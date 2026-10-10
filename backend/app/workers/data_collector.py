"""
Background worker for collecting air quality data from external APIs.
Runs periodically to fetch and store data in database.
"""
import asyncio
import logging
from datetime import datetime, timedelta
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.config import settings
from app.services.openaq import OpenAQService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


class DataCollector:
    """Collects air quality data from various sources."""
    
    def __init__(self):
        self.openaq_service = OpenAQService()
        self.collection_interval = settings.DATA_COLLECTION_INTERVAL_MINUTES * 60
    
    async def collect_openaq_data(self):
        """Collect data from OpenAQ API for major cities."""
        logger.info("Collecting OpenAQ data...")
        
        # Major cities to monitor
        cities = [
            {"name": "New York", "lat": 40.7128, "lon": -74.0060},
            {"name": "Los Angeles", "lat": 34.0522, "lon": -118.2437},
            {"name": "Chicago", "lat": 41.8781, "lon": -87.6298},
            {"name": "Houston", "lat": 29.7604, "lon": -95.3698},
            {"name": "Phoenix", "lat": 33.4484, "lon": -112.0740},
        ]
        
        for city in cities:
            try:
                data = await self.openaq_service.get_latest_measurements(
                    city["lat"], city["lon"], radius=50000
                )
                
                # In production, store in database
                logger.info(f"Collected data for {city['name']}: {len(data.get('measurements', []))} measurements")
                
                # Simulate database storage
                # db = SessionLocal()
                # try:
                #     # Store measurements in database
                #     pass
                # finally:
                #     db.close()
                
            except Exception as e:
                logger.error(f"Error collecting data for {city['name']}: {e}")
            
            # Rate limiting
            await asyncio.sleep(1)
    
    async def collect_fire_data(self):
        """Collect wildfire data from NASA FIRMS."""
        logger.info("Collecting NASA FIRMS fire data...")
        
        # In production, fetch from NASA FIRMS API
        # For now, log placeholder
        logger.info("Fire data collection completed (mock)")
    
    async def cleanup_old_data(self):
        """Remove data older than retention period."""
        logger.info("Cleaning up old data...")
        
        cutoff_date = datetime.utcnow() - timedelta(days=settings.DATA_RETENTION_DAYS)
        
        # In production, delete old records from database
        logger.info(f"Would delete data older than {cutoff_date.isoformat()}")
    
    async def run_collection_cycle(self):
        """Run one complete data collection cycle."""
        logger.info("Starting data collection cycle...")
        
        try:
            await self.collect_openaq_data()
            await self.collect_fire_data()
            await self.cleanup_old_data()
            
            logger.info("Data collection cycle completed successfully")
        except Exception as e:
            logger.error(f"Error in collection cycle: {e}")
    
    async def run_forever(self):
        """Run data collection in infinite loop."""
        logger.info(f"Starting data collector (interval: {self.collection_interval}s)")
        
        while True:
            await self.run_collection_cycle()
            logger.info(f"Sleeping for {self.collection_interval} seconds...")
            await asyncio.sleep(self.collection_interval)


async def main():
    """Main entry point for worker."""
    collector = DataCollector()
    await collector.run_forever()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Data collector stopped by user")
    except Exception as e:
        logger.error(f"Fatal error in data collector: {e}")
