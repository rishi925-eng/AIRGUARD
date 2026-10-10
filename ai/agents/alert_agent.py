"""
Alert Agent - Predictive alerts & sudden anomaly spike specialist
"""
from typing import Dict, Any
from ai.prompts.system_prompts import ALERT_AGENT_PROMPT
from ai.tools.air_tools import create_alert


class AlertAgent:
    """Agent specialized in detecting sudden AQI anomalies and generating 90-minute advance warnings."""
    
    def __init__(self):
        self.name = "Alert Agent"
        self.description = "Identifies sudden pollution spikes and triggers proactive early warning notifications"
        self.system_prompt = ALERT_AGENT_PROMPT

    async def execute(self, current_aqi: int, predicted_aqi: int, location_name: str = "Gorakhpur", user_query: str = "") -> Dict[str, Any]:
        """Evaluate threshold shifts and generate early warnings."""
        is_spike = predicted_aqi - current_aqi > 40 or current_aqi > 200
        severity = "CRITICAL" if predicted_aqi > 250 else ("WARNING" if is_spike else "INFO")
        
        msg = (
            f"⚠️ Proactive Alert: Air quality in {location_name} is predicted to escalate from {current_aqi} "
            f"to {predicted_aqi} within the next 90 minutes. Sensitive groups, schools, and outdoor athletes should take immediate precautions."
        )
        
        alert_result = await create_alert(
            alert_type="PREDICTIVE_SPIKE_WARNING",
            severity=severity,
            message=msg,
            target_area=location_name
        )
        
        return {
            "agent": self.name,
            "status": "COMPLETED",
            "is_spike_detected": is_spike,
            "severity": severity,
            "data": alert_result,
            "specialist_summary": msg
        }
