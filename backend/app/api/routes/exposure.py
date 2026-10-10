"""
Personal exposure tracking endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from geoalchemy2.functions import ST_MakePoint
import uuid

from app.database import get_db
from app.models.exposure import ExposureLog
from app.services.openaq import OpenAQService

router = APIRouter()


class ActivityInput(BaseModel):
    """Activity input for exposure calculation."""
    latitude: float
    longitude: float
    duration_minutes: int
    activity_type: str
    timestamp: str = None


class ExposureCalculationRequest(BaseModel):
    """Request model for exposure calculation."""
    user_id: str
    activities: List[ActivityInput]
    date: str


class ExposureLogInput(BaseModel):
    """Model for logging exposure."""
    user_id: str
    date: str
    latitude: float
    longitude: float
    duration_minutes: int
    activity_type: str


@router.post("/calculate")
async def calculate_exposure(
    request: ExposureCalculationRequest,
    db: Session = Depends(get_db)
):
    """
    Calculate personal air quality exposure based on activities.
    
    Fetches real AQI data for each activity location and calculates exposure scores.
    """
    total_exposure = 0
    detailed_activities = []
    aqi_service = OpenAQService()
    
    for activity in request.activities:
        try:
            # Fetch real AQI data for location
            aqi_data = await aqi_service.get_latest_measurements(
                activity.latitude,
                activity.longitude,
                radius=10000
            )
            
            # Extract AQI from measurements
            measurements = aqi_data.get("measurements", [])
            aqi = 50  # Default moderate
            
            # Calculate AQI from PM2.5 if available
            for m in measurements:
                if m.get("parameter") == "pm25":
                    pm25 = m.get("value", 0)
                    aqi = calculate_pm25_aqi(pm25)
                    break
            
            duration_hours = activity.duration_minutes / 60
            exposure_score = aqi * duration_hours
            
            total_exposure += exposure_score
            detailed_activities.append({
                "location": {
                    "latitude": activity.latitude,
                    "longitude": activity.longitude
                },
                "activity_type": activity.activity_type,
                "duration_minutes": activity.duration_minutes,
                "aqi": aqi,
                "exposure_score": exposure_score,
                "health_impact": get_health_impact(aqi)
            })
        except Exception as e:
            # Use fallback if AQI fetch fails
            aqi = 75
            duration_hours = activity.duration_minutes / 60
            exposure_score = aqi * duration_hours
            
            total_exposure += exposure_score
            detailed_activities.append({
                "location": {
                    "latitude": activity.latitude,
                    "longitude": activity.longitude
                },
                "activity_type": activity.activity_type,
                "duration_minutes": activity.duration_minutes,
                "aqi": aqi,
                "exposure_score": exposure_score,
                "health_impact": get_health_impact(aqi),
                "note": "Using estimated AQI"
            })
    
    total_duration = sum(a.duration_minutes for a in request.activities)
    avg_aqi = total_exposure / (total_duration / 60) if total_duration > 0 else 0
    
    return {
        "user_id": request.user_id,
        "date": request.date,
        "total_exposure": round(total_exposure, 2),
        "average_aqi": round(avg_aqi, 1),
        "total_duration_minutes": total_duration,
        "activities": detailed_activities,
        "health_recommendation": get_health_recommendation(avg_aqi)
    }


@router.post("/log")
async def log_exposure(
    log_input: ExposureLogInput,
    db: Session = Depends(get_db)
):
    """
    Log exposure activity to database.
    
    Saves exposure log for future history queries.
    """
    try:
        # Fetch current AQI
        aqi_service = OpenAQService()
        aqi_data = await aqi_service.get_latest_measurements(
            log_input.latitude,
            log_input.longitude,
            radius=10000
        )
        
        measurements = aqi_data.get("measurements", [])
        aqi = 50
        for m in measurements:
            if m.get("parameter") == "pm25":
                aqi = calculate_pm25_aqi(m.get("value", 0))
                break
        
        duration_hours = log_input.duration_minutes / 60
        exposure_score = aqi * duration_hours
        
        # Create exposure log
        exposure_log = ExposureLog(
            user_id=uuid.UUID(log_input.user_id),
            date=datetime.fromisoformat(log_input.date).date(),
            location=func.ST_SetSRID(
                func.ST_MakePoint(log_input.longitude, log_input.latitude),
                4326
            ),
            duration_minutes=log_input.duration_minutes,
            activity_type=log_input.activity_type,
            aqi=aqi,
            exposure_score=exposure_score
        )
        
        db.add(exposure_log)
        db.commit()
        db.refresh(exposure_log)
        
        return {
            "success": True,
            "log_id": str(exposure_log.id),
            "aqi": aqi,
            "exposure_score": float(exposure_score)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log exposure: {str(e)}")


@router.get("/history")
async def get_exposure_history(
    user_id: str = Query(..., description="User ID"),
    days: int = Query(30, ge=1, le=90, description="Number of days"),
    db: Session = Depends(get_db)
):
    """
    Get user's exposure history from database.
    
    Returns daily exposure logs and statistics.
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Query exposure logs
        logs = db.query(ExposureLog).filter(
            ExposureLog.user_id == uuid.UUID(user_id),
            ExposureLog.date >= start_date,
            ExposureLog.date <= end_date
        ).order_by(ExposureLog.date.desc()).all()
        
        # Group by date
        daily_summary = {}
        for log in logs:
            date_str = log.date.isoformat()
            if date_str not in daily_summary:
                daily_summary[date_str] = {
                    "date": date_str,
                    "total_exposure": 0,
                    "total_duration_minutes": 0,
                    "activities": [],
                    "avg_aqi": 0
                }
            
            daily_summary[date_str]["total_exposure"] += float(log.exposure_score or 0)
            daily_summary[date_str]["total_duration_minutes"] += log.duration_minutes
            daily_summary[date_str]["activities"].append({
                "activity_type": log.activity_type,
                "duration_minutes": log.duration_minutes,
                "aqi": log.aqi,
                "exposure_score": float(log.exposure_score or 0)
            })
        
        # Calculate average AQI for each day
        for day in daily_summary.values():
            if day["total_duration_minutes"] > 0:
                day["avg_aqi"] = round(
                    day["total_exposure"] / (day["total_duration_minutes"] / 60),
                    1
                )
        
        history = list(daily_summary.values())
        
        # Calculate overall statistics
        total_exposure = sum(day["total_exposure"] for day in history)
        total_duration = sum(day["total_duration_minutes"] for day in history)
        avg_daily_exposure = total_exposure / len(history) if history else 0
        
        return {
            "user_id": user_id,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "statistics": {
                "total_exposure": round(total_exposure, 2),
                "total_duration_minutes": total_duration,
                "average_daily_exposure": round(avg_daily_exposure, 2),
                "days_logged": len(history)
            },
            "history": history
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid user_id format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


# Helper functions
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


def get_health_impact(aqi: int) -> str:
    """Get health impact description for AQI level."""
    if aqi <= 50:
        return "Minimal impact"
    elif aqi <= 100:
        return "Minor impact for sensitive individuals"
    elif aqi <= 150:
        return "Moderate impact for sensitive groups"
    elif aqi <= 200:
        return "Unhealthy - reduce prolonged exposure"
    elif aqi <= 300:
        return "Very unhealthy - minimize outdoor activity"
    else:
        return "Hazardous - avoid outdoor activity"


def get_health_recommendation(avg_aqi: float) -> str:
    """Get health recommendation based on average AQI."""
    if avg_aqi <= 50:
        return "Your air quality exposure is good. Continue normal outdoor activities."
    elif avg_aqi <= 100:
        return "Your exposure is acceptable. Sensitive individuals should monitor symptoms."
    elif avg_aqi <= 150:
        return "Consider reducing time in highly polluted areas. Sensitive groups should limit prolonged outdoor activities."
    elif avg_aqi <= 200:
        return "Your exposure is unhealthy. Reduce outdoor activities and consider wearing a mask."
    else:
        return "Your exposure is very high. Minimize outdoor time and use air purifiers indoors."
