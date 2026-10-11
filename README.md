<p align="center">
  <img src="frontend/public/kisanguard-symbol.png" alt="KisanGuard" width="120" />
</p>

<h1 align="center">🌾 KisanGuard</h1>

<p align="center">
  <strong>AI-Powered Hyperlocal Heat & Drought Intelligence Platform for India's 150M+ Smallholder Farmers</strong>
</p>

<p align="center">
  <em>3 custom ML models · 6 languages · Real-time voice alerts · Ward-level 1 km precision</em>
</p>

<p align="center">
  <a href="#-architecture"><img src="https://img.shields.io/badge/AWS-Native-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS Native" /></a>
  <a href="#-ml-models"><img src="https://img.shields.io/badge/ML%20Models-3%20Production-00C7B7?style=for-the-badge&logo=tensorflow&logoColor=white" alt="ML Models" /></a>
  <a href="#-features"><img src="https://img.shields.io/badge/Languages-6%20Indian-8B5CF6?style=for-the-badge&logo=googletranslate&logoColor=white" alt="Languages" /></a>
  <a href="#-alert-delivery"><img src="https://img.shields.io/badge/Alert%20Channels-SMS%20%C2%B7%20Voice%20%C2%B7%20WhatsApp%20%C2%B7%20Push-10B981?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Channels" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

<br/>

## 🔥 The Crisis We're Solving

> **Every year, heat stress kills more Indian workers than floods and cyclones combined.** Over 150 million smallholder farmers — cultivating plots under 2 hectares — face devastating crop losses from rising temperatures with **zero access to localized, actionable intelligence.**

KisanGuard delivers **ward-level (1 km²) heat stress forecasts, crop drought intelligence, and AI-generated voice advisories** — directly to a farmer's phone in their native language — powered entirely by AWS.

<br/>

## ⚡ One-Glance Overview

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         K I S A N G U A R D                                │
 │                                                                             │
 │   📡 DATA INGESTION          🧠 ML INFERENCE            📲 ALERT DELIVERY   │
 │   ─────────────────          ──────────────             ─────────────────   │
 │   IMD Gridded Data           Model 1: WBGT              Amazon SNS (SMS)   │
 │   NASA SMAP Soil             XGBoost + LSTM             Amazon Polly Voice  │
 │   MODIS/Sentinel NDVI        Ensemble (0.92 R²)         Amazon Pinpoint    │
 │   NASA POWER Solar                                      WhatsApp Cloud API │
 │                              Model 2: CDHI/CSYR                            │
 │   ↓  Lambda Ingestors        Calibrated Classifier      ↓                  │
 │   ↓  EventBridge Cron        + XGBoost Regressor        Bedrock Llama 3    │
 │   ↓  S3 + DynamoDB           14-day yield forecast      Advisory Generator │
 │                                                         6 languages        │
 │   🛡️  TRUST LAYER            Model 3: Smart Irrigation  🎙️ Polly Neural   │
 │   ─────────────              PPO Reinforcement Learning Kajal Voice (hi)   │
 │   Confidence ≥ 0.85          MAD Safety Framework       SSML Prosody       │
 │   Missing Data < 10%         5 scenario variants                           │
 │   Outlier Detection          Water-use optimization     📊 DASHBOARD       │
 │   Amazon A2I HITL                                       React 19 + Vite 8  │
 │   15-min RED SLA             Step Functions Pipeline     Mapbox GL / SVG   │
 │   Immutable Audit Trail      Alert → Deliver → Audit    Real-time WebSocket│
 └─────────────────────────────────────────────────────────────────────────────┘
