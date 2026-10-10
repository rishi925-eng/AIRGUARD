"""Forecast database model."""
from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
import uuid
from datetime import datetime

from app.database import Base


class Forecast(Base):
    """AQI forecast model."""
    
    __tablename__ = "forecasts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    forecast_date = Column(Date, nullable=False, index=True)
    aqi_predicted = Column(Integer)
    pm25_predicted = Column(Numeric(10, 2))
    confidence = Column(Numeric(5, 2))
    model_version = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Forecast(date={self.forecast_date}, aqi={self.aqi_predicted})>"
