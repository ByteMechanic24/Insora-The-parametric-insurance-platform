const http = require('http');
const mongoose = require('mongoose');
const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const Claim = require('../models/Claim');
const Worker = require('../models/Worker');
const Policy = require('../models/Policy');

const { connectDB } = require('../db/mongo');
const redisClient = require('../db/redisClient');
const { computeCompositeScore } = require('../scoring/composite');
const { checkEnvironmentalSignals } = require('../verification/environmentalCheck');
const { checkSatelliteCorroboration } = require('../verification/satelliteCheck');
const { sendWhatsapp } = require('./notifications');

// Dummy Razorpay implementation extracted dynamically mimicking API isolated structural integrations
const Razorpay = require('razorpay');
async function _initiatePayout(claimId, payoutAmount, upiHandle) {
  try {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummyKey';
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_dummySecret';

    if (razorpayKeyId === 'rzp_test_dummyKey') {
      return { 
        razorpayPayoutId: 'TEST_rzp_mock_' + Math.random().toString(36).substring(7), 
        upiHandle, 
        status: "INITIATED", 
        initiatedAt: new Date() 
      };
    }

    const rzp = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
    const payout = await rzp.payouts.create({
      account_number: "7878780080316316",
      fund_account_id: upiHandle,
      amount: Math.round(payoutAmount * 100),
      currency: "INR",
      mode: "UPI",
      purpose: "payout",
      reference_id: claimId.toString()
    });

    return { razorpayPayoutId: payout.id, upiHandle, status: "INITIATED", initiatedAt: new Date() };
  } catch (error) {
    return { upiHandle, status: "FAILED", failureReason: error.message || "Unknown Exception" };
  }
}

/**
 * TASK 1: Process SOFT_HOLD delayed claims evaluating strictly bounds dynamically tracking.
 */
async function recheckSoftHoldClaims(db, redis) {
  let processedCount = 0;
  let resolvedCount = 0;
  let escalatedCount = 0;

  try {
    const claims = await Claim.find({ 
      decision: "SOFT_HOLD", 
      "softHold.nextCheckAt": { $lte: new Date() } 
    }).limit(50);

    for (let claim of claims) {
      processedCount++;
      let modified = false;

      // Extract existing records natively tracking bounds 
      const envCheck = claim.checkResults.find(r => r.checkName === 'environmental');
      const satCheck = claim.checkResults.find(r => r.checkName === 'satellite');

      // Re-run purely low confidence parameters preserving stable execution footprints locally 
      if (envCheck && (envCheck.confidence === 'LOW' || envCheck.score < 0.5)) {
        const newEnvResult = await checkEnvironmentalSignals(claim.gps, claim.claimTimestamp, claim.disruptionType);
        claim.checkResults = claim.checkResults.map(r => r.checkName === 'environmental' ? newEnvResult : r);
        modified = true;
      }

      if (satCheck && (satCheck.confidence === 'LOW' || satCheck.score < 0.5)) {
        const newSatResult = await checkSatelliteCorroboration(claim.gps, claim.claimTimestamp);
        claim.checkResults = claim.checkResults.map(r => r.checkName === 'satellite' ? newSatResult : r);
        modified = true;
      }

      if (modified) {
        // Evaluate structural limits backwards locally securely  
        const { compositeScore, decision } = computeCompositeScore(claim.checkResults);
        claim.compositeScore = compositeScore;

        if (compositeScore >= 0.75) {
          claim.decision = "APPROVE";
          
          const worker = await Worker.findById(claim.workerId);
          if (worker) {
            const paymentRec = await _initiatePayout(claim._id, claim.payout?.total || 0, worker.upiHandle);
            claim.payment = paymentRec;
            
            await sendWhatsapp(worker.phone, "claim_approved", { 
              claimRef: claim.claimRef, 
              amount: claim.payout?.total || 0, 
              upiHandle: worker.upiHandle 
            });
          }

          claim.softHold.resolvedBy = "SYSTEM_POLLED";
          claim.softHold.resolvedAt = new Date();
          resolvedCount++;
        } else {
          // Increment tracking mappings sequentially conditionally backing off organically  
          const recheckCount = claim.softHold.recheckCount || 0;
          
          if (recheckCount < 6) {
            claim.softHold.nextCheckAt = new Date(Date.now() + 4 * 3600 * 1000);
            claim.softHold.recheckCount = recheckCount + 1;
            // Native state retains SOFT_HOLD gracefully implicitly 
          } else {
            claim.decision = "MANUAL_REVIEW";
            claim.manualReview = { assignedAt: new Date() };
            const worker = await Worker.findById(claim.workerId);
            if (worker) {
              await sendWhatsapp(worker.phone, "manual_review", { claimRef: claim.claimRef });
            }
            escalatedCount++;
          }
        }
        
        await claim.save();
      }
    }

    if (processedCount > 0) {
      console.log(`[Soft Hold Poller] Processed: ${processedCount}. Resolved: ${resolvedCount}. Escalated: ${escalatedCount}.`);
    }

  } catch (error) {
    console.error("[Soft Hold Execution Trace Fail]", error);
  }
}

