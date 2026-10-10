"""
Weather service for fetching weather data from Open-Meteo API.
"""
import httpx
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class WeatherService:
    """Service for interacting with Open-Meteo Weather API."""
    
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        
    async def get_current_weather(self, lat: float, lon: float) -> Dict:
        """
        Get current weather conditions for a location.
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Dictionary with current weather data
        """
        async with httpx.AsyncClient() as client:
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m",
                "timezone": "auto"
            }
            
            try:
                response = await client.get(
                    self.base_url,
                    params=params,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_current_weather(data)
                else:
                    logger.warning(f"Weather API returned status {response.status_code}")
                    raise RuntimeError(f"Open-Meteo returned HTTP {response.status_code}")
            except Exception as e:
                logger.error(f"Failed to fetch weather data: {e}")
                raise RuntimeError("Current weather provider is unavailable") from e
    
    async def get_forecast(self, lat: float, lon: float, days: int = 7) -> List[Dict]:
        """
        Get weather forecast for a location.
        
        Args:
            lat: Latitude
            lon: Longitude
            days: Number of days to forecast (1-16)
            
        Returns:
            List of daily forecast dictionaries
        """
        async with httpx.AsyncClient() as client:
            params = {
                "latitude": lat,
                "longitude": lon,
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code",
                "timezone": "auto",
                "forecast_days": min(days, 16)
            }
            
            try:
                response = await client.get(
                    self.base_url,
                    params=params,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_forecast(data)
                else:
                    logger.warning(f"Weather API returned status {response.status_code}")
                    raise RuntimeError(f"Open-Meteo returned HTTP {response.status_code}")
            except Exception as e:
                logger.error(f"Failed to fetch forecast: {e}")
                raise RuntimeError("Weather forecast provider is unavailable") from e
    
    async def get_historical(
        self, 
        lat: float, 
        lon: float, 
        start_date: str, 
        end_date: str
    ) -> List[Dict]:
        """
        Get historical weather data for a location.
        
        Args:
            lat: Latitude
            lon: Longitude
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            
        Returns:
            List of historical weather dictionaries
        """
        async with httpx.AsyncClient() as client:
            # Use archive endpoint for historical data
            url = "https://archive-api.open-meteo.com/v1/archive"
            params = {
                "latitude": lat,
                "longitude": lon,
                "start_date": start_date,
                "end_date": end_date,
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
                "timezone": "auto"
            }
            
            try:
                response = await client.get(url, params=params, timeout=15.0)
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_historical(data)
                else:
                    logger.warning(f"Weather archive API returned status {response.status_code}")
                    raise RuntimeError(f"Open-Meteo archive returned HTTP {response.status_code}")
            except Exception as e:
                logger.error(f"Failed to fetch historical weather: {e}")
                raise RuntimeError("Historical weather provider is unavailable") from e
    
    def _parse_current_weather(self, data: Dict) -> Dict:
        """Parse current weather response from API."""
        current = data.get("current", {})
        return {
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "precipitation": current.get("precipitation"),
            "wind_speed": current.get("wind_speed_10m"),
            "wind_direction": current.get("wind_direction_10m"),
            "timestamp": current.get("time"),
            "units": {
                "temperature": "°C",
                "humidity": "%",
                "precipitation": "mm",
                "wind_speed": "km/h"
            }
        }
    
    def _parse_forecast(self, data: Dict) -> List[Dict]:
        """Parse forecast response from API."""
        daily = data.get("daily", {})
        dates = daily.get("time", [])
        temp_max = daily.get("temperature_2m_max", [])
        temp_min = daily.get("temperature_2m_min", [])
        precip = daily.get("precipitation_sum", [])
        wind = daily.get("wind_speed_10m_max", [])
        weather_codes = daily.get("weather_code", [])
        
        forecast = []
        for i in range(len(dates)):
            forecast.append({
                "date": dates[i],
                "temperature_max": temp_max[i] if i < len(temp_max) else None,
                "temperature_min": temp_min[i] if i < len(temp_min) else None,
                "precipitation": precip[i] if i < len(precip) else None,
                "wind_speed": wind[i] if i < len(wind) else None,
                "weather_code": weather_codes[i] if i < len(weather_codes) else None,
                "weather_description": self._get_weather_description(
                    weather_codes[i] if i < len(weather_codes) else 0
                )
            })
        
        return forecast
    
    def _parse_historical(self, data: Dict) -> List[Dict]:
        """Parse historical weather response from API."""
        daily = data.get("daily", {})
        dates = daily.get("time", [])
        temp_max = daily.get("temperature_2m_max", [])
        temp_min = daily.get("temperature_2m_min", [])
        precip = daily.get("precipitation_sum", [])
        wind = daily.get("wind_speed_10m_max", [])
        
        historical = []
        for i in range(len(dates)):
            historical.append({
                "date": dates[i],
                "temperature_max": temp_max[i] if i < len(temp_max) else None,
                "temperature_min": temp_min[i] if i < len(temp_min) else None,
                "precipitation": precip[i] if i < len(precip) else None,
                "wind_speed": wind[i] if i < len(wind) else None
            })
        
        return historical
    
    def _get_weather_description(self, code: int) -> str:
        """Convert WMO weather code to description."""
        weather_codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Foggy",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            71: "Slight snow",
            73: "Moderate snow",
            75: "Heavy snow",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail"
        }
        return weather_codes.get(code, "Unknown")
    
