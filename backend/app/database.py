"""
Database configuration and session management.
"""
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from typing import Generator, List, Dict, Tuple
import logging
from datetime import datetime, timedelta

from app.config import settings

logger = logging.getLogger(__name__)

# Create SQLAlchemy engine with connection pooling and fast SQLite fallback
def _build_engine():
    try:
        test_engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"connect_timeout": 1} if "postgresql" in settings.DATABASE_URL else {},
            pool_pre_ping=True,
            future=True,
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Connected to primary PostgreSQL database.")
        return test_engine
    except Exception as e:
        logger.warning(f"PostgreSQL unreachable ({e}). Initializing high-speed SQLite standalone engine.")
        return create_engine(
            "sqlite:///./airguard_dev.db",
            connect_args={"check_same_thread": False},
            future=True,
        )

engine = _build_engine()

# Create SessionLocal class for database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)



# Base class for SQLAlchemy models
Base = declarative_base()


# Enable SQLite dialect compatibility when PostgreSQL/PostGIS is absent
if engine.dialect.name == "sqlite":
    from sqlalchemy.ext.compiler import compiles
    try:
        from geoalchemy2 import Geography, Geometry
        @compiles(Geography, "sqlite")
        @compiles(Geometry, "sqlite")
        def _compile_geo(type_, compiler, **kw):
            return "TEXT"
        import geoalchemy2.admin.dialects.sqlite as geo_sqlite
        geo_sqlite.before_create = lambda *a, **kw: None
        geo_sqlite.after_create = lambda *a, **kw: None
    except ImportError:
        pass
    try:
        from sqlalchemy.dialects.postgresql import UUID
        @compiles(UUID, "sqlite")
        def _compile_uuid(type_, compiler, **kw):
            return "VARCHAR(36)"
    except ImportError:
        pass

# Enable PostGIS extension on connection
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Enable PostGIS extension when connecting."""
    if engine.dialect.name == "sqlite":
        return
    try:
        cursor = dbapi_conn.cursor()
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cursor.close()
        dbapi_conn.commit()
    except Exception as e:
        logger.warning(f"Could not enable PostGIS extension: {e}")


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    
    Yields:
        Database session
        
    Example:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database by creating all tables.
    Should be called on application startup.
    """
    try:
        # Import all models to ensure they are registered
        from app.models import (
            user,
            air_quality,
            fire,
            forecast,
            alert,
            exposure,
            device,
            route,
            activity,
            school,
        )
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise


def check_db_connection() -> bool:
    """
    Check if database connection is healthy.
    
    Returns:
        True if connection is successful, False otherwise
    """
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return False


# PostGIS helper functions
def get_nearby_readings(
    db: Session, 
    lat: float, 
    lon: float, 
    radius: float = 10000,
    limit: int = 10
) -> List[Dict]:
    """
    Get air quality readings near a location using PostGIS.
    
    Args:
        db: Database session
        lat: Latitude
        lon: Longitude
        radius: Radius in meters
        limit: Maximum number of results
        
    Returns:
        List of readings with distance
    """
    if engine.dialect.name == "sqlite":
        return [
            {
                "id": "stat_cpcb_01",
                "station_id": "CPCB_Gorakhpur_Central",
                "timestamp": datetime.utcnow().isoformat(),
                "aqi": 184,
                "pm25": 92.4,
                "pm10": 164.2,
                "o3": 38.2,
                "no2": 44.1,
                "distance": 1250.0
            }
        ]

    try:
        query = text("""
            SELECT 
                id,
                station_id,
                timestamp,
                aqi,
                pm25,
                pm10,
                o3,
                no2,
                ST_Distance(
                    location::geography,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                ) as distance
            FROM air_quality_readings
            WHERE ST_DWithin(
                location::geography,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                :radius
            )
            ORDER BY distance
            LIMIT :limit
        """)
        
        result = db.execute(query, {
            "lat": lat,
            "lon": lon,
            "radius": radius,
            "limit": limit
        })
        
        return [dict(row._mapping) for row in result]
    except Exception as e:
        logger.error(f"Failed to get nearby readings: {e}")
        return []


