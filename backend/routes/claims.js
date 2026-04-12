const express = require('express');
const dayjs = require('dayjs');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');

// Models
const Claim = require('../models/Claim');
const Policy = require('../models/Policy');
const Worker = require('../models/Worker');
const Payout = require('../models/Payout');
const ManualReview = require('../models/ManualReview');
const AuditLog = require('../models/AuditLog');
const ClaimEvidence = require('../models/ClaimEvidence');
const ClaimCheck = require('../models/ClaimCheck');

// Verification & Scoring
const { runVerification } = require('../verification/engine');
const { haversine } = require('../verification/gpsCheck');
const { calculatePayout, estimateStrandedHours } = require('../scoring/payout');
const redisClient = require('../db/redisClient'); // Assuming this exports { redis, getJson }
const { requireAdmin, requireWorker } = require('../middleware/auth');
const {
  adminClaimsPattern,
  buildCacheKey,
  deleteByPatterns,
  getOrSetJson,
  workerClaimsPattern,
} = require('../services/cache');

const router = express.Router();

function toObjectIdString(value) {
  return value ? value.toString() : null;
}

async function syncPayoutRecord(claim) {
  if (!claim?.payout) {
    return null;
  }

  const payoutDoc = await Payout.findOneAndUpdate(
    { claimId: claim._id },
    {
      workerId: claim.workerId,
      policyId: claim.policyId,
      organizationId: claim.organizationId || null,
      amount: claim.payout.total || 0,
      currency: claim.payout.currency || 'INR',
      upiHandle: claim.payment?.upiHandle || null,
      providerPayoutId: claim.payment?.razorpayPayoutId || null,
      status: mapPayoutStatus(claim.payment?.status),
      failureReason: claim.payment?.failureReason || null,
      initiatedAt: claim.payment?.initiatedAt || null,
      completedAt: claim.payment?.completedAt || null,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return payoutDoc;
}

async function syncClaimEvidenceRecord(claim, checkResults = []) {
  const platformCheck = checkResults.find((result) => result.checkName === 'platform_api');
  const environmentalCheck =
    checkResults.find((result) => result.checkName === 'disruption_validation') ||
    checkResults.find((result) => result.checkName === 'environmental');
  const locationCheck = checkResults.find((result) => result.checkName === 'location_confidence');
  const photoCheck = checkResults.find((result) => result.checkName === 'photo_evidence');
  const aiCheck = checkResults.find((result) => result.checkName === 'ai_final_verifier');

  return ClaimEvidence.findOneAndUpdate(
    { claimId: claim._id },
    {
      workerId: claim.workerId,
      organizationId: claim.organizationId || null,
      gps: claim.gps || null,
      photos: claim.photos || [],
      platformLastGps: platformCheck?.data?.platformLastGps || null,
      routePolyline: platformCheck?.data?.routePolyline || null,
      environmentSnapshot: environmentalCheck?.data || null,
      satelliteSnapshot: photoCheck?.data || null,
      sourcePayloads: {
        platform: platformCheck?.data || null,
        location: locationCheck?.data || null,
        environmental: environmentalCheck?.data || null,
        photos: photoCheck?.data || null,
        aiFinal: aiCheck?.data || null,
      },
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function syncClaimChecks(claim, checkResults = []) {
  if (!Array.isArray(checkResults) || checkResults.length === 0) {
    return [];
  }

  await ClaimCheck.deleteMany({ claimId: claim._id });
  return ClaimCheck.insertMany(
    checkResults.map((result) => ({
      claimId: claim._id,
      workerId: claim.workerId,
      organizationId: claim.organizationId || null,
      checkName: result.checkName,
      weight: result.weight,
      score: result.score,
      confidence: result.confidence || 'NONE',
      hardReject: Boolean(result.hardReject),
      flags: result.flags || [],
      data: result.data || null,
      completedAt: result.completedAt || null,
      updatedAt: new Date(),
    }))
  );
}

async function syncManualReviewRecord(claim, adminId = null) {
  if (!claim?.manualReview) {
    return null;
  }

  const manualReviewDoc = await ManualReview.findOneAndUpdate(
    { claimId: claim._id },
    {
      assignedToAdminId: adminId || null,
      assignedAt: claim.manualReview.assignedAt || null,
      status: claim.manualReview.resolvedAt ? 'resolved' : (claim.manualReview.assignedAt ? 'assigned' : 'queued'),
      resolution: mapManualReviewResolution(claim.manualReview.resolution),
      notes: claim.manualReview.notes || null,
      resolvedAt: claim.manualReview.resolvedAt || null,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return manualReviewDoc;
}

function mapPayoutStatus(status) {
  switch (status) {
    case 'PAID':
      return 'paid';
    case 'INITIATED':
      return 'initiated';
    case 'FAILED':
      return 'failed';
    default:
      return 'pending';
  }
}

function mapManualReviewResolution(resolution) {
  if (resolution === 'APPROVED') return 'approved';
  if (resolution === 'REJECTED') return 'rejected';
  return undefined;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGpsPayload(gps = {}) {
  const lat = toFiniteNumber(gps.lat);
  const lng = toFiniteNumber(gps.lng);
  const accuracyMetres = toFiniteNumber(gps.accuracy_metres ?? gps.accuracyMetres ?? gps.accuracy);
  const networkLat = toFiniteNumber(gps.network_lat ?? gps.networkLat);
  const networkLng = toFiniteNumber(gps.network_lng ?? gps.networkLng);
  const networkAccuracyMetres = toFiniteNumber(
    gps.network_accuracy_metres ?? gps.networkAccuracyMetres ?? gps.network_accuracy
  );

  const normalized = {
    lat,
    lng,
    accuracy_metres: accuracyMetres,
    network_lat: networkLat,
    network_lng: networkLng,
    network_accuracy_metres: networkAccuracyMetres,
    google_geoloc_used: Boolean(gps.google_geoloc_used ?? gps.googleGeolocUsed)
  };

  if (lat !== null && lng !== null && networkLat !== null && networkLng !== null) {
    const claimedGps = { lat, lng };
    const networkGps = { lat: networkLat, lng: networkLng };
    normalized.cell_gps_divergence_metres = Math.round(haversine(claimedGps, networkGps));
  } else {
    normalized.cell_gps_divergence_metres = toFiniteNumber(
      gps.cell_gps_divergence_metres ?? gps.cellGpsDivergenceMetres
    );
  }

  return normalized;
}

async function fetchMockOrders() {
  const platformApiUrl = process.env.PLATFORM_API_URL || 'http://mock_apis:8002';
  const response = await require('axios').get(`${platformApiUrl}/orders/list`, {
    timeout: 3000,
  });

  const zomatoOrders = Array.isArray(response.data?.zomato) ? response.data.zomato : [];
  const swiggyOrders = Array.isArray(response.data?.swiggy) ? response.data.swiggy : [];

  return [
    ...zomatoOrders.map((orderId) => ({ orderId, platform: 'zomato' })),
    ...swiggyOrders.map((orderId) => ({ orderId, platform: 'swiggy' })),
  ];
}

async function generateDemoOrder(platform, anchor) {
  const platformApiUrl = process.env.PLATFORM_API_URL || 'http://mock_apis:8002';
  const response = await require('axios').post(
    `${platformApiUrl}/orders/demo-generate`,
    { platform, anchor },
    { timeout: 3000 }
  );

  return response.data;
}

function normalizePhotosPayload(photos = []) {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos
    .filter((photo) => photo && typeof photo.dataUrl === 'string')
    .map((photo) => ({
      name: photo.name || 'incident-photo',
      mimeType: photo.mimeType || 'image/jpeg',
      sizeBytes: toFiniteNumber(photo.sizeBytes) || 0,
      capturedAt: photo.capturedAt ? new Date(photo.capturedAt) : new Date(),
      dataUrl: photo.dataUrl,
    }));
}

function toAdminPhotoSummary(photos = []) {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos.map((photo) => ({
    name: photo.name || 'incident-photo',
    mimeType: photo.mimeType || 'image/jpeg',
    sizeBytes: photo.sizeBytes || 0,
    capturedAt: photo.capturedAt || null,
    dataUrl: photo.dataUrl || null,
  }));
}

function toWorkerClaimSummary(claim) {
  const baseClaim = claim?.toObject ? claim.toObject() : claim;
  const photos = Array.isArray(baseClaim.photos) ? baseClaim.photos : [];
  const checkResults = Array.isArray(baseClaim.checkResults) ? baseClaim.checkResults : [];

  return {
    ...baseClaim,
    photos: photos.map((photo) => ({
      name: photo.name || 'incident-photo',
      mimeType: photo.mimeType || 'image/jpeg',
      sizeBytes: photo.sizeBytes || 0,
      capturedAt: photo.capturedAt || null,
    })),
    photoCount: photos.length,
    checkResults: checkResults.map((result) => ({
      checkName: result.checkName,
      weight: result.weight,
      score: result.score,
      confidence: result.confidence || 'NONE',
      hardReject: Boolean(result.hardReject),
      flags: Array.isArray(result.flags) ? result.flags : [],
      completedAt: result.completedAt || null,
    })),
  };
}

async function attachAdminClaimDetails(claim, { includeEvidence = false } = {}) {
  try {
    const baseClaim = claim.toObject ? claim.toObject() : claim;

    if (!includeEvidence) {
      return {
        ...baseClaim,
        photos: Array.isArray(baseClaim.photos) ? baseClaim.photos.map((photo) => ({
          name: photo.name || 'incident-photo',
          mimeType: photo.mimeType || 'image/jpeg',
          sizeBytes: photo.sizeBytes || 0,
          capturedAt: photo.capturedAt || null,
        })) : [],
      };
    }

    const evidence = await ClaimEvidence.findOne({ claimId: claim._id }).lean();
    const checks = await ClaimCheck.find({ claimId: claim._id }).lean();

    return {
      ...baseClaim,
      evidence: evidence ? {
        ...evidence,
        photos: toAdminPhotoSummary(evidence.photos),
      } : null,
      photos: toAdminPhotoSummary(baseClaim.photos),
      checks,
    };
  } catch (error) {
    const baseClaim = claim.toObject ? claim.toObject() : claim;
    console.error('Admin claim detail attachment failed:', error.message);
    return {
      ...baseClaim,
      evidence: null,
      photos: toAdminPhotoSummary(baseClaim.photos),
      checks: [],
    };
  }
}

// --- Helpers ---

/**
 * Initiates Razorpay UPI payment in test mode constraints.
 */
async function _initiatePayout(claimId, worker, payoutAmount, upiHandle) {
  try {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummyKey';
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_dummySecret';

    // Mock/Dummy guard handling if missing true auth credentials during testing
    if (razorpayKeyId === 'rzp_test_dummyKey') {
      return { 
        razorpayPayoutId: 'TEST_rzp_mock_' + Math.random().toString(36).substring(7), 
        upiHandle, 
        status: "INITIATED", 
        initiatedAt: new Date() 
      };
    }

    const rzp = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // In a prod system, handling Fund_Account derivations is necessary, keeping structurally pure for hackathon mock scopes
    const payout = await rzp.payouts.create({
      account_number: "7878780080316316", // Standard RazorpayX test funding account
      fund_account_id: upiHandle,
      amount: Math.round(payoutAmount * 100), // convert to paise
      currency: "INR",
      mode: "UPI",
      purpose: "payout",
      reference_id: claimId.toString()
    });

    return { 
      razorpayPayoutId: payout.id, 
      upiHandle, 
      status: "INITIATED", 
      initiatedAt: new Date() 
    };
  } catch (error) {
    return { 
      upiHandle, 
      status: "FAILED", 
      failureReason: error.message || "Unknown Razorpay exception" 
    };
  }
}

/**
 * Placeholder for Phase 3 WhatsApp Webhooks integration
 */
async function sendWhatsapp(workerId, messageType, context = {}) {
  // TODO Phase 3: Implement Twilio/WhatsApp Business API logic natively
  console.log(`[WHATSAPP MOCK] Sent ${messageType} to worker ${workerId}`);
}

// --- Routes ---

/**
 * Submit a new parametric claim
 * POST /api/v1/claims/
 */
router.get('/mock-orders', requireWorker, async (req, res) => {
  try {
    const orders = await fetchMockOrders();
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load mock order list right now.' });
  }
});

router.post('/mock-orders/demo-generate', requireWorker, async (req, res) => {
  try {
    const platform = req.body?.platform === 'swiggy' ? 'swiggy' : 'zomato';
    const order = await generateDemoOrder(platform, req.body?.anchor || {});
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to generate a demo order right now.' });
  }
});

router.post('/', requireWorker, async (req, res) => {
  try {
    const { orderId, platform, gps, disruptionType, claimTimestamp, photos } = req.body;
    
    // 1. Placeholder Auth
    const workerId = req.workerId;

    const now = new Date();

    // 2. Locate Active Policy bounds evaluating constraints rigidly
    const activePolicy = await Policy.findOne({
      workerId,
      status: "active",
      weekStart: { $lte: now },
      weekEnd: { $gte: now }
    });

    // 3. Strict barrier return
    if (!activePolicy) {
      return res.status(402).json({ message: "No active policy for current week" });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({ error: "Linked Worker profile unlocatable" });
    }

    // 5. Build clean, readable domain reference identifier
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const claimRef = `CLM-${dayjs().format('YYYYMMDD')}-${randomSuffix}`;

    // 6. Stage unverified structure mapped safely avoiding async edge leakages
    let claim = new Claim({
      workerId,
      organizationId: worker.organizationId || null,
      policyId: activePolicy._id,
      orderId,
      platform,
      claimTimestamp: claimTimestamp ? new Date(claimTimestamp) : now,
      gps: normalizeGpsPayload(gps),
      photos: normalizePhotosPayload(photos),
      disruptionType,
      claimRef,
      checkResults: []
    });

    // 4. Mongoose uniqueness catch implementation
    try {
      await claim.save();
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: "Claim already successfully lodged for this Order ID." });
      }
      throw err;
    }

    // 7. Core Composite Engine Verification
    const { compositeScore, decision, decisionReason, checkResults } = await runVerification(claim, mongoose, redisClient);

    // 8. Parametric Structural Payout Extrapolations 
    const envCheck =
      checkResults.find(r => r.checkName === 'disruption_validation') ||
      checkResults.find(r => r.checkName === 'environmental');
    const strandedHours = await estimateStrandedHours(claim.claimTimestamp, disruptionType, envCheck);
    
    const payoutBreakdown = calculatePayout(
      strandedHours, 
      workerId, 
      claim.claimTimestamp, 
      activePolicy.tier, 
      checkResults, 
      worker
    );

    // 9. Update composite document structure via atomic commit
    claim = await Claim.findByIdAndUpdate(claim._id, {
      checkResults,
      compositeScore,
      decision,
      decisionReason,
      payout: payoutBreakdown,
      intakeStatus: 'verified',
      reviewStatus: decision === 'SOFT_HOLD' || decision === 'MANUAL_REVIEW' ? 'manual_review' : 'completed',
      payoutStatus: decision === 'APPROVE' ? 'initiated' : 'pending',
      updatedAt: new Date(),
    }, { new: true });
    await syncClaimEvidenceRecord(claim, checkResults);
    await syncClaimChecks(claim, checkResults);

    // 10, 11, 12. Context routing mappings processing the final payload 
    if (decision === "APPROVE") {
      const paymentRec = await _initiatePayout(claim._id, worker, payoutBreakdown.total, worker.upiHandle);
      claim = await Claim.findByIdAndUpdate(
        claim._id,
        {
          payment: paymentRec,
          payoutStatus: mapPayoutStatus(paymentRec.status),
          updatedAt: new Date(),
        },
        { new: true }
      );
      await syncPayoutRecord(claim);
      await sendWhatsapp(workerId, "CLAIM_APPROVED", { amount: payoutBreakdown.total });
      
    } else if (decision === "SOFT_HOLD") {
      const nextCheckAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // Now + 4 hours safely
      claim = await Claim.findByIdAndUpdate(claim._id, { 
        softHold: { nextCheckAt, recheckCount: 0 },
        reviewStatus: 'pending',
        updatedAt: new Date(),
      }, { new: true });
      await sendWhatsapp(workerId, "CLAIM_SOFT_HOLD");

    } else if (decision === "MANUAL_REVIEW") {
      claim = await Claim.findByIdAndUpdate(claim._id, { 
        manualReview: { assignedAt: new Date() },
        reviewStatus: 'manual_review',
        updatedAt: new Date(),
      }, { new: true });
      await syncManualReviewRecord(claim);
      await sendWhatsapp(workerId, "CLAIM_MANUAL_REVIEW");
    }

    await AuditLog.create({
      actorType: 'worker',
      actorId: worker._id,
      entityType: 'claim',
      entityId: claim._id,
      action: 'claim_submitted',
      after: {
        decision: claim.decision,
        payoutStatus: claim.payoutStatus,
        reviewStatus: claim.reviewStatus,
        compositeScore: claim.compositeScore,
      },
      metadata: {
        claimRef: claim.claimRef,
        orderId: claim.orderId,
        policyId: toObjectIdString(claim.policyId),
      },
      ipAddress: req.ip,
    });

    await deleteByPatterns([
      workerClaimsPattern(worker._id),
      adminClaimsPattern(),
    ]);

    // 13. Resolution
    return res.json(claim);

  } catch (error) {
    console.error("Claim Submission Fatal Exception: ", error);
    return res.status(500).json({ error: "Internal System Verification Error" });
  }
});

/**
 * List claims for current worker context gracefully paginated
 * GET /api/v1/claims/
 */
router.get('/', requireWorker, async (req, res) => {
  try {
    const workerId = req.workerId;
    
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const cacheKey = buildCacheKey('claims:worker', { workerId, limit, skip });
    const { value: claims, cacheHit } = await getOrSetJson(cacheKey, 45, async () => {
      const result = await Claim.find({ workerId })
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return result.map((claim) => toWorkerClaimSummary(claim));
    });

    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    res.json(claims);
  } catch(e) {
    res.status(500).json({ error: "Resolution Error" });
  }
});

/**
 * Enterprise Admin Retrieval Route Mapping
 * GET /api/v1/claims/admin/all
 */
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { decision, dateFrom, dateTo, limit, skip } = req.query;
    const parsedSkip = parseInt(skip) || 0;
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    let query = {};

    if (decision) {
      query.decision = decision;
    }

    if (dateFrom || dateTo) {
      query.submittedAt = {};
      if (dateFrom) query.submittedAt.$gte = new Date(dateFrom);
      if (dateTo) query.submittedAt.$lte = new Date(dateTo);
    }

    const claims = await Claim.find(query)
      .select([
        'workerId',
        'orderId',
        'platform',
        'claimTimestamp',
        'gps',
        'disruptionType',
        'claimRef',
        'submittedAt',
        'compositeScore',
        'decision',
        'decisionReason',
        'reviewStatus',
        'payoutStatus',
        'payout',
        'manualReview',
        'softHold',
      ].join(' '))
      .sort({ submittedAt: -1 })
      .allowDiskUse(true)
      .skip(parsedSkip)
      .limit(parsedLimit)
      .lean();

    const enrichedClaims = await Promise.allSettled(
      claims.map((claim) =>
        attachAdminClaimDetails(claim, {
          includeEvidence: ['SOFT_HOLD', 'MANUAL_REVIEW'].includes(claim.decision),
        })
      )
    );

    const detailedClaims = enrichedClaims
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);

    res.set('X-Cache', 'BYPASS');
    res.json(detailedClaims);
  } catch (err) {
    console.error('Admin dashboard query failed:', err.message);
    res.status(500).json({ error: "Enterprise Dashboard Rendering Query Failed" });
  }
});

/**
 * Get individual claim record
 * GET /api/v1/claims/:claimId
 */
router.get('/:claimId', requireWorker, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.claimId);
    if (!claim) return res.status(404).json({ error: "Claim record missing" });
    if (claim.workerId.toString() !== req.workerId) {
      return res.status(403).json({ error: "Claim does not belong to current worker" });
    }
    res.json(claim);
  } catch(e) {
    res.status(500).json({ error: "Resolution error fetching claim structure" });
  }
});

