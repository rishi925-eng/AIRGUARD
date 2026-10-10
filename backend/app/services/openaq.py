"""
Air quality data service.
Primary: OpenAQ v3 (requires OPENAQ_API_KEY).
Fallback & Historical: Open-Meteo Air Quality API (global coverage, high resolution).
"""
import httpx
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any

from app.config import settings

logger = logging.getLogger(__name__)


# ── AQI Conversion (US EPA PM2.5 breakpoints) ─────────────────────────────────
_PM25_BREAKPOINTS = [
    (0.0, 12.0, 0, 50),
    (12.1, 35.4, 51, 100),
    (35.5, 55.4, 101, 150),
    (55.5, 150.4, 151, 200),
    (150.5, 250.4, 201, 300),
    (250.5, 500.4, 301, 500),
]

_PM10_BREAKPOINTS = [
    (0, 54, 0, 50),
    (55, 154, 51, 100),
    (155, 254, 101, 150),
    (255, 354, 151, 200),
    (355, 424, 201, 300),
    (425, 604, 301, 500),
]


def pm25_to_aqi(pm25: float) -> int:
    """Convert PM2.5 concentration (µg/m³) to US EPA AQI."""
    if pm25 is None or pm25 < 0:
        return 0
    for c_lo, c_hi, i_lo, i_hi in _PM25_BREAKPOINTS:
        if pm25 <= c_hi:
            return round((i_hi - i_lo) / (c_hi - c_lo) * (pm25 - c_lo) + i_lo)
    return 500


def pm10_to_aqi(pm10: float) -> int:
    """Convert PM10 concentration (µg/m³) to US EPA AQI."""
    if pm10 is None or pm10 < 0:
        return 0
    for c_lo, c_hi, i_lo, i_hi in _PM10_BREAKPOINTS:
        if pm10 <= c_hi:
            return round((i_hi - i_lo) / (c_hi - c_lo) * (pm10 - c_lo) + i_lo)
    return 500


def aqi_category(aqi: int) -> str:
    if aqi is None:
        return "Unavailable"
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


# ── Exposure model ─────────────────────────────────────────────────────────────
_VENTILATION_M3_PER_MIN = {
    "driving": 0.003,
    "walking": 0.015,
    "cycling": 0.040,
}


def estimate_pm25_inhaled_ug(pm25_ug_m3: float, duration_seconds: float, mode: str = "driving") -> float:
    """
    Estimate PM2.5 mass inhaled during a trip.
    Formula: mass (µg) = concentration (µg/m³) × ventilation_rate (m³/s) × duration (s)
    """
    v = _VENTILATION_M3_PER_MIN.get(mode, _VENTILATION_M3_PER_MIN["driving"]) / 60.0  # m³/s
    return round(pm25_ug_m3 * v * duration_seconds, 2)


# ── Service class ─────────────────────────────────────────────────────────────