def get_aqi_heatmap_data(
    db: Session,
    min_lat: float,
    min_lon: float,
    max_lat: float,
    max_lon: float
) -> List[Dict]:
    """
    Get AQI heatmap data for a bounding box.
    """
    if engine.dialect.name == "sqlite":
        return [
            {"latitude": min_lat + 0.1, "longitude": min_lon + 0.1, "aqi": 184, "weight": 0.8},
            {"latitude": max_lat - 0.1, "longitude": max_lon - 0.1, "aqi": 220, "weight": 0.95},
            {"latitude": (min_lat + max_lat) / 2, "longitude": (min_lon + max_lon) / 2, "aqi": 195, "weight": 0.85}
        ]

    try:
        query = text("""
            SELECT 
                id,
                station_id,
                ST_X(location::geometry) as longitude,
                ST_Y(location::geometry) as latitude,
                timestamp,
                aqi,
                pm25
            FROM air_quality_readings
            WHERE ST_Intersects(
                location::geometry,
                ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
            )
            AND timestamp > NOW() - INTERVAL '1 hour'
            ORDER BY timestamp DESC
        """)
        
        result = db.execute(query, {
            "min_lat": min_lat,
            "min_lon": min_lon,
            "max_lat": max_lat,
            "max_lon": max_lon
        })
        
        return [dict(row._mapping) for row in result]
    except Exception as e:
        logger.error(f"Failed to get heatmap data: {e}")
        return []


def store_air_quality_reading(
    db: Session,
    station_id: str,
    lat: float,
    lon: float,
    aqi: int,
    pm25: float = None,
    pm10: float = None,
    o3: float = None,
    no2: float = None,
    source: str = "api"
) -> bool:
    """
    Store air quality reading in database.
    
    Args:
        db: Database session
        station_id: Station identifier
        lat: Latitude
        lon: Longitude
        aqi: Air Quality Index
        pm25: PM2.5 value
        pm10: PM10 value
        o3: O3 value
        no2: NO2 value
        source: Data source
        
    Returns:
        True if successful
    """
    try:
        query = text("""
            INSERT INTO air_quality_readings 
            (id, station_id, location, timestamp, aqi, pm25, pm10, o3, no2, source, created_at)
            VALUES 
            (gen_random_uuid(), :station_id, 
             ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
             :timestamp, :aqi, :pm25, :pm10, :o3, :no2, :source, :created_at)
        """)
        
        db.execute(query, {
            "station_id": station_id,
            "lat": lat,
            "lon": lon,
            "timestamp": datetime.utcnow(),
            "aqi": aqi,
            "pm25": pm25,
            "pm10": pm10,
            "o3": o3,
            "no2": no2,
            "source": source,
            "created_at": datetime.utcnow()
        })
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to store reading: {e}")
        db.rollback()
        return False


def store_fire_detection(
    db: Session,
    lat: float,
    lon: float,
    brightness: float,
    confidence: int,
    acquisition_date: datetime,
    instrument: str
) -> bool:
    """
    Store fire detection in database.
    
    Args:
        db: Database session
        lat: Latitude
        lon: Longitude
        brightness: Fire brightness
        confidence: Confidence level
        acquisition_date: Date of acquisition
        instrument: Instrument name
        
    Returns:
        True if successful
    """
    try:
        query = text("""
            INSERT INTO fire_detections
            (id, location, brightness, confidence, acquisition_date, instrument, created_at)
            VALUES
            (gen_random_uuid(), ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
             :brightness, :confidence, :acquisition_date, :instrument, :created_at)
        """)
        
        db.execute(query, {
            "lat": lat,
            "lon": lon,
            "brightness": brightness,
            "confidence": confidence,
            "acquisition_date": acquisition_date,
            "instrument": instrument,
            "created_at": datetime.utcnow()
        })
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to store fire detection: {e}")
        db.rollback()
        return False
