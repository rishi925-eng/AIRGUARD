"""
Application configuration management.
Loads settings from environment variables with validation.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator
import os


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    APP_NAME: str = "AIRGUARD"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", description="Environment: development, staging, production")
    DEBUG: bool = Field(default=True, description="Debug mode")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ],
        description="Allowed CORS origins"
    )
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./airguard_dev.db",
        description="PostgreSQL or SQLite connection URL"
    )
    DATABASE_POOL_SIZE: int = Field(default=20, description="Database connection pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=10, description="Max overflow connections")
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379", description="Redis connection URL")
    REDIS_CACHE_TTL: int = Field(default=3600, description="Default cache TTL in seconds")
    
    # Security
    JWT_SECRET: str = Field(default="dev_secret_change_in_production", description="JWT signing secret")
    SECRET_KEY: Optional[str] = Field(default=None, description="Secret key alias")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="Access token expiration")
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, description="Refresh token expiration")
    
    # AWS Configuration
    AWS_REGION: str = Field(default="us-east-1", description="AWS region")
    AWS_ACCESS_KEY_ID: Optional[str] = Field(default=None, description="AWS access key")
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(default=None, description="AWS secret key")
    
    # AWS Cognito
    AWS_COGNITO_USER_POOL_ID: Optional[str] = Field(default=None, description="Cognito User Pool ID")
    COGNITO_USER_POOL_ID: Optional[str] = Field(default=None, description="Cognito User Pool ID alias")
    AWS_COGNITO_CLIENT_ID: Optional[str] = Field(default=None, description="Cognito Client ID")
    COGNITO_CLIENT_ID: Optional[str] = Field(default=None, description="Cognito Client ID alias")
    AWS_COGNITO_REGION: Optional[str] = Field(default=None, description="Cognito region")
    
    # AWS S3
    S3_BUCKET_NAME: Optional[str] = Field(default="airguard-data", description="S3 bucket for data storage")
    
    # AWS IoT Core
    AWS_IOT_ENDPOINT: Optional[str] = Field(default=None, description="AWS IoT Core endpoint")
    IOT_CORE_ENDPOINT: Optional[str] = Field(default=None, description="IoT Core endpoint alias")
    
    # External APIs
    OPENAQ_API_KEY: Optional[str] = Field(default=None, description="OpenAQ API key")
    OPENAQ_BASE_URL: str = Field(default="https://api.openaq.org/v3", description="OpenAQ API base URL")
    
    NASA_FIRMS_API_KEY: Optional[str] = Field(default=None, description="NASA FIRMS API key")
    NASA_FIRMS_BASE_URL: str = Field(
        default="https://firms.modaps.eosdis.nasa.gov/api/area/csv",
        description="NASA FIRMS API base URL"
    )
    
    MAPBOX_TOKEN: Optional[str] = Field(default=None, description="Mapbox access token")
    MAPBOX_ACCESS_TOKEN: Optional[str] = Field(default=None, description="Mapbox access token alias")
    MAPBOX_BASE_URL: str = Field(default="https://api.mapbox.com", description="Mapbox API base URL")
    
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API key")
    OPENAI_MODEL: str = Field(default="gpt-4", description="OpenAI model to use")
    
    OPENMETEO_BASE_URL: str = Field(
        default="https://air-quality-api.open-meteo.com/v1/air-quality",
        description="Open-Meteo Air Quality API"
    )
    OPEN_METEO_API_URL: str = Field(
        default="https://api.open-meteo.com/v1",
        description="Open-Meteo Base API"
    )
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = Field(default=60, description="API rate limit per minute")
    RATE_LIMIT_PER_HOUR: int = Field(default=1000, description="API rate limit per hour")
    
    # Data Collection
    DATA_COLLECTION_INTERVAL_MINUTES: int = Field(default=60, description="Data collection interval")
    DATA_RETENTION_DAYS: int = Field(default=90, description="Data retention period")
    
    # ML Models
    ML_MODELS_PATH: str = Field(default="/app/ml_models", description="Path to ML model files")
    ML_PREDICTION_DAYS: int = Field(default=7, description="Number of days to predict")
    
    # Alert System
    ALERT_CHECK_INTERVAL_MINUTES: int = Field(default=15, description="Alert check interval")
    SNS_TOPIC_ARN: Optional[str] = Field(default=None, description="AWS SNS topic ARN for alerts")
    SNS_ALERT_TOPIC_ARN: Optional[str] = Field(default=None, description="AWS SNS topic ARN alias")
    
    # Feature & Mock Flags
    USE_MOCK_DATA: bool = Field(default=False, description="Whether to force mock data")
    
    # Workers
    CELERY_BROKER_URL: Optional[str] = Field(default=None, description="Celery broker URL")
    CELERY_RESULT_BACKEND: Optional[str] = Field(default=None, description="Celery result backend")
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("DATABASE_URL")
    def validate_database_url(cls, v):
        """Validate database URL format — accepts PostgreSQL and SQLite."""
        if not v.startswith(("postgresql://", "postgresql+psycopg2://", "sqlite:///")):
            raise ValueError("DATABASE_URL must be postgresql:// or sqlite:/// connection string")
        return v
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v):
        """Validate environment value."""
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}")
        return v
    
    @property
    def effective_mapbox_token(self) -> Optional[str]:
        return self.MAPBOX_TOKEN or self.MAPBOX_ACCESS_TOKEN
    
    @property
    def effective_jwt_secret(self) -> str:
        return self.JWT_SECRET or self.SECRET_KEY or "dev_secret_key_for_jwt_signing_min_32_chars_long"
    
    @property
    def effective_cognito_pool_id(self) -> Optional[str]:
        return self.AWS_COGNITO_USER_POOL_ID or self.COGNITO_USER_POOL_ID
        
    @property
    def effective_cognito_client_id(self) -> Optional[str]:
        return self.AWS_COGNITO_CLIENT_ID or self.COGNITO_CLIENT_ID
        
    @property
    def effective_sns_topic(self) -> Optional[str]:
        return self.SNS_TOPIC_ARN or self.SNS_ALERT_TOPIC_ARN
        
    @property
    def effective_iot_endpoint(self) -> Optional[str]:
        return self.AWS_IOT_ENDPOINT or self.IOT_CORE_ENDPOINT

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.ENVIRONMENT == "development"
    
    @property
    def celery_config(self) -> dict:
        """Get Celery configuration."""
        return {
            "broker_url": self.CELERY_BROKER_URL or self.REDIS_URL,
            "result_backend": self.CELERY_RESULT_BACKEND or self.REDIS_URL,
            "task_serializer": "json",
            "result_serializer": "json",
            "accept_content": ["json"],
            "timezone": "UTC",
            "enable_utc": True,
        }
    
    class Config:
        """Pydantic config."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings instance."""
    return settings