/**
 * Admin Manual review resolution override processor
 * PUT /api/v1/claims/:claimId/review
 */
router.put('/:claimId/review', requireAdmin, async (req, res) => {
  try {
    const { resolution, notes } = req.body;
    let claim = await Claim.findById(req.params.claimId);
    if (!claim) return res.status(404).json({ error: "Claim missing" });
    
    claim.manualReview = {
      ...claim.manualReview,
      resolution,
      notes,
      resolvedAt: new Date(),
      assignedTo: req.admin.id
    };
    
    claim.decision = resolution === 'APPROVED' ? 'APPROVE' : 'REJECT';
    claim.reviewStatus = 'completed';
    await claim.save();
    
    if (claim.decision === 'APPROVE') {
      const worker = await Worker.findById(claim.workerId);
      const paymentRec = await _initiatePayout(
        claim._id, 
        worker, 
        claim.payout.total, 
        claim.payment?.upiHandle || worker.upiHandle
      );
      claim.payment = paymentRec;
      claim.payoutStatus = mapPayoutStatus(paymentRec.status);
      await claim.save();
      await syncPayoutRecord(claim);
    } else {
      claim.payoutStatus = 'failed';
      await claim.save();
    }

    await syncManualReviewRecord(claim);
    await AuditLog.create({
      actorType: 'admin',
      actorId: req.admin.id,
      entityType: 'claim',
      entityId: claim._id,
      action: 'claim_reviewed',
      after: {
        decision: claim.decision,
        payoutStatus: claim.payoutStatus,
        reviewStatus: claim.reviewStatus,
      },
      metadata: {
        resolution,
        notes,
      },
      ipAddress: req.ip,
    });

    await deleteByPatterns([
      workerClaimsPattern(claim.workerId),
      adminClaimsPattern(),
    ]);
    
    res.json(claim);
  } catch(e) {
    res.status(500).json({ error: "Failed to cleanly action reviewer overrides" });
  }
});

module.exports = router;
