"""Air quality reading database model."""
from sqlalchemy import Column, String, Integer, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
import uuid
from datetime import datetime

from app.database import Base


class AirQualityReading(Base):
    """Air quality reading model."""
    
    __tablename__ = "air_quality_readings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    station_id = Column(String(255), index=True)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    aqi = Column(Integer)
    pm25 = Column(Numeric(10, 2))
    pm10 = Column(Numeric(10, 2))
    o3 = Column(Numeric(10, 2))
    no2 = Column(Numeric(10, 2))
    so2 = Column(Numeric(10, 2))
    co = Column(Numeric(10, 2))
    source = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<AirQualityReading(station={self.station_id}, aqi={self.aqi})>"
