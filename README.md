# Insora

## Try it yourself
- Worker app: [https://gigshield-worker-application.onrender.com](https://gigshield-worker-application.onrender.com)
- Admin app: [https://gigshield-admin-application.onrender.com](https://gigshield-admin-application.onrender.com)
  *Admin access: use access key `gigshield-admin-dev` at login. No separate username is required.*
- Backend API: [https://gigshield-backend-1ttr.onrender.com](https://gigshield-backend-1ttr.onrender.com)

## Pitch Deck
- Pitch video URL: [https://drive.google.com/file/d/1l0-hvkZffKAah0eLHY31m4564-k4S5V3/view?usp=sharing](https://drive.google.com/file/d/1l0-hvkZffKAah0eLHY31m4564-k4S5V3/view?usp=sharing)

## Git Repository Access
- This repository contains the complete source code for Insora.
- Main project repository: [https://github.com/ByteMechanic24/Insora-The-parametric-insurance-platform](https://github.com/ByteMechanic24/Insora-The-parametric-insurance-platform)

## About the Project
Insora is an AI enabled parametric income protection platform built for gig workers who lose earnings because of external disruptions they cannot control. These disruptions include heatwaves, poor air quality, flooding, road closures, and strikes. Most traditional insurance products focus on health, life, accidents, or vehicle damage, while gig workers often need protection against one very practical problem: they were available to work, but outside conditions stopped them from completing orders and earning.

Insora solves this by offering weekly coverage for delivery workers and then verifying claims through a structured evidence pipeline. A worker can sign up, choose a city and operating zones, activate a weekly plan, attach a payout destination, and submit a claim linked to a platform order. The system then evaluates that claim using platform order context, worker GPS, route alignment, disruption specific signals such as weather and AQI, fraud detection, photo evidence, and an AI based final review layer. Strong claims can be auto approved, while uncertain cases are routed to manual admin review.

The product includes a worker facing application and a separate admin dashboard. The worker app supports onboarding, weekly coverage activation, claim submission, claim tracking, and readable decision feedback. The admin dashboard provides claim review tools, structured evidence summaries, AI reasoning, photo review, and override controls so a reviewer can make a final decision when the engine is not fully confident.

One of the most important things we learned while building Insora was that explainability matters as much as automation. It is not enough to generate a score. A trustworthy system must show why a claim was approved, rejected, or sent for review. We also learned that realistic demos depend on realistic supporting infrastructure, so we improved our mock order APIs to be city aware and aligned them to the user context for more reliable claim validation during demonstrations.

The major challenge was balancing automation with trust. We needed the engine to auto approve genuinely strong claims while still being conservative enough to flag ambiguous ones. We also had to work around external API limits, deployment sleep behavior, and the difficulty of making multiple services feel consistent in a live demo environment. The result is a working MVP that addresses the core hackathon use case with an end to end product rather than a backend only prototype.

## Core Features
- Worker onboarding with city, operating zone, payout route, and weekly coverage selection
- Weekly parametric coverage plans designed for disruption driven income loss
- Claim submission tied to platform order IDs
- Multi step verification pipeline using order context, GPS alignment, disruption checks, fraud signals, photo evidence, and AI review
- Auto approval for strong claims and manual review for uncertain cases
- Claim history and user facing decision explanations
- Admin review workspace with readable evidence and override controls
- City aware mock platform APIs for realistic demos and local testing

## Verification Pipeline
Insora evaluates each claim in a staged pipeline:

1. Eligibility gates check policy validity, duplicate claims, time window, and order structure.
2. Platform validation checks whether the order exists and whether its context is trustworthy.
3. Location confidence checks compare worker GPS with route and order context.
4. Disruption validation checks external signals such as weather, AQI, flooding indicators, or related disruption sources.
5. Fraud scoring and anomaly detection add behavioral risk context.
6. Photo analysis and AI based final verification evaluate overall consistency.
7. The decision layer routes the claim to approve, manual review, soft hold, or reject.

## Built With
- React
- Vite
- Node.js
- Express
- MongoDB
- Redis
- Docker
- Render
- Gemini API
- OpenWeatherMap

## Source Code and Local Setup
This repository contains the full codebase for:
- `frontend` for the worker application
- `admin_frontend` for the admin dashboard
- `backend` for APIs, verification logic, and claim processing
- `mock_apis` for mock platform order services
- `ml_service` for local support during development, while the deployed project also integrates a separate externally hosted ML service

### Run locally with Docker
```bash
git clone https://github.com/ByteMechanic24/Insora-The-parametric-insurance-platform.git
cd Insora-The-parametric-insurance-platform
docker compose up -d --build
```

After startup, the main local services are:
- Worker app: [http://localhost:3000](http://localhost:3000)
- Admin app: [http://localhost:3001](http://localhost:3001)
- Backend API: [http://localhost:8000](http://localhost:8000)
- Mock APIs: [http://localhost:8002](http://localhost:8002)
- ML service: [http://localhost:8001](http://localhost:8001)
- Soft hold worker: runs inside Docker as the `worker` service for delayed rechecks and manual review routing. It does not expose a browser URL in local compose mode.

For the deployed project, the integrated ML endpoints currently in use are:
- ML API service: [https://gigshield-ml-api-i4ok.onrender.com/](https://gigshield-ml-api-i4ok.onrender.com/)
- ML demo app: [https://gigshield-ml.streamlit.app/](https://gigshield-ml.streamlit.app/)

### Run services manually
```bash
# backend
cd backend
npm install
npm run dev

# worker frontend
cd frontend
npm install
npm run dev

# admin frontend
cd admin_frontend
npm install
npm run dev

# mock apis
cd mock_apis
npm install
npm start
```

## Environment Notes
The project expects service specific environment variables for backend integrations such as:
- MongoDB connection
- Redis connection
- Gemini API key
- OpenWeatherMap API key

See the example environment files and deployment configuration in this repository for setup guidance.

## Submission Note
Insora is a working MVP created for the Guidewire DEVTrails 2026 use case around AI enabled parametric protection for gig workers. It is designed to demonstrate a realistic worker flow, an explainable verification engine, and an admin review system in one end to end product.