```

<br/>

## 🏗️ Architecture

<p align="center">
  <img src="https://img.shields.io/badge/17%2B%20AWS%20Services-Production%20Grade-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="17+ AWS Services" />
</p>

```
                           ┌──────────────────────┐
                           │   Amazon CloudFront   │
                           │   React 19 SPA (S3)   │
                           └──────────┬───────────┘
                                      │
                           ┌──────────▼───────────┐
                           │  API Gateway / ALB    │
                           └──────────┬───────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │        FastAPI on ECS Fargate      │
                    │     (3 ML Models Loaded In-Memory) │
                    └───┬──────────┬──────────┬─────────┘
                        │          │          │
            ┌───────────▼┐   ┌────▼────┐   ┌─▼──────────┐
            │  Model 1   │   │ Model 2 │   │  Model 3   │
            │ WBGT       │   │ CDHI    │   │ Irrigation │
            │ XGB + LSTM │   │ CLF+REG │   │ PPO (RL)   │
            └───────┬────┘   └────┬────┘   └──┬─────────┘
                    │             │            │
                    └──────┬──────┘────────────┘
                           │
              ┌────────────▼────────────┐
              │   Trust Layer (A2I)     │
              │  Confidence · Outlier   │
              │  Missing Data · Conflict│
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │   Step Functions        │
              │   Alert Pipeline        │
              │   (11 orchestrated      │
              │    Lambda functions)     │
              └────────────┬────────────┘
                           │
        ┌──────────┬───────┴────┬──────────┐
        ▼          ▼            ▼          ▼
   ┌─────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
   │   SNS   │ │ Polly  │ │Pinpoint│ │ WhatsApp │
   │  (SMS)  │ │ Neural │ │ (Push) │ │Cloud API │
   │         │ │ Voice  │ │        │ │Voice Note│
   └─────────┘ └────────┘ └────────┘ └──────────┘
