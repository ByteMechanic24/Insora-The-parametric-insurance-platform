const { haversine } = require('./gpsCheck');
const { reverseGeocode } = require('./providers/openWeatherClient');

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function decodePolyline(str, precision = 5) {
  if (!str || typeof str !== 'string') {
    return [];
  }

  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push({ lat: lat / factor, lng: lng / factor });
  }

  return coordinates;
}

function distanceToSegment(point, start, end) {
  const earthRadius = 6371e3;
  const latRad = start.lat * (Math.PI / 180);

  const x0 = point.lng * (Math.PI / 180) * Math.cos(latRad) * earthRadius;
  const y0 = point.lat * (Math.PI / 180) * earthRadius;
  const x1 = start.lng * (Math.PI / 180) * Math.cos(latRad) * earthRadius;
  const y1 = start.lat * (Math.PI / 180) * earthRadius;
  const x2 = end.lng * (Math.PI / 180) * Math.cos(latRad) * earthRadius;
  const y2 = end.lat * (Math.PI / 180) * earthRadius;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const denominator = (dx * dx) + (dy * dy);
  if (!denominator) {
    return haversine(point, start);
  }

  let t = ((x0 - x1) * dx + (y0 - y1) * dy) / denominator;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + (t * dx);
  const projY = y1 + (t * dy);

  return Math.sqrt(((x0 - projX) ** 2) + ((y0 - projY) ** 2));
}

function minDistanceToPolyline(point, polyline) {
  const coords = decodePolyline(polyline);
  if (coords.length === 0) return Infinity;
  if (coords.length === 1) return haversine(point, coords[0]);

  let min = Infinity;
  for (let index = 0; index < coords.length - 1; index += 1) {
    min = Math.min(min, distanceToSegment(point, coords[index], coords[index + 1]));
  }
  return min;
}

function scoreFromDistance(distance, excellent, poor) {
  if (!Number.isFinite(distance)) return 0;
  if (distance <= excellent) return 1;
  if (distance >= poor) return 0;
  return clampScore(1 - ((distance - excellent) / (poor - excellent)));
}

function normalizePlace(place) {
  if (!place) return null;
  return {
    name: place.name || null,
    state: place.state || null,
    country: place.country || null,
  };
}

function comparePlaces(workerPlace, platformPlace) {
  if (!workerPlace || !platformPlace) {
    return {
      score: 0.35,
      matchedFields: [],
      mismatchFields: [],
    };
  }

  const matchedFields = [];
  const mismatchFields = [];
  const fields = ['name', 'state', 'country'];

  for (const field of fields) {
    const workerValue = (workerPlace[field] || '').toLowerCase();
    const platformValue = (platformPlace[field] || '').toLowerCase();
    if (workerValue && platformValue) {
      if (workerValue === platformValue) {
        matchedFields.push(field);
      } else {
        mismatchFields.push(field);
      }
    }
  }

  const score = matchedFields.includes('name')
    ? 1
    : matchedFields.length === 2
      ? 0.82
      : matchedFields.length === 1
        ? 0.58
        : mismatchFields.length > 0
          ? 0.12
          : 0.35;

  return {
    score,
    matchedFields,
    mismatchFields,
  };
}

async function checkLocationConfidence({ claimedGps, claimTimestamp, routePolyline, platformLastGps, pickupCoords, dropCoords }) {
  const routeDistance = minDistanceToPolyline(claimedGps, routePolyline);
  const platformLastGpsDistance = haversine(claimedGps, platformLastGps);
  const pickupDistance = haversine(claimedGps, pickupCoords);
  const dropDistance = haversine(claimedGps, dropCoords);
  const nearestOrderPointDistance = Math.min(
    Number.isFinite(pickupDistance) ? pickupDistance : Infinity,
    Number.isFinite(dropDistance) ? dropDistance : Infinity,
  );

  const [workerPlaceRaw, platformPlaceRaw] = await Promise.allSettled([
    reverseGeocode(claimedGps.lat, claimedGps.lng, 1),
    reverseGeocode(
      (platformLastGps?.lat ?? pickupCoords?.lat ?? claimedGps.lat),
      (platformLastGps?.lng ?? pickupCoords?.lng ?? claimedGps.lng),
      1
    ),
  ]);

  const workerPlace = normalizePlace(workerPlaceRaw.status === 'fulfilled' ? workerPlaceRaw.value?.[0] : null);
  const platformPlace = normalizePlace(platformPlaceRaw.status === 'fulfilled' ? platformPlaceRaw.value?.[0] : null);
  const geocodeComparison = comparePlaces(workerPlace, platformPlace);

  const routeScore = scoreFromDistance(routeDistance, 120, 2200);
  const platformGpsScore = scoreFromDistance(platformLastGpsDistance, 150, 3000);
  const pickupDropScore = scoreFromDistance(nearestOrderPointDistance, 150, 2500);

  const gpsFreshnessMinutes = Math.abs(Date.now() - new Date(claimTimestamp).getTime()) / 60000;
  const freshnessScore = gpsFreshnessMinutes <= 15 ? 1 : gpsFreshnessMinutes <= 60 ? 0.75 : 0.5;

  const score = clampScore(
    (routeScore * 0.4) +
      (platformGpsScore * 0.3) +
      (pickupDropScore * 0.1) +
      (geocodeComparison.score * 0.15) +
      (freshnessScore * 0.05)
  );

  let confidence = 'LOW';
  if (score >= 0.75) confidence = 'HIGH';
  else if (score >= 0.5) confidence = 'MEDIUM';

  const flags = [];
  if (routeDistance > 2500) flags.push('WORKER_FAR_FROM_ROUTE');
  if (platformLastGpsDistance > 3500) flags.push('WORKER_FAR_FROM_PLATFORM_GPS');
  if (geocodeComparison.mismatchFields.length >= 2) flags.push('REVERSE_GEOCODE_MISMATCH');

  return {
    checkName: 'location_confidence',
    weight: 0.3,
    score,
    confidence,
    hardReject: false,
    flags,
    data: {
      routeDistanceMetres: routeDistance,
      platformLastGpsDistanceMetres: platformLastGpsDistance,
      nearestOrderPointDistanceMetres: nearestOrderPointDistance,
      workerPlace,
      platformPlace,
      geocodeComparison,
      gpsFreshnessMinutes,
    },
    completedAt: new Date(),
  };
}

module.exports = {
  checkLocationConfidence,
};
