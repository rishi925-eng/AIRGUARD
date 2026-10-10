# AERION (AIRGUARD) — Advanced Air Quality Intelligence & Exposure System

> **Built for WeMakeDevs Bharat Builds Tour — Environmental Hacks (Oct 8–11, 2026)**  
> **Track 01: Air** — *Pollution, exposure, stubble burning, indoor air & school safety*  
> **AWS Integration**: AWS Open Source Strands Agent SDK • AWS IoT Core • AWS Cognito • AWS S3 • AWS SNS • CloudFormation

---

## 🌟 Hackathon Highlights & Track 01 Alignment

| Challenge Topic | How AERION Solves It | Technology / Where AWS Fits |
| :--- | :--- | :--- |
| **Real-Time AQI** | Calibrated ground-truth CPCB / OpenAQ multi-pollutant readings with WHO guideline ratios | FastAPI, SQLite (Dev) / PostGIS (Prod) |
| **Pollution Exposure** | Inhaled dose accumulation tracker based on physical exertion & travel duration | Personal Exposure Engine, Health Risk Score |
| **Stubble & Fire Hotspots** | Real-time agricultural burning & wildfire detection with atmospheric dispersion plumes | NASA FIRMS API, AWS S3 imagery cache |
| **Clean-Air Routing** | Commute pathfinding that routes around high-pollution corridors, saving ~42% inhaled dose | Mapbox GL JS, Multi-Factor Graph Routing |
| **School Safety on Bad Days** | Morning Assembly Index and automatic sports advisories for children | Automated Alert System, AWS SNS Broadcast |
| **Indoor Air & Purifiers** | Real-time ESP32 indoor telemetry with automatic purifier actuation | ESP32 (PMS5003/BME680), **AWS IoT Core** (MQTT) |
| **AI Multi-Agent System** | 7 specialized agents answering natural language queries on air safety | **AWS Open Source Strands Agent SDK** |
| **What-If Policy Simulator** | City command simulator for municipal policy interventions (odd-even, construction bans) | ML Scenario Engine, XGBoost Ensemble |

---

## Overview

AERION is an end-to-end, predictive air intelligence and exposure prevention platform. It unifies real-time sensor spectrometry, NASA satellite fire tracking, multi-horizon machine learning forecasting, and an AWS Strands multi-agent AI orchestrator to protect individuals, commuters, schools, and city administrators.

## Features

### Core Capabilities
- **Real-Time AQI Monitoring**: Live air quality data from OpenAQ network
- **7-Day Forecasting**: ML-powered air quality predictions
- **Fire & Smoke Tracking**: NASA FIRMS wildfire data integration
- **Personal Exposure Tracking**: Calculate cumulative exposure based on activity
- **Smart Route Planning**: Find cleanest paths with Mapbox integration
- **Activity Recommendations**: AI-powered suggestions for outdoor activities
- **Alert System**: Proactive notifications for air quality changes
- **Indoor Monitoring**: ESP32-based IoT sensors for home/office
- **School Air Quality**: Dedicated monitoring for educational institutions
- **City-Wide Analytics**: Comprehensive urban air quality insights

### AI-Powered Intelligence
- **Multi-Agent System**: Specialized AI agents for different aspects (Strands framework)
- **Natural Language Assistant**: Conversational interface for queries
- **Anomaly Detection**: Identify unusual pollution patterns
- **Source Attribution**: ML-based pollution source identification

## Architecture

```
AERION/
├── backend/           # FastAPI REST API
├── frontend/          # Next.js 14 web application
├── ai/               # Strands AI agent system
├── ml/               # Machine learning models
├── iot/              # ESP32 indoor sensor firmware
├── infrastructure/   # AWS CloudFormation templates
├── docs/             # Documentation
└── docker-compose.yml
```

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with PostGIS
- **Cache**: Redis
- **Authentication**: AWS Cognito / JWT

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Mapbox GL JS
- **Charts**: Recharts
- **State Management**: React Context + SWR

### AI/ML
- **Agent Framework**: Strands
- **ML Models**: scikit-learn, XGBoost
- **Feature Engineering**: pandas, numpy
- **LLM Integration**: OpenAI GPT-4

### IoT
- **Hardware**: ESP32-DevKit
- **Sensors**: PMS5003, BME680, MQ-135
- **Protocol**: MQTT → AWS IoT Core

### Infrastructure
- **Cloud Provider**: AWS
- **Services**: RDS, S3, Cognito, SNS, ECS, Amplify, EventBridge, IoT Core
- **IaC**: CloudFormation

## Data Sources

1. **OpenAQ API**: Global air quality data (PM2.5, PM10, O3, NO2, SO2, CO)
2. **Open-Meteo API**: Weather data and air quality forecasts
3. **NASA FIRMS**: Real-time wildfire detection
4. **Mapbox**: Geocoding, routing, and mapping
5. **Custom IoT Sensors**: Indoor air quality data

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- AWS Account (for production deployment)

### Local Development

1. **Clone and Setup**
```bash
git clone <repository-url>
cd AERION
cp .env.example .env
# Edit .env with your API keys
```

