const Worker = require('../models/Worker');
const { checkPlatformApi } = require('./platformCheck');
const { checkLocationConfidence } = require('./locationCheck');
const { checkDisruptionSignals } = require('./disruptionCheck');
const { checkFraudAnomalyScore } = require('./fraudCheck');
const { checkPhotoEvidence } = require('./photoCheck');
const { runFinalAiVerifier } = require('./finalAiVerifier');
const { computeDeterministicScore, decideOutcome } = require('../scoring/decisionPolicy');
const { haversine } = require('./gpsCheck');

function buildFallback(checkName, weight, reason) {
  return {
    checkName,
    weight,
    score: 0.35,
    confidence: 'LOW',
    hardReject: false,
    flags: ['CHECK_EXECUTION_ERROR'],
    data: { reason },
    completedAt: new Date(),
  };
}

function buildAiSummary({
  claim,
  platformCheck,
  locationCheck,
  disruptionCheck,
  photoCheck,
  fraudCheck,
  deterministicScore,
}) {
  return {
    claim: {
      orderId: claim.orderId,
      platform: claim.platform,
      disruptionType: claim.disruptionType,
      claimTimestamp: claim.claimTimestamp,
    },
    platformVerification: {
      score: platformCheck.score,
      confidence: platformCheck.confidence,
      flags: platformCheck.flags,
      orderStatus: platformCheck.data?.orderStatus || null,
      timeDeltaSeconds: platformCheck.data?.timeDeltaSeconds || null,
    },
    locationConfidence: {
      score: locationCheck.score,
      confidence: locationCheck.confidence,
      flags: locationCheck.flags,
      routeDistanceMetres: locationCheck.data?.routeDistanceMetres ?? null,
      platformLastGpsDistanceMetres: locationCheck.data?.platformLastGpsDistanceMetres ?? null,
      nearestOrderPointDistanceMetres: locationCheck.data?.nearestOrderPointDistanceMetres ?? null,
      workerPlace: locationCheck.data?.workerPlace ?? null,
      platformPlace: locationCheck.data?.platformPlace ?? null,
    },
    disruptionValidation: {
      score: disruptionCheck.score,
      confidence: disruptionCheck.confidence,
      flags: disruptionCheck.flags,
      disruptionType: disruptionCheck.data?.disruptionType ?? claim.disruptionType,
      weather: disruptionCheck.data?.weather ?? null,
      aqi: disruptionCheck.data?.aqi ?? null,
      autoEligible: Boolean(disruptionCheck.data?.autoEligible),
    },
    photoEvidence: {
      score: photoCheck.score,
      confidence: photoCheck.confidence,
      flags: photoCheck.flags,
      verdict: photoCheck.data?.verdict ?? null,
      usableEvidence: photoCheck.data?.usableEvidence ?? false,
      reason: photoCheck.data?.reason ?? null,
      photoCount: photoCheck.data?.photoCount ?? 0,
    },
    fraudModifier: {
      score: fraudCheck.score,
      confidence: fraudCheck.confidence,
      flags: fraudCheck.flags,
      mlScoreRaw: fraudCheck.data?.mlScoreRaw ?? null,
    },
    deterministicScore,
  };
}

async function runVerification(claim, db, redisClient) {
  const { orderId, platform, workerId } = claim;
  const claimedGps = { lat: claim.gps.lat, lng: claim.gps.lng };
  const claimTimestamp = claim.claimTimestamp ? new Date(claim.claimTimestamp) : new Date();

  const platformCheck = await checkPlatformApi(orderId, workerId.toString(), claimTimestamp, platform);
  if (platformCheck.hardReject) {
    return {
      compositeScore: 0,
      decision: 'REJECT',
      decisionReason: 'Platform authenticity checks failed.',
      checkResults: [platformCheck],
    };
  }

  let workerDeviceFp = 'unknown';
  try {
    const WorkerModel = db?.models?.Worker || Worker;
    const workerDoc = await WorkerModel.findById(workerId, 'deviceFingerprint').exec();
    if (workerDoc?.deviceFingerprint) {
      workerDeviceFp = workerDoc.deviceFingerprint;
    }
  } catch (error) {
    // Keep the engine resilient and let fraud scoring fall back.
  }

  const routePolyline = platformCheck.data?.routePolyline;
  const platformLastGps = platformCheck.data?.platformLastGps;
  const pickupCoords = platformCheck.data?.pickupCoords;
  const dropCoords = platformCheck.data?.dropCoords;
  const platformGpsDivergence = haversine(claimedGps, platformLastGps);

  const [locationRes, disruptionRes, fraudRes, photoRes] = await Promise.allSettled([
    checkLocationConfidence({
      claimedGps,
      claimTimestamp,
      routePolyline,
      platformLastGps,
      pickupCoords,
      dropCoords,
    }),
    checkDisruptionSignals({ claimedGps, disruptionType: claim.disruptionType }),
    checkFraudAnomalyScore(workerId, orderId, workerDeviceFp, platformGpsDivergence, db, redisClient),
    checkPhotoEvidence(claim.photos, claim.disruptionType),
  ]);

  const locationCheck =
    locationRes.status === 'fulfilled'
      ? locationRes.value
      : buildFallback('location_confidence', 0.3, 'Location confidence evaluation failed.');
  const disruptionCheck =
    disruptionRes.status === 'fulfilled'
      ? disruptionRes.value
      : buildFallback('disruption_validation', 0.25, 'Disruption validation failed.');
  const fraudCheck =
    fraudRes.status === 'fulfilled'
      ? fraudRes.value
      : buildFallback('fraud_anomaly', 0.05, 'Fraud modifier evaluation failed.');
  const photoCheck =
    photoRes.status === 'fulfilled'
      ? photoRes.value
      : buildFallback('photo_evidence', 0.1, 'Photo evidence evaluation failed.');

  const deterministicScore = computeDeterministicScore({
    platformCheck,
    locationCheck,
    disruptionCheck,
    photoCheck,
    fraudCheck,
  });
  const aiSummary = buildAiSummary({
    claim,
    platformCheck,
    locationCheck,
    disruptionCheck,
    photoCheck,
    fraudCheck,
    deterministicScore,
  });
  const aiCheck = await runFinalAiVerifier(aiSummary, deterministicScore);

  const outcome = decideOutcome({
    disruptionType: claim.disruptionType,
    platformCheck,
    locationCheck,
    disruptionCheck,
    photoCheck,
    fraudCheck,
    aiCheck,
  });

  return {
    compositeScore: outcome.finalScore,
    decision: outcome.decision,
    decisionReason: outcome.reason,
    checkResults: [platformCheck, locationCheck, disruptionCheck, photoCheck, fraudCheck, aiCheck],
  };
}

module.exports = {
  runVerification,
};
