# 3-Minute Demo Video Script: AERION (AIRGUARD)
## WeMakeDevs Bharat Builds Tour — Environmental Hacks (Track 01: Air)
*Target Duration: Exactly 2:45 to 2:55 (Must be under 3 minutes per hackathon rules)*

---

### Segment 1: The Problem (0:00 – 0:35)
- **Visual**: Show news clips/images of toxic winter haze in Delhi-NCR/North India or open the AERION dashboard showing Delhi NCR at AQI 287 (Very Unhealthy).
- **Voiceover**: 
  > *"Every winter across North India, millions face suffocating air with AQI readings crossing 300 to 500+. Stubble burning, vehicular emissions, and thermal inversions trap toxic particulates in our lungs. Current air apps are passive—they give a single retrospective number, but never tell commuters how to dodge high-exposure corridors, never tell parents if a morning school assembly is safe, and never attribute what is actually causing the spike. To solve this, we built AERION."*

---

### Segment 2: Live Platform & Core Features (0:35 – 1:25)
- **Visual**: 
  1. Click through the city switcher (Gorakhpur -> Delhi NCR -> Mumbai).
  2. Highlight the real-time spectrometry comparison against WHO limits (PM2.5, PM10, NO2, O3, CO).
  3. Navigate to **Clean Routes** (`/routes`): show how selecting the clean-air corridor saves ~42% inhaled particulate dose.
  4. Navigate to **School Safety** (`/schools`): show the Morning Assembly Index and automated alerts.
- **Voiceover**: 
  > *"AERION is an end-to-end air intelligence and exposure prevention platform built with Next.js 14 and FastAPI. Here on our live dashboard, citizens get calibrated ground-truth readings and real-time WHO safety ratios. Commuters can use our Clean Route engine to navigate through low-exposure green corridors, cutting inhaled pollution by over 40%. For schools, our Morning Assembly Index issues real-time advisories to keep children indoors during dangerous inversion hours."*

---

### Segment 3: AI Agents & ML Predictor (1:25 – 2:05)
- **Visual**:
  1. Open **AI Assistant** (`/assistant`). Type: *"Can I go for an evening run at 6 PM?"*
  2. Show the multi-agent response breaking down current AQI (184), forecasted AQI, and actionable advice.
  3. Switch to **ML Forecast** (`/forecast`) showing 72-hour Bayesian trajectory and the **Source Attribution** breakdown (Biomass vs. Inversion vs. Traffic).
  4. Quick peek at the terminal running `python test_system.py` verifying the multi-agent suite.
- **Voiceover**: 
  > *"Under the hood, AERION is powered by AWS's open-source Strands Agent framework. Seven specialized autonomous agents—covering AQI, Forecast, Fire, Exposure, Route, Alerts, and Recommendations—collaborate to answer real-world questions with evidence-backed guidance. Our ML models run an XGBoost and LSTM ensemble to forecast air quality up to 72 hours ahead and run Source Intelligence to diagnose whether stubble burning or traffic is the primary culprit."*

---

### Segment 4: Where AWS Fits & Architecture (2:05 – 2:40)
- **Visual**: 
  1. Show the Architecture diagram from `docs/ARCHITECTURE.md` or CloudFormation template (`infrastructure/cloudformation/main.yml`).
  2. Show the ESP32 IoT code (`iot/indoor_sensor/indoor_sensor.ino`) and AWS IoT Core / MQTT integration.
- **Voiceover**: 
  > *"AERION leverages AWS across the stack:
  > - **AWS Open Source Strands Agent SDK** powers our multi-agent AI system.
  > - **AWS IoT Core** ingests real-time indoor telemetry from our ESP32 sensor hardware to trigger home air purifiers.
  > - **AWS Cognito** secures citizen and municipal access.
  > - **AWS SNS** broadcasts hazardous spike alerts.
  > - And our full stack is declaratively provisioned via **AWS CloudFormation** across ECS Fargate and RDS PostgreSQL."*

---

### Segment 5: Impact & Conclusion (2:40 – 2:55)
- **Visual**: Return to main dashboard overview; show GitHub repository.
- **Voiceover**: 
  > *"AERION doesn't just measure bad air—it protects every breath with predictive intelligence, smart routing, and agentic action. Thank you WeMakeDevs and AWS for this incredible Bharat Builds Tour!"*
