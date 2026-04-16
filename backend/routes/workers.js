const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const Worker = require('../models/Worker');
const Policy = require('../models/Policy');
const Organization = require('../models/Organization');
const AuthIdentity = require('../models/AuthIdentity');
const AuthSession = require('../models/AuthSession');
const AuditLog = require('../models/AuditLog');
const {
  createWorkerSession,
  revokeWorkerSession,
  upsertWorkerIdentity,
  verifyWorkerIdentity,
} = require('../services/auth');
const { requireWorker } = require('../middleware/auth');
const {
  buildCacheKey,
  getOrSetJson,
  deleteByPatterns,
  workerPolicyPattern,
  workerSessionPattern,
} = require('../services/cache');

const router = express.Router();

function normalizePhone(phone) {
  if (!phone) {
    return '';
  }

  const trimmed = String(phone).trim();
  if (/^\d{10}$/.test(trimmed)) {
    return `+91${trimmed}`;
  }

  return trimmed;
}

async function reconcileActivePolicies(worker) {
  const activePolicies = await Policy.find({
    workerId: worker._id,
    status: 'active',
  })
    .sort({ createdAt: -1, _id: -1 })
    .exec();

  if (activePolicies.length === 0) {
    if (worker.activePolicyId) {
      worker.activePolicyId = null;
      worker.updatedAt = new Date();
      await worker.save();
    }
    return null;
  }

  const [primaryPolicy, ...duplicatePolicies] = activePolicies;

  if (duplicatePolicies.length > 0) {
    await Policy.updateMany(
      { _id: { $in: duplicatePolicies.map((policy) => policy._id) } },
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      }
    );
  }

  if (!worker.activePolicyId || worker.activePolicyId.toString() !== primaryPolicy._id.toString()) {
    worker.activePolicyId = primaryPolicy._id;
    worker.updatedAt = new Date();
    await worker.save();
  }

  return primaryPolicy;
}

async function getDefaultOrganization() {
  return Organization.findOneAndUpdate(
    { slug: 'gigshield-default' },
    {
      name: 'GigShield Default Org',
      slug: 'gigshield-default',
      status: 'active',
      settings: { source: 'worker-registration' },
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function cleanupFailedWorkerSignup(workerId) {
  await Promise.allSettled([
    AuthIdentity.deleteMany({ subjectType: 'worker', subjectId: workerId }),
    AuthSession.deleteMany({ subjectType: 'worker', subjectId: workerId }),
    Worker.deleteOne({ _id: workerId }),
  ]);
}

/**
 * Helper to compute the current week constraints (Monday-Sunday) securely
 */
function getCurrentWeekBounds() {
  const d = new Date();
  const day = d.getDay() || 7; // Map JS Sunday (0) to 7
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  start.setDate(d.getDate() - day + 1); 
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

router.post('/sign-up', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const normalizedPhone = normalizePhone(req.body.phone);

    if (!email || !normalizedPhone || password.length < 8) {
      return res.status(400).json({ error: 'Email, phone number, and a password of at least 8 characters are required.' });
    }

    const existingWorker = await Worker.findOne({
      $or: [{ email }, { phone: normalizedPhone }],
    }).exec();

    if (existingWorker) {
      const existingIdentity = await AuthIdentity.findOne({
        subjectType: 'worker',
        subjectId: existingWorker._id,
        authType: 'email_password',
        status: 'active',
      }).exec();

      const passwordMatchesExisting =
        existingWorker.passwordHash
          ? await bcrypt.compare(password, existingWorker.passwordHash).catch(() => false)
          : false;

      if (passwordMatchesExisting) {
        if (!existingIdentity) {
          await upsertWorkerIdentity(existingWorker, { authType: 'email_password', email });
        }

        const recoveredSession = await createWorkerSession(existingWorker, req);

        await AuditLog.create({
          actorType: 'worker',
          actorId: existingWorker._id,
          entityType: 'worker_account',
          entityId: existingWorker._id,
          action: existingIdentity ? 'worker_signup_reused' : 'worker_signup_recovered',
          metadata: { sessionId: recoveredSession.sessionId },
          ipAddress: req.ip,
        });

        return res.json({
          worker: existingWorker,
          policy: null,
          session: recoveredSession,
          message: 'We restored your existing account and signed you in.',
        });
      }

      return res.status(409).json({ error: 'An account with this email or phone number already exists.' });
    }

    const organization = await getDefaultOrganization();
    const passwordHash = await bcrypt.hash(password, 12);

    const worker = new Worker({
      organizationId: organization._id,
      email,
      phone: normalizedPhone,
      passwordHash,
      name: email.split('@')[0],
      phoneVerified: true,
      accountStatus: 'active',
      onboardingCompleted: false,
      enrolledAt: new Date(),
    });

    try {
      await worker.save();
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'An account with this email or phone number already exists.' });
      }
      throw err;
    }

    let session;

    try {
      await upsertWorkerIdentity(worker, { authType: 'email_password', email });
      session = await createWorkerSession(worker, req);
    } catch (postCreateError) {
      console.error('Worker sign-up auth/session setup failed', {
        workerId: worker._id?.toString(),
        email,
        message: postCreateError.message,
      });
      await cleanupFailedWorkerSignup(worker._id);
      return res.status(500).json({ error: 'We hit a temporary account setup issue. Please try signing up again.' });
    }

    await AuditLog.create({
      actorType: 'worker',
      actorId: worker._id,
      entityType: 'worker_account',
      entityId: worker._id,
      action: 'worker_signed_up',
      after: { email: worker.email, phone: worker.phone },
      metadata: { sessionId: session.sessionId },
      ipAddress: req.ip,
    });

    return res.json({
      worker,
      policy: null,
      session,
      message: 'Welcome to GigShield. Let’s finish your onboarding.',
    });
  } catch (error) {
    console.error('Worker sign-up failed', {
      email: String(req.body.email || '').trim().toLowerCase(),
      phone: normalizePhone(req.body.phone),
      message: error.message,
    });
    return res.status(500).json({ error: 'Unable to create your account right now.' });
  }
});

