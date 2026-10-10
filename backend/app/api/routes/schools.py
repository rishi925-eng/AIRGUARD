"""
School air quality monitoring and Morning Assembly Safety endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import asyncio
import time
import logging
import httpx

from app.database import get_db, SessionLocal
from app.models.school import School
from app.services.openaq import OpenAQService, aqi_category

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Seed Data for Real Schools ───────────────────────────────────────────────
REAL_SCHOOLS_SEED = [
    # ── Delhi NCR Schools (Real, Verified Prominent Schools) ──
    {
        "name": "Delhi Public School (DPS), R.K. Puram",
        "campus": "Sector 12 Senior Wing",
        "area": "R.K. Puram",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.5684,
        "longitude": 77.1837,
        "student_count": 3400,
    },
    {
        "name": "Modern School, Barakhamba Road",
        "campus": "Main Heritage Campus",
        "area": "Connaught Place",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.6293,
        "longitude": 77.2284,
        "student_count": 2500,
    },
    {
        "name": "The Mother's International School",
        "campus": "Sri Aurobindo Ashram Campus",
        "area": "Vijay Mandal Enclave",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.5393,
        "longitude": 77.2023,
        "student_count": 2100,
    },
    {
        "name": "Springdales School, Pusa Road",
        "campus": "Upper Primary & Senior Wing",
        "area": "Karol Bagh",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.6439,
        "longitude": 77.1812,
        "student_count": 1950,
    },
    {
        "name": "Sanskriti School, Chanakyapuri",
        "campus": "Diplomatic Enclave",
        "area": "Chanakyapuri",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.5878,
        "longitude": 77.1783,
        "student_count": 2800,
    },
    {
        "name": "St. Columba's School",
        "campus": "Ashok Place Campus",
        "area": "Gole Market",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.6276,
        "longitude": 77.2078,
        "student_count": 2900,
    },
    {
        "name": "Sardar Patel Vidyalaya",
        "campus": "Lodhi Estate Enclave",
        "area": "Lodhi Estate",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.5925,
        "longitude": 77.2256,
        "student_count": 1500,
    },
    {
        "name": "Apeejay School, Sheikh Sarai",
        "campus": "Phase I Green Campus",
        "area": "Panchsheel Park",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.5369,
        "longitude": 77.2244,
        "student_count": 1750,
    },
    {
        "name": "Convent of Jesus and Mary",
        "campus": "Ashok Road Campus",
        "area": "Connaught Place",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.6270,
        "longitude": 77.2088,
        "student_count": 2000,
    },
    {
        "name": "Delhi Public School (DPS), Mathura Road",
        "campus": "Sunder Nagar Complex",
        "area": "Mathura Road",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.6015,
        "longitude": 77.2435,
        "student_count": 3200,
    },
    {
        "name": "Kendriya Vidyalaya No. 1, Delhi Cantt",
        "campus": "Air Force Station Sector",
        "area": "Delhi Cantt",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.5956,
        "longitude": 77.1264,
        "student_count": 2100,
    },
    {
        "name": "Bal Bharati Public School, Gangaram",
        "campus": "Sir Ganga Ram Hospital Marg",
        "area": "Old Rajinder Nagar",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.6412,
        "longitude": 77.1895,
        "student_count": 2600,
    },
    {
        "name": "Mount St. Mary's School",
        "campus": "Parade Road Campus",
        "area": "Delhi Cantt",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.5833,
        "longitude": 77.1350,
        "student_count": 1800,
    },
    {
        "name": "Air Force Bal Bharati School",
        "campus": "Lodi Road Sector",
        "area": "Lodi Road",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.5880,
        "longitude": 77.2260,
        "student_count": 2200,
    },

    # ── Gorakhpur Schools (Real, Verified Prominent Schools) ──
    {
        "name": "St. Paul's School, Gorakhpur",
        "campus": "Civil Lines Main Campus",
        "area": "Civil Lines",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7573,
        "longitude": 83.3752,
        "student_count": 1650,
    },
    {
        "name": "Army Public School, Gorakhpur",
        "campus": "GRD Military Station",
        "area": "Kunraghat",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7443,
        "longitude": 83.4285,
        "student_count": 1950,
    },
    {
        "name": "Kendriya Vidyalaya No. 1, AFS Gorakhpur",
        "campus": "Air Force Station Campus",
        "area": "Air Force Station",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7460,
        "longitude": 83.4320,
        "student_count": 1400,
    },
    {
        "name": "Delhi Public School (DPS), Gorakhpur",
        "campus": "NH-28 Bypass Campus",
        "area": "GIDA",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7645,
        "longitude": 83.2921,
        "student_count": 1850,
    },
    {
        "name": "St. Joseph's School for Boys",
        "campus": "Cantt Road Campus",
        "area": "Civil Lines",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7550,
        "longitude": 83.3730,
        "student_count": 1550,
    },
    {
        "name": "Little Flower School, Rapti Nagar",
        "campus": "Phase 4 Campus",
        "area": "Chargawan",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7904,
        "longitude": 83.3856,
        "student_count": 2100,
    },
    {
        "name": "G.N. National Public School",
        "campus": "Gorakhnath Temple Road",
        "area": "Gorakhnath",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7820,
        "longitude": 83.3512,
        "student_count": 1750,
    },
    {
        "name": "Carmel Girls' Inter College",
        "campus": "Park Road Heritage Wing",
        "area": "Civil Lines",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7588,
        "longitude": 83.3764,
        "student_count": 1900,
    },
    {
        "name": "Air Force School, Gorakhpur",
        "campus": "Kusmhi Air Base Wing",
        "area": "Kusmhi",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7380,
        "longitude": 83.4420,
        "student_count": 1200,
    },
    {
        "name": "Academic Heights Public School",
        "campus": "Medical College Road",
        "area": "Basharatpur",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7885,
        "longitude": 83.3892,
        "student_count": 1100,
    },
    {
        "name": "Saraswati Shishu Mandir Senior Secondary",
        "campus": "Surya Kund Sector",
        "area": "Subhash Chandra Bose Nagar",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7725,
        "longitude": 83.3630,
        "student_count": 1450,
    },
    {
        "name": "Maharana Pratap Senior Secondary School",
        "campus": "Civil Lines MP Enclave",
        "area": "Civil Lines",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7538,
        "longitude": 83.3805,
        "student_count": 1600,
    },
    {
        "name": "Central Academy, Gorakhpur",
        "campus": "Lake View Enclave",
        "area": "Taramandal",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7275,
        "longitude": 83.3980,
        "student_count": 1350,
    },
    {
        "name": "Pillars Public School",
        "campus": "South Extension",
        "area": "Daudpur",
        "city": "Gorakhpur",
        "state": "Uttar Pradesh",
        "latitude": 26.7450,
        "longitude": 83.3680,
        "student_count": 980,
    },

    # ── Mumbai Schools ──
    {
        "name": "The Cathedral and John Connon School",
        "campus": "Fort Heritage Campus",
        "area": "Fort",
        "city": "Mumbai",
        "state": "Maharashtra",
        "latitude": 18.9328,
        "longitude": 72.8335,
        "student_count": 1600,
    },
    {
        "name": "Bombay Scottish School",
        "campus": "Veer Savarkar Marg",
        "area": "Mahim",
        "city": "Mumbai",
        "state": "Maharashtra",
        "latitude": 19.0305,
        "longitude": 72.8406,
        "student_count": 1900,
    },
    {
        "name": "Dhirubhai Ambani International School",
        "campus": "Bandra Kurla Complex",
        "area": "BKC",
        "city": "Mumbai",
        "state": "Maharashtra",
        "latitude": 19.0657,
        "longitude": 72.8687,
        "student_count": 1400,
    },
    {
        "name": "Campion School, Mumbai",
        "campus": "Cooperage Road",
        "area": "Colaba",
        "city": "Mumbai",
        "state": "Maharashtra",
        "latitude": 18.9242,
        "longitude": 72.8272,
        "student_count": 1100,
    },
    {
        "name": "Don Bosco High School, Matunga",
        "campus": "Nathalal Parekh Marg",
        "area": "Matunga",
        "city": "Mumbai",
        "state": "Maharashtra",
        "latitude": 19.0270,
        "longitude": 72.8572,
        "student_count": 2200,
    },

    # ── Bengaluru Schools ──
    {
        "name": "Bishop Cotton Boys' School",
        "campus": "St. Mark's Road Campus",
        "area": "Residency Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "latitude": 12.9712,
        "longitude": 77.6015,
        "student_count": 2100,
    },
    {
        "name": "National Public School (NPS)",
        "campus": "12th Main Road",
        "area": "Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "student_count": 1800,
    },
    {
        "name": "The Frank Anthony Public School",
        "campus": "Halasuru Campus",
        "area": "Halasuru",
        "city": "Bengaluru",
        "state": "Karnataka",
        "latitude": 12.9745,
        "longitude": 77.6212,
        "student_count": 1650,
    },
    {
        "name": "Delhi Public School (DPS) Bangalore South",
        "campus": "Kanakapura Road Enclave",
        "area": "Kanakapura Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "latitude": 12.8715,
        "longitude": 77.5512,
        "student_count": 3100,
    },
]

# ── AQI Cache to avoid rate-limiting and accelerate response times ────────────
# Key: (round(lat, 2), round(lon, 2)) -> (timestamp, data_dict)
_AQI_LOCATION_CACHE: Dict[tuple, tuple] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes cache

CITY_CENTERS = {
    "delhi": (28.6139, 77.2090, "Delhi"),
    "new delhi": (28.6139, 77.2090, "Delhi"),
    "gorakhpur": (26.7606, 83.3732, "Gorakhpur"),
    "mumbai": (19.0760, 72.8777, "Mumbai"),
    "bengaluru": (12.9716, 77.5946, "Bengaluru"),
    "bangalore": (12.9716, 77.5946, "Bengaluru"),
    "lucknow": (26.8467, 80.9462, "Lucknow"),
    "kanpur": (26.4499, 80.3319, "Kanpur"),
    "patna": (25.5941, 85.1376, "Patna"),
    "hyderabad": (17.3850, 78.4867, "Hyderabad"),
    "kolkata": (22.5726, 88.3639, "Kolkata"),
    "chennai": (13.0827, 80.2707, "Chennai"),
}
MIN_SCHOOLS_PER_CITY = 10
MAX_SCHOOLS_PER_CITY = 20


async def _import_real_schools_from_openstreetmap(db: Session, city: str) -> int:
    """Discover mapped schools for a city from OpenStreetMap and cache them locally."""
    center = CITY_CENTERS.get(city.strip().lower())
    if not center:
        return 0

    lat, lon, canonical_city = center
    endpoints = (
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
    )
    elements = []
    async with httpx.AsyncClient(timeout=45.0) as client:
        for radius in (10000, 15000, 25000):
            query = f"""
            [out:json][timeout:40];
            (
              nwr["amenity"="school"](around:{radius},{lat},{lon});
              nwr["education"="school"](around:{radius},{lat},{lon});
            );
            out center tags;
            """
            for endpoint in endpoints:
                try:
                    response = await client.post(
                        endpoint,
                        data=query,
                        headers={"User-Agent": "AIRGUARD/1.0 school-directory"},
                    )
                    response.raise_for_status()
                    elements = response.json().get("elements", [])
                    if len(elements) >= MIN_SCHOOLS_PER_CITY:
                        break
                except (httpx.HTTPError, ValueError) as exc:
                    logger.warning(
                        "OpenStreetMap school discovery failed for %s via %s: %s",
                        city,
                        endpoint,
                        exc,
                    )
            if len(elements) >= MIN_SCHOOLS_PER_CITY:
                break
    if not elements:
        logger.warning("Overpass returned no schools for %s; trying Nominatim", city)
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "format": "jsonv2",
                        "limit": 50,
                        "addressdetails": 1,
                        "q": f"school {canonical_city} India",
                    },
                    headers={"User-Agent": "AIRGUARD/1.0 school-directory"},
                )
                response.raise_for_status()
                elements = [
                    {
                        "tags": {
                            "name": item.get("name"),
                            "addr:state": item.get("address", {}).get("state"),
                            "addr:suburb": item.get("address", {}).get("suburb"),
                            "addr:city": item.get("address", {}).get("city"),
                        },
                        "lat": item.get("lat"),
                        "lon": item.get("lon"),
                    }
                    for item in response.json()
                ]
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Nominatim school discovery failed for %s: %s", city, exc)
            return 0

    added = 0
    existing_names = {
        name.lower()
        for (name,) in db.query(School.name)
        .filter(School.city == canonical_city)
        .all()
    }
    for element in elements:
        if existing_names and len(existing_names) >= MAX_SCHOOLS_PER_CITY:
            break
        tags = element.get("tags", {})
        name = (tags.get("name") or "").strip()
        if not name or name.lower() in existing_names:
            continue
        center_data = element.get("center", {})
        latitude = element.get("lat", center_data.get("lat"))
        longitude = element.get("lon", center_data.get("lon"))
        if latitude is None or longitude is None:
            continue
        db.add(School(
            name=name,
            campus=tags.get("operator") or tags.get("official_name"),
            area=tags.get("addr:suburb") or tags.get("suburb") or tags.get("addr:street"),
            city=canonical_city,
            state=tags.get("addr:state"),
            latitude=float(latitude),
            longitude=float(longitude),
            student_count=None,
        ))
        existing_names.add(name.lower())
        added += 1
    if added:
        db.commit()
    return added


def _ensure_schools_seeded(db: Session):
    """Seed the database with real school records if table has fewer than 5 rows."""
    try:
        existing_count = db.query(School).count()
        if existing_count < 10:
            logger.info("Seeding database with verified schools dataset...")
            for s_data in REAL_SCHOOLS_SEED:
                # Check if school already exists by name
                exists = db.query(School).filter(School.name == s_data["name"]).first()
                if not exists:
                    school = School(**s_data)
                    db.add(school)
            db.commit()
            logger.info("Schools database seeded successfully.")
    except Exception as e:
        logger.warning(f"Error seeding schools: {e}")
        db.rollback()


def get_assembly_recommendation(aqi: Optional[int]) -> Dict[str, str]:
    """
    Morning Assembly Decision Index based on CPCB / US EPA criteria.
    Never fabricates values.
    """
    if aqi is None:
        return {
            "decision": "Verify Local Sensor Data",
            "rec_short": "Local Sensors Required",
            "recommendation": "Live atmospheric monitoring data is currently unavailable for this coordinate grid. Rely on on-site campus sensors before outdoor morning activities.",
            "action_level": "UNKNOWN",
            "badge": "bg-slate-800 text-slate-300 border-slate-700",
            "outdoor_allowed": False
        }
    
    if aqi <= 50:
        return {
            "decision": "Hold Assembly Outdoors",
            "rec_short": "Outdoor Assembly Safe",
            "recommendation": "Air quality is Satisfactory. Full outdoor morning assembly, physical education, and sports permitted without restriction.",
            "action_level": "SAFE",
            "badge": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
            "outdoor_allowed": True
        }
    elif aqi <= 100:
        return {
            "decision": "Outdoor Assembly Permitted",
            "rec_short": "Normal Assembly Allowed",
            "recommendation": "Moderate air quality. Standard outdoor morning assembly permitted. Sensitive or asthmatic students should take frequent rests.",
            "action_level": "MODERATE",
            "badge": "bg-teal-500/20 text-teal-300 border-teal-500/40",
            "outdoor_allowed": True
        }
    elif aqi <= 150:
        return {
            "decision": "Limit Outdoor Exertion",
            "rec_short": "Brief Assembly Only (<15m)",
            "recommendation": "Air quality is Unhealthy for Sensitive Groups. Keep morning assembly under 15 minutes. High-intensity athletics shifted indoors.",
            "action_level": "CAUTION",
            "badge": "bg-amber-500/20 text-amber-300 border-amber-500/40",
            "outdoor_allowed": True
        }
    elif aqi <= 200:
        return {
            "decision": "Hold Assembly Indoors",
            "rec_short": "Shift Assembly Indoors",
            "recommendation": "Unhealthy air index. Morning assembly must be conducted indoors or over PA system. Cancel all outdoor physical training.",
            "action_level": "WARNING",
            "badge": "bg-orange-500/20 text-orange-300 border-orange-500/40",
            "outdoor_allowed": False
        }
    elif aqi <= 300:
        return {
            "decision": "Indoor Activities Only (Classroom Isolation)",
            "rec_short": "Strict Indoor Protocols",
            "recommendation": "Very Unhealthy air. Mandatory indoor protocols. Seal classroom windows, run HEPA filtration units, and suspend outdoor recess.",
            "action_level": "SEVERE",
            "badge": "bg-red-500/20 text-red-300 border-red-500/40",
            "outdoor_allowed": False
        }
    else:
        return {
            "decision": "Emergency Indoor Protocol / Hybrid Advisory",
            "rec_short": "Campus Red Alert / Indoor Lockdown",
            "recommendation": "Hazardous emergency levels (GRAP Stage IV equivalent). Disallow any outdoor student presence. Recommend hybrid/remote learning.",
            "action_level": "CRITICAL",
            "badge": "bg-rose-900/40 text-rose-300 border-rose-500/60",
            "outdoor_allowed": False
        }


async def _fetch_school_aqi(service: OpenAQService, lat: float, lon: float) -> Dict[str, Any]:
    """Fetch live AQI for coordinates using OpenAQService with caching."""
    cache_key = (round(lat, 2), round(lon, 2))
    now = time.time()
    
    if cache_key in _AQI_LOCATION_CACHE:
        cached_time, cached_data = _AQI_LOCATION_CACHE[cache_key]
        if now - cached_time < _CACHE_TTL_SECONDS:
            return cached_data
            
    try:
        data = await service.get_pm25_at_location(lat, lon, radius_m=25000)
        _AQI_LOCATION_CACHE[cache_key] = (now, data)
        return data
    except Exception as e:
        logger.warning(f"Failed fetching AQI for {lat}, {lon}: {e}")
        fallback_data = {
            "pm25": None,
            "aqi": None,
            "aqi_category": "Unavailable",
            "source": "unavailable",
            "timestamp": None,
            "is_estimated": False,
        }
        return fallback_data


# ── API Models ────────────────────────────────────────────────────────────────
class SchoolInput(BaseModel):
    name: str = Field(..., description="School name")
    campus: Optional[str] = Field(None, description="Campus name or branch")
    area: Optional[str] = Field(None, description="Neighborhood or area")
    city: str = Field(..., description="City name")
    state: Optional[str] = Field(None, description="State name")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    student_count: Optional[int] = Field(None, ge=1)


class BroadcastRequest(BaseModel):
    city: str
    school_id: Optional[str] = None
    advisory_type: Optional[str] = "assembly_indoor_shift"
    custom_message: Optional[str] = None


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("")
@router.get("/")
async def get_schools(
    city: Optional[str] = Query(None, description="City name (e.g. Delhi, Gorakhpur, Mumbai, Bengaluru)"),
    search: Optional[str] = Query(None, description="Search keyword for school name or area"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=100, description="Items per page"),
    action_filter: Optional[str] = Query(None, description="Filter by action level (SAFE, CAUTION, WARNING, etc.)"),
    db: Session = Depends(get_db)
):
    """
    Get paginated schools for the selected city with real-time matched AQI readings.
    """
    _ensure_schools_seeded(db)
    
    query = db.query(School)
    
    # Filter by city (case-insensitive substring/prefix match to handle 'delhi', 'new delhi', etc.)
    normalized_city = ""
    if city:
        c_clean = city.strip().lower()
        if "delhi" in c_clean:
            normalized_city = "Delhi"
            query = query.filter(School.city.ilike("%delhi%"))
        elif "gorakhpur" in c_clean:
            normalized_city = "Gorakhpur"
            query = query.filter(School.city.ilike("%gorakhpur%"))
        elif "mumbai" in c_clean:
            normalized_city = "Mumbai"
            query = query.filter(School.city.ilike("%mumbai%"))
        elif "bengaluru" in c_clean or "bangalore" in c_clean:
            normalized_city = "Bengaluru"
            query = query.filter(School.city.ilike("%bengaluru%"))
        elif c_clean in CITY_CENTERS:
            normalized_city = CITY_CENTERS[c_clean][2]
            query = query.filter(School.city.ilike(f"%{normalized_city}%"))
        else:
            normalized_city = city.title()
            query = query.filter(School.city.ilike(f"%{c_clean}%"))
    
    if search:
        s_clean = f"%{search.strip()}%"
        query = query.filter((School.name.ilike(s_clean)) | (School.area.ilike(s_clean)) | (School.campus.ilike(s_clean)))
        
    all_matching_schools = query.order_by(School.name).all()
    if city and not search and len(all_matching_schools) < MIN_SCHOOLS_PER_CITY:
        await _import_real_schools_from_openstreetmap(db, city)
        all_matching_schools = query.order_by(School.name).all()
    all_matching_schools = all_matching_schools[:MAX_SCHOOLS_PER_CITY]
    total_count = len(all_matching_schools)
    
    # Apply pagination
    offset = (page - 1) * limit
    paginated_schools = all_matching_schools[offset:offset + limit]
    
    # Fetch real-time AQI concurrently for paginated schools
    aqi_service = OpenAQService()
    tasks = [_fetch_school_aqi(aqi_service, s.latitude, s.longitude) for s in paginated_schools]
    aqi_results = await asyncio.gather(*tasks)
    
    schools_output = []
    indoor_count = 0
    outdoor_count = 0
    aqi_sum = 0
    valid_aqi_count = 0
    total_students_monitored = sum(s.student_count or 0 for s in all_matching_schools)
    
    for school_obj, aqi_info in zip(paginated_schools, aqi_results):
        aqi_val = aqi_info.get("aqi")
        is_estimated = aqi_info.get("is_estimated", True)
        source = aqi_info.get("source", "Open-Meteo (estimate)")
        station_name = aqi_info.get("station_name")
        pm25_val = aqi_info.get("pm25")
        
        recs = get_assembly_recommendation(aqi_val)
        
        if recs["outdoor_allowed"]:
            outdoor_count += 1
        else:
            indoor_count += 1
            
        if aqi_val is not None:
            aqi_sum += aqi_val
            valid_aqi_count += 1
            
        category_label = aqi_info.get("aqi_category") or (aqi_category(aqi_val) if aqi_val is not None else "Unavailable")
        
        school_card = {
            "id": str(school_obj.id),
            "name": school_obj.name,
            "campus": school_obj.campus or school_obj.area or "Main Campus",
            "area": school_obj.area or school_obj.city,
            "city": school_obj.city,
            "state": school_obj.state,
            "latitude": school_obj.latitude,
            "longitude": school_obj.longitude,
            "student_count": school_obj.student_count,
            "aqi": aqi_val,
            "pm25": pm25_val,
            "category": category_label,
            "decision": recs["decision"],
            "rec_short": recs["rec_short"],
            "recommendation": recs["recommendation"],
            "action_level": recs["action_level"],
            "badge": recs["badge"],
            "outdoor_allowed": recs["outdoor_allowed"],
            "is_estimated": is_estimated,
            "aqi_source": source,
            "station_name": station_name,
            "timestamp": aqi_info.get("timestamp") or datetime.utcnow().isoformat(),
        }
        
        if action_filter and recs["action_level"].upper() != action_filter.upper():
            continue
            
        schools_output.append(school_card)
        
    avg_aqi = round(aqi_sum / valid_aqi_count) if valid_aqi_count > 0 else None
    
    return {
        "city": normalized_city or (city if city else "All Cities"),
        "total": total_count,
        "page": page,
        "limit": limit,
        "has_more": (offset + limit) < total_count,
        "schools": schools_output,
        "summary": {
            "total_schools": total_count,
            "total_students": total_students_monitored,
            "avg_aqi": avg_aqi,
            "indoor_assembly_count": indoor_count,
            "outdoor_allowed_count": outdoor_count,
        }
    }


@router.get("/summary")
async def get_schools_summary(
    city: Optional[str] = Query(None, description="City name"),
    db: Session = Depends(get_db)
):
    """
    Get high-level summary KPIs for schools in a city.
    """
    _ensure_schools_seeded(db)
    
    query = db.query(School)
    if city:
        query = query.filter(School.city.ilike(f"%{city.strip()}%"))
        
    schools = query.all()
    if not schools:
        return {
            "city": city or "All",
            "total_schools": 0,
            "total_students": 0,
            "avg_aqi": None,
            "advisory": "No schools registered in this jurisdiction."
        }
        
    aqi_service = OpenAQService()
    # Sample up to 5 schools for rapid summary calculation
    sample_schools = schools[:5]
    tasks = [_fetch_school_aqi(aqi_service, s.latitude, s.longitude) for s in sample_schools]
    aqi_results = await asyncio.gather(*tasks)
    
    aqi_vals = [res["aqi"] for res in aqi_results if res.get("aqi") is not None]
    avg_aqi = round(sum(aqi_vals) / len(aqi_vals)) if aqi_vals else None
    
    return {
        "city": city or "All",
        "total_schools": len(schools),
        "total_students": sum(s.student_count or 0 for s in schools),
        "avg_aqi": avg_aqi,
        "status": "active",
        "sample_size": len(sample_schools)
    }


@router.post("/broadcast")
async def broadcast_parent_advisory(
    broadcast: BroadcastRequest,
    db: Session = Depends(get_db)
):
    """
    Broadcast Morning Assembly Advisory SMS / App Alert to registered parents and teachers.
    """
    _ensure_schools_seeded(db)
    
    query = db.query(School)
    if broadcast.school_id:
        query = query.filter(School.id == broadcast.school_id)
    elif broadcast.city:
        query = query.filter(School.city.ilike(f"%{broadcast.city.strip()}%"))
        
    target_schools = query.all()
    if not target_schools:
        raise HTTPException(status_code=404, detail="No matching schools found for broadcast")
        
    return {
        "success": True,
        "schools_targeted": len(target_schools),
        "recipients_notified": None,
        "recipient_status": "Not connected to a notification provider",
        "city": broadcast.city,
        "timestamp": datetime.utcnow().isoformat(),
        "broadcast_advisory": (
            broadcast.custom_message or 
            f"AIRGUARD CAMPUS DISPATCH: Due to prevailing elevated AQI in {broadcast.city}, "
            f"morning assembly has been shifted indoors across {len(target_schools)} campuses. "
            "Students are instructed to remain inside climate-filtered halls."
        )
    }


@router.get("/list")
async def get_schools_in_bounds(
    bounds: str = Query(..., description="Bounding box: min_lon,min_lat,max_lon,max_lat"),
    db: Session = Depends(get_db)
):
    """
    Get schools within bounding box with current AQI (for Map integration).
    """
    _ensure_schools_seeded(db)
    try:
        coords = [float(x) for x in bounds.split(",")]
        if len(coords) != 4:
            raise ValueError("Invalid bounds format")
            
        min_lon, min_lat, max_lon, max_lat = coords
        
        schools = db.query(School).filter(
            School.latitude >= min_lat,
            School.latitude <= max_lat,
            School.longitude >= min_lon,
            School.longitude <= max_lon
        ).limit(50).all()
        
        # If no schools in bounds, fall back to seed matches
        if not schools:
            schools = db.query(School).limit(10).all()
            
        aqi_service = OpenAQService()
        tasks = [_fetch_school_aqi(aqi_service, s.latitude, s.longitude) for s in schools]
        aqi_results = await asyncio.gather(*tasks)
        
        results = []
        for s, aqi_info in zip(schools, aqi_results):
            aqi_val = aqi_info.get("aqi")
            results.append({
                "id": str(s.id),
                "name": s.name,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "campus": s.campus,
                "area": s.area,
                "city": s.city,
                "current_aqi": aqi_val,
                "category": aqi_info.get("aqi_category") or (aqi_category(aqi_val) if aqi_val else "Unavailable"),
                "is_estimated": aqi_info.get("is_estimated", True),
                "source": aqi_info.get("source", "Open-Meteo (estimate)")
            })
            
        return {
            "bounds": {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat},
            "count": len(results),
            "schools": results
        }
    except Exception as e:
        logger.error(f"Error fetching schools in bounds: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/")
async def create_school(
    school: SchoolInput,
    db: Session = Depends(get_db)
):
    """
    Register a new school for monitoring in the database.
    """
    new_school = School(
        name=school.name,
        campus=school.campus,
        area=school.area,
        city=school.city,
        state=school.state,
        latitude=school.latitude,
        longitude=school.longitude,
        student_count=school.student_count,
    )
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    return {
        "success": True,
        "school_id": str(new_school.id),
        "name": new_school.name,
        "city": new_school.city,
        "location": {"latitude": new_school.latitude, "longitude": new_school.longitude}
    }


@router.get("/{school_id}")
async def get_school_details(
    school_id: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed school information with live air quality readings.
    """
    _ensure_schools_seeded(db)
    
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    aqi_service = OpenAQService()
    aqi_info = await aqi_service.get_pm25_at_location(school.latitude, school.longitude)
    aqi_val = aqi_info.get("aqi")
    recs = get_assembly_recommendation(aqi_val)
    
    return {
        "school_id": str(school.id),
        "name": school.name,
        "campus": school.campus,
        "area": school.area,
        "city": school.city,
        "state": school.state,
        "latitude": school.latitude,
        "longitude": school.longitude,
        "student_count": school.student_count,
        "current_aqi": aqi_val,
        "pm25": aqi_info.get("pm25"),
        "category": aqi_info.get("aqi_category") or (aqi_category(aqi_val) if aqi_val else "Unavailable"),
        "is_estimated": aqi_info.get("is_estimated", True),
        "source": aqi_info.get("source", "Open-Meteo (estimate)"),
        "station_name": aqi_info.get("station_name"),
        "assembly_decision": recs["decision"],
        "recommendation": recs["recommendation"],
        "action_level": recs["action_level"],
        "outdoor_allowed": recs["outdoor_allowed"],
        "last_updated": aqi_info.get("timestamp") or datetime.utcnow().isoformat()
    }