```

<br/>

### 🟠 AWS Services Map

| Category | Service | Purpose |
|:---------|:--------|:--------|
| **🧠 AI/ML** | ![Bedrock](https://img.shields.io/badge/-Amazon%20Bedrock-8B5CF6?style=flat-square) | Meta Llama 3 advisory generation (6 languages) |
| | ![SageMaker](https://img.shields.io/badge/-Amazon%20SageMaker-8B5CF6?style=flat-square) | Model training, endpoints, Model Registry |
| | ![A2I](https://img.shields.io/badge/-Amazon%20A2I-8B5CF6?style=flat-square) | Human-in-the-loop review with 15-min SLA |
| **💾 Storage** | ![S3](https://img.shields.io/badge/-Amazon%20S3-569A31?style=flat-square) | Feature cache, model artifacts, audio, satellite data |
| | ![DynamoDB](https://img.shields.io/badge/-Amazon%20DynamoDB-4053D6?style=flat-square) | Users, features, alerts, audit, crop calendars, pipeline status |
| | ![Timestream](https://img.shields.io/badge/-Amazon%20Timestream-4053D6?style=flat-square) | WBGT time-series forecasts at sub-second query |
| **🔌 Compute** | ![Lambda](https://img.shields.io/badge/-AWS%20Lambda-FF9900?style=flat-square) | 11 pipeline functions (ingestion, inference, delivery) |
| | ![Step Functions](https://img.shields.io/badge/-AWS%20Step%20Functions-FF4F8B?style=flat-square) | Alert pipeline + retraining pipeline orchestration |
| | ![ECS Fargate](https://img.shields.io/badge/-Amazon%20ECS%20Fargate-FF9900?style=flat-square) | FastAPI backend with in-memory model serving |
| **📡 Messaging** | ![SNS](https://img.shields.io/badge/-Amazon%20SNS-DD344C?style=flat-square) | Transactional SMS delivery (regional Indian numbers) |
| | ![Polly](https://img.shields.io/badge/-Amazon%20Polly-8B5CF6?style=flat-square) | Neural TTS — Kajal voice (Hindi, Marathi, English) |
| | ![Pinpoint](https://img.shields.io/badge/-Amazon%20Pinpoint-DD344C?style=flat-square) | Targeted push notifications |
| **🔐 Security** | ![Cognito](https://img.shields.io/badge/-Amazon%20Cognito-DD344C?style=flat-square) | Farmer & org authentication with JWT |
| | ![KMS](https://img.shields.io/badge/-AWS%20KMS-DD344C?style=flat-square) | CMK encryption for PII & health data |
| | ![Secrets Manager](https://img.shields.io/badge/-Secrets%20Manager-DD344C?style=flat-square) | Partner webhook keys |
| **📊 Observability** | ![X-Ray](https://img.shields.io/badge/-AWS%20X--Ray-FF9900?style=flat-square) | Distributed tracing across Lambda + ECS |
| | ![EventBridge](https://img.shields.io/badge/-Amazon%20EventBridge-FF4F8B?style=flat-square) | Scheduled cron ingestion triggers |
| | ![CloudFront](https://img.shields.io/badge/-Amazon%20CloudFront-8B5CF6?style=flat-square) | CDN for React SPA + audio assets |

<br/>

## 🧠 ML Models

<table>
  <tr>
    <td width="33%" align="center">
      <h3>🌡️ Model 1 — WBGT</h3>
      <img src="https://img.shields.io/badge/XGBoost%20%2B%20LSTM-Ensemble-FF6B6B?style=for-the-badge" alt="Model 1" /><br/><br/>
      <strong>Wet Bulb Globe Temperature</strong><br/>
      Hourly 48-hour forecasts at<br/>1 km ward-level precision<br/><br/>
      <code>R² = 0.92</code><br/><br/>
      <em>Features:</em> IMD gridded temp, humidity,<br/>wind, solar, MODIS LST, NDVI,<br/>elevation + 28 lag features<br/><br/>
      <strong>PSI → Severity → Rest Schedule</strong><br/>
      Physiological Strain Index per<br/>work intensity (light/moderate/heavy)
    </td>
    <td width="33%" align="center">
      <h3>🌿 Model 2 — CDHI / CSYR</h3>
      <img src="https://img.shields.io/badge/Calibrated%20CLF%20%2B%20XGBReg-Dual%20Head-10B981?style=for-the-badge" alt="Model 2" /><br/><br/>
      <strong>Crop Drought-Heat Index &<br/>Crop-Specific Yield Risk</strong><br/><br/>
      <code>CDHI = f(SPI, SMA, AHSD, HSI, HDD)</code><br/><br/>
      <em>Formula components:</em><br/>
      SPI-3 · Soil Moisture Anomaly<br/>
      Accumulated Heat Stress Days<br/>
      Heat Stress Index · Heating Degree Days<br/><br/>
      <strong>14-day yield risk forecast</strong><br/>
      Stage-specific multipliers for<br/>flowering, grain-filling, vegetative
    </td>
    <td width="33%" align="center">
      <h3>💧 Model 3 — Irrigation PPO</h3>
      <img src="https://img.shields.io/badge/Reinforcement%20Learning-PPO%20%C3%97%205-3B82F6?style=for-the-badge" alt="Model 3" /><br/><br/>
      <strong>Proximal Policy Optimization</strong><br/>
      5 scenario-specific policies<br/><br/>
      <code>Actions: [0, 10, 20, 30, 40, 50, 60, 80] mm</code><br/><br/>
      <em>Scenarios:</em> default, extreme_heat,<br/>
      drought, monsoon, water_scarce<br/><br/>
      <strong>MAD Safety Framework</strong><br/>
      Management Allowable Depletion<br/>
      override ensures soil never falls<br/>
      below crop-critical thresholds<br/><br/>
      <code>+22.4% water-use efficiency</code>
    </td>
  </tr>
</table>

<br/>

## 🌍 Features

<table>
<tr>
  <td width="50%">

### 🌡️ Hyperlocal Heat Risk & WBGT Dashboard
- **Ward-level 1 km²** WBGT forecasts (48-hour)
- **PSI (Physiological Strain Index)** per work intensity
- Safe work windows & mandatory rest hours (IST)
- Water intake & shade-break recommendations
- Real-time severity: `🟢 SAFE` · `🟡 CAUTION` · `🔴 RED`

### 🌿 Crop Health & CDHI Scoring
- Composite Drought-Heat Index from 5 environmental signals
- Supports **12+ crops** with stage-aware thresholds
- Crop-specific heat tolerance configurations
- Interactive risk visualization with Mapbox GL

### 📉 14-Day Yield Risk Forecast
- Calibrated classifier + XGBoost regressor dual-head
- Stage-multiplier amplification at critical growth phases
- Revenue loss estimation (₹/hectare)
- Counterfactual "what-if" analysis on irrigation

  </td>
  <td width="50%">

### 💧 Smart Irrigation Advisor (RL)
- **PPO reinforcement learning** with 5 trained scenario policies
- MAD (Management Allowable Depletion) safety framework
- Evening timing optimization (−35% evaporation vs midday)
- Plot-level water budget tracking (m³)
- Expected yield improvement: **+18.2%**

### ✅ Verified Alerts & Trust Layer
- **Amazon A2I** human-in-the-loop verification
- 4-tier flagging: low confidence, missing data, outlier, conflict
- **15-minute SLA** for RED alerts · 2-hour for CAUTION
- Immutable DynamoDB audit trail with correlation IDs
- Decision types: APPROVED · CORRECTED · REJECTED · ESCALATED

### 🎙️ Personalized Multilingual Voice Alerts
- **Amazon Bedrock** (Meta Llama 3 8B Instruct) advisory generation
- **Amazon Polly Neural** (Kajal voice) speech synthesis
- 6 languages: हिंदी · English · मराठी · ਪੰਜਾਬੀ · తెలుగు · বাংলা
- 4 channels: SMS · Voice Call · WhatsApp Voice Note · Push
- Alert fatigue management (configurable daily caps)

  </td>
</tr>
</table>

<br/>

## 🔊 Alert Delivery Pipeline

```
                    ┌──────────────────────────────────┐
                    │    Step Functions: Alert Pipeline │
                    │    (11 orchestrated steps)        │
                    └──────────────┬───────────────────┘
                                   │
  ┌────────────────────────────────┼────────────────────────────────┐
  │                                │                                │
  ▼                                ▼                                ▼
