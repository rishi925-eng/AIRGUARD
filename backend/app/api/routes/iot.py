"""
IoT device management and data ingestion endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models.device import IoTDevice, IoTReading
from app.services.aws import AWSService

router = APIRouter()


class DeviceRegistration(BaseModel):
    """Device registration model."""
    device_id: str
    name: str
    user_id: str
    latitude: float = None
    longitude: float = None
    device_type: str = "air_quality_sensor"


class SensorReading(BaseModel):
    """Sensor reading model."""
    device_id: str
    timestamp: str = None
    pm25: float = None
    pm10: float = None
    temperature: float = None
    humidity: float = None
    co2: int = None
    tvoc: int = None


@router.post("/register")
async def register_device(
    device: DeviceRegistration,
    db: Session = Depends(get_db)
):
    """
    Register a new IoT device.
    
    Creates device record and optionally registers with AWS IoT Core.
    """
    try:
        # Check if device already exists
        existing = db.query(IoTDevice).filter(IoTDevice.device_id == device.device_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Device already registered")
        
        # Create device record
        location = None
        if device.latitude and device.longitude:
            location = func.ST_SetSRID(
                func.ST_MakePoint(device.longitude, device.latitude),
                4326
            )
        
        iot_device = IoTDevice(
            user_id=uuid.UUID(device.user_id),
            device_id=device.device_id,
            name=device.name,
            location=location,
            device_type=device.device_type,
            is_active=True
        )
        
        db.add(iot_device)
        db.commit()
        db.refresh(iot_device)
        
        # Optionally publish to AWS IoT
        aws_service = AWSService()
        await aws_service.publish_iot_message(
            f"airguard/devices/{device.device_id}/registered",
            {"device_id": device.device_id, "name": device.name, "timestamp": datetime.utcnow().isoformat()}
        )
        
        return {
            "success": True,
            "device_id": str(iot_device.id),
            "name": device.name,
            "message": "Device registered successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to register device: {str(e)}")


@router.post("/readings")
async def submit_sensor_reading(
    reading: SensorReading,
    db: Session = Depends(get_db)
):
    """
    Submit IoT sensor reading.
    
    Stores sensor data from IoT devices.
    """
    try:
        # Find device
        device = db.query(IoTDevice).filter(IoTDevice.device_id == reading.device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Parse timestamp
        if reading.timestamp:
            timestamp = datetime.fromisoformat(reading.timestamp.replace('Z', '+00:00'))
        else:
            timestamp = datetime.utcnow()
        
        # Create reading record
        iot_reading = IoTReading(
            device_id=device.id,
            timestamp=timestamp,
            pm25=reading.pm25,
            pm10=reading.pm10,
            temperature=reading.temperature,
            humidity=reading.humidity,
            co2=reading.co2,
            tvoc=reading.tvoc
        )
        
        db.add(iot_reading)
        device.last_seen = timestamp
        db.commit()
        
        return {
            "success": True,
            "message": "Reading received",
            "device_id": reading.device_id,
            "timestamp": timestamp.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to store reading: {str(e)}")


@router.get("/devices")
async def list_user_devices(
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """
    List user's IoT devices.
    
    Returns all devices registered to the user.
    """
    try:
        devices = db.query(IoTDevice).filter(
            IoTDevice.user_id == uuid.UUID(user_id)
        ).all()
        
        return {
            "user_id": user_id,
            "count": len(devices),
            "devices": [
                {
                    "id": str(device.id),
                    "device_id": device.device_id,
                    "name": device.name,
                    "device_type": device.device_type,
                    "is_active": device.is_active,
                    "last_seen": device.last_seen.isoformat() if device.last_seen else None,
                    "created_at": device.created_at.isoformat()
                }
                for device in devices
            ]
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list devices: {str(e)}")


@router.get("/readings/{device_id}")
async def get_device_readings(
    device_id: str,
    hours: int = Query(24, ge=1, le=168, description="Number of hours of data"),
    db: Session = Depends(get_db)
):
    """
    Get device reading history.
    
    Returns time series of sensor readings for the device.
    """
    try:
        # Find device
        device = db.query(IoTDevice).filter(IoTDevice.device_id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Get readings from last N hours
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        readings = db.query(IoTReading).filter(
            IoTReading.device_id == device.id,
            IoTReading.timestamp >= start_time
        ).order_by(IoTReading.timestamp.desc()).all()
        
        return {
            "device_id": device_id,
            "device_name": device.name,
            "period_hours": hours,
            "count": len(readings),
            "readings": [
                {
                    "timestamp": r.timestamp.isoformat(),
                    "pm25": float(r.pm25) if r.pm25 else None,
                    "pm10": float(r.pm10) if r.pm10 else None,
                    "temperature": float(r.temperature) if r.temperature else None,
                    "humidity": float(r.humidity) if r.humidity else None,
                    "co2": r.co2,
                    "tvoc": r.tvoc
                }
                for r in readings
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get readings: {str(e)}")
