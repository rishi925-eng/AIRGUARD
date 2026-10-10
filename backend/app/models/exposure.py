"""Exposure tracking database model."""
from sqlalchemy import Column, String, Integer, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
import uuid
from datetime import datetime

from app.database import Base


class ExposureLog(Base):
    """Exposure log model."""
    
    __tablename__ = "exposure_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), index=True)
    date = Column(Date, nullable=False, index=True)
    location = Column(Geography(geometry_type='POINT', srid=4326))
    duration_minutes = Column(Integer, nullable=False)
    activity_type = Column(String(100))
    aqi = Column(Integer)
    exposure_score = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<ExposureLog(user={self.user_id}, date={self.date}, score={self.exposure_score})>"
