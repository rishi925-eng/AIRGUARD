# WeMakeDevs Bharat Builds Tour: Environmental Hacks
## Event 02 — Track 01: Air
### Project Name: AERION (AIRGUARD) — Real-Time Predictive Air Intelligence & Exposure Engine

---

### 1. The Problem
Across India and the Indo-Gangetic Plain, seasonal winter inversions, stubble/crop burning, industrial emissions, and heavy traffic produce hazardous Air Quality Index (AQI) levels exceeding 300 to 500+ every year. 

Current air quality tools suffer from three critical shortcomings:
1. **Passive Reporting**: Existing apps only show raw numbers after the pollution has already been inhaled; they do not forecast hyper-local trajectories or identify *why* the air is bad (e.g., thermal inversion vs. stubble burning).
2. **No Exposure Tracking or Actionable Routing**: Commuters have no way of knowing how much toxic particulate mass they inhale during outdoor trips, nor do maps offer "clean-air routes" that avoid high-pollution corridors.
3. **No Coordinated Protection for Vulnerable Populations**: Schools, parents, and asthmatic individuals lack automated, policy-grade triggers (e.g., Morning Assembly Safety Indices, indoor purifier automation).

AERION solves this by transforming static air quality data into an active, predictive intelligence and intervention platform.

---

### 2. The Build & Architecture

AERION is built as a cloud-native, microservices-based platform:

- **Frontend**: Next.js 14 App Router, TypeScript, and Tailwind CSS with custom dark glassmorphism styling, interactive telemetry gauges, and Mapbox GL GIS visualization.
- **Backend API**: High-performance FastAPI (Python 3.11+) service providing 14 distinct API routes, featuring an automatic standalone SQLite engine with PostGIS compatibility polyfills for zero-friction local execution, and production PostgreSQL integration.
- **Machine Learning Pipeline**: 
  - **Multi-Horizon XGBoost + LSTM Ensemble**: Predicts AQI at 1h, 3h, 6h, 24h, and 72h intervals with 95% Bayesian confidence intervals.
  - **Source Intelligence Attribution**: Decomposes pollution into fire/biomass, atmospheric stagnation, traffic, and construction dust.
  - **What-If Scenario Simulator**: Simulates real-time policy levers (e.g., traffic reduction, industrial cutbacks, construction bans).
  - **Anomaly & Spike Detector**: Flags sudden toxic surges within 60 seconds.
- **IoT Hardware & Edge Firmware**: ESP32 microcontrollers wired to PMS5003 (PM2.5/PM10), BME680 (VOC, temp, humidity), and MQ-135 sensors, streaming real-time indoor air telemetry and triggering purifiers.

---

### 3. Where AWS Fits

AERION deeply integrates both **AWS Open-Source Tooling** and **AWS Cloud Services** in accordance with the hackathon's "Build It / Ship It" guidelines:

1. **Strands Agent SDK (AWS Open Source)**:
   - Powers our master multi-agent AI system.
   - Seven specialized autonomous sub-agents (`AQIAgent`, `ForecastAgent`, `FireAgent`, `ExposureAgent`, `RouteAgent`, `AlertAgent`, `RecommendationAgent`) run coordinated tool calls through an orchestrator to answer complex questions (e.g., *"Is it safe for my 8-year-old to play outdoor football at 5 PM in Gorakhpur?"*).

2. **AWS IoT Core**:
   - Ingests indoor telemetry from ESP32 edge sensors via MQTT over TLS.
   - Evaluates SQL rules to trigger smart purifier actuators when PM2.5 crosses safety thresholds.

3. **AWS Cognito**:
   - Manages citizen and administrative user pools with JWT authentication and role-based access for school and municipal dashboards.

4. **AWS S3**:
   - Provides durable object storage for satellite fire hotspot imagery, daily calibration data, and serialized ML model weights.

5. **AWS SNS (Simple Notification Service)**:
   - Delivers real-time emergency broadcast alerts to subscribers when AQI crosses hazardous levels (>300).

6. **AWS CloudFormation (Infrastructure as Code)**:
   - Full, automated CloudFormation template (`infrastructure/cloudformation/main.yml`) that provisions the complete production VPC, multi-AZ subnets, ECS Fargate clusters, RDS PostgreSQL, S3 buckets, and IoT policies.

7. **AWS SageMaker & Bedrock**:
   - Supports scalable model training jobs and foundation model inference for AI conversational diagnostics.

---

### 4. AI & ML Tools Used

- **Agent Framework**: AWS Open Source Strands Agent SDK
- **Machine Learning**: scikit-learn, XGBoost, NumPy, Pandas, SciPy
- **AI Models & Orchestration**: Custom multi-agent tool-calling architecture with support for Claude 3 (via AWS Bedrock) and OpenAI GPT-4
- **Assisted Coding**: Antigravity AI, Claude 3.7 Flash
