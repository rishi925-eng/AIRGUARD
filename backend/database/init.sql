-- AIRGUARD Database Initialization Script
-- PostgreSQL with PostGIS extension

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- User locations/favorites
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Air quality readings
CREATE TABLE IF NOT EXISTS air_quality_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id VARCHAR(255),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    aqi INTEGER,
    pm25 DECIMAL(10,2),
    pm10 DECIMAL(10,2),
    o3 DECIMAL(10,2),
    no2 DECIMAL(10,2),
    so2 DECIMAL(10,2),
    co DECIMAL(10,2),
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_air_quality_location ON air_quality_readings USING GIST(location);
CREATE INDEX idx_air_quality_timestamp ON air_quality_readings(timestamp);
CREATE INDEX idx_air_quality_station ON air_quality_readings(station_id);

-- Fire detections
CREATE TABLE IF NOT EXISTS fire_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    brightness DECIMAL(10,2),
    confidence INTEGER,
    acquisition_date TIMESTAMP NOT NULL,
    instrument VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fire_location ON fire_detections USING GIST(location);
CREATE INDEX idx_fire_date ON fire_detections(acquisition_date);

-- Forecasts
CREATE TABLE IF NOT EXISTS forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    forecast_date DATE NOT NULL,
    aqi_predicted INTEGER,
    pm25_predicted DECIMAL(10,2),
    confidence DECIMAL(5,2),
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forecast_location ON forecasts USING GIST(location);
CREATE INDEX idx_forecast_date ON forecasts(forecast_date);

-- Exposure tracking
CREATE TABLE IF NOT EXISTS exposure_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    duration_minutes INTEGER NOT NULL,
    activity_type VARCHAR(100),
    aqi INTEGER,
    exposure_score DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exposure_user ON exposure_logs(user_id);
CREATE INDEX idx_exposure_date ON exposure_logs(date);

-- IoT devices
CREATE TABLE IF NOT EXISTS iot_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    location GEOGRAPHY(POINT, 4326),
    device_type VARCHAR(50),
    firmware_version VARCHAR(50),
    last_seen TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_devices_user ON iot_devices(user_id);

-- IoT sensor readings
CREATE TABLE IF NOT EXISTS iot_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES iot_devices(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    pm25 DECIMAL(10,2),
    pm10 DECIMAL(10,2),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    co2 INTEGER,
    tvoc INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_iot_readings_device ON iot_readings(device_id);
CREATE INDEX idx_iot_readings_timestamp ON iot_readings(timestamp);

-- Alerts/subscriptions
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    threshold INTEGER NOT NULL,
    notification_method VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_user ON alert_subscriptions(user_id);
CREATE INDEX idx_alerts_location ON alert_subscriptions USING GIST(location);

-- Alert history
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP NOT NULL,
    aqi INTEGER,
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schools
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    student_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_location ON schools USING GIST(location);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50),
    period_start DATE,
    period_end DATE,
    file_url TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_user ON reports(user_id);

-- Create view for latest AQI by location
CREATE OR REPLACE VIEW latest_aqi_view AS
SELECT DISTINCT ON (station_id)
    station_id,
    location,
    timestamp,
    aqi,
    pm25,
    pm10
FROM air_quality_readings
ORDER BY station_id, timestamp DESC;

-- Function to calculate distance
CREATE OR REPLACE FUNCTION calculate_distance(lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION, lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Distance(
        ST_MakePoint(lon1, lat1)::geography,
        ST_MakePoint(lon2, lat2)::geography
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust for production)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO airguard;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO airguard;
