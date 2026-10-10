"""
AIRGUARD Feature Engineering Pipeline
Constructs meteorological dispersion features, lag dynamics, cyclical time encodings, and satellite fire transport indices.
"""
from typing import Dict, List, Any
import math
from datetime import datetime


class FeatureEngineer:
    """Transforms raw sensor and weather points into ML-ready tabular features."""
    
    @staticmethod
    def extract_time_features(dt: datetime) -> Dict[str, float]:
        """Extract cyclical trigonometric representations of hour-of-day and day-of-week."""
        hour = dt.hour + dt.minute / 60.0
        day = dt.weekday()
        month = dt.month
        
        return {
            "hour_sin": math.sin(2 * math.pi * hour / 24.0),
            "hour_cos": math.cos(2 * math.pi * hour / 24.0),
            "day_sin": math.sin(2 * math.pi * day / 7.0),
            "day_cos": math.cos(2 * math.pi * day / 7.0),
            "month_sin": math.sin(2 * math.pi * month / 12.0),
            "month_cos": math.cos(2 * math.pi * month / 12.0),
            "is_weekend": 1.0 if day in [5, 6] else 0.0,
            "is_rush_hour": 1.0 if (7 <= dt.hour <= 10 or 17 <= dt.hour <= 20) else 0.0
        }

    @staticmethod
    def compute_fire_transport_index(
        fire_distance_km: float,
        fire_count: int,
        wind_speed_kmh: float,
        wind_direction_deg: float,
        fire_bearing_deg: float
    ) -> float:
        """
        Calculate fire plume transport impact towards the monitoring location.
        Considers downwind alignment angle, distance attenuation, and wind advection velocity.
        """
        if fire_distance_km <= 0 or fire_count <= 0:
            return 0.0
            
        # Angular difference between wind blowing vector and bearing to city
        # (Wind blowing vector is wind_direction + 180 mod 360)
        plume_vector = (wind_direction_deg + 180) % 360
        angle_diff = abs(plume_vector - fire_bearing_deg)
        angle_diff = min(angle_diff, 360 - angle_diff)
        
        # Alignment factor (1.0 when perfectly pointing at city, 0.0 when perpendicular or away)
        alignment_factor = max(0.0, math.cos(math.radians(angle_diff)))
        
        # Distance decay (inverse square law with min clamp)
        distance_decay = 1.0 / (1.0 + (fire_distance_km / 25.0) ** 1.5)
        
        # Advection speed factor (stronger wind carries plume faster with less dilution over short distance)
        speed_factor = min(2.5, wind_speed_kmh / 10.0)
        
        raw_index = fire_count * alignment_factor * distance_decay * speed_factor * 10.0
        return round(raw_index, 3)

    @classmethod
    def build_feature_vector(
        cls,
        current_aqi: float,
        lag_1h: float,
        lag_3h: float,
        lag_6h: float,
        lag_24h: float,
        temperature: float,
        humidity: float,
        wind_speed: float,
        wind_direction_deg: float,
        fire_count: int = 8,
        fire_distance_km: float = 34.2,
        fire_bearing_deg: float = 135.0,
        dt: datetime = None
    ) -> Dict[str, float]:
        """Generate complete dictionary of input features for XGBoost prediction."""
        dt = dt or datetime.utcnow()
        time_feats = cls.extract_time_features(dt)
        fire_idx = cls.compute_fire_transport_index(
            fire_distance_km, fire_count, wind_speed, wind_direction_deg, fire_bearing_deg
        )
        
        # Atmospheric Stagnation Index (High humidity + Low wind = High trap risk)
        stagnation_index = (humidity / 100.0) * (1.0 / (max(1.0, wind_speed) / 5.0))
        
        features = {
            "current_aqi": current_aqi,
            "lag_1h": lag_1h,
            "lag_3h": lag_3h,
            "lag_6h": lag_6h,
            "lag_24h": lag_24h,
            "temperature": temperature,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "wind_direction_deg": wind_direction_deg,
            "stagnation_index": round(stagnation_index, 3),
            "fire_transport_index": fire_idx,
            "fire_count": float(fire_count),
            **time_feats
        }
        return features