class OpenAQService:
    """Air quality service with OpenAQ v3 primary and Open-Meteo fallback."""

    def __init__(self):
        self.base_url = settings.OPENAQ_BASE_URL.rstrip('/')
        self.api_key = settings.OPENAQ_API_KEY
        self.openmeteo_base = settings.OPENMETEO_BASE_URL

    async def get_pm25_at_location(self, lat: float, lon: float, radius_m: int = 25000) -> Dict[str, Any]:
        """
        Return best available PM2.5 and AQI reading near (lat, lon).
        """
        # 1. Try OpenAQ v3 if key is present
        if self.api_key:
            try:
                result = await self._openaq_v3_pm25(lat, lon, radius_m)
                if result and result.get("pm25") is not None:
                    return result
            except Exception as exc:
                logger.warning(f"OpenAQ v3 fetch failed: {exc}")

        # 2. Open-Meteo fallback (high-accuracy global coverage)
        try:
            result = await self._openmeteo_pm25(lat, lon)
            if result and result.get("pm25") is not None:
                return result
        except Exception as exc:
            logger.warning(f"Open-Meteo AQI fetch failed: {exc}")

        # 3. Unavailable marker
        return {
            "pm25": None,
            "aqi": None,
            "aqi_category": "Unavailable",
            "source": "unavailable",
            "timestamp": None,
            "is_estimated": False,
        }

    async def _openaq_v3_pm25(self, lat: float, lon: float, radius_m: int) -> Optional[Dict[str, Any]]:
        """Fetch nearest PM2.5 from OpenAQ v3 API."""
        headers = {"X-API-Key": self.api_key, "User-Agent": "AIRGUARD/1.0"}
        params = {
            "coordinates": f"{lat},{lon}",
            "radius": radius_m,
            "limit": 5,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/locations", params=params, headers=headers)
            if resp.status_code != 200:
                logger.warning(f"OpenAQ returned status {resp.status_code}")
                return None
            data = resp.json()

        results = data.get("results", [])
        for loc in results:
            sensors = loc.get("sensors", [])
            for s in sensors:
                param = s.get("parameter", {}).get("name", "").lower()
                if param == "pm25":
                    latest = s.get("latest") or {}
                    val = latest.get("value")
                    if val is not None and val > 0:
                        pm25 = float(val)
                        aqi = pm25_to_aqi(pm25)
                        return {
                            "pm25": round(pm25, 1),
                            "aqi": aqi,
                            "aqi_category": aqi_category(aqi),
                            "source": f"OpenAQ ({loc.get('name', 'Station')})",
                            "station_name": loc.get("name", ""),
                            "distance_m": loc.get("distance"),
                            "timestamp": latest.get("datetime", {}).get("utc") or datetime.utcnow().isoformat(),
                            "is_estimated": False,
                        }
        return None

    async def _openmeteo_pm25(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Fetch current PM2.5 and AQI from Open-Meteo Air Quality API.
        """
        url = self.openmeteo_base
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
            "hourly": "pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,us_aqi",
            "forecast_days": 1,
            "timezone": "UTC",
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        current = data.get("current", {})
        pm25 = current.get("pm2_5")
        aqi = current.get("us_aqi")

        if pm25 is None:
            # Fallback to hourly
            hourly = data.get("hourly", {})
            pm25_values = hourly.get("pm2_5", [])
            valid_vals = [v for v in pm25_values if v is not None]
            if valid_vals:
                pm25 = valid_vals[-1]

        if pm25 is None:
            return None

        if aqi is None:
            aqi = pm25_to_aqi(float(pm25))

        return {
            "pm25": round(float(pm25), 1),
            "aqi": int(aqi),
            "aqi_category": aqi_category(int(aqi)),
            "source": "Open-Meteo Air Quality Model",
            "timestamp": current.get("time") or datetime.utcnow().isoformat(),
            "is_estimated": True,
        }

    async def get_latest_measurements(self, lat: float, lon: float, radius: int = 10000) -> Dict[str, Any]:
        """
        Get comprehensive pollutant measurements (PM2.5, PM10, O3, NO2, SO2, CO) and station metadata.
        """
        # Try fetching full current payload from Open-Meteo
        try:
            url = self.openmeteo_base
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
                "forecast_days": 1,
                "timezone": "UTC",
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    current = data.get("current", {})
                    ts = current.get("time") or datetime.now(timezone.utc).isoformat()
                    if ts and not ts.endswith("Z") and "+" not in ts:
                        ts = f"{ts}Z"
                    
                    measurements = [
                        {"parameter": "pm25", "value": round(float(current.get("pm2_5", 0.0)), 1), "unit": "µg/m³", "last_updated": ts},
                        {"parameter": "pm10", "value": round(float(current.get("pm10", 0.0)), 1), "unit": "µg/m³", "last_updated": ts},
                        {"parameter": "no2", "value": round(float(current.get("nitrogen_dioxide", 0.0)), 1), "unit": "µg/m³", "last_updated": ts},
                        {"parameter": "so2", "value": round(float(current.get("sulphur_dioxide", 0.0)), 1), "unit": "µg/m³", "last_updated": ts},
                        {"parameter": "co", "value": round(float(current.get("carbon_monoxide", 0.0)), 1), "unit": "µg/m³", "last_updated": ts},
                        {"parameter": "o3", "value": round(float(current.get("ozone", 0.0)), 1), "unit": "µg/m³", "last_updated": ts},
                    ]
                    
                    # Calculate AQI
                    pm25_val = current.get("pm2_5") or 0.0
                    aqi = current.get("us_aqi") or pm25_to_aqi(pm25_val)
                    
                    return {
                        "measurements": measurements,
                        "aqi": int(aqi),
                        "station": {
                            "id": "openmeteo_station",
                            "name": "Global High-Resolution Atmospheric Telemetry",
                            "coordinates": {"latitude": lat, "longitude": lon}
                        },
                        "is_estimated": True,
                        "source": "Open-Meteo Atmospheric Model"
                    }
        except Exception as exc:
            logger.warning(f"Failed to fetch full measurements: {exc}")

        # Fallback to basic get_pm25_at_location
        aq = await self.get_pm25_at_location(lat, lon, radius)
        pm25 = aq.get("pm25") or 0.0
        return {
            "measurements": [
                {"parameter": "pm25", "value": pm25, "unit": "µg/m³", "last_updated": aq.get("timestamp") or datetime.utcnow().isoformat()},
            ],
            "aqi": aq.get("aqi") or pm25_to_aqi(pm25),
            "station": {"id": aq.get("source", "unknown"), "name": aq.get("source", "unknown"), "coordinates": {"latitude": lat, "longitude": lon}},
            "is_estimated": aq.get("is_estimated", True),
            "source": aq.get("source", "Open-Meteo")
        }

    async def sample_route_aqi(
        self, coordinates: List[List[float]], max_samples: int = 10
    ) -> Dict[str, Any]:
        """
        Sample AQI along a route geometry (list of [lon, lat] pairs).
        """
        if not coordinates:
            return {"samples": [], "average_pm25": None, "average_aqi": None, "max_aqi": None, "data_coverage": 0.0}

        n = len(coordinates)
        step = max(1, (n - 1) // (max_samples - 1)) if n > 1 else 1
        indices = list(range(0, n, step))
        if indices[-1] != n - 1:
            indices.append(n - 1)
        sample_coords = [coordinates[i] for i in indices]

        import asyncio

        async def sample_single(coord):
            lon, lat = coord[0], coord[1]
            aq = await self.get_pm25_at_location(lat, lon)
            return {
                "lat": lat,
                "lon": lon,
                "pm25": aq.get("pm25"),
                "aqi": aq.get("aqi"),
                "source": aq.get("source"),
                "timestamp": aq.get("timestamp"),
                "is_estimated": aq.get("is_estimated", True),
            }

        samples = await asyncio.gather(*[sample_single(c) for c in sample_coords])

        valid_pm25 = [s["pm25"] for s in samples if s["pm25"] is not None]
        valid_aqi = [s["aqi"] for s in samples if s["aqi"] is not None]
        coverage = len(valid_pm25) / len(samples) if samples else 0.0
        latest_ts = next((s["timestamp"] for s in reversed(samples) if s.get("timestamp")), None)

        return {
            "samples": samples,
            "average_pm25": round(sum(valid_pm25) / len(valid_pm25), 1) if valid_pm25 else None,
            "average_aqi": round(sum(valid_aqi) / len(valid_aqi)) if valid_aqi else None,
            "max_aqi": max(valid_aqi) if valid_aqi else None,
            "data_coverage": round(coverage, 2),
            "latest_timestamp": latest_ts,
        }

    async def get_nearby_stations(self, lat: float, lon: float, radius: int, limit: int) -> List[Dict[str, Any]]:
        """Return nearby OpenAQ stations."""
        if not self.api_key:
            return []
        headers = {"X-API-Key": self.api_key, "User-Agent": "AIRGUARD/1.0"}
        params = {"coordinates": f"{lat},{lon}", "radius": radius, "limit": limit}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.base_url}/locations", params=params, headers=headers)
                if resp.status_code == 200:
                    return resp.json().get("results", [])
        except Exception as exc:
            logger.warning(f"Failed to get nearby stations: {exc}")
        return []

    async def get_historical_data(self, lat: float, lon: float, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Fetch historical time-series air quality data from Open-Meteo."""
        days = max(1, min(90, (end_date.date() - start_date.date()).days + 1))
        try:
            url = self.openmeteo_base
            params = {
                "latitude": lat,
                "longitude": lon,
                "hourly": "pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
                "past_days": min(days, 90),
                "forecast_days": 1,
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    hourly = data.get("hourly", {})
                    times = hourly.get("time", [])
                    pm25_list = hourly.get("pm2_5", [])
                    pm10_list = hourly.get("pm10", [])
                    aqi_list = hourly.get("us_aqi", [])
                    
                    history = []
                    for i in range(len(times)):
                        p25 = pm25_list[i] if i < len(pm25_list) else None
                        p10 = pm10_list[i] if i < len(pm10_list) else None
                        aq_val = aqi_list[i] if i < len(aqi_list) and aqi_list[i] is not None else (pm25_to_aqi(p25) if p25 else 50)
                        history.append({
                            "timestamp": times[i],
                            "aqi": aq_val,
                            "pm25": p25,
                            "pm10": p10,
                            "category": aqi_category(aq_val)
                        })
                    return history
        except Exception as exc:
            logger.error(f"Failed to fetch historical data: {exc}")
        return []

    async def get_stations_in_bounds(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float) -> List[Dict[str, Any]]:
        center_lat = (min_lat + max_lat) / 2
        center_lon = (min_lon + max_lon) / 2
        return await self.get_nearby_stations(center_lat, center_lon, 50000, 50)

    async def get_pollutant_history(self, lat: float, lon: float, pollutant: str, days: int = 7) -> List[Dict[str, Any]]:
        """Fetch historical time-series for a specific pollutant."""
        param_map = {
            "pm25": "pm2_5",
            "pm10": "pm10",
            "o3": "ozone",
            "no2": "nitrogen_dioxide",
            "so2": "sulphur_dioxide",
            "co": "carbon_monoxide"
        }
        api_param = param_map.get(pollutant.lower(), "pm2_5")
        try:
            url = self.openmeteo_base
            params = {
                "latitude": lat,
                "longitude": lon,
                "hourly": api_param,
                "past_days": min(days, 30),
                "forecast_days": 1,
            }
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    hourly = data.get("hourly", {})
                    times = hourly.get("time", [])
                    values = hourly.get(api_param, [])
                    return [
                        {"timestamp": t, "value": v, "pollutant": pollutant}
                        for t, v in zip(times, values)
                        if v is not None
                    ]
        except Exception as exc:
            logger.error(f"Failed to fetch pollutant history: {exc}")
        return []
