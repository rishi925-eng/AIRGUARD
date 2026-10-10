"""
Forecast Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Dict, Any, List, Optional


class HorizonForecast(BaseModel):
    aqi: int
    category: str
    confidence: float
    range: List[int]
    horizon_hours: int


class ForecastResponse(BaseModel):
    location: Dict[str, Any]
    current_aqi: int
    model_version: str
    horizons: Dict[str, HorizonForecast]
    peak_window: Optional[str] = None
    best_window: Optional[str] = None
    generated_at: Optional[str] = None
