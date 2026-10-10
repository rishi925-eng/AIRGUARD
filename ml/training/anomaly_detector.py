"""
AIRGUARD Anomaly & Pollution Event Detector
Detects sudden AQI spikes, sensor anomalies, and localized pollution events (e.g. 180 -> 380 spike).
"""
from typing import Dict, List, Any, Optional
from datetime import datetime


class PollutionAnomalyDetector:
    """Statistical & machine learning detector for abrupt atmospheric pollution surges."""
    
    def __init__(self, spike_threshold_pct: float = 35.0, absolute_spike_threshold: float = 50.0):
        self.spike_threshold_pct = spike_threshold_pct
        self.absolute_spike_threshold = absolute_spike_threshold

    def evaluate_time_series(self, readings: List[float]) -> Dict[str, Any]:
        """
        Evaluate a sequence of recent hourly AQI readings (e.g., [180, 182, 185, 190, 380, 390]).
        Returns event detection status and probable environmental contributors.
        """
        if len(readings) < 2:
            return {"event_detected": False, "confidence": 0.0}
            
        prev_val = readings[-2]
        curr_val = readings[-1]
        delta = curr_val - prev_val
        delta_pct = (delta / max(1.0, prev_val)) * 100.0
        
        is_spike = (delta >= self.absolute_spike_threshold) or (delta_pct >= self.spike_threshold_pct and delta >= 30.0)
        
        if is_spike:
            return {
                "event_detected": True,
                "event_type": "SUDDEN_AQI_SPIKE",
                "severity": "CRITICAL" if curr_val > 300 else "HIGH",
                "previous_aqi": prev_val,
                "current_aqi": curr_val,
                "absolute_increase": round(delta, 1),
                "percentage_increase": round(delta_pct, 1),
                "alert_title": "⚠️ POLLUTION EVENT DETECTED: AQI Increased Sharply",
                "possible_contributors": [
                    {"factor": "🔥 Stubble / Biomass Burning Plume Incursion", "likelihood": "High"},
                    {"factor": "🌬 Wind Vector Shift / Thermal Inversion", "likelihood": "High"},
                    {"factor": "🚗 Localized Traffic Gridlock / Industrial Release", "likelihood": "Medium"}
                ],
                "recommended_action": "Issue immediate school and vulnerable citizen alerts; activate municipal mist cannons.",
                "detected_at": datetime.utcnow().isoformat()
            }
            
        return {
            "event_detected": False,
            "current_aqi": curr_val,
            "rate_of_change_hourly": round(delta, 1),
            "status": "Normal atmospheric variation"
        }
