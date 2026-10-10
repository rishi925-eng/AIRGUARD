"""
Geospatial service: Mapbox (primary) with OSRM + Nominatim free fallbacks for routing and geocoding.
"""
import httpx
from typing import Dict, List, Optional, Tuple
from app.config import settings
import logging
import time
import urllib.parse
import math

logger = logging.getLogger(__name__)
_geocode_cache: Dict[str, Tuple[float, List[Dict]]] = {}
_GEOCODE_CACHE_TTL_SECONDS = 300

# OSRM uses different profile names than Mapbox
_OSRM_PROFILE = {"driving": "driving", "cycling": "bike", "walking": "foot"}


class MapboxService:
    """Geospatial service with Mapbox primary and OSRM/Nominatim free fallbacks."""

    def __init__(self):
        self.base_url = settings.MAPBOX_BASE_URL
        self.token = settings.effective_mapbox_token or settings.MAPBOX_TOKEN or ""

    # ── Geocoding ──────────────────────────────────────────────────────────────

    async def geocode_suggestions(self, address: str) -> List[Dict]:
        """Return location suggestions from Mapbox (if configured) or Nominatim."""
        query = " ".join(address.split())
        cache_key = query.casefold()
        cached = _geocode_cache.get(cache_key)
        if cached and time.monotonic() - cached[0] < _GEOCODE_CACHE_TTL_SECONDS:
            logger.debug("Geocode cache hit for %r", cache_key)
            return cached[1]

        try:
            if self.token:
                results = await self._mapbox_geocode(query)
            else:
                results = await self._nominatim_geocode(query)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                raise RuntimeError("Location provider rate limit reached; please try again shortly")
            raise RuntimeError(f"Location provider returned HTTP {exc.response.status_code}")
        except httpx.TimeoutException:
            raise RuntimeError("Location provider request timed out")
        except Exception as exc:
            raise RuntimeError(f"Location search failed: {exc}") from exc

        _geocode_cache[cache_key] = (time.monotonic(), results)
        return results

    async def _mapbox_geocode(self, query: str) -> List[Dict]:
        encoded = urllib.parse.quote(query)
        url = f"{self.base_url}/geocoding/v5/mapbox.places/{encoded}.json"
        params = {"access_token": self.token, "limit": 6, "autocomplete": "true"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()
        return [
            {
                "latitude": f["center"][1],
                "longitude": f["center"][0],
                "label": f.get("place_name", ""),
                "type": (f.get("place_type") or [None])[0],
            }
            for f in payload.get("features", [])
            if f.get("center") and f.get("place_name")
        ]

    async def _nominatim_geocode(self, query: str) -> List[Dict]:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "format": "jsonv2",
            "q": query,
            "limit": 6,
            "addressdetails": 1,
            "countrycodes": "",          # allow global results
        }
        headers = {
            "User-Agent": "AIRGUARD/1.0 (local prototype; contact=airguard-dev)",
            "Accept-Language": "en",
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            payload = response.json()
        return [
            {
                "latitude": float(r["lat"]),
                "longitude": float(r["lon"]),
                "label": r.get("display_name", ""),
                "type": r.get("type"),
                "address": r.get("address", {}),
            }
            for r in payload
            if r.get("lat") and r.get("lon") and r.get("display_name")
        ]

    # ── Routing ────────────────────────────────────────────────────────────────

    async def get_routes(
        self,
        origin: Tuple[float, float],       # (lon, lat)
        destination: Tuple[float, float],  # (lon, lat)
        profile: str = "driving",
    ) -> List[Dict]:
        """Return a list of route dicts (geometry, distance, duration, legs)."""
        if self.token:
            routes = await self._mapbox_routes(origin, destination, profile)
        else:
            routes = await self._osrm_routes(origin, destination, profile)
        return routes or []

    async def _mapbox_routes(
        self, origin: Tuple[float, float], destination: Tuple[float, float], profile: str
    ) -> List[Dict]:
        coords = f"{origin[0]},{origin[1]};{destination[0]},{destination[1]}"
        url = f"{self.base_url}/directions/v5/mapbox/{profile}/{coords}"
        params = {
            "access_token": self.token,
            "geometries": "geojson",
            "overview": "full",
            "steps": "true",
            "alternatives": "true",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        return data.get("routes", [])

    async def _osrm_routes(
        self, origin: Tuple[float, float], destination: Tuple[float, float], profile: str
    ) -> List[Dict]:
        """Use public OSRM demo server (prototype only; do not abuse)."""
        osrm_profile = _OSRM_PROFILE.get(profile, "driving")
        coords = f"{origin[0]},{origin[1]};{destination[0]},{destination[1]}"
        url = f"https://router.project-osrm.org/route/v1/{osrm_profile}/{coords}"
        params = {
            "geometries": "geojson",
            "overview": "full",
            "steps": "true",
            "alternatives": "true",
        }
        headers = {"User-Agent": "AIRGUARD/1.0 (prototype)"}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
            if data.get("code") != "Ok":
                logger.warning("OSRM returned non-Ok code: %s", data.get("code"))
                return []
            return data.get("routes", [])
        except Exception as exc:
            logger.error("OSRM routing failed: %s", exc)
            return []

    async def get_route(
        self, origin: Tuple[float, float], destination: Tuple[float, float], profile: str = "driving"
    ) -> Optional[Dict]:
        routes = await self.get_routes(origin, destination, profile)
        return routes[0] if routes else None

    # ── Cleanest route (AQI sampling) ─────────────────────────────────────────

    async def calculate_cleanest_route(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        aqi_data_provider,
    ) -> Dict:
        """
        Calculate one route and sample AQI along its geometry.
        Returns the route dict extended with aqi_exposure data.
        """
        route = await self.get_route(origin, destination, "driving")
        if not route:
            return {"error": "Could not calculate route"}

        geometry = route.get("geometry", {})
        coordinates = geometry.get("coordinates", [])
        if not coordinates:
            return route

        sample_interval = max(1, len(coordinates) // 10)
        sample_points = coordinates[::sample_interval]

        aqi_segments: List[Dict] = []
        for i, coord in enumerate(sample_points):
            lon, lat = coord[0], coord[1]
            try:
                aqi = await aqi_data_provider(lat, lon)
            except Exception as exc:
                logger.warning("AQI fetch failed for (%.4f, %.4f): %s", lat, lon, exc)
                aqi = None
            aqi_segments.append({"position": i, "latitude": lat, "longitude": lon, "aqi": aqi})

        valid = [s["aqi"] for s in aqi_segments if s["aqi"] is not None]
        avg_exposure = sum(valid) / len(valid) if valid else 0

        return {
            **route,
            "aqi_exposure": {
                "average": avg_exposure,
                "total": sum(valid),
                "segments": aqi_segments,
                "max_aqi": max(valid, default=0),
            },
        }

    # ── Geometry helpers ───────────────────────────────────────────────────────

    @staticmethod
    def sample_route_points(coordinates: List[List[float]], max_samples: int = 12) -> List[List[float]]:
        """Sample up to max_samples evenly spaced coordinates from a route geometry."""
        if not coordinates:
            return []
        if len(coordinates) <= max_samples:
            return coordinates
        step = (len(coordinates) - 1) / (max_samples - 1)
        return [coordinates[round(i * step)] for i in range(max_samples)]

    @staticmethod
    def haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        """Return great-circle distance in km."""
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        return R * 2 * math.asin(math.sqrt(a))

    # ── Legacy mock stubs (kept for backwards compat) ─────────────────────────

    async def geocode(self, address: str) -> Optional[Dict]:
        results = await self.geocode_suggestions(address)
        if not results:
            return None
        r = results[0]
        return {"longitude": r["longitude"], "latitude": r["latitude"], "place_name": r["label"], "place_type": [r.get("type")], "relevance": 1.0}

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict]:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {"format": "jsonv2", "lat": lat, "lon": lon}
        headers = {"User-Agent": "AIRGUARD/1.0 (prototype)"}
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
            return {"place_name": data.get("display_name", ""), "place_type": [data.get("type")], "address": data.get("address", {})}
        except Exception:
            return None
