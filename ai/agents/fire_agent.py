"""
Fire Agent - Satellite thermal anomaly & smoke plume dispersion specialist
"""
from typing import Dict, Any
from ai.prompts.system_prompts import FIRE_AGENT_PROMPT
from ai.tools.air_tools import get_fire_hotspots, get_weather


class FireAgent:
    """Agent specialized in NASA FIRMS fire tracking, wind trajectory alignment, and smoke impact."""
    
    def __init__(self):
        self.name = "Fire Agent"
        self.description = "Monitors wildfire & stubble burning hotspots and models smoke plume transport"
        self.system_prompt = FIRE_AGENT_PROMPT

    async def execute(self, lat: float, lon: float, radius_km: float = 100.0, user_query: str = "") -> Dict[str, Any]:
        """Fetch satellite fire data and wind vectors to estimate city impact."""
        fire_data = await get_fire_hotspots(lat, lon, radius_km=radius_km)
        weather_data = await get_weather(lat, lon)
        
        hotspots = fire_data.get("active_hotspots_count", 8)
        wind_dir = weather_data.get("wind_direction", "NW")
        wind_spd = weather_data.get("wind_speed_kmh", 12)
        contrib = fire_data.get("estimated_pollution_contribution", "HIGH")
        eta = fire_data.get("plume_arrival_eta_hours", 1.5)
        
        summary = (
            f"Detected {hotspots} active stubble/wildfire hotspots in the upwind corridor ({fire_data.get('nearest_fire_distance_km')} km away). "
            f"Current wind vector ({wind_dir} at {wind_spd} km/h) is transporting particulate plumes towards the metropolitan zone. "
            f"Smoke arrival ETA is approximately {eta} hours, with an estimated pollution contribution of {contrib}."
        )
        
        return {
            "agent": self.name,
            "status": "COMPLETED",
            "data": fire_data,
            "weather_vector": weather_data,
            "specialist_summary": summary
        }
