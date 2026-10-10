"""Alert subscription database model."""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
import uuid
from datetime import datetime

from app.database import Base


class AlertSubscription(Base):
    """Alert subscription model."""
    
    __tablename__ = "alert_subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), index=True)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    threshold = Column(Integer, nullable=False)
    notification_method = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<AlertSubscription(user={self.user_id}, threshold={self.threshold})>"
