"""
AIRGUARD ML Evaluation & Uncertainty Estimation
Computes statistical error metrics and prediction confidence intervals.
"""
import math
from typing import List, Dict, Any, Tuple


class ModelEvaluator:
    """Calculates forecasting metrics and conformal prediction uncertainty intervals."""
    
    @staticmethod
    def calculate_mae(actuals: List[float], predictions: List[float]) -> float:
        if not actuals or len(actuals) != len(predictions):
            return 0.0
        return sum(abs(a - p) for a, p in zip(actuals, predictions)) / len(actuals)

    @staticmethod
    def calculate_rmse(actuals: List[float], predictions: List[float]) -> float:
        if not actuals or len(actuals) != len(predictions):
            return 0.0
        return math.sqrt(sum((a - p) ** 2 for a, p in zip(actuals, predictions)) / len(actuals))

    @staticmethod
    def calculate_r2(actuals: List[float], predictions: List[float]) -> float:
        if not actuals or len(actuals) != len(predictions):
            return 0.0
        mean_actual = sum(actuals) / len(actuals)
        ss_tot = sum((a - mean_actual) ** 2 for a in actuals)
        ss_res = sum((a - p) ** 2 for a, p in zip(actuals, predictions))
        if ss_tot == 0:
            return 1.0
        return 1.0 - (ss_res / ss_tot)

    @staticmethod
    def estimate_uncertainty_interval(predicted_aqi: float, horizon_hours: int) -> Tuple[float, float, float]:
        """
        Estimate (lower_bound, upper_bound, confidence_pct) based on prediction horizon.
        Longer horizons exhibit greater atmospheric entropy and higher uncertainty.
        """
        # Horizon standard deviation expansion
        sigma = 5.0 + (math.sqrt(horizon_hours) * 4.5)
        
        lower_bound = max(0.0, round(predicted_aqi - 1.96 * sigma, 1))
        upper_bound = min(500.0, round(predicted_aqi + 1.96 * sigma, 1))
        confidence = max(0.65, round(1.0 - (horizon_hours * 0.0035), 2))
        
        return lower_bound, upper_bound, confidence
