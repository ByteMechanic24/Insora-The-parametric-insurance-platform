import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, MapPin, Shield, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../App';
import PolicyCard from './PolicyCard';
import { getClaims, getCurrentPolicy } from '../utils/api';
import {
  formatDate,
  formatDecision,
  formatDisruption,
  formatPlatform,
  formatRupees,
} from '../utils/formatting';

export default function Dashboard() {
  const navigate = useNavigate();
  const { worker } = useWorker();
  const [policy, setPolicy] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [policyResult, claimsResult] = await Promise.all([
          getCurrentPolicy().catch(() => null),
          getClaims({ limit: 20 }).catch(() => []),
        ]);
        setPolicy(policyResult);
        setClaims(claimsResult);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const approvedClaims = useMemo(
    () => claims.filter((claim) => claim.decision === 'APPROVE'),
    [claims]
  );
  const paidOut = approvedClaims.reduce((sum, claim) => sum + (claim.payout?.total || 0), 0);
  const reviewQueue = claims.filter((claim) =>
    ['SOFT_HOLD', 'MANUAL_REVIEW'].includes(claim.decision)
  ).length;
  const recentClaims = claims.slice(0, 4);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="p-page-stack">
      <section className="p-card p-card--hero">
        <div className="hero-card__grid" style={{ zIndex: 1, position: 'relative' }}>
          <div>
            <p className="p-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" style={{ background: 'var(--brand)', width: 6, height: 6, borderRadius: '50%' }} />
              Welcome back
            </p>
            <h2 className="p-title p-title--hero">
              {policy ? 'Your coverage is live and ready for the next disruption.' : 'Finish activating your protection.'}
            </h2>
            <p className="p-subtext">
              Use the dashboard to check your policy window, review claim decisions, and submit a new blocked-order claim in a few taps.
            </p>
            <div className="p-pill-row" style={{ marginTop: 24 }}>
              <span className="p-tag p-tag--brand">
                <MapPin size={14} />
                {worker?.city || 'City not set'}
              </span>
              <span className="p-tag p-tag--brand">
                <Shield size={14} />
                {worker?.tier ? `${worker.tier} tier` : 'No tier'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', alignContent: 'start', gap: 16 }}>
            <div className="p-metric" style={{ background: 'rgba(255,255,255,0.95)' }}>
              <p className="p-metric__label">
                Total approved payout
              </p>
              <div className="p-metric__value" style={{ marginTop: 6 }}>{formatRupees(paidOut)}</div>
              <p className="p-metric__caption">
                Across {approvedClaims.length} approved claims
              </p>
            </div>
            <div className="p-grid-actions">
              <button type="button" className="button button--secondary" onClick={() => navigate('/claim')} disabled={!policy}>
                New claim
              </button>
              <button type="button" className="button button--ghost" onClick={() => navigate('/history')}>
                See history
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="p-stats-grid">
        <div className="p-metric">
          <p className="p-metric__label">Claims this month</p>
          <div className="p-metric__value" style={{ marginTop: 4 }}>{claims.length}</div>
          <p className="p-metric__caption">Fresh submissions tied to your worker account.</p>
        </div>
        <div className="p-metric">
          <p className="p-metric__label">Needs attention</p>
          <div className="p-metric__value" style={{ marginTop: 4 }}>{reviewQueue}</div>
          <p className="p-metric__caption">Claims still in auto recheck or manual review.</p>
        </div>
        <div className="p-metric">
          <p className="p-metric__label">Protected payout flow</p>
          <div className="p-metric__value" style={{ marginTop: 4, fontSize: '1.4rem' }}>{worker?.upiHandle || 'UPI set'}</div>
          <p className="p-metric__caption">Settlement route for successful payouts.</p>
        </div>
      </div>

      {policy ? <PolicyCard policy={policy} /> : null}

      <section className="p-card">
        <div className="p-section-heading">
          <div>
            <p className="p-eyebrow">
              Recent claims
            </p>
            <h3 className="p-title p-title--section">
              Your latest activity
            </h3>
            <p className="p-subtext">We surface the newest claim decisions first, with payout and score detail.</p>
          </div>
          <button type="button" className="button button--ghost" onClick={() => navigate('/history')}>
            Full history
            <ArrowRight size={16} />
          </button>
        </div>

        {recentClaims.length === 0 ? (
          <div className="p-empty" style={{ marginTop: 20 }}>
            Your claim timeline is empty. Submit a disruption claim when an order gets blocked by real-world conditions.
          </div>
        ) : (
          <div className="p-list" style={{ marginTop: 20 }}>
            {recentClaims.map((claim) => {
              const decision = formatDecision(claim.decision);

              return (
                <div key={claim._id} className="p-list-item">
                  <div className="p-list-item__row">
                    <div>
                      <div className="p-pill-row" style={{ marginBottom: 12 }}>
                        <span className={`p-tag p-tag--${claim.platform}`}>{formatPlatform(claim.platform)}</span>
                        <span className={`p-tag p-tag--${decision.tone === 'review' ? 'warning' : decision.tone}`}>{decision.label}</span>
                      </div>
                      <strong className="p-title p-title--card">{claim.orderId}</strong>
                      <span className="p-helper-copy" style={{ display: 'block' }}>{formatDisruption(claim.disruptionType)}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong className="p-title" style={{ display: 'block', fontSize: '1.4rem', marginBottom: 4 }}>{formatRupees(claim.payout?.total || 0)}</strong>
                      <span className="p-helper-copy">{formatDate(claim.submittedAt)}</span>
                    </div>
                  </div>

                  <div className="p-pill-row" style={{ marginTop: 12, borderTop: '1px dashed rgba(23,32,51,0.1)', paddingTop: 16 }}>
                    <span className="p-tag">
                      <Clock3 size={14} />
                      Score {typeof claim.compositeScore === 'number' ? claim.compositeScore.toFixed(2) : 'N/A'}
                    </span>
                    <span className="p-tag">
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