╔═══════════════╗  ╔══════════════════════════╗  ╔═════════════════════╗
║ CheckDataQual ║→ ║  Parallel ML Inference   ║→ ║  AggregateResults   ║
║ (freshness +  ║  ║  ┌─────────────────────┐ ║  ║  (merge all ward +  ║
║  completeness)║  ║  │ WBGT → Trust → A2I  │ ║  ║   plot predictions) ║
╚═══════════════╝  ║  │ CDHI → Trust → A2I  │ ║  ╚════════╤════════════╝
                   ║  │ Irrigation (PPO)    │ ║           │
                   ║  └─────────────────────┘ ║           ▼
                   ╚══════════════════════════╝  ╔═════════════════════╗
                                                 ║   RouteAlerts       ║
                    ┌────────────────────────┐    ║ ┌───────────────┐  ║
                    │   Bedrock (Llama 3)    │◄───║ │ Fatigue Check │  ║
                    │   Advisory Generation  │    ║ │ → Generate    │  ║
                    │   6 Languages          │────║ │ → Deliver     │  ║
                    └────────────────────────┘    ║ │ → Audit Log   │  ║
                                                 ║ └───────────────┘  ║
                    ┌────────────────────────┐    ╚════════╤════════════╝
                    │ Polly Neural (Kajal)   │             │
                    │ SSML Voice Synthesis   │             ▼
                    │ MP3 → S3 → CloudFront  │    ╔═════════════════════╗
                    └────────────────────────┘    ║ BroadcastDashboard  ║
                                                 ║ + Partner Webhooks  ║
                                                 ╚═════════════════════╝
