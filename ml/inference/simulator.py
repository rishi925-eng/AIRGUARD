"""
AIRGUARD Scenario What-If Simulator
Simulates municipal policy interventions (traffic reduction, industrial controls, construction bans, odd-even rules)
and projects estimated atmospheric AQI changes.
"""
from typing import Dict, Any


class ScenarioSimulator:
    """Estimates the potential air quality impact of urban policy and emission interventions."""
    
    @staticmethod
    def simulate_scenario(
        baseline_aqi: float,
        traffic_reduction_pct: float = 0.0,
        industrial_reduction_pct: float = 0.0,
        construction_ban: bool = False,
        odd_even_rule: bool = False,
        dust_mist_cannons: bool = False
    ) -> Dict[str, Any]:
        """
        Calculates projected AQI based on source attribution sensitivity weights.
        Traffic weight: 0.25
        Industrial weight: 0.20
        Dust/Construction weight: 0.15
        Stubble/Regional background (uncontrollable locally): 0.40
        """
        # Calculate policy impacts
        traffic_pct = traffic_reduction_pct
        if odd_even_rule:
            traffic_pct = max(traffic_pct, 35.0)
            
        dust_pct = 0.0
        if construction_ban:
            dust_pct += 40.0
        if dust_mist_cannons:
            dust_pct += 25.0
        dust_pct = min(60.0, dust_pct)
        
        # Weighted reduction in controllable fractions
        traffic_reduction = (traffic_pct / 100.0) * 0.25
        industrial_reduction = (industrial_reduction_pct / 100.0) * 0.20
        dust_reduction = (dust_pct / 100.0) * 0.15
        
        total_reduction_ratio = traffic_reduction + industrial_reduction + dust_reduction
        
        projected_aqi = max(25.0, baseline_aqi * (1.0 - total_reduction_ratio))
        abs_diff = baseline_aqi - projected_aqi
        pct_improvement = (abs_diff / max(1.0, baseline_aqi)) * 100.0
        
        return {
            "baseline_aqi": round(baseline_aqi, 1),
            "projected_aqi": round(projected_aqi, 1),
            "estimated_improvement_pct": round(pct_improvement, 1),
            "absolute_reduction_points": round(abs_diff, 1),
            "intervention_breakdown": {
                "traffic_reduction_pct": traffic_pct,
                "industrial_reduction_pct": industrial_reduction_pct,
                "construction_ban_active": construction_ban,
                "odd_even_rule_active": odd_even_rule,
                "dust_suppression_active": dust_mist_cannons
            },
            "disclaimer": "Scenario estimate based on source apportionment sensitivity model; not a guaranteed real-world outcome due to dynamic regional atmospheric advection."
        }
