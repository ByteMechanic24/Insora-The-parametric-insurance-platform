import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { getClaims } from '../utils/api';
import {
  formatDate,
  formatDecision,
  formatDisruption,
  formatPlatform,
  formatRupees,
} from '../utils/formatting';

const FILTERS = ['ALL', 'APPROVED', 'PENDING', 'REJECTED'];

export default function ClaimHistory() {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [expandedClaim, setExpandedClaim] = useState(null);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const response = await getClaims();
        setClaims(response);
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

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="p-page-stack">
      <section className="p-card">
        <div className="p-section-heading">
          <div>
            <p className="p-eyebrow">
              <span style={{ fontSize: 10 }}>●</span> Claim history
            </p>
            <h2 className="p-title p-title--section">
              Review every submission
            </h2>
            <p className="p-subtext">Filter by outcome and expand a claim to inspect the scoring breakdown.</p>
          </div>
        </div>

        <div className="p-pill-row" style={{ marginTop: 22 }}>
          {FILTERS.map((filterValue) => (
            <button
              key={filterValue}
              type="button"
              className={`p-toggle${filter === filterValue ? ' p-toggle--active' : ''}`}
              onClick={() => setFilter(filterValue)}
            >
              {filterValue === 'PENDING' ? 'In review' : filterValue.toLowerCase()}
            </button>
          ))}
        </div>
      </section>

      {filteredClaims.length === 0 ? (
        <div className="p-empty">No claims match this filter yet.</div>
      ) : (
        <div className="p-list">
          {filteredClaims.map((claim) => {
            const decision = formatDecision(claim.decision);
            const isExpanded = expandedClaim === claim._id;

            return (
              <div key={claim._id} className="p-list-item">
                <div className="p-list-item__row">
                  <div>
                    <div className="p-pill-row" style={{ marginBottom: 12 }}>
                      <span className={`p-tag p-tag--${claim.platform}`}>{formatPlatform(claim.platform)}</span>
                      <span className={`p-tag p-tag--${decision.tone === 'review' ? 'warning' : decision.tone}`}>{decision.label}</span>
                    </div>
                    <h3 className="p-title p-title--card">{claim.orderId}</h3>
                    <p className="p-helper-copy">
                      {formatDisruption(claim.disruptionType)} · {formatDate(claim.submittedAt)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong className="p-title" style={{ display: 'block', fontSize: '1.4rem', marginBottom: 8 }}>{formatRupees(claim.payout?.total || 0)}</strong>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => setExpandedClaim(isExpanded ? null : claim._id)}
                      style={{ padding: '4px 12px', minHeight: 32, fontSize: '0.85rem' }}
                    >
                      <SlidersHorizontal size={14} />
                      Details
                      <ChevronDown
                        size={14}
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }}
                      />
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="p-list-item__detail">
                    <div className="p-metric">
                      <p className="p-metric__label">Composite score</p>
                      <div className="p-metric__value" style={{ fontSize: '1.4rem', marginTop: 4 }}>
                        {typeof claim.compositeScore === 'number' ? claim.compositeScore.toFixed(2) : 'N/A'}
                      </div>
                      <div className="p-scorebar" style={{ marginTop: 12 }}>
                        <div
                          className="p-scorebar__fill"
                          style={{
                            width: `${Math.round((claim.compositeScore || 0) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {claim.checkResults?.length ? (
                      <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>
                        {claim.checkResults.map((result, index) => (
                          <div key={`${claim._id}-${index}`}>
                            <div className="p-list-item__row">
                              <strong style={{ fontSize: '0.95rem' }}>{result.checkName}</strong>
                              <span className="p-helper-copy">{Math.round((result.weight || 0) * 100)}% weight</span>
                            </div>
                            <div className="p-scorebar" style={{ marginTop: 10 }}>
                              <div
                                className="p-scorebar__fill"
                                style={{ width: `${Math.round((result.score || 0) * 100)}%` }}
                              />
                            </div>
                            <p className="p-helper-copy" style={{ marginTop: 8 }}>
                              Score {typeof result.score === 'number' ? result.score.toFixed(2) : 'N/A'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-helper-copy">No individual verification checks were returned for this claim.</div>
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
