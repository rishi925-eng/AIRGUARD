"""
Alert system endpoints for air quality notifications.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
from datetime import datetime
import uuid

from app.database import get_db
from app.models.alert import AlertSubscription as AlertSubscriptionModel
from app.services.openaq import OpenAQService
from app.services.aws import AWSService

router = APIRouter()


class LocationInput(BaseModel):
    """Location input model."""
    latitude: float
    longitude: float


class AlertSubscriptionInput(BaseModel):
    """Alert subscription input model."""
    user_id: str
    location: LocationInput
    threshold: int
    notification_method: str = "email"  # email, sms, push


@router.post("/subscribe")
async def subscribe_to_alerts(
    subscription: AlertSubscriptionInput,
    db: Session = Depends(get_db)
):
    """
    Subscribe to air quality alerts for a location.
    
    Creates alert subscription that triggers when AQI exceeds threshold.
    """
    try:
        alert_sub = AlertSubscriptionModel(
            user_id=uuid.UUID(subscription.user_id),
            location=func.ST_SetSRID(
                func.ST_MakePoint(
                    subscription.location.longitude,
                    subscription.location.latitude
                ),
                4326
            ),
            threshold=subscription.threshold,
            notification_method=subscription.notification_method,
            is_active=True
        )
        
        db.add(alert_sub)
        db.commit()
        db.refresh(alert_sub)
        
        # Send a welcome email/notification immediately
        try:
            aws_service = AWSService()
            await aws_service.send_sns_notification(
                message=f"Welcome to AIRGUARD Alerts! You are now subscribed to receive notifications when AQI exceeds {subscription.threshold} at your selected location.",
                subject="AIRGUARD Alert Subscription Confirmed"
            )
        except Exception as e:
            print(f"Failed to send welcome email: {e}")
        
        return {
            "success": True,
            "subscription_id": str(alert_sub.id),
            "message": f"Subscribed to alerts when AQI exceeds {subscription.threshold}",
            "location": {
                "latitude": subscription.location.latitude,
                "longitude": subscription.location.longitude
            },
            "threshold": subscription.threshold,
            "notification_method": subscription.notification_method
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create subscription: {str(e)}")


@router.get("/subscriptions")
async def get_user_subscriptions(
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Get all alert subscriptions for a user.
    
    Returns active and inactive subscriptions.
    """
    try:
        subscriptions = db.query(AlertSubscriptionModel).filter(
            AlertSubscriptionModel.user_id == uuid.UUID(user_id)
        ).all()
        
        return {
            "user_id": user_id,
            "count": len(subscriptions),
            "subscriptions": [
                {
                    "id": str(sub.id),
                    "threshold": sub.threshold,
                    "notification_method": sub.notification_method,
                    "is_active": sub.is_active,
                    "created_at": sub.created_at.isoformat()
                }
                for sub in subscriptions
            ]
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscriptions: {str(e)}")


@router.delete("/subscriptions/{subscription_id}")
async def delete_subscription(
    subscription_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete an alert subscription.
    
    Removes subscription by ID.
    """
    try:
        subscription = db.query(AlertSubscriptionModel).filter(
            AlertSubscriptionModel.id == uuid.UUID(subscription_id)
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        db.delete(subscription)
        db.commit()
        
        return {
            "success": True,
            "message": "Subscription deleted successfully",
            "subscription_id": subscription_id
        }
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subscription_id format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete subscription: {str(e)}")


@router.get("/active")
async def get_active_alerts(
    user_id: str = Query(None, description="Optional user ID to check their subscriptions"),
    lat: float = Query(None, description="Latitude"),
    lon: float = Query(None, description="Longitude"),
    radius: int = Query(50000, description="Search radius in meters"),
    db: Session = Depends(get_db)
):
    """
    Get active air quality alerts.
    
    Checks current AQI against user subscriptions or general location.
    """
    try:
        alerts = []
        
        if user_id:
            # Check user's subscriptions
            subscriptions = db.query(AlertSubscriptionModel).filter(
                AlertSubscriptionModel.user_id == uuid.UUID(user_id),
                AlertSubscriptionModel.is_active == True
            ).all()
            
            aqi_service = OpenAQService()
            
            for sub in subscriptions:
                # Get location from geography column (simplified - in production parse properly)
                # For now, use provided lat/lon or skip
                if lat is not None and lon is not None:
                    aqi_data = await aqi_service.get_latest_measurements(lat, lon, radius=10000)
                    measurements = aqi_data.get("measurements", [])
                    
                    current_aqi = 50
                    for m in measurements:
                        if m.get("parameter") == "pm25":
                            current_aqi = calculate_pm25_aqi(m.get("value", 0))
                            break
                    
                    if current_aqi >= sub.threshold:
                        alerts.append({
                            "subscription_id": str(sub.id),
                            "threshold": sub.threshold,
                            "current_aqi": current_aqi,
                            "severity": get_alert_severity(current_aqi),
                            "message": f"Air quality alert: AQI is {current_aqi}, exceeding your threshold of {sub.threshold}",
                            "timestamp": datetime.utcnow().isoformat()
                        })
        
        elif lat is not None and lon is not None:
            # General location check
            aqi_service = OpenAQService()
            aqi_data = await aqi_service.get_latest_measurements(lat, lon, radius)
            measurements = aqi_data.get("measurements", [])
            
            current_aqi = 50
            for m in measurements:
                if m.get("parameter") == "pm25":
                    current_aqi = calculate_pm25_aqi(m.get("value", 0))
                    break
            
            if current_aqi > 100:  # Alert if unhealthy
                alerts.append({
                    "location": {"lat": lat, "lon": lon},
                    "current_aqi": current_aqi,
                    "severity": get_alert_severity(current_aqi),
                    "message": f"Air quality is {get_aqi_category(current_aqi)}",
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        return {
            "count": len(alerts),
            "alerts": alerts,
            "timestamp": datetime.utcnow().isoformat()
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check alerts: {str(e)}")


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


def get_alert_severity(aqi: int) -> str:
    """Get alert severity level."""
    if aqi <= 100:
        return "info"
    elif aqi <= 150:
        return "warning"
    elif aqi <= 200:
        return "high"
    else:
        return "critical"


def get_aqi_category(aqi: int) -> str:
    """Get AQI category name."""
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"