```

<br/>

## 🗣️ Live Bedrock + Polly Voice Advisory

> _"Farmer receives a personalized, metric-grounded voice advisory in their native language — generated in real time by Bedrock Llama 3 and spoken by Polly Neural."_

```python
# Real advisory flow — every metric is grounded in live model outputs
prompt = f"""
  Target Farmer: {farmer_name}
  Location: {village}, {district}, {state}
  Crop: {crop} ({stage})
  Wet-Bulb Globe Temperature (WBGT): {wbgt}°C
  Mandatory Field Halt Window: {halt_hours}
  Smart Irrigation Advice: {irrigation} on {soil}
"""

# Bedrock Llama 3 → localized advisory → Polly Neural Kajal → MP3
response = bedrock.converse(modelId='meta.llama3-8b-instruct-v1:0', ...)
audio    = polly.synthesize_speech(Engine='neural', VoiceId='Kajal', ...)
```

**Example output (Hindi):**
> 🎙️ *"नमस्ते राजेश जी। जोधपुर में वेट-बल्ब तापमान 35.2°C दर्ज हुआ है। गेहूं की फूलन अवस्था में दोपहर 11:30 से 3:30 तक खेत का काम बंद रखें। काली मिट्टी में शाम की ड्रिप सिंचाई करें।"*

<br/>

## 🌐 Supported Languages

<table>
<tr align="center">
  <td><h2>🇮🇳</h2><strong>हिंदी</strong><br/>Hindi<br/><code>hi</code></td>
  <td><h2>🇬🇧</h2><strong>English</strong><br/>English<br/><code>en</code></td>
  <td><h2>🇮🇳</h2><strong>मराठी</strong><br/>Marathi<br/><code>mr</code></td>
  <td><h2>🇮🇳</h2><strong>ਪੰਜਾਬੀ</strong><br/>Punjabi<br/><code>pa</code></td>
  <td><h2>🇮🇳</h2><strong>తెలుగు</strong><br/>Telugu<br/><code>te</code></td>
  <td><h2>🇮🇳</h2><strong>বাংলা</strong><br/>Bengali<br/><code>bn</code></td>
</tr>
</table>

All advisory text is generated **100% in the target language** — no transliteration, no English mixing. Crop names use local terminology (गेहूं not "wheat", ਕਣਕ not "wheat").

<br/>

## 📊 Data Pipeline

```
  ╔══════════════════════════════════════════════════════════════╗
  ║                    DATA INGESTION SOURCES                    ║
  ╠══════════════════════════════════════════════════════════════╣
  ║                                                              ║
  ║  🌤️  IMD Gridded        🛰️  NASA SMAP         🌍  MODIS/     ║
  ║     (imdlib)              Soil Moisture        Sentinel       ║
  ║     Tmax, Tmin,           (earthaccess)        NDVI, LST      ║
  ║     Humidity, Wind        (HDF5 + rasterio)    (rasterio)     ║
  ║                                                              ║
  ╚══════════╤═══════════════════╤═══════════════════╤═══════════╝
             │                   │                   │
             ▼                   ▼                   ▼
  ┌──────────────────────────────────────────────────────────────┐
  │          Lambda Ingestors (EventBridge Scheduled)            │
  │  imd_ingestor.py  ·  smap_ingestor.py  ·  satellite_ingestor│
  └──────────────────────────────┬───────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Amazon S3 Bucket    │
                    │ kisanguard-data-ap-south│
                    │ Feature Cache (60 min)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Amazon DynamoDB       │
                    │   6 Tables              │
                    │   Users · Features      │
                    │   Alerts · Audit        │
                    │   Pipeline · Calendars  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Amazon Timestream      │
                    │  WBGT time-series       │
                    │  Sub-second query       │
                    └─────────────────────────┘
