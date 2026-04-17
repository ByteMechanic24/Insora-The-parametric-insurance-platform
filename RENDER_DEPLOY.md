## Render Deployment

This project is deployed on Render as a multi service stack.

### Current live services
- Worker app: [https://gigshield-worker-application.onrender.com](https://gigshield-worker-application.onrender.com)
- Admin app: [https://gigshield-admin-application.onrender.com](https://gigshield-admin-application.onrender.com)
- Backend API: [https://gigshield-backend-1ttr.onrender.com](https://gigshield-backend-1ttr.onrender.com)
- Mock APIs: [https://gigshield-mock-apis.onrender.com](https://gigshield-mock-apis.onrender.com)
- Soft hold worker health: [https://gigshield-soft-hold-web.onrender.com/health](https://gigshield-soft-hold-web.onrender.com/health)
- External ML API service: [https://gigshield-ml-api-i4ok.onrender.com/](https://gigshield-ml-api-i4ok.onrender.com/)
- External ML demo app: [https://gigshield-ml.streamlit.app/](https://gigshield-ml.streamlit.app/)

## Recommended topology
- MongoDB on Atlas
- Redis on Render
- Backend as a Render web service
- Soft hold worker deployed as a web service with a health endpoint
- Mock APIs as a Render web service
- Worker frontend as a Render static site
- Admin frontend as a Render static site
- ML service integrated as a separate supporting service

## Services to create
- `gigshield-backend`
- `gigshield-mock-apis`
- `gigshield-soft-hold-web`
- `gigshield-worker-application`
- `gigshield-admin-application`

## Before deploying
You should have:
- a GitHub repository connected to Render
- a MongoDB Atlas connection string
- a Redis URL
- an admin access key
- an OpenWeatherMap API key
- a Gemini API key

## Backend service
Create a Render web service with:

```text
Name: gigshield-backend
Root Directory: backend
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

### Backend environment variables
```env
NODE_ENV=production
PORT=8000
MONGODB_URI=your_mongodb_uri
MONGODB_DB_NAME=gigshield_dev
REDIS_URL=your_redis_url
ML_SERVICE_URL=https://gigshield-ml-api-i4ok.onrender.com
PLATFORM_API_URL=https://gigshield-mock-apis.onrender.com
ADMIN_API_KEY=your_admin_key
GOOGLE_WEATHER_API_KEY=your_google_weather_key_if_used
GOOGLE_MAPS_API_KEY=your_google_maps_key_if_used
OPENWEATHERMAP_API_KEY=your_openweathermap_key
OPENWEATHERMAP_BASE_URL=https://api.openweathermap.org
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODELS=gemini-2.5-flash,gemini-2.5-pro
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MAX_RETRIES=2
GEMINI_RETRY_DELAY_MS=1200
SOFT_HOLD_SERVICE_URL=https://gigshield-soft-hold-web.onrender.com
ENABLE_SEED=false
ALLOW_PRODUCTION_SEED=false
```

## Mock API service
Create a Render web service with:

```text
Name: gigshield-mock-apis
Root Directory: mock_apis
Build Command: npm install
Start Command: node app.js
Health Check Path: /health
```

### Mock API environment variables
```env
NODE_ENV=production
PORT=8002
```

## Soft hold worker service
This service runs the background soft hold poller and also exposes a small health endpoint so it can live as a Render web service.

Create a Render web service with:

```text
Name: gigshield-soft-hold-web
Root Directory: backend
Build Command: npm install
Start Command: npm run worker
```

### Soft hold worker environment variables
```env
NODE_ENV=production
PORT=8003
MONGODB_URI=your_mongodb_uri
MONGODB_DB_NAME=gigshield_dev
REDIS_URL=your_redis_url
ML_SERVICE_URL=https://gigshield-ml-api-i4ok.onrender.com
PLATFORM_API_URL=https://gigshield-mock-apis.onrender.com
OPENWEATHERMAP_API_KEY=your_openweathermap_key
OPENWEATHERMAP_BASE_URL=https://api.openweathermap.org
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODELS=gemini-2.5-flash,gemini-2.5-pro
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MAX_RETRIES=2
GEMINI_RETRY_DELAY_MS=1200
ENABLE_SEED=false
ALLOW_PRODUCTION_SEED=false
```

## Worker frontend
Create a Render static site with:

```text
Name: gigshield-worker-application
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
```

### Worker frontend environment variables
```env
VITE_API_BASE_URL=https://gigshield-backend-1ttr.onrender.com/api/v1
```

### Rewrite rule
Add this rewrite so React routes work correctly:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

## Admin frontend
Create a Render static site with:

```text
Name: gigshield-admin-application
Root Directory: admin_frontend
Build Command: npm install && npm run build
Publish Directory: dist
```

### Admin frontend environment variables
```env
VITE_API_BASE_URL=https://gigshield-backend-1ttr.onrender.com/api/v1
```

### Rewrite rule
```text
Source: /*
Destination: /index.html
Action: Rewrite
```

## Deploy order
Use this order for a smoother setup:

1. `gigshield-mock-apis`
2. `gigshield-backend`
3. `gigshield-soft-hold-web`
4. `gigshield-worker-application`
5. `gigshield-admin-application`

## Important notes
- The worker and admin frontends need the rewrite rule or React routes will show `Not Found`.
- The mock API service is required for order verification in the current MVP.
- The soft hold worker is needed for delayed rechecks and background review flow.
- The external ML API is integrated separately and is not the same as the frontend or backend deployments in this repository.
- The in app warm up flow helps reduce cold starts during active usage, but external uptime monitoring is still recommended for better reliability.

## Suggested uptime monitoring
If you want to reduce Render free tier sleep issues, monitor:

```text
https://gigshield-backend-1ttr.onrender.com/api/v1/webhooks/warmup
https://gigshield-mock-apis.onrender.com/health
```

## Blueprint note
This repository still contains a `render.yaml`, but the current live setup and service names should be treated as the source of truth for deployment.
