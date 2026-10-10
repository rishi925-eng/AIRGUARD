"""
AIRGUARD ML Preprocessing Pipeline
Handles data cleaning, normalization, deduplication, missing-value imputation, and geo/timestamp validation.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import math


class DataCleaner:
    """Preprocesses raw sensory, meteorological, and satellite feeds for the ML pipeline."""
    
    @staticmethod
    def validate_geo(lat: float, lon: float) -> bool:
        """Verify latitude and longitude fall within valid geospatial boundaries."""
        return -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0

    @staticmethod
    def clean_sensor_reading(raw_reading: Dict[str, Any]) -> Dict[str, Any]:
        """Clean single air quality reading, clamping negative or abnormal sensor spikes."""
        cleaned = dict(raw_reading)
        
        # Validate timestamp
        ts = cleaned.get("timestamp")
        if not ts:
            cleaned["timestamp"] = datetime.now(timezone.utc).isoformat()
            
        # Clean pollutants (clamp realistic atmospheric ranges)
        pollutant_limits = {
            "pm25": (0.0, 1000.0),
            "pm10": (0.0, 2000.0),
            "no2": (0.0, 500.0),
            "so2": (0.0, 500.0),
            "co": (0.0, 100.0),
            "o3": (0.0, 500.0),
            "aqi": (0, 500)
        }
        
        for param, (min_v, max_v) in pollutant_limits.items():
            if param in cleaned and cleaned[param] is not None:
                try:
                    val = float(cleaned[param])
                    cleaned[param] = max(min_v, min(max_v, val))
                except (ValueError, TypeError):
                    cleaned[param] = None

        return cleaned

    @staticmethod
    def interpolate_missing(timeseries: List[Dict[str, Any]], field: str = "aqi") -> List[Dict[str, Any]]:
        """Linear interpolation for missing values in chronological air quality sequence."""
        if not timeseries:
            return []
            
        n = len(timeseries)
        res = [dict(r) for r in timeseries]
        
        for i in range(n):
            if res[i].get(field) is None:
                # Find left valid
                left = i - 1
                while left >= 0 and res[left].get(field) is None:
                    left -= 1
                # Find right valid
                right = i + 1
                while right < n and res[right].get(field) is None:
                    right += 1
                    
                if left >= 0 and right < n:
                    val_left = res[left][field]
                    val_right = res[right][field]
                    res[i][field] = val_left + (val_right - val_left) * ((i - left) / (right - left))
                elif left >= 0:
                    res[i][field] = res[left][field]
                elif right < n:
                    res[i][field] = res[right][field]
                else:
                    res[i][field] = 50.0  # default baseline
                    
        return res
