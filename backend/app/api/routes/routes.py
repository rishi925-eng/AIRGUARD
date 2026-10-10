"""
Smart routing endpoints: real road routes with AQI-aware exposure ranking.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import asyncio
import logging

from app.database import get_db
from app.services.mapbox import MapboxService
from app.services.openaq import OpenAQService, pm25_to_aqi, aqi_category, estimate_pm25_inhaled_ug

router = APIRouter()
logger = logging.getLogger(__name__)

# Mode → OSRM/Mapbox profile mapping
_MODE_PROFILE = {"drive": "driving", "bike": "cycling", "walk": "walking"}


# ── Request / Response models ──────────────────────────────────────────────────

class LocationModel(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class RouteRequest(BaseModel):
    start: LocationModel
    end: LocationModel
    waypoints: List[LocationModel] = []
    mode: str = "drive"


# ── Pollution Warning Helper ───────────────────────────────────────────────────

def _get_pollution_warning(aqi: Optional[int], pm25: Optional[float]) -> str:
    if aqi is None and pm25 is None:
        return "Air quality data is currently unavailable for this coordinate."
    val = aqi if aqi is not None else pm25_to_aqi(pm25 or 0)
    if val <= 50:
        return "Good air quality: Air poses little or no health risk. Safe for all outdoor activities."
    elif val <= 100:
        return "Moderate air quality: Acceptable. Unusually sensitive individuals should consider limiting prolonged outdoor exertion."
    elif val <= 150:
        return "Unhealthy for Sensitive Groups: Children, seniors, and individuals with respiratory conditions should limit prolonged outdoor exertion."
    elif val <= 200:
        return "Unhealthy: General public may experience irritation. Sensitive groups should avoid prolonged outdoor exposure; wear a mask if needed."
    elif val <= 300:
        return "Very Unhealthy: Health alert. Avoid strenuous outdoor activities. Use protective air masks and recirculate cabin air."
    else:
        return "Hazardous: Emergency conditions. Avoid all outdoor activity. High-efficiency air filtration strongly advised."


def _get_safer_route_recommendation(routes: List[Dict[str, Any]], orig_data: Dict, dest_data: Dict, mode: str) -> Dict[str, Any]:
    if routes:
        cleanest = routes[0]
        saving_pct = cleanest.get("exposure_reduction_pct")
        reason = (
            f"Choosing {cleanest['name']} reduces inhaled PM2.5 exposure by ~{saving_pct}% compared to alternative routes."
            if saving_pct and saving_pct > 0
            else f"This route offers the lowest estimated PM2.5 exposure ({cleanest.get('average_pm25', 'N/A')} µg/m³) along available paths."
        )
        
        # Health advisory based on cleanest route AQI
        aqi_val = cleanest.get("average_aqi")
        if aqi_val and aqi_val > 150:
            advisory = "High air pollution detected along the corridor. Wear an N95 mask if walking or cycling; keep vehicle windows closed and recirculation on."
        elif aqi_val and aqi_val > 100:
            advisory = "Elevated particulate matter along the road network. Vulnerable travelers should minimize deep respiratory exertion."
        else:
            advisory = "Corridor air quality is within acceptable limits. Safe for regular travel."

        return {
            "recommended_route_id": cleanest.get("id"),
            "route_name": cleanest.get("name"),
            "title": "Safer Route Recommendation",
            "reason": reason,
            "health_advisory": advisory,
            "exposure_saved_pct": saving_pct,
        }
    else:
        orig_aqi = orig_data.get("aqi")
        dest_aqi = dest_data.get("aqi")
        return {
            "recommended_route_id": None,
            "route_name": None,
            "title": "Location Air Quality Advisory",
            "reason": f"Start location AQI is {orig_aqi or 'N/A'} and destination AQI is {dest_aqi or 'N/A'}.",
            "health_advisory": (
                "Road network routing is temporarily unavailable, but air quality measurements at both locations are live. Plan departure accordingly."
            ),
            "exposure_saved_pct": None,
        }


# ── Geocoding ─────────────────────────────────────────────────────────────────

@router.get("/geocode")
async def geocode_locations(q: str = Query(..., min_length=2, max_length=200)):
    """
    Search for location suggestions.
    Uses Mapbox if MAPBOX_TOKEN is set, otherwise falls back to OpenStreetMap Nominatim.
    """
    query = q.strip()
    if len(query) < 2:
        return []
    try:
        results = await MapboxService().geocode_suggestions(query)
        return results
    except RuntimeError as exc:
        msg = str(exc)
        if "rate limit" in msg.lower():
            raise HTTPException(status_code=429, detail=msg)
        raise HTTPException(status_code=502, detail=msg)
    except Exception as exc:
        logger.error("Geocoding failed: %s", exc)
        raise HTTPException(status_code=502, detail="Location search is temporarily unavailable")


# ── Route comparison (main endpoint used by frontend) ────────────────────────

@router.post("/compare")
async def compare_routes(request: RouteRequest, db: Session = Depends(get_db)):
    """
    Fetch road route alternatives and rank them by estimated PM2.5 exposure.
    Always returns origin and destination AQI, pollution warnings, and a safer route recommendation.
    If routing fails, still returns available AQI. If AQI fails, still returns road route.
    """
    if request.start.lat == request.end.lat and request.start.lon == request.end.lon:
        raise HTTPException(status_code=422, detail="Start and destination must be different locations.")

    geo_service = MapboxService()
    aqi_service = OpenAQService()
    profile = _MODE_PROFILE.get(request.mode, "driving")

    # Fetch origin AQI, destination AQI, and routes concurrently
    tasks = [
        aqi_service.get_pm25_at_location(request.start.lat, request.start.lon),
        aqi_service.get_pm25_at_location(request.end.lat, request.end.lon),
        geo_service.get_routes(
            (request.start.lon, request.start.lat),
            (request.end.lon, request.end.lat),
            profile,
        ),
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # 1. Process Origin AQI
    orig_res = results[0]
    if isinstance(orig_res, Exception) or not isinstance(orig_res, dict):
        logger.warning("Failed to fetch origin AQI: %s", orig_res)
        orig_data = {
            "lat": request.start.lat,
            "lon": request.start.lon,
            "aqi": None,
            "pm25": None,
            "category": "Unavailable",
            "warning": "Origin air quality measurement unavailable.",
            "source": "None",
            "is_estimated": False,
        }
    else:
        orig_data = {
            "lat": request.start.lat,
            "lon": request.start.lon,
            "aqi": orig_res.get("aqi"),
            "pm25": orig_res.get("pm25"),
            "category": orig_res.get("aqi_category") or "Unknown",
            "warning": _get_pollution_warning(orig_res.get("aqi"), orig_res.get("pm25")),
            "source": orig_res.get("source") or "Open-Meteo",
            "timestamp": orig_res.get("timestamp"),
            "is_estimated": orig_res.get("is_estimated", False),
        }

    # 2. Process Destination AQI
    dest_res = results[1]
    if isinstance(dest_res, Exception) or not isinstance(dest_res, dict):
        logger.warning("Failed to fetch destination AQI: %s", dest_res)
        dest_data = {
            "lat": request.end.lat,
            "lon": request.end.lon,
            "aqi": None,
            "pm25": None,
            "category": "Unavailable",
            "warning": "Destination air quality measurement unavailable.",
            "source": "None",
            "timestamp": None,
            "is_estimated": False,
        }
    else:
        dest_data = {
            "lat": request.end.lat,
            "lon": request.end.lon,
            "aqi": dest_res.get("aqi"),
            "pm25": dest_res.get("pm25"),
            "category": dest_res.get("aqi_category") or "Unknown",
            "warning": _get_pollution_warning(dest_res.get("aqi"), dest_res.get("pm25")),
            "source": dest_res.get("source") or "Open-Meteo",
            "timestamp": dest_res.get("timestamp"),
            "is_estimated": dest_res.get("is_estimated", False),
        }

    # 3. Process Routes
    routes_res = results[2]
    raw_routes = []
    routing_status = "ok"
    routing_error = None

    if isinstance(routes_res, Exception):
        logger.error("Route fetching failed: %s", routes_res)
        routing_status = "failed"
        routing_error = f"Road routing unavailable: {str(routes_res)}"
    elif not routes_res:
        routing_status = "failed"
        routing_error = "No road network path found between these locations."
    else:
        raw_routes = routes_res

    route_entries = []
    for index, route in enumerate(raw_routes[:3]):
        # Distance and duration directly from routing provider (OSRM / Mapbox)
        duration = route.get("duration")    # seconds
        distance = route.get("distance")    # metres
        geometry = route.get("geometry", {"type": "LineString", "coordinates": []})
        coordinates = geometry.get("coordinates", [])

        # Extract turn-by-turn steps
        steps = [
            {"instruction": step.get("maneuver", {}).get("instruction", "")}
            for leg in route.get("legs", [])
            for step in leg.get("steps", [])
            if step.get("maneuver", {}).get("instruction")
        ]

        # Sample AQI along route
        try:
            aq_data = await aqi_service.sample_route_aqi(coordinates, max_samples=10)
        except Exception as aq_err:
            logger.warning("AQI sampling failed for route %d: %s", index, aq_err)
            aq_data = {"samples": [], "data_coverage": 0.0}

        avg_pm25 = aq_data.get("average_pm25")
        avg_aqi = aq_data.get("average_aqi")
        max_aqi = aq_data.get("max_aqi")
        coverage = aq_data.get("data_coverage", 0.0)
        all_estimated = all(s.get("is_estimated", True) for s in aq_data.get("samples", []) if s.get("pm25") is not None)

        # Inhaled PM2.5 calculation
        pm25_inhaled: Optional[float] = None
        if avg_pm25 is not None and duration is not None and duration > 0:
            pm25_inhaled = estimate_pm25_inhaled_ug(avg_pm25, duration, request.mode)

        exposure_status = "unavailable"
        if avg_pm25 is not None:
            exposure_status = "estimated" if all_estimated else "measured"

        route_entries.append({
            "id": f"route-{index}",
            "name": _route_name(index),
            "duration": duration,
            "distance": distance,
            "average_aqi": avg_aqi,
            "max_aqi": max_aqi,
            "aqi_category": aqi_category(avg_aqi) if avg_aqi is not None else None,
            "average_pm25": avg_pm25,
            "pm25_exposure_ug": pm25_inhaled,
            "exposure_status": exposure_status,
            "aqi_data_coverage": coverage,
            "aqi_source": _aqi_source_label(aq_data),
            "timestamp": aq_data.get("latest_timestamp"),
            "geometry": geometry,
            "steps": steps,
            "_aqi_score": avg_aqi if avg_aqi is not None else 999,
            "_duration": duration if duration is not None else 999999,
            "_distance": distance if distance is not None else 999999,
        })

    # Rank routes: find cleanest (lowest AQI), fastest, shortest
    if len(route_entries) > 1:
        cleanest_idx = min(range(len(route_entries)), key=lambda i: route_entries[i]["_aqi_score"])
        fastest_idx = min(range(len(route_entries)), key=lambda i: route_entries[i]["_duration"])
        shortest_idx = min(range(len(route_entries)), key=lambda i: route_entries[i]["_distance"])

        route_entries[cleanest_idx]["name"] = "Cleanest Route (Lowest Exposure)"
        if fastest_idx != cleanest_idx:
            route_entries[fastest_idx]["name"] = "Fastest Route"
        if shortest_idx not in (cleanest_idx, fastest_idx):
            route_entries[shortest_idx]["name"] = "Shortest Route"

        # Reorder so cleanest route is first
        if cleanest_idx != 0:
            route_entries.insert(0, route_entries.pop(cleanest_idx))

    # Add exposure reduction percentage vs cleanest
    baseline = route_entries[0] if route_entries else None
    for i, r in enumerate(route_entries):
        if i == 0 or baseline is None:
            r["exposure_reduction_pct"] = None
        else:
            b_pm25 = baseline.get("pm25_exposure_ug")
            r_pm25 = r.get("pm25_exposure_ug")
            if b_pm25 is not None and r_pm25 is not None and r_pm25 > 0:
                r["exposure_reduction_pct"] = round((r_pm25 - b_pm25) / r_pm25 * 100, 1)
            else:
                r["exposure_reduction_pct"] = None

    for r in route_entries:
        r.pop("_aqi_score", None)
        r.pop("_duration", None)
        r.pop("_distance", None)

    # Generate Safer Route recommendation
    recommendation = _get_safer_route_recommendation(route_entries, orig_data, dest_data, request.mode)

    return {
        "routes": route_entries,
        "origin_aqi": orig_data,
        "destination_aqi": dest_data,
        "safer_route_recommendation": recommendation,
        "routing_status": routing_status,
        "routing_error": routing_error,
        "mode": request.mode,
    }


# ── Cleanest route (single route) ─────────────────────────────────────────────

@router.post("/cleanest")
async def find_cleanest_route(request: RouteRequest, db: Session = Depends(get_db)):
    """Find the route with lowest AQI exposure."""
    response = await compare_routes(request, db)
    routes = response.get("routes", [])
    if not routes:
        raise HTTPException(status_code=404, detail="No route found")
    return {"route": routes[0], "mode": request.mode}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _route_name(index: int) -> str:
    names = ["Recommended Route", "Alternative Route", "Second Alternative"]
    return names[index] if index < len(names) else f"Route {index + 1}"


def _aqi_source_label(aq_data: dict) -> str:
    samples = aq_data.get("samples", [])
    sources = {s.get("source") for s in samples if s.get("source") and s.get("pm25") is not None}
    if not sources:
        return "Open-Meteo Air Quality Model"
    return ", ".join(sorted(sources))
