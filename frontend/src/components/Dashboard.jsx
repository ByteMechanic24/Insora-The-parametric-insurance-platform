import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, MapPin, RefreshCw, Shield, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../App';
import PolicyCard from './PolicyCard';
import { getClaims, getCurrentPolicy } from '../utils/api';
import {
  getCachedClaimsSnapshot,
  getCachedPolicySnapshot,
  updateClaimsSnapshot,
  updatePolicySnapshot,
} from '../utils/workerDataPrefetch';
import {
  formatDate,
  formatDecision,
  formatDisruption,
  formatPlatform,
  formatRupees,
} from '../utils/formatting';
import '../styles/app.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { worker } = useWorker();
  const [policy, setPolicy] = useState(() => getCachedPolicySnapshot());
  const [claims, setClaims] = useState(() => getCachedClaimsSnapshot() || []);
  const [policyLoading, setPolicyLoading] = useState(() => !getCachedPolicySnapshot());
  const [claimsLoading, setClaimsLoading] = useState(() => !getCachedClaimsSnapshot());
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setRefreshing(true);
      if (!policy) {
        setPolicyLoading(true);
      }
      if (claims.length === 0) {
        setClaimsLoading(true);
      }
    }

    try {
      const [policyResult, claimsResult] = await Promise.all([
        getCurrentPolicy().catch(() => null),
        getClaims({ limit: 20 }).catch(() => []),
      ]);
      setPolicy(policyResult);
      setClaims(claimsResult);
      updatePolicySnapshot(policyResult);
      updateClaimsSnapshot(claimsResult);
    } finally {
      setPolicyLoading(false);
      setClaimsLoading(false);
      setRefreshing(false);
    }
  }, [claims.length, policy]);

  useEffect(() => {
    fetchData();
    const intervalId = window.setInterval(() => {
      fetchData({ silent: true });
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [fetchData]);

  const approvedClaims = useMemo(
    () => claims.filter((claim) => claim.decision === 'APPROVE'),
    [claims]
  );
  const paidOut = approvedClaims.reduce((sum, claim) => sum + (claim.payout?.total || 0), 0);
  const reviewQueue = claims.filter((claim) =>
    ['SOFT_HOLD', 'MANUAL_REVIEW'].includes(claim.decision)
  ).length;
  const recentClaims = claims.slice(0, 4);

  return (
    <div className="page-stack">
      <section className="app-hero">
        <div className="app-hero__grid">
          <div>
            <p className="eyebrow">
              Welcome back
            </p>
            <h2 className="app-hero__title" style={{ maxWidth: 620 }}>
              {policy ? <span>Your coverage is live</span> : <span>Finish activating</span>}
              {policy ? ' and ready for the next disruption.' : ' your protection.'}
            </h2>
            <p className="app-hero__sub" style={{ maxWidth: 560 }}>
              Use the dashboard to check your policy window, review claim decisions, and submit a new blocked-order claim in a few taps.
            </p>
            <div className="pill-row">
              <span className="tag">
                <MapPin size={14} />
                {worker?.city || 'City not set'}
              </span>
              <span className="tag">
                <Shield size={14} />
                {worker?.tier ? `${worker.tier} tier` : 'No tier'}
              </span>
            </div>
          </div>

          <div className="app-hero__actions">
            <div className="app-metric" style={{ background: 'transparent', padding: '16px' }}>
              <p className="app-metric__label">
                Total approved payout
              </p>
              <div className="app-metric__value">{formatRupees(paidOut)}</div>
              <p className="app-metric__caption">
                Across {approvedClaims.length} approved claims
              </p>
            </div>
            <div className="inline-actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button
                type="button"
                className="button button--primary"
                onClick={() => navigate('/dashboard/claim')}
                disabled={!policy}
              >
                New claim
              </button>
              <button type="button" className="button button--ghost" onClick={() => navigate('/dashboard/history')}>
                See history
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="app-stats-grid">
        <div className="app-metric">
          <p className="app-metric__label">Claims this month</p>
          <div className="app-metric__value">{claimsLoading && claims.length === 0 ? '...' : claims.length}</div>
          <p className="app-metric__caption">Fresh submissions tied to your worker account.</p>
        </div>
        <div className="app-metric">
          <p className="app-metric__label">Needs attention</p>
          <div className="app-metric__value">{claimsLoading && claims.length === 0 ? '...' : reviewQueue}</div>
          <p className="app-metric__caption">Claims still in auto recheck or manual review.</p>
        </div>
        <div className="app-metric">
          <p className="app-metric__label">Protected payout flow</p>
          <div className="app-metric__value">{worker?.upiHandle || 'UPI set'}</div>
          <p className="app-metric__caption">Settlement route for successful payouts.</p>
        </div>
      </div>

      {policyLoading ? (
        <section className="app-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Active policy</p>
              <h3 className="page-title" style={{ fontSize: '1.9rem' }}>
                Loading your current coverage...
              </h3>
              <p className="card-copy">We are pulling the latest policy window and premium details.</p>
            </div>
          </div>
        </section>
      ) : policy ? <PolicyCard policy={policy} /> : null}

      <section className="app-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recent claims</p>
            <h3 className="page-title" style={{ fontSize: '2rem' }}>
              Your latest activity
            </h3>
            <p className="card-copy">We surface the newest claim decisions first.</p>
          </div>
          <div className="inline-actions" style={{ gridTemplateColumns: 'auto auto' }}>
            <button type="button" className="button button--ghost" onClick={() => fetchData()}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button type="button" className="button button--ghost" onClick={() => navigate('/dashboard/history')}>
              Full history
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {claimsLoading && recentClaims.length === 0 ? (
          <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
            {[1, 2, 3].map((placeholder) => (
              <div key={placeholder} className="app-timeline-card">
                <div className="app-timeline-row">
                  <strong>Loading recent claim...</strong>
                  <span className="helper-copy">Fetching latest activity</span>
                </div>
              </div>
            ))}
          </div>
        ) : recentClaims.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 20 }}>
            Your claim timeline is empty. Submit a disruption claim when an order gets blocked by real-world conditions.
          </div>
        ) : (
          <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
            {recentClaims.map((claim) => {
              const decision = formatDecision(claim.decision);

              return (
                <div key={claim._id} className="app-timeline-card">
                  <div className="app-timeline-row">
                    <div className="timeline-item">
                      <div className="pill-row">
                        <span className={`platform-chip platform-chip--${claim.platform}`}>{formatPlatform(claim.platform)}</span>
                        <span className={`decision-chip decision-chip--${decision.tone}`}>{decision.label}</span>
                      </div>
                      <strong style={{ fontSize: '1.08rem' }}>{claim.orderId}</strong>
                      <span className="helper-copy">{formatDisruption(claim.disruptionType)}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ display: 'block', fontSize: '1.1rem' }}>{formatRupees(claim.payout?.total || 0)}</strong>
                      <span className="helper-copy">{formatDate(claim.submittedAt)}</span>
                    </div>
                  </div>

                  <div className="pill-row">
                    <span className="platform-chip">
                      <Clock3 size={14} />
                      Score {typeof claim.compositeScore === 'number' ? claim.compositeScore.toFixed(2) : 'N/A'}
                    </span>
                    <span className="platform-chip">
                      <Wallet size={14} />
                      {claim.decision === 'APPROVE' ? 'Payout released' : 'Outcome pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
