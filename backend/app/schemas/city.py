"""
City & What-If Simulation Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Dict, Any, List, Optional


class SimulationRequest(BaseModel):
    baseline_aqi: float = 287.0
    traffic_reduction: float = 20.0
    industrial_reduction: float = 15.0
    construction_ban: bool = False
    odd_even_rule: bool = False
    mist_cannons: bool = True


class SimulationResponse(BaseModel):
    baseline_aqi: float
    projected_aqi: float
    estimated_improvement_pct: float
    absolute_reduction_points: float
    intervention_breakdown: Dict[str, Any]
    disclaimer: str