router.post('/register', requireWorker, async (req, res) => {
  try {
    const { upiHandle, deviceFingerprint, tier, city, operatingZones } = req.body;
    const normalizedUpiHandle = String(upiHandle || '').trim().toLowerCase();

    if (!normalizedUpiHandle || !tier || !city) {
      return res.status(400).json({ error: 'UPI ID, city, and plan tier are required.' });
    }

    const worker = await Worker.findById(req.workerId).exec();
    if (!worker) {
      return res.status(404).json({ error: 'Worker account not found.' });
    }

    worker.upiHandle = normalizedUpiHandle;
    worker.deviceFingerprint = crypto.createHash('sha256').update(deviceFingerprint || worker.email || 'unknown').digest('hex');
    worker.upiVerified = true;
    worker.tier = tier;
    worker.city = city;
    worker.operatingZones = operatingZones || [];

    const existingActivePolicy = await reconcileActivePolicies(worker);
    if (worker.onboardingCompleted && existingActivePolicy) {
      await worker.save();
      return res.json({ worker, policy: existingActivePolicy, session: null });
    }

    let initialPremium = 30;
    try {
      const mlUrl = `${process.env.ML_SERVICE_URL || 'http://localhost:8001'}/predict/premium`;
      const mlRes = await axios.post(mlUrl, { city, tier }, { timeout: 3000 });
      if (mlRes.data && mlRes.data.premium) {
        initialPremium = mlRes.data.premium;
      }
    } catch (e) {}

    const { start, end } = getCurrentWeekBounds();
    const policy = existingActivePolicy || await Policy.create({
      workerId: worker._id,
      organizationId: worker.organizationId,
      tier,
      premiumAmount: initialPremium,
      riskScore: 0.5,
      weekStart: start,
      weekEnd: end,
      status: 'active',
      coverageLimits: {
        maxPayoutPerWeek: tier === 'premium' ? 20000 : (tier === 'standard' ? 10000 : 5000),
      },
    });

    worker.activePolicyId = policy._id;
    worker.onboardingCompleted = true;
    worker.updatedAt = new Date();
    await worker.save();
    await deleteByPatterns([
      workerPolicyPattern(worker._id),
      workerSessionPattern(worker._id),
    ]);

    await AuditLog.create({
      actorType: 'worker',
      actorId: worker._id,
      entityType: 'worker_account',
      entityId: worker._id,
      action: 'worker_onboarding_completed',
      metadata: { policyId: policy._id, tier, city },
      ipAddress: req.ip,
    });

    return res.json({ worker, policy, session: null });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to complete onboarding right now.' });
  }
});

/**
 * POST /api/v1/workers/sign-in
 */
