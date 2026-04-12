const mongoose = require('mongoose');
const { Schema } = mongoose;

const GPSCoords = new Schema({
  lat: Number,
  lng: Number,
  accuracy_metres: Number,
  network_lat: Number,
  network_lng: Number,
  network_accuracy_metres: Number,
  cell_gps_divergence_metres: Number,
  google_geoloc_used: { type: Boolean, default: false }
}, { _id: false });

const PhotoEvidenceSchema = new Schema({
  name: String,
  mimeType: String,
  sizeBytes: Number,
  capturedAt: Date,
  dataUrl: String,
}, { _id: false });

const CheckResult = new Schema({
  checkName: String,
  weight: Number,
  score: Number,
  confidence: { type: String, enum: ["HIGH", "MEDIUM", "LOW", "NONE"] },
  hardReject: { type: Boolean, default: false },
  flags: [String],
  data: Schema.Types.Mixed,
  completedAt: Date
}, { _id: false });

const PayoutBreakdown = new Schema({
  orderEarnings: Number,
  strandedHours: Number,
  hourlyBaseline: Number,
  tierMultiplier: Number,
  strandedCompensation: Number,
  consecutiveDayBonus: { type: Number, default: 0 },
  total: Number,
  currency: { type: String, default: "INR" }
}, { _id: false });

const PaymentRecord = new Schema({
  razorpayPayoutId: String,
  upiHandle: String,
  status: { type: String, enum: ["PENDING", "INITIATED", "PAID", "FAILED"] },
  initiatedAt: Date,
  completedAt: Date,
  failureReason: String
}, { _id: false });

const SoftHoldRecord = new Schema({
  recheckCount: { type: Number, default: 0 },
  lastCheckedAt: Date,
  nextCheckAt: Date,
  resolvedBy: String,
  resolvedAt: Date
}, { _id: false });

const ManualReviewRecord = new Schema({
  assignedTo: String,
  assignedAt: Date,
  notes: String,
  resolvedAt: Date,
  resolution: { type: String, enum: ["APPROVED", "REJECTED"] }
}, { _id: false });

const ClaimSchema = new Schema({
  workerId: { type: Schema.Types.ObjectId, ref: "Worker", required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
  policyId: { type: Schema.Types.ObjectId, ref: "Policy", required: true },
  disruptionEventId: { type: Schema.Types.ObjectId, ref: "DisruptionEvent", default: null },
  orderId: { type: String, required: true, unique: true },
  platform: { type: String, enum: ["zomato", "swiggy"], required: true },
  claimTimestamp: { type: Date, required: true },
  gps: { type: GPSCoords, required: true },
  photos: { type: [PhotoEvidenceSchema], default: [] },
  disruptionType: { type: String, enum: ["flooding", "heat", "aqi", "strike", "road_closure", "other"], required: true },
  claimRef: String,
  submittedAt: { type: Date, default: Date.now },
  checkResults: [CheckResult],
  compositeScore: Number,
  decision: { type: String, enum: ["APPROVE", "SOFT_HOLD", "MANUAL_REVIEW", "REJECT"] },
  decisionReason: String,
  intakeStatus: { type: String, enum: ["submitted", "verified", "closed"], default: "submitted" },
  reviewStatus: { type: String, enum: ["pending", "manual_review", "completed"], default: "pending" },
  payoutStatus: { type: String, enum: ["pending", "initiated", "paid", "failed"], default: "pending" },
  payout: PayoutBreakdown,
  payment: PaymentRecord,
  softHold: SoftHoldRecord,
  manualReview: ManualReviewRecord,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Adding index as requested
ClaimSchema.index({ "gps.lat": 1, "gps.lng": 1 });
ClaimSchema.index({ submittedAt: -1 });
ClaimSchema.index({ decision: 1, submittedAt: -1 });

module.exports = mongoose.model("Claim", ClaimSchema);
