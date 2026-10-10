"""
Air Quality Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class Coordinate(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class PollutantMeasurement(BaseModel):
    parameter: str
    value: float
    unit: str = "µg/m³"


class CurrentAirQualityResponse(BaseModel):
    location: Dict[str, Any]
    aqi: int
    category: str
    dominant_pollutant: str
    measurements: List[PollutantMeasurement]
    timestamp: str
    station: Optional[str] = None