router.post('/sign-in', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const worker = await Worker.findOne({
      email,
      accountStatus: 'active',
    }).populate('activePolicyId').exec();
    if (!worker) {
      return res.status(404).json({ error: 'No account exists with that email. You need to sign up first.', code: 'WORKER_NOT_FOUND' });
    }

    const isMatch = worker.passwordHash ? await bcrypt.compare(password, worker.passwordHash) : false;
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const resolvedPolicy = await reconcileActivePolicies(worker);
    worker.lastLoginAt = new Date();
    await worker.save();
    await upsertWorkerIdentity(worker, { authType: 'email_password', email });

    const session = await createWorkerSession(worker, req);
    await AuditLog.create({
      actorType: 'worker',
      actorId: worker._id,
      entityType: 'auth_session',
      entityId: session.sessionId,
      action: 'worker_signed_in',
      metadata: { workerId: worker._id },
      ipAddress: req.ip,
    });
    return res.json({ worker, policy: resolvedPolicy || worker.activePolicyId || null, session });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

/**
 * GET /api/v1/workers/session
 */
router.get('/session', requireWorker, async (req, res) => {
  try {
    const cacheKey = buildCacheKey('worker:session', { workerId: req.workerId });
    const { value, cacheHit } = await getOrSetJson(cacheKey, 45, async () => {
      const worker = await Worker.findById(req.workerId).exec();
      if (!worker) {
        return null;
      }

      const resolvedPolicy = await reconcileActivePolicies(worker);
      await worker.populate('activePolicyId');

      return {
        worker,
        policy: resolvedPolicy || worker.activePolicyId || null,
      };
    });

    if (!value?.worker) {
      return res.status(404).json({ error: 'Worker Missing' });
    }

    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    return res.json({
      ...value,
      session: {
        sessionId: req.authSession?._id || null,
        expiresAt: req.authSession?.expiresAt || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to restore worker session.' });
  }
});

/**
 * POST /api/v1/workers/sign-out
 */
router.post('/sign-out', requireWorker, async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;
    if (rawToken) {
      await revokeWorkerSession(rawToken);
    }

    await AuditLog.create({
      actorType: 'worker',
      actorId: req.workerId,
      entityType: 'auth_session',
      entityId: req.authSession?._id || null,
      action: 'worker_signed_out',
      ipAddress: req.ip,
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to sign out right now.' });
  }
});

/**
 * GET /api/v1/workers/me
 */
router.get('/me', requireWorker, async (req, res) => {
  try {
    const worker = await Worker.findById(req.workerId).exec();
    if (!worker) return res.status(404).json({ error: "Worker Missing" });
    await reconcileActivePolicies(worker);
    await worker.populate('activePolicyId');
    
    return res.json(worker);
  } catch(e) {
    res.status(500).json({ error: "Retrieval constraints isolated natively failed" });
  }
});

/**
 * PUT /api/v1/workers/me/tier
 */
router.put('/me/tier', requireWorker, async (req, res) => {
  try {
    const { tier } = req.body;
    const worker = await Worker.findById(req.workerId);
    if (!worker) return res.status(404).json({ error: "Worker Missing" });
    
    worker.tier = tier;

    // Recalculate parameters mapping
    let newPremium = 30;
    try {
      const mlUrl = `${process.env.ML_SERVICE_URL || 'http://localhost:8001'}/predict/premium`;
      const mlRes = await axios.post(mlUrl, { city: worker.city, tier }, { timeout: 3000 });
      if (mlRes.data && mlRes.data.premium) newPremium = mlRes.data.premium;
    } catch(e) {}

    let policy = null;
    if (worker.activePolicyId) {
      policy = await Policy.findById(worker.activePolicyId);
      if (policy) {
        policy.tier = tier;
        policy.premiumAmount = newPremium;
        policy.coverageLimits.maxPayoutPerWeek = tier === 'premium' ? 20000 : (tier === 'standard' ? 10000 : 5000);
        await policy.save();
      }
    }

    await worker.save();
    await AuditLog.create({
      actorType: 'worker',
      actorId: worker._id,
      entityType: 'worker_account',
      entityId: worker._id,
      action: 'worker_tier_updated',
      metadata: { tier, policyId: policy?._id || null },
      ipAddress: req.ip,
    });
    return res.json(worker);
  } catch(e) {
    res.status(500).json({ error: "Tier Re-mapping Exception" });
  }
});

/**
 * GET /api/v1/workers/me/earnings-baseline
 */
router.get('/me/earnings-baseline', requireWorker, async (req, res) => {
  try {
    const worker = await Worker.findById(req.workerId);
    if (!worker) return res.status(404).json({ error: "Worker Missing" });

    const daysMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const formatted = {};

    // Map through the structured baseline bounds native to Javascript maps mapping cleanly over Mongoose strict structs
    if (worker.earningsBaseline && typeof worker.earningsBaseline.keys === 'function') {
      for (const dayKey of worker.earningsBaseline.keys()) {
        const dayName = daysMap[parseInt(dayKey)] || `Day ${dayKey}`;
        const dayData = worker.earningsBaseline.get(dayKey);
        formatted[dayName] = {};
        
        // Handling nested depth natively securely avoiding crash vectors implicitly
        const iterateData = (typeof dayData.keys === 'function') ? dayData.entries() : Object.entries(dayData);
        for (const [hourBand, data] of iterateData) {
           formatted[dayName][`${hourBand}:00 - ${parseInt(hourBand)+1}:00`] = data;
        }
      }
    }

    return res.json(formatted);
  } catch(e) {
    res.status(500).json({ error: "Rendering Baseline mapping exception structurally failed" });
  }
});

module.exports = router;
