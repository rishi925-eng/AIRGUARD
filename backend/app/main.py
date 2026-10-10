import sys
import os

# Add project root to sys.path so ai and ml packages are accessible
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi import FastAPI, Request, status

from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import time

from app.config import settings
from app.database import init_db, check_db_connection
from app.api.routes import (
    air,
    weather,
    fire,
    forecast,
    exposure,
    routes as route_router,
    activities,
    alerts,
    assistant,
    schools,
    city,
    reports,
    iot,
    auth,
    analytics,
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    # Initialize database
    try:
        init_db()
        if check_db_connection():
            logger.info("Database connection established")
        else:
            logger.warning("Database connection check failed")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Advanced Air Quality Intelligence System API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add X-Process-Time header to responses."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed messages."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "body": exc.body,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error" if settings.is_production else str(exc),
        },
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers."""
    db_status = check_db_connection()
    return {
        "status": "healthy" if db_status else "degraded",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_status else "disconnected",
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }


# Include API routers (Mount on both /api/v1 and /api for seamless frontend compatibility)
for prefix in [settings.API_V1_PREFIX, "/api"]:
    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["Authentication"])
    app.include_router(air.router, prefix=f"{prefix}/air", tags=["Air Quality"])
    app.include_router(weather.router, prefix=f"{prefix}/weather", tags=["Weather"])
    app.include_router(fire.router, prefix=f"{prefix}/fire", tags=["Fire Detection"])
    app.include_router(forecast.router, prefix=f"{prefix}/forecast", tags=["Forecasting"])
    app.include_router(exposure.router, prefix=f"{prefix}/exposure", tags=["Exposure Tracking"])
    app.include_router(route_router.router, prefix=f"{prefix}/routes", tags=["Smart Routing"])
    app.include_router(activities.router, prefix=f"{prefix}/activities", tags=["Activities"])
    app.include_router(alerts.router, prefix=f"{prefix}/alerts", tags=["Alerts"])
    app.include_router(assistant.router, prefix=f"{prefix}/assistant", tags=["AI Assistant"])
    app.include_router(schools.router, prefix=f"{prefix}/schools", tags=["Schools"])
    app.include_router(city.router, prefix=f"{prefix}/city", tags=["City Analytics"])
    app.include_router(reports.router, prefix=f"{prefix}/reports", tags=["Reports"])
    app.include_router(iot.router, prefix=f"{prefix}/iot", tags=["IoT Devices"])
    app.include_router(analytics.router, prefix=f"{prefix}/analytics", tags=["Analytics"])



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