2. **Start Services with Docker Compose**
```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 8000)
- Frontend (port 3000)

3. **Access the Application**
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- API Health: http://localhost:8000/health

### Manual Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### AI Agents
```bash
cd ai
pip install -r requirements.txt
python orchestrator.py
```

#### ML Training
```bash
cd ml
pip install -r requirements.txt
python train_model.py
```

## API Documentation

### Key Endpoints

#### Air Quality
- `GET /api/air/current?lat={lat}&lon={lon}` - Current AQI
- `GET /api/air/historical?lat={lat}&lon={lon}&days={days}` - Historical data
- `GET /api/air/stations?bounds={bounds}` - Nearby stations

#### Forecasting
- `GET /api/forecast?lat={lat}&lon={lon}&days={days}` - AQI forecast

#### Fire Detection
- `GET /api/fire/active?bounds={bounds}` - Active fires in area

#### Exposure Tracking
- `POST /api/exposure/calculate` - Calculate personal exposure
- `GET /api/exposure/history` - User exposure history

#### Smart Routing
- `POST /api/routes/cleanest` - Find cleanest route between points

#### Alerts
- `POST /api/alerts/subscribe` - Subscribe to alerts
- `GET /api/alerts/active` - Active air quality alerts

#### AI Assistant
- `POST /api/assistant/chat` - Natural language queries

#### IoT
- `POST /api/iot/readings` - Submit sensor readings
- `GET /api/iot/devices` - List user devices

Full API documentation: http://localhost:8000/docs

## Environment Variables

### Required
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/airguard
REDIS_URL=redis://localhost:6379

# API Keys
OPENAQ_API_KEY=your_key
NASA_FIRMS_API_KEY=your_key
MAPBOX_TOKEN=your_token
OPENAI_API_KEY=your_key

# AWS (Production)
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=your_pool_id
AWS_COGNITO_CLIENT_ID=your_client_id
AWS_IOT_ENDPOINT=your_endpoint.iot.us-east-1.amazonaws.com
S3_BUCKET_NAME=airguard-data

# Security
JWT_SECRET=your_secret_key
CORS_ORIGINS=http://localhost:3000
```

## Deployment

### AWS Deployment

1. **Provision Infrastructure**
```bash
cd infrastructure
aws cloudformation create-stack --stack-name airguard-infrastructure --template-body file://cloudformation/main.yml --parameters file://parameters.json --capabilities CAPABILITY_IAM
```

2. **Build and Push Docker Images**
```bash
# Backend
docker build -t airguard-backend ./backend
docker tag airguard-backend:latest <ecr-url>/airguard-backend:latest
docker push <ecr-url>/airguard-backend:latest

# Frontend
docker build -t airguard-frontend ./frontend
docker tag airguard-frontend:latest <ecr-url>/airguard-frontend:latest
docker push <ecr-url>/airguard-frontend:latest
```

3. **Deploy to ECS**
```bash
aws ecs update-service --cluster airguard-cluster --service airguard-backend --force-new-deployment
aws ecs update-service --cluster airguard-cluster --service airguard-frontend --force-new-deployment
```

4. **Deploy Frontend to Amplify**
```bash
cd frontend
amplify publish
```

## IoT Device Setup

### Hardware Requirements
- ESP32 DevKit
- PMS5003 Particulate Matter Sensor
- BME680 Temperature/Humidity/VOC Sensor
- MQ-135 Air Quality Sensor

### Flashing Firmware
```bash
cd iot
# Install Arduino CLI and ESP32 board support
arduino-cli core install esp32:esp32
# Configure WiFi and AWS IoT credentials in config.h
arduino-cli compile --fqbn esp32:esp32:esp32 indoor_sensor
arduino-cli upload -p /dev/ttyUSB0 --fqbn esp32:esp32:esp32 indoor_sensor
```

## Machine Learning Models

### Training
```bash
cd ml
python scripts/train_aqi_predictor.py --epochs 100 --model xgboost
python scripts/train_anomaly_detector.py
python scripts/train_attribution_model.py
```

Models are saved to `ml/models/` and automatically loaded by the backend.

### Model Performance
- AQI Prediction: RMSE < 15, R² > 0.85
- Anomaly Detection: F1 Score > 0.90
- Source Attribution: Accuracy > 80%

## Monitoring & Observability

- **Health Checks**: `/health` endpoint
- **Metrics**: Prometheus-compatible `/metrics`
- **Logging**: Structured JSON logs
- **Tracing**: OpenTelemetry integration (AWS X-Ray)

## Testing

### Backend Tests
```bash
cd backend
pytest tests/ --cov=app
```

### Frontend Tests
```bash
cd frontend
npm run test
npm run test:e2e
```

### Load Testing
```bash
cd backend
locust -f tests/load/locustfile.py
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Backend: PEP 8, type hints, docstrings
- Frontend: ESLint, Prettier, TypeScript strict mode
- Commit Messages: Conventional Commits

## Security

- All API keys stored in AWS Secrets Manager (production)
- JWT-based authentication with refresh tokens
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection protection via parameterized queries
- XSS protection in frontend
- CORS configuration

## License

MIT License - see LICENSE file

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@airguard.io

## Acknowledgments

- OpenAQ for global air quality data
- NASA FIRMS for wildfire detection
- Open-Meteo for weather forecasts
- Strands AI framework

---

Built with ❤️ for cleaner air and healthier communities
