"""IoT device database models."""
from sqlalchemy import Column, String, Integer, Boolean, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
import uuid
from datetime import datetime

from app.database import Base


class IoTDevice(Base):
    """IoT device model."""
    
    __tablename__ = "iot_devices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), index=True)
    device_id = Column(String(255), unique=True, nullable=False)
    name = Column(String(255))
    location = Column(Geography(geometry_type='POINT', srid=4326))
    device_type = Column(String(50))
    firmware_version = Column(String(50))
    last_seen = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<IoTDevice(id={self.device_id}, name={self.name})>"


class IoTReading(Base):
    """IoT sensor reading model."""
    
    __tablename__ = "iot_readings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True), ForeignKey('iot_devices.id', ondelete='CASCADE'), index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    pm25 = Column(Numeric(10, 2))
    pm10 = Column(Numeric(10, 2))
    temperature = Column(Numeric(5, 2))
    humidity = Column(Numeric(5, 2))
    co2 = Column(Integer)
    tvoc = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<IoTReading(device={self.device_id}, timestamp={self.timestamp})>"
