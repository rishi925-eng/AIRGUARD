"""
Air quality data endpoints for real-time and historical AQI data.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import httpx

from app.database import get_db
from app.config import settings
from app.services.openaq import OpenAQService

router = APIRouter()


@router.get("/current")
async def get_current_air_quality(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
    radius: int = Query(10000, description="Search radius in meters", ge=1000, le=50000),
    db: Session = Depends(get_db)
):
    """
    Get current air quality data for a location.
    
    Returns AQI, pollutant levels, and nearest station information.
    """
    service = OpenAQService()
    try:
        data = await service.get_latest_measurements(lat, lon, radius)
        
        # Calculate AQI from pollutants
        aqi = calculate_aqi(data.get("measurements", []))
        
        observation_timestamps = [
            item.get("last_updated")
            for item in data.get("measurements", [])
            if item.get("last_updated")
        ]
        observation_timestamp = max(observation_timestamps) if observation_timestamps else None

        return {
            "location": {"lat": lat, "lon": lon},
            "aqi": aqi,
            "category": get_aqi_category(aqi),
            "dominant_pollutant": get_dominant_pollutant(data.get("measurements", [])),
            "measurements": data.get("measurements", []),
            "timestamp": observation_timestamp,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "station": data.get("station"),
            "source": data.get("source", "Open-Meteo Air Quality Model"),
            "is_estimated": data.get("is_estimated", True),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch air quality data: {str(e)}")


@router.get("/historical")
async def get_historical_air_quality(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    days: int = Query(7, description="Number of days of historical data", ge=1, le=90),
    db: Session = Depends(get_db)
):
    """
    Get historical air quality data for a location.
    
    Returns time series of AQI values and pollutant levels.
    """
    service = OpenAQService()
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        data = await service.get_historical_data(lat, lon, start_date, end_date)
        
        return {
            "location": {"lat": lat, "lon": lon},
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch historical data: {str(e)}")


@router.get("/stations")
async def get_nearby_stations(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius: int = Query(25000, description="Search radius in meters", le=100000),
    limit: int = Query(10, description="Maximum number of stations", le=50),
    db: Session = Depends(get_db)
):
    """
    Get nearby air quality monitoring stations.
    
    Returns list of stations with their current readings.
    """
    service = OpenAQService()
    try:
        stations = await service.get_nearby_stations(lat, lon, radius, limit)
        return {
            "location": {"lat": lat, "lon": lon},
            "radius": radius,
            "count": len(stations),
            "stations": stations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stations: {str(e)}")


@router.get("/map")
async def get_air_quality_map(
    bounds: str = Query(..., description="Bounding box: min_lon,min_lat,max_lon,max_lat"),
    db: Session = Depends(get_db)
):
    """
    Get air quality data for map visualization within bounding box.
    
    Returns grid of AQI values and station locations.
    """
    try:
        # Parse bounds
        coords = [float(x) for x in bounds.split(",")]
        if len(coords) != 4:
            raise ValueError("Invalid bounds format")
        
        min_lon, min_lat, max_lon, max_lat = coords
        
        service = OpenAQService()
        stations = await service.get_stations_in_bounds(min_lat, min_lon, max_lat, max_lon)
        
        return {
            "bounds": {
                "min_lat": min_lat,
                "min_lon": min_lon,
                "max_lat": max_lat,
                "max_lon": max_lon
            },
            "stations": stations,
            "timestamp": datetime.utcnow().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid bounds: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch map data: {str(e)}")


@router.get("/pollutants/{pollutant}")
async def get_pollutant_data(
    pollutant: str,
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    days: int = Query(7, description="Number of days", ge=1, le=30),
    db: Session = Depends(get_db)
):
    """
    Get specific pollutant data (PM2.5, PM10, O3, NO2, SO2, CO).
    
    Returns historical time series for the specified pollutant.
    """
    valid_pollutants = ["pm25", "pm10", "o3", "no2", "so2", "co"]
    if pollutant.lower() not in valid_pollutants:
        raise HTTPException(status_code=400, detail=f"Invalid pollutant. Must be one of {valid_pollutants}")
    
    service = OpenAQService()
    try:
        data = await service.get_pollutant_history(lat, lon, pollutant, days)
        return {
            "pollutant": pollutant,
            "location": {"lat": lat, "lon": lon},
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pollutant data: {str(e)}")


# Helper functions
def calculate_aqi(measurements: List[dict]) -> int:
    """Calculate AQI from pollutant measurements."""
    # Simplified AQI calculation - in production use EPA formula
    if not measurements:
        return 0
    
    # Find highest pollutant AQI
    max_aqi = 0
    for m in measurements:
        if m.get("parameter") == "pm25":
            aqi = calculate_pm25_aqi(m.get("value", 0))
            max_aqi = max(max_aqi, aqi)
    
    return max_aqi


def calculate_pm25_aqi(pm25: float) -> int:
    """Calculate AQI from PM2.5 concentration."""
    if pm25 <= 12.0:
        return linear_scale(pm25, 0, 12.0, 0, 50)
    elif pm25 <= 35.4:
        return linear_scale(pm25, 12.1, 35.4, 51, 100)
    elif pm25 <= 55.4:
        return linear_scale(pm25, 35.5, 55.4, 101, 150)
    elif pm25 <= 150.4:
        return linear_scale(pm25, 55.5, 150.4, 151, 200)
    elif pm25 <= 250.4:
        return linear_scale(pm25, 150.5, 250.4, 201, 300)
    else:
        return linear_scale(pm25, 250.5, 500.4, 301, 500)


def linear_scale(value: float, in_min: float, in_max: float, out_min: int, out_max: int) -> int:
    """Linear interpolation for AQI calculation."""
    return int(((value - in_min) / (in_max - in_min)) * (out_max - out_min) + out_min)


def get_aqi_category(aqi: int) -> dict:
    """Get AQI category and health information."""
    if aqi <= 50:
        return {"level": "Good", "color": "#00e400", "message": "Air quality is satisfactory"}
    elif aqi <= 100:
        return {"level": "Moderate", "color": "#ffff00", "message": "Acceptable for most people"}
    elif aqi <= 150:
        return {"level": "Unhealthy for Sensitive Groups", "color": "#ff7e00", "message": "Sensitive groups should limit outdoor activity"}
    elif aqi <= 200:
        return {"level": "Unhealthy", "color": "#ff0000", "message": "Everyone may experience health effects"}
    elif aqi <= 300:
        return {"level": "Very Unhealthy", "color": "#8f3f97", "message": "Health alert: everyone may experience serious effects"}
    else:
        return {"level": "Hazardous", "color": "#7e0023", "message": "Health warning of emergency conditions"}


def get_dominant_pollutant(measurements: List[dict]) -> str:
    """Identify the dominant pollutant contributing most to AQI."""
    if not measurements:
        return "unknown"
    
    max_aqi = 0
    dominant = "unknown"
    
    for m in measurements:
        param = m.get("parameter", "").lower()
        value = m.get("value", 0)
        
        if param == "pm25":
            aqi = calculate_pm25_aqi(value)
            if aqi > max_aqi:
                max_aqi = aqi
                dominant = "PM2.5"
    
    return dominant
