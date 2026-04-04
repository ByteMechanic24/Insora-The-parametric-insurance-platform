# GigShield 🛡️

**AI-powered parametric income insurance for food delivery workers on Zomato and Swiggy**

> Guidewire DEVTrails 2026 · University Hackathon · Phase 1 Submission

**Stack at a glance:**
React PWA · Python FastAPI · PostgreSQL · Redis · scikit-learn (XGBoost + Isolation Forest) · OpenWeatherMap · IMD · CWC · GDELT · NewsAPI · Google Maps Directions API · Sentinel-1 SAR · Razorpay · WhatsApp Business API

---

## Table of Contents

1. [Persona and Scenario Walkthrough](#1-persona-and-scenario-walkthrough)
2. [Weekly Premium Model and Parametric Triggers](#2-weekly-premium-model-and-parametric-triggers)
3. [Platform Choice](#3-platform-choice)
4. [AI and ML Integration](#4-ai-and-ml-integration)
5. [Technical Architecture](#5-technical-architecture)
6. [Tech Stack and Development Plan](#6-tech-stack-and-development-plan)
7. [Adversarial Defense and Anti-Spoofing Strategy](#7-adversarial-defense-and-anti-spoofing-strategy)
8. [Database Schema](#8-database-schema)
9. [Repository Structure and Local Setup](#9-repository-structure-and-local-setup)

---

## 1. Persona and Scenario Walkthrough

### Who We Are Building For

**Persona:** Food delivery partners working on Zomato and Swiggy in Tier 1 Indian cities.

These workers earn between ₹600 and ₹1,200 per day depending on city, zone, and working hours. They operate on two-wheelers, work in outdoor conditions, and are paid per completed delivery. There are no fixed salaries, no sick days, and no protection when external conditions make work impossible. A single disrupted afternoon can wipe out 30 to 40 percent of a day's earnings with zero recourse.

We chose food delivery specifically because it is the most weather-sensitive gig category in India. Rain does not just slow these workers down, it stops them entirely. Zomato and Swiggy suspend order allocation in flooded zones. Riders get stranded mid-route with no orders coming through and no way to claim the time they lost.

---

### Scenario 1: Monsoon Flooding Mid-Delivery (Environmental Disruption)

**Worker:** Raju, 26, delivers for Zomato in Andheri East, Mumbai. Average earnings: ₹90 per hour. Enrolled on GigShield Standard Shield at ₹47 per week.

**What happens:**

It is 4:10 PM on a Tuesday in July. Raju accepts an order from a restaurant in Marol and starts riding toward the drop location in Saki Naka. Halfway through the route, he turns onto a service road and finds it submerged under two feet of water from a backed-up drain. He cannot go forward. The alternate route adds 40 minutes and his phone shows three more blocked roads ahead. The order is going to be undeliverable.

Raju opens GigShield. He taps "Report Blocked Delivery." The app pre-fills his active Order ID from the Zomato partner app session and captures his GPS automatically. He hits confirm. The entire submission takes 22 seconds.

**What GigShield does in the next 10 minutes:**

Five verification checks fire simultaneously against timestamp 16:10:34 IST:

- **Check 1** calls the Zomato partner API with Order ID `ZOM-20240716-391847`. The API returns: order status `IN_TRANSIT`, assigned to worker `WRK-00482`, route polyline through Marol to Saki Naka, worker payout ₹83, platform's last known GPS for Raju at coordinates matching his claimed position.
- **Check 2** calculates the distance from Raju's submitted GPS to the nearest point on the route polyline: 140 metres. Passes. Cross-reference against platform GPS: 180 metre divergence. Passes.
- **Check 3** queries the CWC gauge for Mithi River at Andheri: above warning level. OpenWeatherMap reports 24mm/hr rainfall at those coordinates. IMD has issued an orange alert for Mumbai suburban. Three signals confirm the flooding.
- **Check 4** queries Copernicus for the most recent Sentinel-1 SAR pass. A pass from 09:30 AM shows surface water increase of 38% in the bounding box around Raju's coordinates. Corroborated.
- **Check 5** scores Raju's claim against his behavioral history: 14 weeks enrolled, 2 prior claims both paid, claim frequency within normal range for his zone, device fingerprint unique, GPS trajectory shows continuous movement consistent with riding before the stop. Anomaly score: 0.82 out of 1 (high legitimacy).

Composite score: 0.89. Decision: **APPROVE**.

Payout: ₹83 (lost order) + ₹88/hr × 1.5 stranded hours × 0.9 multiplier = ₹83 + ₹119 = **₹202 credited to Raju's UPI at 4:21 PM.**

Raju receives a WhatsApp message: *"GigShield: Flooding confirmed in Andheri East. ₹202 has been sent to your UPI account. Stay safe."*

He filed nothing. He called nobody. He argued with no one.

---

### Scenario 2: Strike Blocking Delivery Route (Social Disruption)

**Worker:** Priya, 31, delivers for Swiggy in Dadar, Mumbai. Average earnings: ₹105 per hour. Enrolled on Premium Shield at ₹72 per week.

**What happens:**

It is 1:30 PM on a Thursday. Priya picks up an order from a restaurant near Dadar station and heads toward a drop in Parel. She reaches the main road and finds it completely blocked by a large protest march. Police have cordoned off a 6-block area. The drop location is inside the cordon. She cannot reach it and there is no alternate route.

She opens GigShield and taps "Report Blocked Delivery." The app captures her GPS at the edge of the cordon and pre-fills Order ID `SWG-20240620-112934`.

**What the system checks simultaneously:**

- **Check 1** confirms with Swiggy API: order is `IN_TRANSIT`, Priya is the assigned worker, the drop coordinates are inside the blocked zone, her payout for the order is ₹112.
- **Check 2** GPS is 80 metres from the route. Platform's last known ping matches. Both pass.
- **Check 3** queries social disruption signals for coordinates near Dadar at 13:30 IST. GDELT returns 3 event records tagged as `PROTEST/MARCH` within 1.2km of the location with confidence above 0.7. NewsAPI returns a Mumbai Mirror article published at 12:45 PM about the march. Two independent sources confirmed. The Google Maps Directions API, queried with the drop coordinates at 13:30, returns no viable route.
- **Check 4** No flooding event so satellite check returns partial score with a note.
- **Check 5** Priya has 22 weeks of enrollment, zero prior fraud flags, claim frequency normal. Anomaly score: 0.91.

Composite score: 0.81. Decision: **APPROVE**.

Payout: ₹112 (lost order) + ₹105/hr × 2 stranded hours × 1.0 multiplier (Premium Shield) = ₹112 + ₹210 = **₹322 credited within 10 minutes.**

---

### Scenario 3: Soft Hold Due to Incomplete Signals (Borderline Case)

**Worker:** Arjun, 23, new enrollee, 10 days on the platform, delivers for Zomato in Bengaluru. Enrolled on Basic Shield at ₹28 per week.

**What happens:**

Arjun claims a blocked delivery during moderate rainfall. His GPS is 1.4km from the route (he took a detour). The CWC gauge for his area does not show flood stage exceeded. IMD has only a yellow alert, not red. GDELT returns no social events. OpenWeatherMap shows 11mm/hr rainfall, below the 20mm threshold for strong confirmation. No satellite pass available within the 24-hour window.

- Check 1: passes (order valid, in-transit).
- Check 2: partial (1.4km from route is outside the 1km clean pass threshold).
- Check 3: partial (rainfall present but below strong-signal threshold).
- Check 4: no data available.
- Check 5: new enrollee with short history, no strong fraud signal but limited baseline data.

Composite score: 0.61. Decision: **SOFT HOLD**.

The system sends Arjun a WhatsApp message: *"GigShield: We are verifying your claim. This usually resolves within 4 hours. No action needed from you."*

A background worker polls every 30 minutes for new data. At the 3-hour mark, a Sentinel-1 SAR pass becomes available showing 22% surface water increase near his route. The composite score updates to 0.77. **APPROVE fires automatically.** Arjun receives ₹130 without any manual review or action from him.

---

## 2. Weekly Premium Model and Parametric Triggers

### How the Weekly Premium Works

Every enrolled worker pays a weekly premium, recalculated every Monday at 00:00 IST. The premium is not fixed. It moves based on the worker's individual risk profile and conditions for the coming week.

The calculation uses an XGBoost regression model trained on historical disruption frequency, earnings data, and claim patterns. A worker operating in a chronically flood-prone zone in Mumbai during monsoon season pays more than one operating on elevated roads in Delhi in February. This is deliberate. It keeps the product financially sustainable and makes pricing meaningful rather than arbitrary.

**Weekly premium formula (simplified):**

```
weekly_premium = base_city_rate
              + zone_disruption_factor
              + weather_forecast_adjustment
              + seasonal_multiplier
              + personal_risk_adjustment
```

**Coverage tiers:**

| Tier | Weekly Premium | Payout Coverage |
|---|---|---|
| Basic Shield | ₹25 to ₹35 | Order earnings + 1 hour stranded compensation |
| Standard Shield | ₹40 to ₹55 | Order earnings + up to 3 hours stranded compensation |
| Premium Shield | ₹60 to ₹80 | Order earnings + unlimited stranded hours + ₹100 consecutive-day bonus |

**Payout formula:**

```
payout = order_earnings_from_platform_api
       + (stranded_hours × worker_4week_baseline_hourly_rate × tier_multiplier)
```

`worker_4week_baseline_hourly_rate` is the rolling average of the worker's actual hourly earnings over the past 4 weeks, segmented by day of week and hour band. A Tuesday afternoon baseline is computed separately from a Sunday morning baseline to prevent unfair comparisons.

**Unit economics (10,000 workers, Mumbai):**

| Metric | Value |
|---|---|
| Average weekly premium | ₹40 |
| Weekly gross premium collected | ₹4,00,000 |
| Annual gross premium | ₹2.08 crore |
| Expected disruption weeks per year | ~10 |
| Expected payout per disruption week | ~₹90 lakh |
| Annual loss ratio | ~56% |

The 56% loss ratio is healthy for a parametric product. Reinsurance is purchased to cap catastrophic exposure for anomalous monsoon years.

---

### Parametric Triggers

Every claim requires at least one confirmed trigger from Check 3. A trigger is a measurable, independently verifiable signal from an external data source confirming that an obstruction exists at the worker's route coordinates at the time of claim.

| Trigger | Source | Threshold for Confirmation |
|---|---|---|
| Heavy rainfall and flooding | OpenWeatherMap + IMD | Rainfall above 20mm/hr at coordinates OR IMD red or orange alert for the district |
| River and drain flooding | Central Water Commission gauge data | Gauge reading above warning level at the nearest monitored point to the route |
| Extreme heat | OpenWeatherMap | Temperature above 45°C at route coordinates during claim timestamp |
| Severe air quality | OpenAQ + CPCB live feed | AQI above 400 at nearest monitoring station |
| Strike or protest blockage | GDELT + NewsAPI + X keyword monitor | 2 or more independent sources reporting an active event within 2km of claim coordinates |
| Curfew or government-ordered closure | State government alert RSS + GDELT | Official alert covering the claim area at the claim timestamp |
| Road closure or infrastructure failure | Google Maps Directions API + HERE Maps | Route queried at claim timestamp returns no viable path or detour factor above 2.5x |

**For environmental triggers:** a single strong API reading is sufficient because these are objective sensor measurements.

**For social triggers:** two independent sources are required because no single API is authoritative for civil unrest or strikes.

---

## 3. Platform Choice

**We chose a Progressive Web App (PWA) over a native mobile application.**

The reasoning is grounded in how delivery workers actually behave. A worker who has never used GigShield will not install an app from the Play Store for a service they have not yet trusted. A WhatsApp link that opens directly in the browser removes that barrier entirely. The worker experiences something that looks and feels like a native app without any installation friction.

On a modern Android device (which is what the overwhelming majority of Indian delivery workers carry), a PWA with full-screen mode, push notifications via WhatsApp integration, and offline form caching for poor connectivity is functionally equivalent to a native app for our use case.

The claim submission flow specifically is designed for one-handed operation in rain, with large tap targets and a maximum of two screens from open to submit.

---

## 4. AI and ML Integration

### 4.1 Dynamic Premium Calculation: XGBoost Regression

The weekly premium calculation uses an XGBoost regression model trained on historical data combining claim frequency, weather records, zone flood risk scores, and worker earning patterns.

**Feature set:**

```python
premium_features = [
    "zone_disruption_rate_90d",        # how often this zone had confirmed disruptions
    "zone_flood_risk_score",            # derived from CWC historical gauge data
    "worker_route_elevation_profile",   # low-lying routes carry higher flood risk
    "weather_forecast_7d_risk_score",   # IMD extended forecast probability
    "seasonal_factor",                  # monsoon months weighted significantly higher
    "worker_claim_history_ratio",       # personal risk relative to zone peers
    "city_baseline_rate"                # city-level floor premium
]
```

The model outputs a rupee value between the tier floor and ceiling. A worker in a high-risk zone during peak monsoon might see their Standard Shield premium move from ₹40 to ₹52. A worker in a historically safe zone in winter might see it drop to ₹41. This creates a financially sustainable product where risk is priced accurately at the individual level.

### 4.2 Fraud Detection: Isolation Forest Anomaly Scoring

The fraud detection uses an Isolation Forest model, an unsupervised algorithm that learns what normal claim behavior looks like and flags statistical outliers without requiring labeled fraud examples.

```python
fraud_features = {
    "claims_last_30d": worker_history.claim_count_30d,
    "claims_per_peer_ratio": claim_count / zone_peer_average,
    "days_since_enrollment": worker_history.tenure_days,
    "enrollment_days_before_forecasted_event": delta,
    "device_fingerprint_account_count": accounts_on_device,
    "gps_trajectory_velocity_variance": motion_consistency_score,
    "order_route_type_match": similarity_to_typical_routes,
    "platform_gps_divergence_metres": abs(claimed_gps - platform_gps)
}

anomaly_score = isolation_forest.score_samples([feature_vector])[0]
# More negative = more anomalous. Normalized to 0-1 range.
normalized_score = (anomaly_score + 0.5) / 0.5
```

The model catches patterns that rule-based fraud checks miss: coordinated enrollment spikes before a forecasted storm, device fingerprints shared across multiple accounts, GPS trajectories inconsistent with active riding, and claim frequency outliers relative to zone peers.

### 4.3 Composite Verification Scoring

The five-check verification system produces a weighted composite score that determines the payout decision. This is not a simple rule engine. Each check contributes a continuous score between 0 and 1, and the composite reflects the balance of evidence across all five independent sources.

```python
weights = {
    "platform_api":   0.35,   # server-side, unfakeable
    "gps_route":      0.20,   # strong but spoofable, hence lower weight
    "environmental":  0.25,   # objective sensor data
    "satellite":      0.10,   # high quality but slow
    "fraud_anomaly":  0.10    # behavioral adjustment
}

composite = sum(result.score * weights[result.check_id] for result in results)
```

This weighted approach tolerates real-world data latency. A CWC gauge that is temporarily offline does not kill a claim that has strong confirmation from all other sources.

### 4.4 Baseline Earnings Model

Each worker's payout for stranded time is calculated against their individual rolling baseline rather than a flat rate. This baseline is stored in PostgreSQL partitioned by `day_of_week` and `hour_band` and updated weekly.

```sql
CREATE TABLE order_earnings_baseline (
    worker_id       UUID REFERENCES workers(id),
    day_of_week     SMALLINT,    -- 0 = Monday
    hour_band       SMALLINT,    -- 0 to 23
    avg_hourly_rate DECIMAL(8,2),
    sample_count    INTEGER,
    computed_at     TIMESTAMPTZ,
    PRIMARY KEY (worker_id, day_of_week, hour_band)
);
```

A worker who earns ₹120 per hour gets a larger payout than one earning ₹65 per hour for the same disruption duration. This makes GigShield actuarially fair and eliminates the incentive to exaggerate stranded time since the rate is historical, not self-reported.

---

## 5. Technical Architecture

### Claim Ingestion and Parallel Verification Engine

When a worker submits a blocked delivery claim, the backend launches five async verification tasks concurrently against the same Unix timestamp. Sequential verification is explicitly avoided because it creates a manipulation window between steps. All five checks describe the same moment in time.

```
POST /api/v1/claims

{
  "order_id": "ZOM-20240318-847291",
  "worker_id": "WRK-00482",
  "gps_lat": 19.1136,
  "gps_lng": 72.8697,
  "timestamp": 1710758400
}
```

```python
results = await asyncio.gather(
    check_platform_api(order_id, worker_id, timestamp),
    check_gps_route_consistency(gps_lat, gps_lng, order_route),
    check_environmental_signals(route_coords, timestamp),
    check_satellite_corroboration(route_coords, timestamp),
    check_fraud_anomaly_score(worker_id, order_id, device_fingerprint),
    return_exceptions=True
)
```

Any coroutine that throws is treated as a partial result rather than a hard failure. A satellite API timeout does not block payout on an otherwise high-confidence claim.

---

### Check 1: Platform API Verification (Weight: 35%)

```python
async def check_platform_api(order_id, worker_id, timestamp):
    response = await platform_client.get_order(order_id)

    # Hard failures immediately reject the claim
    if response.status != "IN_TRANSIT":
        return CheckResult(score=0.0, hard_reject=True,
                           reason="Order not in-transit at claim time")
    if response.assigned_worker != worker_id:
        return CheckResult(score=0.0, hard_reject=True,
                           reason="Order belongs to different worker")

    time_delta = abs(timestamp - response.acceptance_timestamp)
    score = 1.0 if time_delta < 3600 else max(0.3, 1 - (time_delta / 7200))

    return CheckResult(
        score=score,
        order_earnings=response.worker_payout,
        route_polyline=response.route,
        platform_last_gps=response.last_known_location
    )
```

Data retrieved from the platform API:

| Field | Usage |
|---|---|
| `route_polyline` | Route geometry for GPS consistency check |
| `worker_payout` | Exact order earnings for payout calculation |
| `last_known_location` | Independent GPS reference for spoofing detection |
| `acceptance_timestamp` | Temporal consistency gate |
| `order_status` | Hard gate: must be IN_TRANSIT |

---

### Check 2: GPS and Route Consistency (Weight: 20%)

```python
async def check_gps_route_consistency(claimed_lat, claimed_lng,
                                       route_polyline, platform_last_gps):
    route_distance = min_distance_to_polyline(
        (claimed_lat, claimed_lng), route_polyline
    )
    platform_distance = haversine(
        (claimed_lat, claimed_lng),
        (platform_last_gps.lat, platform_last_gps.lng)
    )

    route_score = max(0, 1 - (route_distance / 2000))
    spoof_score = 1.0 if platform_distance < 500 else max(0, 1 - (platform_distance / 5000))

    # GPS spoofing signature: faked onto route but real location is elsewhere
    if platform_distance > 3000 and route_distance < 200:
        return CheckResult(score=0.1, flag="POTENTIAL_GPS_SPOOF")

    return CheckResult(score=(route_score * 0.5 + spoof_score * 0.5))
```

---

### Check 3: Environmental and Social Disruption APIs (Weight: 25%)

```python
async def check_environmental_signals(route_coords, timestamp):
    lat, lng = route_coords

    weather, aqi, cwc, gdelt_events, roads = await asyncio.gather(
        owm_client.get_historical(lat, lng, timestamp),
        cpcb_client.get_aqi(lat, lng, timestamp),
        cwc_client.get_gauge_level(lat, lng, timestamp),
        gdelt_client.query_events(lat, lng, timestamp, radius_km=2),
        gmaps_client.directions(route_coords, departure_time=timestamp)
    )

    scores = {
        "weather":  1.0 if weather.rainfall_mmhr > 20 or weather.imd_alert == "RED"
                    else (0.6 if weather.rainfall_mmhr > 10 else 0.0),
        "aqi":      1.0 if aqi.value > 400 else (0.5 if aqi.value > 300 else 0.0),
        "flooding": 1.0 if cwc.flood_stage_exceeded else (0.7 if cwc.above_warning else 0.0),
        "social":   1.0 if len([e for e in gdelt_events if e.confidence > 0.7]) >= 2
                    else (0.4 if len(gdelt_events) == 1 else 0.0),
        "roads":    1.0 if roads.status == "ROUTE_NOT_FOUND"
                    else (0.7 if roads.duration_factor > 2.5 else 0.0)
    }

    return CheckResult(score=max(scores.values()), breakdown=scores)
```

---

### Check 4: Satellite Corroboration (Weight: 10%)

```python
async def check_satellite_corroboration(route_coords, timestamp):
    bbox = get_bounding_box(route_coords, buffer_km=1)
    scenes = await copernicus_client.search(
        bbox=bbox,
        start_time=timestamp - 86400,
        end_time=timestamp + 3600,
        product_type="GRD",
        platform="Sentinel-1"
    )

    if not scenes:
        return CheckResult(score=0.5, confidence="LOW",
                           note="No SAR pass within window")

    flood_extent = await compute_flood_extent(scenes[0], bbox)
    return CheckResult(
        score=min(1.0, flood_extent.water_increase_pct / 50),
        confidence="HIGH"
    )
```

SAR imaging penetrates monsoon cloud cover. Latency is 6 to 12 hours so satellite data does not gate real-time payout decisions, but it resolves soft-hold claims automatically as passes become available.

---

### Check 5: Fraud and Anomaly Scoring (Weight: 10%)

```python
async def check_fraud_anomaly_score(worker_id, order_id, device_fingerprint):
    features = {
        "claims_last_30d":                  worker_history.claim_count_30d,
        "claims_per_peer_ratio":            worker_history.claim_count_30d / zone_avg,
        "days_since_enrollment":            worker_history.tenure_days,
        "enrollment_forecast_delta":        worker_history.enrollment_days_before_storm,
        "device_fingerprint_seen_accounts": await db.count_accounts_by_device(device_fp),
        "gps_trajectory_variance":          worker_history.recent_gps_variance,
        "route_type_match":                 route_type_similarity(order_id, worker_history),
        "platform_gps_divergence":          platform_distance_metres
    }

    anomaly_score = isolation_forest.score_samples([list(features.values())])[0]
    normalized = (anomaly_score + 0.5) / 0.5

    flags = []
    if features["device_fingerprint_seen_accounts"] > 1:
        flags.append("MULTI_ACCOUNT_DEVICE")
    if features["enrollment_forecast_delta"] < 2:
        flags.append("PRE_STORM_ENROLLMENT")
    if features["claims_per_peer_ratio"] > 3:
        flags.append("HIGH_CLAIM_FREQUENCY")

    return CheckResult(score=max(0, normalized), flags=flags)
```

---

### Composite Score and Resolution

```python
def compute_composite_score(results):
    if any(r.hard_reject for r in results):
        return CompositeResult(score=0, decision="REJECT")

    composite = sum(r.score * weights[r.check_id] for r in results)

    if composite >= 0.75:
        return CompositeResult(score=composite, decision="APPROVE")
    elif composite >= 0.50:
        return CompositeResult(score=composite, decision="SOFT_HOLD",
                               recheck_after_hours=4)
    else:
        return CompositeResult(score=composite, decision="MANUAL_REVIEW",
                               sla_hours=24)
```

Soft-hold claims are re-evaluated every 30 minutes by a background worker as new satellite passes and news API updates arrive. Most resolve automatically without human involvement.

---

## 6. Tech Stack and Development Plan

### Full Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | React PWA + Tailwind CSS | Onboarding, claim submission, worker dashboard |
| Backend | Python FastAPI | Parallel verification engine, claim API, policy management |
| Database | PostgreSQL + Redis | Persistent storage + real-time score aggregation |
| ML and AI | scikit-learn (XGBoost + Isolation Forest) | Premium calculation + fraud scoring |
| Platform API | Zomato and Swiggy partner API (mocked) | Order record retrieval for Check 1 |
| Weather | OpenWeatherMap + IMD | Rainfall and temperature signals for Check 3 |
| Flood | Central Water Commission | River gauge data for Check 3 |
| Air quality | OpenAQ + CPCB | AQI signals for Check 3 |
| Social events | GDELT + NewsAPI + X monitor | Strike and riot corroboration for Check 3 |
| Routing | Google Maps Directions API | Road impassability check for Check 3 |
| Satellite | Copernicus Sentinel-1 SAR | Post-event flood validation for Check 4 |
| Payments | Razorpay (test mode) | UPI payout simulation |
| Notifications | WhatsApp Business API + Twilio | Worker alerts through claim lifecycle |
| Hosting | AWS free tier or Railway.app | Hackathon deployment |

---

### Six-Week Development Plan

**Phase 1: March 4 to 20 — Ideation and Foundation**

Deliverables for this phase:
- This README
- Database schema design (workers, claims, check_results, order_earnings_baseline)
- Worker onboarding flow (React PWA: phone, UPI, zone selection, tier picker)
- Mock Zomato and Swiggy partner API server returning realistic order objects
- OpenWeatherMap route-coordinate integration
- Static premium calculator showing weekly price based on city and zone

Demo target: a worker can complete onboarding and receive a weekly premium quote in under 3 minutes.

**Phase 2: March 21 to April 4 — Automation and Protection**

Deliverables:
- One-tap claim submission UI with automatic GPS capture and deep-linked Order ID prefill
- Parallel async verification engine with all five checks running concurrently
- GDELT and NewsAPI integration for social disruption signals
- Composite scoring model with 0.75 and 0.50 thresholds
- Soft-hold background recheck worker
- Razorpay test mode payout on APPROVE decision
- Policy management screens (active coverage, premium history, claim history)

Demo target: submit a mock Order ID for a simulated flood, watch all five checks resolve in parallel, and watch a UPI payout fire end to end.

**Phase 3: April 5 to 17 — Scale and Optimise**

Deliverables:
- Isolation Forest fraud model trained on synthetic claim data, scoring on every submission
- Sentinel-1 SAR integration for soft-hold resolution
- Worker dashboard (earnings protected, weekly coverage status, claim history)
- Insurer admin dashboard (loss ratios, fraud alert queue, predictive claim volume)
- XGBoost premium model refined with route-level elevation and zone risk features
- Five-minute final demo video
- Final pitch deck (PDF)

Demo target: full walkthrough from worker enrollment through blocked delivery report through five-check parallel verification through payout confirmation through dashboard update.

---

## 7. Adversarial Defense and Anti-Spoofing Strategy

> Added in response to DEVTrails Phase 1 Market Shift brief: a coordinated 500-worker GPS-spoofing syndicate organizing via Telegram.

### Why the Attack Fails Against GigShield

The syndicate's attack model assumes GPS location plus weather event equals payout. It works against GPS-first platforms. It fails here because Check 1 uses the platform's own server-side order dispatch records, which are architecturally inaccessible to client-side GPS manipulation.

When 500 workers spoof GPS into a flood zone, Check 1 queries the platform API for each Order ID. The platform's dispatch records show where orders were actually routed. A GPS showing Andheri while dispatch records show Noida is a hard contradiction. Five hundred contradictions produce zero payouts.

### Two-Source Independence Principle

```
Source A: Worker's device GPS (reported to GigShield)
Source B: Platform's server-side last known location (from dispatch pings)

Both captured at same timestamp from architecturally separate systems.
GPS spoofing app alters Source A only.
Divergence > 3km between sources triggers POTENTIAL_GPS_SPOOF flag.
```

### Coordinated Ring Detection

```python
async def compute_cluster_signal(gps_lat, gps_lng, timestamp, window_minutes=15):
    nearby_claims = await db.query("""
        SELECT COUNT(*) FROM claims
        WHERE ST_DWithin(
            ST_MakePoint(gps_lng, gps_lat)::geography,
            ST_MakePoint($1, $2)::geography,
            1000
        )
        AND submitted_at BETWEEN $3 AND $4
    """, gps_lng, gps_lat,
        timestamp - timedelta(minutes=window_minutes),
        timestamp + timedelta(minutes=window_minutes))

    # Organic: 1-3 claims per 1km per 15min during a real disruption
    # Syndicate: 50-500 claims at same coordinates same window
    return nearby_claims.count  # > 20 flags entire cluster for review
```

### UX Balance for Honest Workers

Workers experiencing genuine network degradation during a storm are protected by:

1. **2-hour grace period** from order's expected delivery timestamp to submit a claim
2. **Pre-event GPS confirmation** from Check 1 captures position before storm degrades connectivity
3. **Soft-hold re-evaluation** auto-resolves most borderline cases within 4 hours as satellite and news data arrives
4. **Tenure weighting** means a worker with 12 weeks of clean history gets Tier 1 treatment on mild anomalies

---

## 8. Database Schema

```sql
CREATE TABLE workers (
    id              UUID PRIMARY KEY,
    phone           VARCHAR UNIQUE NOT NULL,
    upi_handle      VARCHAR UNIQUE NOT NULL,
    device_fp       VARCHAR NOT NULL,
    enrolled_at     TIMESTAMPTZ NOT NULL,
    tier            VARCHAR CHECK (tier IN ('basic', 'standard', 'premium')),
    baseline_rate   DECIMAL(8,2),
    baseline_updated_at TIMESTAMPTZ
);

CREATE TABLE policies (
    id              UUID PRIMARY KEY,
    worker_id       UUID REFERENCES workers(id),
    week_start      DATE NOT NULL,
    premium_amount  DECIMAL(6,2) NOT NULL,
    tier            VARCHAR NOT NULL,
    risk_score      DECIMAL(4,3),
    active          BOOLEAN DEFAULT TRUE
);

CREATE TABLE claims (
    id              UUID PRIMARY KEY,
    worker_id       UUID REFERENCES workers(id),
    order_id        VARCHAR NOT NULL,
    submitted_at    TIMESTAMPTZ NOT NULL,
    claim_timestamp TIMESTAMPTZ NOT NULL,
    gps_lat         DECIMAL(9,6),
    gps_lng         DECIMAL(9,6),
    composite_score DECIMAL(4,3),
    decision        VARCHAR CHECK (decision IN ('APPROVE','SOFT_HOLD','MANUAL_REVIEW','REJECT')),
    payout_amount   DECIMAL(8,2),
    paid_at         TIMESTAMPTZ
);

CREATE TABLE check_results (
    id              UUID PRIMARY KEY,
    claim_id        UUID REFERENCES claims(id),
    check_name      VARCHAR NOT NULL,
    score           DECIMAL(4,3),
    confidence      VARCHAR,
    flags           JSONB,
    raw_response    JSONB,
    completed_at    TIMESTAMPTZ
);

CREATE TABLE order_earnings_baseline (
    worker_id       UUID REFERENCES workers(id),
    day_of_week     SMALLINT,
    hour_band       SMALLINT,
    avg_hourly_rate DECIMAL(8,2),
    sample_count    INTEGER,
    computed_at     TIMESTAMPTZ,
    PRIMARY KEY (worker_id, day_of_week, hour_band)
);
```

---

## 9. Repository Structure and Local Setup

### Repository Structure

```
gigshield/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Onboarding.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── ClaimSubmit.jsx
│   │   └── hooks/
│   │       └── useDeepLink.js       # Zomato Order ID extraction
│   └── public/
│
├── backend/
│   ├── api/
│   │   ├── claims.py                # POST /claims ingestion
│   │   ├── policies.py              # premium calculation endpoints
│   │   └── webhooks.py              # Razorpay payout callbacks
│   ├── verification/
│   │   ├── engine.py                # asyncio.gather orchestrator
│   │   ├── platform_check.py        # Check 1
│   │   ├── gps_check.py             # Check 2
│   │   ├── environmental_check.py   # Check 3
│   │   ├── satellite_check.py       # Check 4
│   │   └── fraud_check.py           # Check 5
│   ├── scoring/
│   │   └── composite.py             # weighted score aggregation
│   └── workers/
│       └── soft_hold_poller.py      # background recheck loop
│
├── ml/
│   ├── premium_model/
│   │   ├── train.py                 # XGBoost training pipeline
│   │   └── features.py
│   └── fraud_model/
│       ├── train.py                 # Isolation Forest training
│       └── inference.py
│
├── mock-apis/
│   ├── zomato_mock.py
│   └── swiggy_mock.py
│
└── docs/
    ├── architecture.md
    └── api-reference.md
```

### Local Setup

```bash
git clone https://github.com/your-org/gigshield.git
cd gigshield

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

# Mock platform APIs
cd mock-apis
uvicorn mock_server:app --port 8001

# Frontend
cd frontend
npm install
npm run dev

# Train ML models (first time)
cd ml
python premium_model/train.py --data data/synthetic_workers.csv
python fraud_model/train.py --data data/synthetic_claims.csv
```

### Environment Variables

```
OPENWEATHERMAP_API_KEY=
GOOGLE_MAPS_API_KEY=
GDELT_API_KEY=
NEWSAPI_KEY=
CPCB_API_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
WHATSAPP_API_TOKEN=
COPERNICUS_USERNAME=
COPERNICUS_PASSWORD=
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PLATFORM_API_BASE_URL=http://localhost:8001
```

### External API Dependencies

| API | Provider | Free Tier | Usage |
|---|---|---|---|
| Weather | OpenWeatherMap | 1,000 calls/day | Check 3 weather signals |
| Flood alerts | India Meteorological Department | Free public | Check 3 IMD alerts |
| River gauges | Central Water Commission | Free public | Check 3 flood stage |
| Air quality | OpenAQ + CPCB | Free | Check 3 AQI |
| Event monitoring | GDELT | Free | Check 3 social disruptions |
| News | NewsAPI | 100 calls/day (dev) | Check 3 strike corroboration |
| Route check | Google Maps Directions | Free tier ($200/mo credit) | Check 3 road closures |
| SAR imagery | Copernicus Sentinel-1 | Free (ESA account) | Check 4 flood corroboration |
| Payouts | Razorpay | Test mode free | UPI payout simulation |
| Notifications | WhatsApp Business + Twilio | Trial credits | Worker alerts |

---

*GigShield · Guidewire DEVTrails 2026 · Income protection for the people who keep India's cities fed*
