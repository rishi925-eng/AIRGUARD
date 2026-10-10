"""
Weather data endpoints integrated with air quality.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.config import settings
from app.services.weather import WeatherService

router = APIRouter()


@router.get("/current")
async def get_current_weather(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
    db: Session = Depends(get_db)
):
    """
    Get current weather conditions.
    
    Returns temperature, humidity, wind speed/direction, and precipitation.
    """
    service = WeatherService()
    try:
        weather_data = await service.get_current_weather(lat, lon)
        
        return {
            "location": {"lat": lat, "lon": lon},
            "current": weather_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch weather data: {str(e)}")


@router.get("/forecast")
async def get_weather_forecast(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
    days: int = Query(7, description="Number of days", ge=1, le=16),
    db: Session = Depends(get_db)
):
    """
    Get weather forecast for specified days.
    
    Returns daily forecasts including temperature, precipitation, and wind.
    """
    service = WeatherService()
    try:
        forecast_data = await service.get_forecast(lat, lon, days)
        
        return {
            "location": {"lat": lat, "lon": lon},
            "forecast": forecast_data,
            "days": len(forecast_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch forecast: {str(e)}")


@router.get("/historical")
async def get_historical_weather(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
    days: int = Query(7, description="Number of days back", ge=1, le=90),
    db: Session = Depends(get_db)
):
    """
    Get historical weather data.
    
    Returns past weather conditions for the specified time period.
    """
    service = WeatherService()
    try:
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        historical_data = await service.get_historical(
            lat, lon,
            start_date.isoformat(),
            end_date.isoformat()
        )
        
        return {
            "location": {"lat": lat, "lon": lon},
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "data": historical_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch historical weather: {str(e)}")