```

<br/>

## 🛡️ Trust & Safety Layer

<table>
<tr>
<td width="50%">

### Trust Invariants (Automated)
| Check | Threshold | Action |
|:------|:----------|:-------|
| Confidence | < 0.85 | Flag for A2I review |
| Missing Data | > 10% | Flag for A2I review |
| WBGT Outlier | < 5°C or > 50°C | Flag + suppress |
| Signal Conflict | CDHI > 60 + WBGT < 31 | Flag for review |

</td>
<td width="50%">

### Amazon A2I Human Review
| Severity | SLA | Escalation |
|:---------|:----|:-----------|
| 🔴 RED | **15 minutes** | Auto-SNS to ops team |
| 🟡 CAUTION | 2 hours | Dashboard notification |
| 🟢 SAFE | 2 hours | Standard queue |

**Decisions:** `APPROVED` · `CORRECTED` · `REJECTED` · `ESCALATED`

</td>
</tr>
</table>

Every prediction, A2I decision, and alert delivery is written to an **immutable audit trail** in DynamoDB with correlation IDs, timestamps, and reviewer attribution.

<br/>

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 22+ & pnpm
- Docker & Docker Compose
- AWS CLI configured (`ap-south-1`)

### 1️⃣ Clone & Setup Backend

```bash
git clone https://github.com/parthjod/KisanGuard.git
cd KisanGuard

# Backend
cd backend
cp .env.example .env          # Fill in AWS credentials
pip install -r requirements.txt
```

### 2️⃣ Start with Docker (Recommended)

```bash
cd backend
docker-compose up --build     # Starts FastAPI + LocalStack
```

This spins up:
- 🟢 **FastAPI** on `http://localhost:8000` (with all 3 ML models loaded)
- 🟢 **LocalStack** on `http://localhost:4566` (DynamoDB, S3, SQS, SNS, EventBridge, Secrets Manager)

### 3️⃣ Start Frontend

```bash
cd frontend
pnpm install
pnpm dev                      # Vite dev server with hot reload
```

### 4️⃣ Verify

```bash
# Health check
curl http://localhost:8000/health

# API Docs
open http://localhost:8000/docs
```

<br/>

## 📁 Project Structure

