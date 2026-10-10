"""
IoT Device Telemetry Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class IoTReadingPayload(BaseModel):
    device_id: str
    pm25: float = Field(..., ge=0, le=1000)
    pm10: Optional[float] = Field(None, ge=0, le=2000)
    co2: Optional[float] = Field(None, ge=0, le=5000)
    temperature: Optional[float] = Field(None, ge=-40, le=80)
    humidity: Optional[float] = Field(None, ge=0, le=100)
    voc_index: Optional[float] = None
    timestamp: Optional[str] = None


class IoTReadingResponse(BaseModel):
    status: str
    device_id: str
    indoor_aqi: int
    category: str
    recommendation: str
    timestamp: str
