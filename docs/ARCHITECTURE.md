# AIRGUARD System Architecture

## Overview

AIRGUARD is a cloud-native, microservices-based air quality monitoring and prediction platform built on AWS infrastructure.

## System Components

### 1. Backend API (FastAPI)
- **Purpose**: REST API for all data operations
- **Technology**: Python 3.11, FastAPI, PostgreSQL, Redis
- **Deployment**: AWS ECS Fargate
- **Responsibilities**:
  - Air quality data aggregation from OpenAQ
  - Real-time fire detection from NASA FIRMS
  - User authentication and authorization
  - Exposure tracking and calculation
  - IoT device management
  - ML model inference

### 2. Frontend Application (Next.js 14)
- **Purpose**: Web-based user interface
- **Technology**: React 18, Next.js 14, TypeScript, Tailwind CSS
- **Deployment**: AWS Amplify
- **Features**:
  - Real-time AQI dashboard
  - Interactive map with Mapbox GL
  - 7-day forecast visualization
  - Personal exposure tracking
  - AI assistant chat interface
  - Smart route planning

### 3. AI Agent System (Strands)
- **Purpose**: Conversational AI for natural language queries
- **Technology**: Python, OpenAI GPT-4, LangChain
- **Architecture**: Multi-agent orchestrator pattern
- **Agents**:
  - AQI Agent: Current air quality queries
  - Forecast Agent: Prediction queries
  - Fire Agent: Wildfire tracking
  - Exposure Agent: Personal health tracking
  - Route Agent: Path optimization

### 4. ML Pipeline
- **Purpose**: Air quality prediction and anomaly detection
- **Technology**: Python, XGBoost, scikit-learn
- **Models**:
  - AQI Prediction (7-day forecast)
  - Anomaly Detection (unusual pollution events)
  - Source Attribution (pollution source identification)
- **Training**: Scheduled retraining on AWS ECS

### 5. IoT Device System
- **Purpose**: Indoor air quality monitoring
- **Hardware**: ESP32, PMS5003, BME680, MQ-135
- **Protocol**: MQTT via AWS IoT Core
- **Data**: PM2.5, PM10, temperature, humidity, CO2, VOC

### 6. Data Pipeline
- **Data Collection Workers**: Background jobs for API polling
- **Storage**: PostgreSQL (primary), Redis (cache), S3 (historical)
- **Processing**: Real-time aggregation and alerting

## Data Flow

### Real-Time Air Quality Query
```
User → Frontend → Backend API → OpenAQ API → Response
                              → PostgreSQL (cache)
                              → Redis (cache)
```

### Forecast Generation
```
User Request → Backend → ML Model (XGBoost) → Forecast
                      → Historical Data (PostgreSQL)
                      → Weather API (Open-Meteo)
```

### IoT Data Ingestion
```
ESP32 Device → AWS IoT Core → Lambda → Backend API → PostgreSQL
                                                   → Real-time alerts
```

### AI Assistant Query
```
User Message → Frontend → AI Orchestrator → Agent Selection
                                         → External APIs
                                         → GPT-4 Processing
                                         → Response
```

## Infrastructure

### AWS Services Used

1. **Compute**
   - ECS Fargate: Backend API, ML training jobs
   - Amplify: Frontend hosting
   - Lambda: Event processing

2. **Database & Storage**
   - RDS PostgreSQL: Primary database with PostGIS
   - ElastiCache Redis: Caching layer
   - S3: Historical data, model artifacts

3. **Security & Identity**
   - Cognito: User authentication
   - Secrets Manager: API keys and credentials
   - IAM: Service permissions

4. **Networking**
   - VPC: Network isolation
   - ALB: Load balancing
   - CloudFront: CDN

5. **Monitoring & Alerts**
   - CloudWatch: Logs and metrics
   - SNS: Push notifications
   - EventBridge: Scheduled tasks

6. **IoT**
   - IoT Core: Device connectivity
   - IoT Analytics: Device data processing

## Scaling Strategy

### Horizontal Scaling
- **Backend**: Auto-scaling ECS tasks based on CPU/memory
- **Database**: Read replicas for query load
- **Cache**: Redis cluster with sharding

### Vertical Scaling
- **Database**: Upgrade RDS instance class
- **ML Training**: Use larger EC2 instances

### Performance Optimizations
- Redis caching for frequently accessed data
- Database indexing on geospatial queries
- CDN caching for static assets
- API response pagination
- Database connection pooling

## Security Architecture

### Authentication & Authorization
- JWT tokens for API authentication
- AWS Cognito for user management
- Role-based access control (RBAC)

### Data Protection
- Encryption at rest (RDS, S3)
- Encryption in transit (TLS 1.3)
- VPC network isolation
- Security groups for firewall rules

### API Security
- Rate limiting (60 req/min)
- Input validation and sanitization
- CORS policy enforcement
- SQL injection prevention

## Monitoring & Observability

### Metrics
- API response times
- Error rates and types
- Database query performance
- Cache hit rates
- ML model accuracy

### Logging
- Structured JSON logs
- Centralized log aggregation (CloudWatch)
- Log retention policies

### Alerting
- Critical error notifications
- Performance degradation alerts
- Security event alerts

## Disaster Recovery

### Backup Strategy
- Database: Daily automated backups (7-day retention)
- S3: Versioning enabled
- Configuration: Infrastructure as Code (CloudFormation)

### Recovery Procedures
- RTO: 1 hour
- RPO: 24 hours
- Multi-AZ deployment for high availability

## Development Workflow

### Environments
1. **Development**: Local Docker Compose
2. **Staging**: AWS staging stack
3. **Production**: AWS production stack

### CI/CD Pipeline
```
Git Push → GitHub Actions → Build → Test → Deploy
                          → Docker images
                          → Infrastructure updates
```

### Testing Strategy
- Unit tests: Backend (pytest), Frontend (Jest)
- Integration tests: API endpoints
- Load testing: Locust
- E2E tests: Playwright

## Future Enhancements

1. **GraphQL API**: Flexible querying for frontend
2. **WebSocket Support**: Real-time data streaming
3. **Mobile Apps**: Native iOS/Android
4. **Edge Computing**: Process IoT data at edge
5. **Advanced ML**: Deep learning models (LSTM, Transformer)
6. **Blockchain**: Decentralized data verification
7. **Global Expansion**: Multi-region deployment
