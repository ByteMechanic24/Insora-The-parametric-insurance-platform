import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { getClaims } from '../utils/api';
import { getCachedClaimsSnapshot, updateClaimsSnapshot } from '../utils/workerDataPrefetch';
import {
  formatDate,
  formatDecision,
  formatDisruption,
  formatPlatform,
  formatRupees,
} from '../utils/formatting';
import '../styles/app.css';

const FILTERS = ['ALL', 'APPROVED', 'PENDING', 'REJECTED'];

export default function ClaimHistory() {
  const [claims, setClaims] = useState(() => getCachedClaimsSnapshot() || []);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(() => !getCachedClaimsSnapshot());
  const [expandedClaim, setExpandedClaim] = useState(null);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const response = await getClaims();
        setClaims(response);
        updateClaimsSnapshot(response);
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
  }, []);

  const filteredClaims = useMemo(() => {
    if (filter === 'ALL') {
      return claims;
    }

    if (filter === 'APPROVED') {
      return claims.filter((claim) => claim.decision === 'APPROVE');
    }

    if (filter === 'REJECTED') {
      return claims.filter((claim) => claim.decision === 'REJECT');
    }

    return claims.filter((claim) => ['SOFT_HOLD', 'MANUAL_REVIEW'].includes(claim.decision));
  }, [claims, filter]);

  return (
    <div className="page-stack">
      <section className="app-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Claim history</p>
            <h2 className="app-hero__title" style={{ fontSize: '2.2rem' }}>
              Review every submission
            </h2>
            <p className="card-copy">Filter by outcome and expand a claim to inspect the scoring breakdown.</p>
          </div>
        </div>

        <div className="pill-row" style={{ marginTop: 22 }}>
          {FILTERS.map((filterValue) => (
            <button
              key={filterValue}
              type="button"
              className={`toggle-chip${filter === filterValue ? ' toggle-chip--active' : ''}`}
              onClick={() => setFilter(filterValue)}
            >
              {filterValue === 'PENDING' ? 'In review' : filterValue.toLowerCase()}
            </button>
          ))}
        </div>
      </section>

      {loading && filteredClaims.length === 0 ? (
        <div className="history-grid">
          {[1, 2, 3].map((placeholder) => (
            <div key={placeholder} className="app-timeline-card">
              <div className="app-timeline-row">
                <div>
                  <h3 style={{ margin: '12px 0 6px', fontSize: '1.2rem' }}>Loading claim history...</h3>
                  <p className="helper-copy">Pulling the latest claim cards and scores.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="empty-state">No claims match this filter yet.</div>
      ) : (
        <div className="history-grid">
          {filteredClaims.map((claim) => {
            const decision = formatDecision(claim.decision);
            const isExpanded = expandedClaim === claim._id;

            return (
              <div key={claim._id} className="app-timeline-card">
                <div className="app-timeline-row">
                  <div>
                    <div className="pill-row">
                      <span className={`platform-chip platform-chip--${claim.platform}`}>{formatPlatform(claim.platform)}</span>
                      <span className={`decision-chip decision-chip--${decision.tone}`}>{decision.label}</span>
                    </div>
                    <h3 style={{ margin: '12px 0 6px', fontSize: '1.2rem' }}>{claim.orderId}</h3>
                    <p className="helper-copy">
                      {formatDisruption(claim.disruptionType)} · {formatDate(claim.submittedAt)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ display: 'block', fontSize: '1.2rem' }}>{formatRupees(claim.payout?.total || 0)}</strong>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => setExpandedClaim(isExpanded ? null : claim._id)}
                    >
                      <SlidersHorizontal size={16} />
                      Details
                      <ChevronDown
                        size={16}
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }}
                      />
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="app-timeline-detail">
                    <div className="app-metric" style={{ background: '#fafafa', border: 'none', boxShadow: 'none' }}>
                      <p className="app-metric__label">Composite score</p>
                      <div className="app-metric__value">
                        {typeof claim.compositeScore === 'number' ? claim.compositeScore.toFixed(2) : 'N/A'}
                      </div>
                      <div className="scorebar" style={{ marginTop: 12 }}>
                        <div
                          className="scorebar__fill"
                          style={{
                            width: `${Math.round((claim.compositeScore || 0) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {claim.checkResults?.length ? (
                      claim.checkResults.map((result, index) => (
                        <div key={`${claim._id}-${index}`}>
                          <div className="app-timeline-row" style={{ marginTop: 12 }}>
                            <strong>{result.checkName}</strong>
                            <span className="helper-copy">{Math.round((result.weight || 0) * 100)}% weight</span>
                          </div>
                          <div className="scorebar" style={{ marginTop: 10 }}>
                            <div
                              className="scorebar__fill"
                              style={{ width: `${Math.round((result.score || 0) * 100)}%` }}
                            />
                          </div>
                          <p className="helper-copy" style={{ marginTop: 8 }}>
                            Score {typeof result.score === 'number' ? result.score.toFixed(2) : 'N/A'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="helper-copy">No individual verification checks were returned for this claim.</div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
