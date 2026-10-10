"""
Exposure Agent - Personal & family cumulative intake specialist
"""
from typing import Dict, Any, List, Optional
from ai.prompts.system_prompts import EXPOSURE_AGENT_PROMPT
from ai.tools.air_tools import calculate_exposure


class ExposureAgent:
    """Agent specialized in calculating particulate inhalation dose across daily journeys."""
    
    def __init__(self):
        self.name = "Exposure Agent"
        self.description = "Computes daily journey particulate intake and lifestyle exposure scores"
        self.system_prompt = EXPOSURE_AGENT_PROMPT

    async def execute(self, journey_steps: Optional[List[Dict[str, Any]]] = None, user_profile: str = "general", user_query: str = "") -> Dict[str, Any]:
        """Compute user journey exposure and risk profile."""
        exposure_data = await calculate_exposure(journey_steps, user_profile=user_profile)
        score = exposure_data.get("estimated_exposure_score", 68)
        risk = exposure_data.get("risk_level", "Elevated Exposure")
        
        summary = (
            f"Estimated Daily Exposure Score is {score}/100 ({risk}). "
            f"{exposure_data.get('actionable_insight')} "
            f"(Note: {exposure_data.get('disclaimer')})"
        )
        
        return {
            "agent": self.name,
            "status": "COMPLETED",
            "data": exposure_data,
            "specialist_summary": summary
        }
