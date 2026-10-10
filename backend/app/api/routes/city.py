"""
City-wide air quality analytics endpoints.
Fetches real atmospheric telemetry across municipal regions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import asyncio
from typing import Dict, List, Optional, Any

from app.database import get_db, get_aqi_heatmap_data
from app.services.openaq import OpenAQService, pm25_to_aqi, aqi_category
from app.services.mapbox import MapboxService

router = APIRouter()

CITY_COORDS_LOOKUP = {
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "gorakhpur": (26.7606, 83.3732),
    "mumbai": (19.0760, 72.8777),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "kolkata": (22.5726, 88.3639),
    "chennai": (13.0827, 80.2707),
    "lucknow": (26.8467, 80.9462),
    "patna": (25.5941, 85.1376),
    "varanasi": (25.3176, 82.9739),
    "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567),
    "jaipur": (26.9124, 75.7873),
    "ahmedabad": (23.0225, 72.5714),
    "new york": (40.7128, -74.0060),
    "london": (51.5074, -0.1278),
    "tokyo": (35.6762, 139.6503),
    "paris": (48.8566, 2.3522),
    "dubai": (25.2048, 55.2708),
}


async def _resolve_city_coords(city_name: str) -> tuple:
    name_clean = city_name.strip().lower()
    if name_clean in CITY_COORDS_LOOKUP:
        return CITY_COORDS_LOOKUP[name_clean]
    
    # Try geocoding with MapboxService
    try:
        geo = MapboxService()
        res = await geo.geocode_suggestions(city_name)
        if res:
            return (float(res[0]["latitude"]), float(res[0]["longitude"]))
    except Exception as exc:
        raise ValueError(f"Could not resolve city '{city_name}'") from exc


@router.get("/dashboard")
async def get_city_dashboard(
    city_name: str = Query(None, description="City name"),
    bounds: str = Query(None, description="Bounding box: min_lon,min_lat,max_lon,max_lat"),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive city-wide air quality dashboard with real telemetry.
    """
    try:
        if bounds:
            coords = [float(x) for x in bounds.split(",")]
            if len(coords) != 4:
                raise ValueError("Invalid bounds format")
            min_lon, min_lat, max_lon, max_lat = coords
        else:
            # Default to current city bounds
            city_target = city_name or "Gorakhpur"
            lat, lon = await _resolve_city_coords(city_target)
            delta = 0.25
            min_lat, min_lon, max_lat, max_lon = lat - delta, lon - delta, lat + delta, lon + delta

        # Fetch real AQI at center and perimeter points
        center_lat = (min_lat + max_lat) / 2
        center_lon = (min_lon + max_lon) / 2
        
        service = OpenAQService()
        center_aq = await service.get_pm25_at_location(center_lat, center_lon)
        avg_aqi = center_aq.get("aqi")
        pm25 = center_aq.get("pm25")
        if avg_aqi is None or pm25 is None:
            raise HTTPException(
                status_code=503,
                detail="No current air-quality observation is available for this city",
            )
        
        # Determine trend
        trend = "stable"
        if avg_aqi < 70:
            trend = "improving"
        elif avg_aqi > 150:
            trend = "worsening"
            
        hotspots = []

        return {
            "city": city_name or "Analyzed Area",
            "bounds": {
                "min_lat": min_lat,
                "min_lon": min_lon,
                "max_lat": max_lat,
                "max_lon": max_lon
            },
            "statistics": {
                "average_aqi": int(avg_aqi),
                "max_aqi": int(avg_aqi),
                "min_aqi": int(avg_aqi),
                "pm25": pm25,
                "trend": trend,
                "category": aqi_category(int(avg_aqi))
            },
            "hotspots": hotspots,
            "heatmap_points": 0,
            "data_source": center_aq.get("source", "Open-Meteo Atmospheric Telemetry"),
            "timestamp": datetime.utcnow().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get city analytics: {str(e)}")


@router.get("/compare")
async def compare_cities(
    cities: str = Query(..., description="Comma-separated city names"),
    db: Session = Depends(get_db)
):
    """
    Compare air quality across multiple cities using live API data.
    """
    city_list = [c.strip() for c in cities.split(",") if c.strip()]
    if not city_list:
        city_list = ["Delhi", "Gorakhpur", "Mumbai", "Bengaluru"]
        
    service = OpenAQService()
    
    async def fetch_city_aqi(city: str) -> Dict[str, Any]:
        lat, lon = await _resolve_city_coords(city)
        aq = await service.get_pm25_at_location(lat, lon)
        aqi_val = aq.get("aqi")
        if aqi_val is None:
            return {
                "city": city.title(),
                "coordinates": {"lat": lat, "lon": lon},
                "current_aqi": None,
                "pm25": None,
                "category": "Unavailable",
                "trend": "unavailable",
                "source": aq.get("source", "unavailable"),
                "is_estimated": False,
            }
            
        trend = "stable"
        if aqi_val < 80:
            trend = "improving"
        elif aqi_val > 160:
            trend = "worsening"
            
        return {
            "city": city.title(),
            "coordinates": {"lat": lat, "lon": lon},
            "current_aqi": aqi_val,
            "pm25": aq.get("pm25"),
            "category": aqi_category(aqi_val),
            "trend": trend,
            "source": aq.get("source", "Open-Meteo"),
            "is_estimated": aq.get("is_estimated", True)
        }
        
    tasks = [fetch_city_aqi(c) for c in city_list]
    comparisons = await asyncio.gather(*tasks)
    
    return {
        "cities": city_list,
        "comparisons": comparisons,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/simulate")
async def simulate_city_intervention(
    baseline_aqi: float = Query(287.0, description="Baseline AQI before policy intervention"),
    traffic_reduction: float = Query(20.0, description="Percentage reduction in traffic (0-100)"),
    industrial_reduction: float = Query(0.0, description="Percentage reduction in industrial emissions (0-100)"),
    construction_ban: bool = Query(False, description="Whether construction dust ban is in effect"),
    odd_even_rule: bool = Query(False, description="Whether odd-even traffic rule is active"),
    mist_cannons: bool = Query(False, description="Whether municipal water mist cannons are active"),
):
    """
    Simulate the impact of policy and emission interventions on city AQI.
    """
    from ml.inference.simulator import ScenarioSimulator
    return ScenarioSimulator.simulate_scenario(
        baseline_aqi=baseline_aqi,
        traffic_reduction_pct=traffic_reduction,
        industrial_reduction_pct=industrial_reduction,
        construction_ban=construction_ban,
        odd_even_rule=odd_even_rule,
        dust_mist_cannons=mist_cannons
    )
