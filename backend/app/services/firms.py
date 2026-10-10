"""
NASA FIRMS (Fire Information for Resource Management System) API service.
"""
import httpx
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class FIRMSService:
    """Service for interacting with NASA FIRMS API."""
    
    def __init__(self):
        self.base_url = settings.NASA_FIRMS_BASE_URL
        self.api_key = settings.NASA_FIRMS_API_KEY
        
    async def get_active_fires(
        self, 
        min_lat: float, 
        min_lon: float, 
        max_lat: float, 
        max_lon: float,
        days: int = 1
    ) -> List[Dict]:
        """
        Get active fire detections within a bounding box.
        
        Args:
            min_lat: Minimum latitude
            min_lon: Minimum longitude
            max_lat: Maximum latitude
            max_lon: Maximum longitude
            days: Number of days to look back (1-10)
            
        Returns:
            List of fire detection dictionaries
        """
        if not self.api_key:
            if getattr(settings, 'USE_MOCK_DATA', False):
                logger.warning("NASA FIRMS API key not configured, returning mock data")
                return self._get_mock_fire_data()
            return []
        
        async with httpx.AsyncClient() as client:
            # FIRMS API format: /api_key/VIIRS_SNPP_NRT/{min_lon,min_lat,max_lon,max_lat}/{days}
            area = f"{min_lon},{min_lat},{max_lon},{max_lat}"
            url = f"{self.base_url}/{self.api_key}/VIIRS_SNPP_NRT/{area}/{days}"
            
            try:
                response = await client.get(url, timeout=15.0)
                
                if response.status_code == 200:
                    # Parse CSV response
                    return self._parse_firms_csv(response.text)
                else:
                    logger.warning(f"FIRMS API returned status {response.status_code}")
                    if getattr(settings, 'USE_MOCK_DATA', False):
                        return self._get_mock_fire_data()
                    return []
            except Exception as e:
                logger.error(f"Failed to fetch fire data: {e}")
                if getattr(settings, 'USE_MOCK_DATA', False):
                    return self._get_mock_fire_data()
                return []
    
    async def get_fires_near_point(
        self, 
        lat: float, 
        lon: float, 
        radius_km: float = 50,
        days: int = 1
    ) -> List[Dict]:
        """
        Get active fires near a specific point.
        
        Args:
            lat: Latitude of center point
            lon: Longitude of center point
            radius_km: Radius in kilometers
            days: Number of days to look back
            
        Returns:
            List of fire detections within radius
        """
        # Calculate bounding box from center point and radius
        # Approximate: 1 degree latitude = 111 km
        lat_delta = radius_km / 111.0
        lon_delta = radius_km / (111.0 * abs(max(-1, min(1, lat / 90))))
        
        min_lat = lat - lat_delta
        max_lat = lat + lat_delta
        min_lon = lon - lon_delta
        max_lon = lon + lon_delta
        
        fires = await self.get_active_fires(min_lat, min_lon, max_lat, max_lon, days)
        
        # Filter by actual distance if needed
        return fires
    
    def _parse_firms_csv(self, csv_text: str) -> List[Dict]:
        """
        Parse CSV response from FIRMS API.
        
        CSV format includes: latitude, longitude, brightness, scan, track, 
        acq_date, acq_time, satellite, instrument, confidence, version, 
        bright_t31, frp, daynight
        """
        lines = csv_text.strip().split('\n')
        if len(lines) < 2:
            return []
        
        # Parse header
        header = lines[0].split(',')
        
        fires = []
        for line in lines[1:]:
            if not line.strip():
                continue
                
            values = line.split(',')
            if len(values) < len(header):
                continue
            
            fire_dict = dict(zip(header, values))
            
            # Convert to our format
            try:
                fires.append({
                    "latitude": float(fire_dict.get("latitude", 0)),
                    "longitude": float(fire_dict.get("longitude", 0)),
                    "brightness": float(fire_dict.get("brightness", 0)),
                    "confidence": fire_dict.get("confidence", "unknown"),
                    "acquisition_date": fire_dict.get("acq_date", ""),
                    "acquisition_time": fire_dict.get("acq_time", ""),
                    "instrument": fire_dict.get("instrument", ""),
                    "satellite": fire_dict.get("satellite", ""),
                    "frp": float(fire_dict.get("frp", 0)) if fire_dict.get("frp") else None,  # Fire Radiative Power
                    "daynight": fire_dict.get("daynight", "")
                })
            except (ValueError, KeyError) as e:
                logger.warning(f"Failed to parse fire record: {e}")
                continue
        
        return fires
    
    def parse_to_fire_detection_model(self, fire_data: Dict) -> Dict:
        """
        Convert FIRMS data format to FireDetection model format.
        
        Args:
            fire_data: Dictionary from FIRMS API
            
        Returns:
            Dictionary formatted for FireDetection model
        """
        # Parse acquisition datetime
        acq_date = fire_data.get("acquisition_date", "")
        acq_time = fire_data.get("acquisition_time", "0000")
        
        try:
            # Parse date (YYYY-MM-DD format)
            date_parts = acq_date.split('-')
            # Parse time (HHMM format)
            time_str = acq_time.zfill(4)
            hour = int(time_str[:2])
            minute = int(time_str[2:4])
            
            acquisition_datetime = datetime(
                int(date_parts[0]), int(date_parts[1]), int(date_parts[2]),
                hour, minute
            )
        except (ValueError, IndexError):
            acquisition_datetime = datetime.utcnow()
        
        # Map confidence to numeric value
        confidence_map = {
            "low": 30,
            "nominal": 50,
            "high": 80,
            "l": 30,
            "n": 50,
            "h": 80
        }
        confidence_str = str(fire_data.get("confidence", "")).lower()
        try:
            confidence = int(confidence_str) if confidence_str.isdigit() else confidence_map.get(confidence_str, 50)
        except:
            confidence = 50
        
        return {
            "latitude": fire_data.get("latitude"),
            "longitude": fire_data.get("longitude"),
            "brightness": fire_data.get("brightness"),
            "confidence": confidence,
            "acquisition_date": acquisition_datetime,
            "instrument": fire_data.get("instrument", ""),
            "frp": fire_data.get("frp")
        }
    
    def _get_mock_fire_data(self) -> List[Dict]:
        """Return mock fire detection data for development."""
        base_time = datetime.utcnow()
        
        return [
            {
                "latitude": 34.0522,
                "longitude": -118.2437,
                "brightness": 325.5,
                "confidence": "high",
                "acquisition_date": base_time.strftime("%Y-%m-%d"),
                "acquisition_time": base_time.strftime("%H%M"),
                "instrument": "VIIRS",
                "satellite": "Suomi-NPP",
                "frp": 12.5,
                "daynight": "D"
            },
            {
                "latitude": 34.1234,
                "longitude": -118.3456,
                "brightness": 298.3,
                "confidence": "nominal",
                "acquisition_date": base_time.strftime("%Y-%m-%d"),
                "acquisition_time": (base_time - timedelta(hours=2)).strftime("%H%M"),
                "instrument": "VIIRS",
                "satellite": "NOAA-20",
                "frp": 8.3,
                "daynight": "D"
            },
            {
                "latitude": 33.9876,
                "longitude": -118.1234,
                "brightness": 310.0,
                "confidence": "high",
                "acquisition_date": (base_time - timedelta(days=1)).strftime("%Y-%m-%d"),
                "acquisition_time": "1445",
                "instrument": "VIIRS",
                "satellite": "Suomi-NPP",
                "frp": 15.2,
                "daynight": "D"
            }
        ]