/**
 * TASK 2: Enforce structured coverage mapping exclusively matching parameter bounds seamlessly.
 */
async function renewWeeklyPremiums(db, redis) {
  let renewedCount = 0;
  let failureCount = 0;

  try {
    const workers = await Worker.find({ activePolicyId: { $ne: null } });

    for (let worker of workers) {
      try {
        await Policy.findByIdAndUpdate(worker.activePolicyId, { status: "expired" });

        let computedPremium = 30;
        try {
          const mlUrl = `${process.env.ML_SERVICE_URL || 'http://localhost:8001'}/predict/premium`;
          const mlRes = await axios.post(mlUrl, { city: worker.city, tier: worker.tier }, { timeout: 3000 });
          if (mlRes.data && mlRes.data.premium) computedPremium = mlRes.data.premium;
        } catch (e) {
             // defaults unconditionally seamlessly bypassing timeout limitations reliably
        }

        const today = new Date();
        const start = new Date(today);
        const nextMondayOffset = (7 - today.getDay() + 1) % 7 || 7; 
        if (today.getDay() === 1) start.setDate(today.getDate()); // Align natively mapped  
        else start.setDate(today.getDate() + nextMondayOffset);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const policy = new Policy({
          workerId: worker._id,
          tier: worker.tier,
          premiumAmount: computedPremium,
          weekStart: start,
          weekEnd: end,
          status: "active",
          coverageLimits: {
             maxPayoutPerWeek: worker.tier === 'premium' ? 20000 : (worker.tier === 'standard' ? 10000 : 5000)
          }
        });
        await policy.save();

        worker.activePolicyId = policy._id;
        await worker.save();
        renewedCount++;

      } catch (innerErr) {
        failureCount++;
        console.error(`Renewal error seamlessly caught gracefully for worker: ${worker._id}`, innerErr.message);
      }
    }

    console.log(`[Premium Renewal Poller] Total Workers Renewed: ${renewedCount}. Failures: ${failureCount}.`);

  } catch (error) {
    console.error("[Premium Setup Fatal Exception Bound Safely]", error);
  }
}

/**
 * Isolated Context Loop Executor tracking parameters natively cleanly seamlessly  
 */
async function main() {
  await connectDB();
  const redis = redisClient;
  const port = Number(process.env.PORT || 8003);

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'soft-hold-worker' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('GigShield soft-hold worker is running');
  });

  server.listen(port, () => {
    console.log(`GigShield soft-hold worker health server listening on PORT ${port}`);
  });
  
  // Run soft-hold recheck every 30 minutes seamlessly bounds mapped 
  setInterval(async () => {
    try { 
      await recheckSoftHoldClaims(null, redis); 
    } catch (err) { 
      console.error("Recheck error isolated contexturally natively avoiding halt:", err); 
    }
  }, 30 * 60 * 1000);

  // Run premium renewal dynamically triggering only sequentially cleanly 
  setInterval(async () => {
    const now = dayjs().tz("Asia/Kolkata");
    // Confirm exact sequential trigger structural blocks locally 
    if (now.day() === 1 && now.hour() === 0 && now.minute() < 30) {
      try { 
        await renewWeeklyPremiums(null, redis); 
      } catch (err) { 
        console.error("Renewal boundary mappings safely isolated:", err); 
      }
    }
  }, 60 * 60 * 1000);

  console.log("GigShield background worker started actively polling efficiently natively.");

  await recheckSoftHoldClaims(null, redis);
}

// Intercept local invocation executing mappings exclusively smoothly 
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  recheckSoftHoldClaims,
  renewWeeklyPremiums
};
