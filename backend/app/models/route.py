"""Route calculation model (if needed for caching)."""
from sqlalchemy import Column, String, Integer, Numeric, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.database import Base


class Route(Base):
    """Cached route model."""
    
    __tablename__ = "routes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    start_location = Column(JSON)
    end_location = Column(JSON)
    mode = Column(String(50))
    distance = Column(Integer)
    duration = Column(Integer)
    average_aqi = Column(Integer)
    geometry = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Route(mode={self.mode}, distance={self.distance}m)>"