```
KisanGuard/
├── 📂 backend/
│   ├── 📂 app/
│   │   ├── 📂 api/v1/                # REST endpoints (WBGT, CDHI, irrigation, alerts, users, audit)
│   │   ├── 📂 api/ws/                # WebSocket dashboard (real-time push)
│   │   ├── 📂 ml/
│   │   │   ├── model1_wbgt/          # XGBoost + LSTM ensemble
│   │   │   ├── model2_cdhi_csyr/     # Calibrated CLF + XGB Regressor
│   │   │   └── model3_irrigation/    # PPO RL (5 variants) + MAD framework
│   │   ├── 📂 services/              # 14 domain services
│   │   │   ├── wbgt_service.py       #   WBGT forecast pipeline
│   │   │   ├── cdhi_service.py       #   CDHI formula + yield risk
│   │   │   ├── irrigation_service.py #   PPO inference + MAD
│   │   │   ├── bedrock_service.py    #   Llama 3 advisory (6 langs)
│   │   │   ├── trust_service.py      #   A2I human review loop
│   │   │   ├── delivery_service.py   #   SMS + Voice + Push + WhatsApp
│   │   │   ├── audit_service.py      #   Immutable audit trail
│   │   │   ├── fatigue_service.py    #   Alert fatigue caps
│   │   │   └── ...                   #   + weather, translate, user, org, crop calendar
│   │   ├── 📂 db/                    # DynamoDB, S3, Timestream clients
│   │   ├── 📂 utils/                 # Correlation IDs, geo lookup, error types
│   │   ├── config.py                 # pydantic-settings (zero hardcoded secrets)
│   │   ├── lifespan.py               # Startup: load 3 models + warmup
│   │   └── main.py                   # FastAPI entrypoint
│   ├── 📂 lambda/                    # 5 Lambda function handlers
│   │   ├── ingestion/                #   IMD, SMAP, Satellite ingestors
│   │   ├── a2i_callback/            #   A2I human review callback
│   │   ├── delivery_receipt/        #   SMS/Voice delivery confirmation
│   │   ├── model_monitor/           #   SageMaker model drift detection
│   │   └── pipeline_trigger/        #   EventBridge → Step Functions
│   ├── 📂 step_functions/           # 2 State Machine definitions
│   │   ├── alert_pipeline.json      #   Full alert orchestration (11 states)
│   │   └── retrain_pipeline.json    #   Continuous retraining pipeline
│   ├── 📂 scripts/                  # DB setup, model warmup, geo loader
│   ├── 📂 tests/                    # Unit + integration (pytest + moto)
│   ├── Dockerfile                   # Python 3.11 slim container
│   ├── docker-compose.yml           # FastAPI + LocalStack
│   └── requirements.txt             # 30+ production dependencies
│
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── 📂 screens/              # 7 feature screens
│   │   │   ├── HeatRiskScreen       #   WBGT dashboard + hourly charts
│   │   │   ├── CropHealthScreen     #   CDHI scoring + risk map
│   │   │   ├── YieldRiskScreen      #   14-day forecast visualization
│   │   │   ├── SmartIrrigationScreen#   PPO recommendation + MAD status
│   │   │   ├── VerifiedAlertsScreen #   A2I trust center + audit grid
│   │   │   ├── PersonalizedAlertsScreen # Bedrock + Polly voice player
│   │   │   └── AboutScreen          #   Mission & approach
│   │   ├── 📂 components/           # Shared UI (SiteChrome, RiskMap, LocationPicker)
│   │   ├── 📂 services/             # API client (mock + REST modes)
│   │   ├── 📂 state/                # AppState, Auth, Language contexts
│   │   └── 📂 translations/         # i18n for 6 languages
│   ├── index.html                   # Vite HTML shell
│   ├── package.json                 # React 19, Mapbox GL, Recharts, Lucide
│   └── vite.config.ts               # Vite 8 + Tailwind CSS v4 + React
│
├── 📂 models/                       # Pre-trained model artifacts
│   ├── model1_wbgt/artifacts/       #   wbgt_xgb.json, wbgt_lstm.keras, preprocessor.pkl
│   ├── model2_cdhi_csyr/artifacts/  #   clf_calibrated.pkl, reg_xgb.json, encoders.pkl
│   └── model3_irrigation/artifacts/ #   5× PPO .zip, manifest.json, training_config.json
│
└── 📂 scratch_lambda/               # Standalone Bedrock + Polly Lambda
    └── lambda_function.py           # Live advisory generator (deployed)
```

<br/>

## 🔧 API Reference

<details>
<summary><strong>📡 REST API Endpoints (click to expand)</strong></summary>

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/health` | ALB/ECS health check |
| `GET` | `/v1/wbgt/{ward_id}` | WBGT forecast (48h) |
| `GET` | `/v1/cdhi/{plot_id}` | CDHI + yield risk prediction |
| `GET` | `/v1/irrigation/{plot_id}` | PPO irrigation recommendation |
| `GET` | `/v1/alerts` | List alerts for user |
| `POST` | `/v1/alerts/send` | Trigger alert delivery |
| `GET` | `/v1/audit` | Audit trail query |
| `POST` | `/v1/audit/a2i-callback` | A2I human review callback |
| `GET` | `/v1/users/me` | Current user profile |
| `POST` | `/v1/users/register` | Farmer registration |
| `GET` | `/v1/org/{org_id}` | Organization dashboard |
| `POST` | `/v1/webhook` | Partner webhook dispatch |
| `WS` | `/ws/dashboard` | Real-time WebSocket stream |

**Swagger UI:** `http://localhost:8000/docs`
**ReDoc:** `http://localhost:8000/redoc`

</details>

<br/>

## ⚙️ Environment Variables

<details>
<summary><strong>🔐 Configuration Reference (click to expand)</strong></summary>

