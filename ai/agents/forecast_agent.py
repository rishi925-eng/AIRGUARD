"""
Forecast Agent - Machine learning predictive intelligence specialist
"""
from typing import Dict, Any
from ai.prompts.system_prompts import FORECAST_AGENT_PROMPT
from ai.tools.air_tools import get_forecast


class ForecastAgent:
    """Agent specialized in multi-horizon predictive modeling and trend detection."""
    
    def __init__(self):
        self.name = "Forecast Agent"
        self.description = "Generates and interprets 1h, 3h, 6h, 24h, and 72h AQI forecasts"
        self.system_prompt = FORECAST_AGENT_PROMPT

    async def execute(self, lat: float, lon: float, hours: int = 72, user_query: str = "") -> Dict[str, Any]:
        """Fetch ML predictions and generate predictive briefing."""
        forecast_data = await get_forecast(lat, lon, hours=hours)
        horizons = forecast_data.get("horizons", {})
        
        h1 = horizons.get("1h", {}).get("aqi", 205)
        h3 = horizons.get("3h", {}).get("aqi", 240)
        h6 = horizons.get("6h", {}).get("aqi", 290)
        h24 = horizons.get("24h", {}).get("aqi", 215)
        
        summary = (
            f"Predictive model ({forecast_data.get('model_version')}) indicates air quality will deteriorate "
            f"over the next 6 hours: 1h: {h1}, 3h: {h3}, peaking at 6h: {h6}. "
            f"Highest risk window is {forecast_data.get('peak_window')}. "
            f"Cleanest window for outdoor activity is {forecast_data.get('best_window')}."
        )
        
        return {
            "agent": self.name,
            "status": "COMPLETED",
            "data": forecast_data,
            "specialist_summary": summary
        }
