"""
Wildfire detection and tracking endpoints using NASA FIRMS data.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from math import radians, cos, sin, asin, sqrt

from app.database import get_db
from app.config import settings
from app.services.firms import FIRMSService

router = APIRouter()


@router.get("/active")
async def get_active_fires(
    bounds: str = Query(None, description="Bounding box: min_lon,min_lat,max_lon,max_lat"),
    min_lat: float = Query(None, description="Minimum latitude"),
    min_lon: float = Query(None, description="Minimum longitude"),
    max_lat: float = Query(None, description="Maximum latitude"),
    max_lon: float = Query(None, description="Maximum longitude"),
    lat: float = Query(None, description="Center latitude fallback"),
    lon: float = Query(None, description="Center longitude fallback"),
    days: int = Query(1, description="Days of data", ge=1, le=10),
    db: Session = Depends(get_db)
):
    """
    Get active fires within bounding box from NASA FIRMS.
    
    Returns fire locations with confidence levels and brightness.
    """
    try:
        # Resolve coordinates from bounds string, direct parameters, or center coordinates
        if bounds:
            coords = [float(x.strip()) for x in bounds.split(",")]
            if len(coords) == 4:
                min_lon, min_lat, max_lon, max_lat = coords
        elif min_lat is not None and min_lon is not None and max_lat is not None and max_lon is not None:
            pass
        elif lat is not None and lon is not None:
            delta = 0.5
            min_lat, min_lon, max_lat, max_lon = lat - delta, lon - delta, lat + delta, lon + delta
        else:
            # Default to North India / Indo-Gangetic plain bounding box
            min_lat, min_lon, max_lat, max_lon = 25.0, 75.0, 31.0, 85.0
        
        # Fetch fires using FIRMS service
        service = FIRMSService()
        fires = await service.get_active_fires(min_lat, min_lon, max_lat, max_lon, days)
        
        return {
            "bounds": {
                "min_lat": min_lat,
                "min_lon": min_lon,
                "max_lat": max_lat,
                "max_lon": max_lon
            },
            "days": days,
            "count": len(fires),
            "fires": fires,
            "timestamp": datetime.utcnow().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid bounds: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch fire data: {str(e)}")


@router.get("/nearby")
async def get_nearby_fires(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
    radius: int = Query(50000, description="Search radius in meters", le=200000),
    days: int = Query(1, description="Days of data", ge=1, le=10),
    db: Session = Depends(get_db)
):
    """
    Get fires near a specific location.
    
    Returns fires within radius sorted by distance.
    """
    try:
        service = FIRMSService()
        fires = await service.get_fires_near_point(lat, lon, radius / 1000, days)
        
        # Calculate distances and sort
        for fire in fires:
            fire["distance"] = calculate_distance(
                lat, lon,
                fire["latitude"], fire["longitude"]
            )
        
        fires.sort(key=lambda x: x.get("distance", float('inf')))
        
        return {
            "location": {"lat": lat, "lon": lon},
            "radius": radius,
            "count": len(fires),
            "fires": fires,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch nearby fires: {str(e)}")


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in meters using Haversine formula."""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000  # Radius of earth in meters
    return c * r
