"""
AI Agent Tools Registry
"""
from .air_tools import (
    get_current_aqi,
    get_forecast,
    get_weather,
    get_fire_hotspots,
    get_pollution_sources,
    calculate_exposure,
    find_clean_route,
    get_school_status,
    get_city_risk,
    create_alert,
)

__all__ = [
    "get_current_aqi",
    "get_forecast",
    "get_weather",
    "get_fire_hotspots",
    "get_pollution_sources",
    "calculate_exposure",
    "find_clean_route",
    "get_school_status",
    "get_city_risk",
    "create_alert",
]
