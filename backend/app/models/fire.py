"""Fire detection database model."""
from sqlalchemy import Column, String, Integer, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
import uuid
from datetime import datetime

from app.database import Base


class FireDetection(Base):
    """Fire detection model."""
    
    __tablename__ = "fire_detections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    brightness = Column(Numeric(10, 2))
    confidence = Column(Integer)
    acquisition_date = Column(DateTime, nullable=False, index=True)
    instrument = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<FireDetection(confidence={self.confidence}, date={self.acquisition_date})>"
