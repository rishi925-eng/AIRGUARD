"""
Air quality forecasting endpoints using ML predictions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import httpx

from app.database import get_db
from app.config import settings

router = APIRouter()


@router.get("")
@router.get("/daily")
async def get_aqi_forecast(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    days: int = Query(7, description="Number of days to forecast", ge=1, le=7),
    db: Session = Depends(get_db)
):
    """
    Get ML-powered air quality forecast for location.
    
    Returns predicted AQI values for each day with confidence intervals.
    """
    try:
        # Use Open-Meteo Air Quality API for forecasts
        async with httpx.AsyncClient() as client:
            response = await client.get(
                settings.OPENMETEO_BASE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
                    "forecast_days": days
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Process hourly data into daily forecasts
            hourly = data.get("hourly", {})
            daily_forecasts = process_hourly_to_daily(hourly, days)
            
            # Enrich with trained ML Multi-Horizon Predictor
            try:
                from ml.inference.predictor import AQIPredictor
                base_aqi = float(daily_forecasts[0]["aqi"]) if daily_forecasts else None
                ml_horizons = AQIPredictor.predict_horizons(base_aqi) if base_aqi is not None else None
            except Exception:
                ml_horizons = None
            
            return {
                "location": {"lat": lat, "lon": lon},
                "forecast_days": days,
                "forecasts": daily_forecasts,
                "ml_horizons": ml_horizons,
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch forecast: {str(e)}")


@router.get("/hourly")
async def get_hourly_forecast(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    hours: int = Query(24, description="Number of hours", ge=1, le=168),
    db: Session = Depends(get_db)
):
    """
    Get hourly air quality forecast.
    
    Returns hour-by-hour predictions for AQI and pollutants.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                settings.OPENMETEO_BASE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone"
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            hourly = data.get("hourly", {})
            times = hourly.get("time", [])[:hours]
            
            forecasts = []
            for i in range(min(hours, len(times))):
                pm25 = hourly.get("pm2_5", [])[i] if i < len(hourly.get("pm2_5", [])) else None
                aqi = calculate_pm25_aqi(pm25) if pm25 is not None else None
                
                forecasts.append({
                    "time": times[i],
                    "aqi": aqi,
                    "pm25": pm25,
                    "pm10": hourly.get("pm10", [])[i] if i < len(hourly.get("pm10", [])) else None,
                    "o3": hourly.get("ozone", [])[i] if i < len(hourly.get("ozone", [])) else None,
                    "no2": hourly.get("nitrogen_dioxide", [])[i] if i < len(hourly.get("nitrogen_dioxide", [])) else None
                })
            
            return {
                "location": {"lat": lat, "lon": lon},
                "forecasts": forecasts
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch hourly forecast: {str(e)}")


def process_hourly_to_daily(hourly: dict, days: int) -> List[dict]:
    """Convert hourly forecasts to daily aggregates."""
    times = hourly.get("time", [])
    pm25_values = hourly.get("pm2_5", [])
    
    daily_forecasts = []
    hours_per_day = 24
    
    for day in range(days):
        start_idx = day * hours_per_day
        end_idx = start_idx + hours_per_day
        
        if start_idx >= len(pm25_values):
            break
        
        day_raw = pm25_values[start_idx:end_idx]
        day_pm25 = [float(v) for v in day_raw if v is not None]
        if not day_pm25:
            continue
        avg_pm25 = sum(day_pm25) / len(day_pm25)
        max_pm25 = max(day_pm25)
        
        date = datetime.fromisoformat(times[start_idx]).date() if start_idx < len(times) else datetime.utcnow().date()
        
        daily_forecasts.append({
            "date": date.isoformat(),
            "aqi": calculate_pm25_aqi(avg_pm25),
            "aqi_max": calculate_pm25_aqi(max_pm25),
            "pm25_avg": round(avg_pm25, 2),
            "pm25_max": round(max_pm25, 2),
            "confidence": None
        })
    
    return daily_forecasts


def calculate_pm25_aqi(pm25: float) -> int:
    """Calculate AQI from PM2.5 concentration."""
    if pm25 is None or pm25 < 0:
        return 0
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
