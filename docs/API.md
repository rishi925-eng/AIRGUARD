# AIRGUARD API Documentation

Base URL: `https://api.airguard.io` or `http://localhost:8000`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "message": "User registered successfully"
}
```

#### POST /api/auth/login
Login and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### Air Quality

#### GET /api/air/current
Get current air quality for a location.

**Query Parameters:**
- `lat` (required): Latitude (-90 to 90)
- `lon` (required): Longitude (-180 to 180)
- `radius` (optional): Search radius in meters (default: 10000, max: 50000)

**Response:**
```json
{
  "location": {"lat": 40.7128, "lon": -74.0060},
  "aqi": 75,
  "category": {
    "level": "Moderate",
    "color": "#ffff00",
    "message": "Acceptable for most people"
  },
  "dominant_pollutant": "PM2.5",
  "measurements": [
    {
      "parameter": "pm25",
      "value": 25.5,
      "unit": "µg/m³",
      "last_updated": "2024-01-01T12:00:00Z"
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z",
  "station": {
    "id": "station_123",
    "name": "Downtown Monitor",
    "distance": 1500
  }
}
```

#### GET /api/air/historical
Get historical air quality data.

**Query Parameters:**
- `lat`, `lon` (required): Location coordinates
- `days` (optional): Number of days (1-90, default: 7)

**Response:**
```json
{
  "location": {"lat": 40.7128, "lon": -74.0060},
  "period": {
    "start": "2023-12-25T00:00:00Z",
    "end": "2024-01-01T00:00:00Z"
  },
  "data": [
    {"date": "2023-12-25", "aqi": 65, "pm25": 20.5},
    {"date": "2023-12-26", "aqi": 72, "pm25": 23.1}
  ]
}
```

#### GET /api/air/stations
Get nearby air quality monitoring stations.

**Query Parameters:**
- `lat`, `lon` (required): Center coordinates
- `radius` (optional): Search radius in meters (default: 25000, max: 100000)
- `limit` (optional): Max results (default: 10, max: 50)

**Response:**
```json
{
  "location": {"lat": 40.7128, "lon": -74.0060},
  "radius": 25000,
  "count": 5,
  "stations": [
    {
      "id": "station_123",
      "name": "Downtown Monitor",
      "location": {"lat": 40.7100, "lon": -74.0050},
      "distance": 1500,
      "parameters": ["pm25", "pm10", "o3", "no2"]
    }
  ]
}
```

### Forecasting

#### GET /api/forecast
Get air quality forecast.

**Query Parameters:**
- `lat`, `lon` (required): Location coordinates
- `days` (optional): Forecast days (1-7, default: 7)

**Response:**
```json
{
  "location": {"lat": 40.7128, "lon": -74.0060},
  "forecast_days": 7,
  "forecasts": [
    {
      "date": "2024-01-02",
      "aqi": 75,
      "aqi_max": 85,
      "pm25_avg": 25.5,
      "pm25_max": 30.2,
      "confidence": 0.85
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### GET /api/forecast/hourly
Get hourly forecast.

**Query Parameters:**
- `lat`, `lon` (required): Location
- `hours` (optional): Number of hours (1-168, default: 24)

**Response:**
```json
{
  "location": {"lat": 40.7128, "lon": -74.0060},
  "forecasts": [
    {
      "time": "2024-01-01T13:00:00Z",
      "aqi": 72,
      "pm25": 24.5,
      "pm10": 45.0,
      "o3": 35.0,
      "no2": 20.0
    }
  ]
}
```

### Fire Detection

#### GET /api/fire/active
Get active fires in area.

**Query Parameters:**
- `bounds` (required): Bounding box "min_lon,min_lat,max_lon,max_lat"
- `days` (optional): Days of data (1-10, default: 1)

**Response:**
```json
{
  "bounds": {
    "min_lat": 40.0,
    "min_lon": -75.0,
    "max_lat": 41.0,
    "max_lon": -74.0
  },
  "count": 3,
  "fires": [
    {
      "latitude": 40.5,
      "longitude": -74.5,
      "brightness": 325.5,
      "confidence": 85,
      "acquisition_date": "2024-01-01T12:00:00Z",
      "instrument": "VIIRS"
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Exposure Tracking

#### POST /api/exposure/calculate
Calculate personal air quality exposure.

**Request Body:**
```json
{
  "user_id": "uuid",
  "activities": [
    {
      "location": {"lat": 40.7128, "lon": -74.0060},
      "duration": 2,
      "activity_type": "walking"
    }
  ],
  "date": "2024-01-01"
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "date": "2024-01-01",
  "total_exposure": 150,
  "average_aqi": 75,
  "activities": [
    {
      "location": {"lat": 40.7128, "lon": -74.0060},
      "activity_type": "walking",
      "duration_hours": 2,
      "aqi": 75,
      "exposure_score": 150
    }
  ]
}
```

#### GET /api/exposure/history
Get user's exposure history.

**Query Parameters:**
- `user_id` (required): User ID
- `days` (optional): Number of days (1-90, default: 30)

**Response:**
```json
{
  "user_id": "uuid",
  "period_days": 30,
  "history": [
    {
      "date": "2024-01-01",
      "total_exposure": 150,
      "average_aqi": 75
    }
  ]
}
```

### Smart Routing

#### POST /api/routes/cleanest
Find cleanest route between points.

**Request Body:**
```json
{
  "start": {"lat": 40.7128, "lon": -74.0060},
  "end": {"lat": 40.7589, "lon": -73.9851},
  "mode": "walking",
  "waypoints": []
}
```

**Response:**
```json
{
  "route": {
    "geometry": [],
    "distance": 5000,
    "duration": 1200,
    "average_aqi": 65,
    "waypoints": []
  },
  "alternatives": []
}
```

### Alerts

#### POST /api/alerts/subscribe
Subscribe to air quality alerts.

**Request Body:**
```json
{
  "user_id": "uuid",
  "location": {"lat": 40.7128, "lon": -74.0060},
  "threshold": 100,
  "notification_method": "email"
}
```

**Response:**
```json
{
  "message": "Subscribed successfully",
  "subscription_id": "uuid"
}
```

#### GET /api/alerts/active
Get active alerts.

**Query Parameters:**
- `lat`, `lon` (required): Location
- `radius` (optional): Search radius (default: 50000)

**Response:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "type": "high_aqi",
      "severity": "warning",
      "message": "Air quality has reached unhealthy levels",
      "issued_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### AI Assistant

#### POST /api/assistant/chat
Chat with AI assistant.

**Request Body:**
```json
{
  "message": "What's the air quality today?",
  "user_id": "uuid",
  "context": {}
}
```

**Response:**
```json
{
  "response": "The current AQI is 75 (Moderate). Most people can engage in outdoor activities.",
  "suggestions": [
    "Check current AQI",
    "Get forecast",
    "Find cleanest route"
  ]
}
```

### IoT Devices

#### POST /api/iot/readings
Submit IoT sensor reading.

**Request Body:**
```json
{
  "device_id": "esp32_001",
  "timestamp": "2024-01-01T12:00:00Z",
  "pm25": 35.5,
  "pm10": 50.2,
  "temperature": 23.5,
  "humidity": 45.0,
  "co2": 650
}
```

**Response:**
```json
{
  "message": "Reading received",
  "device_id": "esp32_001"
}
```

#### GET /api/iot/devices
List user's IoT devices.

**Query Parameters:**
- `user_id` (required): User ID

**Response:**
```json
{
  "devices": [
    {
      "device_id": "esp32_001",
      "name": "Living Room Monitor",
      "status": "online",
      "last_reading": "2024-01-01T12:00:00Z"
    }
  ]
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "detail": "Error message"
}
```

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing/invalid token)
- `404`: Not Found
- `422`: Validation Error
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

## Rate Limiting

- **Default**: 60 requests per minute per IP
- **Authenticated**: 1000 requests per hour per user
- Headers returned:
  - `X-RateLimit-Limit`: Limit per period
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp
