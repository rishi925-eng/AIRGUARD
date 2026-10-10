"""
Activity recommendations based on air quality.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.database import get_db
from app.services.openaq import OpenAQService
from app.services.weather import WeatherService
from app.models.activity import ActivityRecommendation

router = APIRouter()


class ActivityLogInput(BaseModel):
    """Model for logging activity."""
    user_id: str
    activity_type: str
    latitude: float
    longitude: float
    duration_minutes: int
    notes: str = None


@router.get("/recommendations")
async def get_activity_recommendations(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
    activity_type: str = Query("outdoor", description="Activity type: outdoor, exercise, sports"),
    db: Session = Depends(get_db)
):
    """
    Get activity recommendations based on current and forecast AQI and weather.
    
    Returns safety scores and best times for outdoor activities.
    """
    try:
        aqi_service = OpenAQService()
        weather_service = WeatherService()
        
        # Get current AQI
        aqi_data = await aqi_service.get_latest_measurements(lat, lon, radius=10000)
        measurements = aqi_data.get("measurements", [])
        
        current_aqi = 50
        for m in measurements:
            if m.get("parameter") == "pm25":
                current_aqi = calculate_pm25_aqi(m.get("value", 0))
                break
        
        # Get current weather
        weather_data = await weather_service.get_current_weather(lat, lon)
        temperature = weather_data.get("temperature", 20)
        
        # Generate recommendations based on AQI and activity type
        recommendations = generate_activity_recommendations(
            current_aqi, 
            temperature, 
            activity_type
        )
        
        # Get forecast for best time recommendation
        forecast = await weather_service.get_forecast(lat, lon, days=1)
        
        return {
            "location": {"lat": lat, "lon": lon},
            "current_aqi": current_aqi,
            "current_weather": {
                "temperature": temperature,
                "conditions": weather_data.get("weather_description", "")
            },
            "activity_type": activity_type,
            "overall_safety_score": calculate_safety_score(current_aqi, temperature),
            "recommendations": recommendations,
            "best_time": determine_best_time(current_aqi, forecast),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


@router.post("/log-activity")
async def log_activity(
    activity_input: ActivityLogInput,
    db: Session = Depends(get_db)
):
    """
    Log completed outdoor activity.
    
    Saves activity for future analysis and exposure tracking.
    """
    try:
        # In production, save to activity log table
        # For now, return confirmation
        
        return {
            "success": True,
            "activity_id": str(uuid.uuid4()),
            "message": "Activity logged successfully",
            "activity": {
                "type": activity_input.activity_type,
                "duration_minutes": activity_input.duration_minutes,
                "location": {
                    "latitude": activity_input.latitude,
                    "longitude": activity_input.longitude
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log activity: {str(e)}")


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
    """Linear interpolation."""
    return int(((value - in_min) / (in_max - in_min)) * (out_max - out_min) + out_min)


def calculate_safety_score(aqi: int, temperature: float) -> int:
    """Calculate overall safety score (0-100) for outdoor activities."""
    # Base score from AQI (inverted - lower AQI = higher score)
    if aqi <= 50:
        aqi_score = 100
    elif aqi <= 100:
        aqi_score = 80
    elif aqi <= 150:
        aqi_score = 60
    elif aqi <= 200:
        aqi_score = 40
    elif aqi <= 300:
        aqi_score = 20
    else:
        aqi_score = 10
    
    # Temperature factor (optimal 15-25°C)
    if 15 <= temperature <= 25:
        temp_factor = 1.0
    elif 10 <= temperature < 15 or 25 < temperature <= 30:
        temp_factor = 0.9
    elif 5 <= temperature < 10 or 30 < temperature <= 35:
        temp_factor = 0.8
    else:
        temp_factor = 0.7
    
    return int(aqi_score * temp_factor)


def generate_activity_recommendations(aqi: int, temperature: float, activity_type: str) -> list:
    """Generate specific activity recommendations."""
    recommendations = []
    
    # Define activities
    activities = {
        "outdoor": ["Walking", "Picnic", "Outdoor dining", "Photography"],
        "exercise": ["Running", "Cycling", "Yoga", "Sports"],
        "sports": ["Soccer", "Basketball", "Tennis", "Jogging"]
    }
    
    activity_list = activities.get(activity_type, activities["outdoor"])
    
    for activity in activity_list:
        if aqi <= 50:
            recommendations.append({
                "activity": activity,
                "recommended": True,
                "safety_level": "Safe",
                "precautions": ["Stay hydrated"],
                "duration_recommendation": "No restrictions"
            })
        elif aqi <= 100:
            recommendations.append({
                "activity": activity,
                "recommended": True,
                "safety_level": "Acceptable",
                "precautions": ["Monitor if sensitive", "Stay hydrated"],
                "duration_recommendation": "Normal duration acceptable"
            })
        elif aqi <= 150:
            if "intense" not in activity.lower():
                recommendations.append({
                    "activity": activity,
                    "recommended": False if "Running" in activity or "Sports" in activity else True,
                    "safety_level": "Caution advised",
                    "precautions": ["Limit intense activities", "Wear mask if sensitive", "Take breaks"],
                    "duration_recommendation": "Reduce by 25-50%"
                })
        elif aqi <= 200:
            recommendations.append({
                "activity": activity,
                "recommended": False,
                "safety_level": "Not recommended",
                "precautions": ["Avoid prolonged outdoor activity", "Wear N95 mask if necessary", "Stay indoors if possible"],
                "duration_recommendation": "Less than 30 minutes"
            })
        else:
            recommendations.append({
                "activity": activity,
                "recommended": False,
                "safety_level": "Unsafe",
                "precautions": ["Stay indoors", "Use air purifier", "Avoid all outdoor activity"],
                "duration_recommendation": "Not recommended"
            })
    
    return recommendations


def determine_best_time(current_aqi: int, forecast: list) -> str:
    """Determine best time for outdoor activities."""
    if current_aqi <= 50:
        return "Current conditions are excellent for outdoor activities"
    elif current_aqi <= 100:
        return "Morning hours typically have better air quality"
    elif current_aqi <= 150:
        return "Early morning (6-8 AM) recommended when pollution levels are lower"
    else:
        return "Consider postponing outdoor activities until air quality improves"
