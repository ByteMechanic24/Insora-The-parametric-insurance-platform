const mongoose = require('mongoose');
const { getEnvConfig } = require('../config/env');

/**
 * Connect to MongoDB using Mongoose.
 * Throws on connection error — let the caller handle it.
 */
async function connectDB() {
  const config = getEnvConfig();
  const uri = config.mongodb.uri;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  const connectOptions = {
    dbName: config.mongodb.dbName,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: config.mongodb.maxPoolSize,
    family: 4,
  };

  if (config.mongodb.enableAtlasTls) {
    connectOptions.tls = true;
  }

  await mongoose.connect(uri, connectOptions);

  console.log('MongoDB connected');
}

/**
 * Create indexes on all registered Mongoose models.
 * Call this AFTER all models have been required/registered.
 */
async function safeCreateIndex(collection, spec, options = {}) {
  try {
    await collection.createIndex(spec, options);
  } catch (error) {
    if (error?.code === 85 || error?.code === 86) {
      return;
    }
    throw error;
  }
}

async function dropWorkerIndexesThatNoLongerMatch(collection) {
  const indexes = await collection.indexes();

  for (const index of indexes) {
    if (index.name === 'upiHandle_1' && index.unique && !index.sparse) {
      await collection.dropIndex(index.name);
    }
  }
}

async function createIndexes() {
  const Worker = mongoose.model('Worker');
  const Policy = mongoose.model('Policy');
  const Claim = mongoose.model('Claim');
  const DisruptionEvent = mongoose.model('DisruptionEvent');
  const NotificationLog = mongoose.model('NotificationLog');
  const Organization = mongoose.model('Organization');
  const AdminAccount = mongoose.model('AdminAccount');
  const AuthIdentity = mongoose.model('AuthIdentity');
  const AuthSession = mongoose.model('AuthSession');
  const AuthChallenge = mongoose.model('AuthChallenge');
  const WorkerSession = mongoose.model('WorkerSession');
  const Order = mongoose.model('Order');
  const Payout = mongoose.model('Payout');
  const ManualReview = mongoose.model('ManualReview');
  const AuditLog = mongoose.model('AuditLog');
  const ClaimEvidence = mongoose.model('ClaimEvidence');
  const ClaimCheck = mongoose.model('ClaimCheck');

  // ── Worker indexes ──────────────────────────────────────
  await dropWorkerIndexesThatNoLongerMatch(Worker.collection);
  await safeCreateIndex(Worker.collection, { phone: 1 }, { unique: true });
  await safeCreateIndex(Worker.collection, { upiHandle: 1 }, { unique: true, sparse: true });
  await safeCreateIndex(Worker.collection, { email: 1 }, { unique: true, sparse: true });
  await safeCreateIndex(Worker.collection, { googleSub: 1 }, { unique: true, sparse: true });
  await safeCreateIndex(Worker.collection, { deviceFingerprint: 1 });
  await safeCreateIndex(Worker.collection, { organizationId: 1, accountStatus: 1 });

  // ── Policy indexes ──────────────────────────────────────
  await safeCreateIndex(Policy.collection, { workerId: 1, weekStart: -1 });
  await safeCreateIndex(Policy.collection, { status: 1, weekEnd: 1 });
  await safeCreateIndex(Policy.collection, { organizationId: 1, status: 1 });

  // ── Claim indexes ───────────────────────────────────────
  await safeCreateIndex(Claim.collection, { workerId: 1, submittedAt: -1 });
  await safeCreateIndex(Claim.collection, { organizationId: 1, createdAt: -1 });
  await safeCreateIndex(Claim.collection, { orderId: 1 }, { unique: true });
  await safeCreateIndex(Claim.collection, { decision: 1, compositeScore: -1 });
  await safeCreateIndex(Claim.collection, { 'payment.status': 1, createdAt: -1 });
  await safeCreateIndex(Claim.collection, { gps: '2dsphere' });
  await safeCreateIndex(
    Claim.collection,
    { decision: 1, 'softHold.nextCheckAt': 1 },
    { partialFilterExpression: { decision: 'SOFT_HOLD' } }
  );

  // ── DisruptionEvent indexes ─────────────────────────────
  await safeCreateIndex(DisruptionEvent.collection, { city: 1, startedAt: -1 });

  // ── NotificationLog indexes ─────────────────────────────
  await safeCreateIndex(NotificationLog.collection, { workerId: 1, sentAt: -1 });
  await safeCreateIndex(NotificationLog.collection, { claimId: 1, messageType: 1 });

  await safeCreateIndex(Organization.collection, { slug: 1 }, { unique: true });
  await safeCreateIndex(AdminAccount.collection, { organizationId: 1, status: 1 });
  await safeCreateIndex(AdminAccount.collection, { email: 1 }, { sparse: true });
  await safeCreateIndex(AuthIdentity.collection, { subjectType: 1, subjectId: 1, authType: 1 }, { unique: true });
  await safeCreateIndex(AuthIdentity.collection, { identifier: 1, authType: 1 });
  await safeCreateIndex(AuthSession.collection, { refreshTokenHash: 1 }, { unique: true });
  await safeCreateIndex(AuthSession.collection, { subjectType: 1, subjectId: 1, sessionStatus: 1 });
  await safeCreateIndex(AuthChallenge.collection, { identifier: 1, authType: 1, createdAt: -1 });
  await safeCreateIndex(AuthChallenge.collection, { expiresAt: 1 }, { expireAfterSeconds: 0 });
  await safeCreateIndex(WorkerSession.collection, { workerId: 1, startedAt: -1 });
  await safeCreateIndex(Order.collection, { externalOrderId: 1 }, { unique: true });
  await safeCreateIndex(Order.collection, { workerId: 1, createdAt: -1 });
  await safeCreateIndex(Payout.collection, { claimId: 1 }, { unique: true });
  await safeCreateIndex(Payout.collection, { workerId: 1, status: 1 });
  await safeCreateIndex(ManualReview.collection, { claimId: 1 }, { unique: true });
  await safeCreateIndex(ManualReview.collection, { status: 1, assignedAt: -1 });
  await safeCreateIndex(AuditLog.collection, { entityType: 1, entityId: 1, createdAt: -1 });
  await safeCreateIndex(ClaimEvidence.collection, { claimId: 1 }, { unique: true });
  await safeCreateIndex(ClaimEvidence.collection, { workerId: 1, createdAt: -1 });
  await safeCreateIndex(ClaimCheck.collection, { claimId: 1, checkName: 1 }, { unique: true });
  await safeCreateIndex(ClaimCheck.collection, { workerId: 1, createdAt: -1 });

  console.log('All database indexes created');
}

module.exports = {
  mongoose,
  connectDB,
  createIndexes,
};
