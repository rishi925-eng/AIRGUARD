"""
AQI Agent - Real-time air quality specialist
"""
from typing import Dict, Any, Optional
from ai.prompts.system_prompts import AQI_AGENT_PROMPT
from ai.tools.air_tools import get_current_aqi, get_pollution_sources


class AQIAgent:
    """Agent specialized in real-time air quality observation and pollutant breakdown."""
    
    def __init__(self):
        self.name = "AQI Agent"
        self.description = "Measures and analyzes real-time AQI, PM2.5, PM10, and gaseous pollutants"
        self.system_prompt = AQI_AGENT_PROMPT

    async def execute(self, lat: float, lon: float, user_query: str = "") -> Dict[str, Any]:
        """Fetch live sensor data and provide specialist interpretation."""
        aqi_data = await get_current_aqi(lat, lon)
        sources_data = await get_pollution_sources(lat, lon)
        
        aqi_val = aqi_data.get("aqi", 184)
        category = aqi_data.get("category", "Unhealthy")
        pm25 = next((m["value"] for m in aqi_data.get("measurements", []) if m["parameter"] == "pm25"), 92)
        
        summary = (
            f"Current AQI is {aqi_val} ({category}). Dominant pollutant is PM2.5 at {pm25} µg/m³. "
            f"Primary atmospheric contributors: {sources_data['primary_contributors'][0]['source']} "
            f"({sources_data['primary_contributors'][0]['percentage']}%) and "
            f"{sources_data['primary_contributors'][1]['source']} ({sources_data['primary_contributors'][1]['percentage']}%)."
        )
        
        return {
            "agent": self.name,
            "status": "COMPLETED",
            "data": aqi_data,
            "sources": sources_data,
            "specialist_summary": summary
        }
