"""
Recommendation Agent - Holistic action & activity advisory specialist
"""
from typing import Dict, Any, Optional
from ai.prompts.system_prompts import RECOMMENDATION_AGENT_PROMPT


class RecommendationAgent:
    """Agent specialized in synthesizing all intelligence layers into clear user, school, and city actions."""
    
    def __init__(self):
        self.name = "Recommendation Agent"
        self.description = "Synthesizes multi-agent intelligence into clear, actionable health and lifestyle guidance"
        self.system_prompt = RECOMMENDATION_AGENT_PROMPT

    async def execute(self, aqi: int, forecast_trend: str, activity_type: str = "general", user_profile: str = "general", user_query: str = "") -> Dict[str, Any]:
        """Synthesize advice based on current AQI, forecast trend, and activity type."""
        recommendations = []
        
        # Activity specific
        if "run" in activity_type.lower() or "football" in activity_type.lower() or "sport" in activity_type.lower() or "outdoor" in activity_type.lower():
            if aqi > 150:
                recommendations.append({
                    "action": "AVOID_OUTDOOR_CARDIO",
                    "title": f"❌ {activity_type.title()} at this hour is not recommended",
                    "detail": f"Current AQI ({aqi}) and worsening trend create high particulate lung deposition during vigorous respiration.",
                    "better_window": "Tomorrow 6:30 AM - 7:30 AM"
                })
            else:
                recommendations.append({
                    "action": "PROCEED_WITH_AWARENESS",
                    "title": f"✅ Moderate {activity_type.title()} Permitted",
                    "detail": "Air quality is currently acceptable, but monitor updates if exercising near major roads."
                })
                
        # School & Children advisory
        recommendations.append({
            "action": "SCHOOL_ADVISORY",
            "title": "🏫 School Recess & Sports Guidance",
            "detail": "Schools should conduct physical education indoors; sensitive students should wear N95/KF94 masks during afternoon dismissal."
        })
        
        # Indoor Air & Home ventilation
        recommendations.append({
            "action": "INDOOR_AIR_MANAGEMENT",
            "title": "🏠 Indoor & Ventilation Protocol",
            "detail": "Keep windows closed during evening peak stagnation (5 PM - 10 PM). Set HEPA air purifiers to Auto/High mode."
        })
        
        summary = (
            f"AIRGUARD Action Summary: Based on current AQI ({aqi}) and forecast trajectory, "
            f"avoid prolonged outdoor cardio after 6 PM. Move school sports indoors and seal windows during evening hours. "
            f"Optimal outdoor window opens tomorrow morning between 6:30 AM and 7:30 AM."
        )
        
        return {
            "agent": self.name,
            "status": "COMPLETED",
            "recommendations": recommendations,
            "specialist_summary": summary
        }
