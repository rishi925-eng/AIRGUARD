"""Activity recommendation model."""
from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.database import Base


class ActivityRecommendation(Base):
    """Activity recommendation model."""
    
    __tablename__ = "activity_recommendations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    activity_type = Column(String(100))
    aqi_threshold = Column(Integer)
    recommendations = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<ActivityRecommendation(type={self.activity_type})>"