| Variable | Default | Description |
|:---------|:--------|:------------|
| `APP_VERSION` | `2.0.0` | API version |
| `AWS_REGION` | `ap-south-1` | Primary AWS region (Mumbai) |
| `BEDROCK_MODEL_ID` | `meta.llama3-8b-instruct-v1:0` | Bedrock model for advisories |
| `CONFIDENCE_THRESHOLD` | `0.85` | Minimum confidence before A2I flag |
| `MISSING_DATA_THRESHOLD` | `0.10` | Maximum missing data before A2I flag |
| `A2I_RED_SLA_MINUTES` | `15` | SLA for RED severity human review |
| `MAX_RED_ALERTS_PER_DAY` | `1` | Alert fatigue cap (RED) |
| `MAX_CAUTION_ALERTS_PER_DAY` | `3` | Alert fatigue cap (CAUTION) |
| `USE_LOCAL_MODELS` | `true` | Load models from disk (vs SageMaker endpoints) |

See [`.env.example`](backend/.env.example) for the full list of 30+ configuration variables.

</details>

<br/>

## 🧪 Testing

```bash
cd backend

# Unit tests with mocked AWS (moto)
pytest tests/unit/ -v --cov=app --cov-report=term-missing

# Integration tests
pytest tests/integration/ -v

# Frontend type checking
cd ../frontend
pnpm typecheck
```

<br/>

## 📈 MLOps & Continuous Retraining

```
  EventBridge (weekly cron)
          │
          ▼
  ┌───────────────────────┐
  │ Step Functions:        │
  │ Retrain Pipeline       │
  │                        │
  │ 1. Fetch 12-month data │
  │ 2. Parallel training:  │
  │    ├─ WBGT (XGBoost)   │
  │    └─ CDHI (XGBoost)   │
  │ 3. Evaluate metrics    │
  │ 4. Gate: pass/fail     │
  │    ├─ Pass → Promote   │
  │    │   to Model Registry│
  │    │   → Update Endpoint│
  │    └─ Fail → Alert Ops │
  └───────────────────────┘
```

- **SageMaker Model Registry** for versioned model management
- **Automated drift detection** via Lambda model monitor
- **Zero-downtime endpoint updates** via SageMaker endpoint config swaps

<br/>

## 🏆 Key Differentiators

<table>
<tr>
<td>

### 🎯 Not Another Dashboard
Most ag-tech solutions display weather data. KisanGuard **generates personalized, actionable advisories** — a farmer hears their name, their crop, their field's WBGT temperature, and exactly when to stop working, in their own language.

### 🔬 Science-Backed, Not Heuristic
WBGT is the **ISO 7243 occupational heat standard**. CDHI combines 5 peer-reviewed drought-heat indices. PSI follows the Moran physiological strain model. This isn't rule-based — it's research-grade.

### 🤖 AI You Can Trust
Every ML prediction passes through a 4-invariant trust layer. Anomalies go to human reviewers via Amazon A2I with SLA enforcement. Every decision is audited. No black boxes.

</td>
<td>

### 📱 Last-Mile Delivery
India's farmers don't have data plans. KisanGuard delivers via **SMS, voice call, and WhatsApp voice note** — channels that work on ₹1,000 feature phones. Amazon Polly's Kajal neural voice sounds natural in Hindi, Marathi, and English.

### 🧠 3 Real ML Models
Not wrappers around APIs. Three distinct architectures: **XGBoost + LSTM ensemble**, **calibrated classifier + regressor**, and **PPO reinforcement learning** — each trained on real Indian climate data.

### ⚡ Production-Grade Infrastructure
Step Functions orchestration, DynamoDB audit trails, Timestream time-series, X-Ray tracing, KMS encryption, Cognito auth, idempotent delivery, alert fatigue management. This is built to operate at national scale.

</td>
</tr>
</table>

<br/>

---

<p align="center">
  <strong>Built with ❤️ for India's farmers — powered by AWS</strong>
</p>

<p align="center">
  <a href="https://github.com/parthjod/KisanGuard">
    <img src="https://img.shields.io/badge/⭐%20Star%20on%20GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="Star" />
  </a>
</p>

<p align="center">
  <sub>🌾 Protecting livelihoods. Preserving harvests. One ward at a time.</sub>
</p>
