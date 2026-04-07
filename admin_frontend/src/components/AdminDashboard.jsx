import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BadgeIndianRupee, Camera, MapPinned, RefreshCw, ShieldCheck, Waves } from 'lucide-react';
import { fetchAdminStats, reviewClaim } from '../utils/api';
import { formatDate, formatDecision, formatDisruption, formatPlatform, formatRupees } from '../utils/formatting';

export default function AdminDashboard() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingClaimId, setReviewingClaimId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const formatScore = (value) => (typeof value === 'number' ? value.toFixed(2) : 'N/A');

  const getReviewPhotos = (claim) => {
    if (Array.isArray(claim?.evidence?.photos) && claim.evidence.photos.length) {
      return claim.evidence.photos;
    }

    if (Array.isArray(claim?.photos) && claim.photos.length) {
      return claim.photos;
    }

    return [];
  };

  const getEnvironmentSnapshot = (claim) =>
    claim?.evidence?.environmentSnapshot ||
    claim?.checks?.find?.((check) => check.checkName === 'environmental')?.data ||
    null;

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setRefreshing(true);
    }
    try {
      const response = await fetchAdminStats({ limit: 80 });
      const normalizedClaims = Array.isArray(response)
        ? response
        : Array.isArray(response?.value)
          ? response.value
          : [];
      setClaims(normalizedClaims);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load the admin queue right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const intervalId = window.setInterval(() => {
      loadData({ silent: true });
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  const uniqueWorkers = useMemo(() => new Set(claims.map((claim) => claim.workerId)).size, [claims]);
  const claimsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return claims.filter((claim) => new Date(claim.submittedAt).getTime() >= weekAgo);
  }, [claims]);
  const approvedThisWeek = claimsThisWeek.filter((claim) => claim.decision === 'APPROVE');
  const totalPayoutsThisWeek = approvedThisWeek.reduce((sum, claim) => sum + (claim.payout?.total || 0), 0);
  const attentionQueue = claims.filter((claim) => ['SOFT_HOLD', 'MANUAL_REVIEW'].includes(claim.decision));

  const handleReviewAction = async (claimId, resolution) => {
    setReviewingClaimId(claimId);
    try {
      await reviewClaim(claimId, {
        resolution,
        notes: `Resolved from admin console as ${resolution.toLowerCase()}.`,
      });
      await loadData();
    } finally {
      setReviewingClaimId(null);
    }
  };

  const renderCheckCard = (check) => {
    const scorePercent = typeof check?.score === 'number' ? Math.max(0, Math.min(100, check.score * 100)) : 0;

    return (
      <div key={check._id || check.checkName} className="p-metric">
        <div className="p-list-item__row">
          <div>
            <p className="p-metric__label">{String(check.checkName || 'check').replaceAll('_', ' ')}</p>
            <div className="p-metric__value" style={{ fontSize: '1.4rem', marginTop: 4 }}>
              {formatScore(check.score)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong style={{ display: 'block', fontSize: '1.2rem' }}>{check.weight ?? 'N/A'}</strong>
            <span className="p-helper-copy">Weight</span>
          </div>
        </div>

        <div className="p-scorebar" style={{ marginTop: 10 }}>
          <div className="p-scorebar__fill" style={{ width: `${scorePercent}%` }} />
        </div>

        <div className="p-pill-row" style={{ marginTop: 12 }}>
          <span className="p-tag">{check.confidence || 'NONE'} confidence</span>
          {check.hardReject ? <span className="p-tag p-tag--danger">Hard reject signal</span> : null}
          {(check.flags || []).slice(0, 3).map((flag) => (
            <span key={`${check.checkName}-${flag}`} className="p-tag p-tag--warning">
              {flag}
            </span>
          ))}
        </div>
      </div>
    );
  };

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
               <span style={{ fontSize: 10 }}>●</span> Operations
            </p>
            <h2 className="p-title p-title--section">
              Claims command center
            </h2>
            <p className="p-subtext">Review manual cases, inspect proof signals, and release decisions from one workspace.</p>
          </div>
          <button type="button" className="button button--ghost" onClick={() => loadData()}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? (
          <div className="p-alert p-alert--error" style={{ marginTop: 18 }}>
            {error}
          </div>
        ) : null}

        <div className="p-stats-grid">
          <div className="p-metric">
            <p className="p-metric__label">
              <Activity size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Active workers
            </p>
            <div className="p-metric__value">{uniqueWorkers}</div>
            <p className="p-metric__caption">Unique workers represented in the current claim set.</p>
          </div>
          <div className="p-metric">
            <p className="p-metric__label">
              <BadgeIndianRupee size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Weekly payouts
            </p>
            <div className="p-metric__value">{formatRupees(totalPayoutsThisWeek)}</div>
            <p className="p-metric__caption">{approvedThisWeek.length} approved claims this week.</p>
          </div>
          <div className="p-metric">
            <p className="p-metric__label">
              <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Needs attention
            </p>
            <div className="p-metric__value">{attentionQueue.length}</div>
            <p className="p-metric__caption">Claims currently in soft hold or manual review.</p>
          </div>
        </div>
      </section>

      <div className="p-page-stack">
        <section className="p-card">
          <div className="p-section-heading">
            <div>
              <h3 className="p-title p-title--section" style={{ fontSize: '1.9rem' }}>
                Claims needing action
              </h3>
              <p className="p-subtext">Open each case as a guided review instead of raw payload output.</p>
            </div>
          </div>

          {attentionQueue.length === 0 ? (
            <div className="p-empty" style={{ marginTop: 20 }}>
              No claims need manual attention right now.
            </div>
          ) : (
            <div className="p-list" style={{ marginTop: 20 }}>
              {attentionQueue.map((claim) => {
                const decision = formatDecision(claim.decision);
                const photos = getReviewPhotos(claim);
                const environmentSnapshot = getEnvironmentSnapshot(claim);

                return (
                  <div key={claim._id} className="p-list-item">
                    <div className="p-list-item__row">
                      <div>
                        <div className="p-pill-row">
                          <div className={`p-tag p-tag--${decision.tone === 'review' ? 'warning' : decision.tone}`}>{decision.label}</div>
                          <span className={`p-tag p-tag--${claim.platform}`}>{formatPlatform(claim.platform)}</span>
                          <span className="p-tag">{formatDisruption(claim.disruptionType)}</span>
                        </div>
                        <h4 className="p-title p-title--card">{claim.claimRef || claim.orderId}</h4>
                        <p className="p-helper-copy">
                          Order {claim.orderId} · worker {String(claim.workerId || '').slice(-6) || 'unknown'} · {formatDate(claim.submittedAt)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong className="p-title" style={{ display: 'block', fontSize: '1.4rem' }}>{formatScore(claim.compositeScore)}</strong>
                        <span className="p-helper-copy">Composite score</span>
                      </div>
                    </div>

                    <div className="p-grid-actions">
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => handleReviewAction(claim._id, 'APPROVED')}
                        disabled={reviewingClaimId === claim._id}
                      >
                        {reviewingClaimId === claim._id ? 'Saving...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => handleReviewAction(claim._id, 'REJECTED')}
                        disabled={reviewingClaimId === claim._id}
                      >
                        Reject
                      </button>
                    </div>

                    <div className="p-list-item__detail">

                      <div className="p-grid-2">
                        <div className="p-metric">
                          <p className="p-metric__label">
                            <MapPinned size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                            Claim location
                          </p>
                          <div className="p-metric__value" style={{ fontSize: '1.2rem', marginTop: 4 }}>
                            {claim.gps?.lat?.toFixed?.(4) || 'N/A'}, {claim.gps?.lng?.toFixed?.(4) || 'N/A'}
                          </div>
                          <p className="p-metric__caption">
                            Accuracy {claim.gps?.accuracy_metres || 'N/A'}m · network {claim.gps?.network_accuracy_metres || 'N/A'}m
                          </p>
                        </div>
                        <div className="p-metric">
                          <p className="p-metric__label">
                            <Camera size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                            Evidence summary
                          </p>
                          <div className="p-metric__value" style={{ fontSize: '1.2rem', marginTop: 4 }}>
                            {photos.length} photos
                          </div>
                          <p className="p-metric__caption">
                            Review status {claim.reviewStatus || 'pending'} · payout {formatRupees(claim.payout?.total || 0)}
                          </p>
                        </div>
                        <div className="p-metric">
                          <p className="p-metric__label">
                            <ShieldCheck size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                            Payout review
                          </p>
                          <div className="p-metric__value" style={{ fontSize: '1.2rem', marginTop: 4 }}>
                            {formatRupees(claim.payout?.total || 0)}
                          </div>
                          <p className="p-metric__caption">
                            {claim.payout?.strandedHours || 0} stranded hours · {claim.payoutStatus || 'pending'} payout state
                          </p>
                        </div>
                        <div className="p-metric">
                          <p className="p-metric__label">
                            <Waves size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                            Environment snapshot
                          </p>
                          <div className="p-metric__value" style={{ fontSize: '1.2rem', marginTop: 4 }}>
                            {environmentSnapshot?.provider || environmentSnapshot?.condition || 'Unavailable'}
                          </div>
                          <p className="p-metric__caption">
                            Temp {environmentSnapshot?.temperatureC ?? 'N/A'}°C · alerts {environmentSnapshot?.alertsCount ?? 0}
                          </p>
                        </div>
                      </div>

                      {claim.checks?.length ? (
                        <div style={{ display: 'grid', gap: 12 }}>
                          <p className="p-metric__label">Verification checks</p>
                          <div className="p-grid-2">{claim.checks.map((check) => renderCheckCard(check))}</div>
                        </div>
                      ) : null}

                      {photos.length ? (
                        <div style={{ display: 'grid', gap: 12 }}>
                          <p className="p-metric__label">Submitted photos</p>
                          <div className="photo-grid" style={{ marginTop: 4 }}>
                            {photos.map((photo, index) => (
                              <div key={`${claim._id}-photo-${index}`} className="photo-card" style={{ border: '1px solid rgba(23,32,51,0.08)', borderRadius: 16, padding: 12 }}>
                                {photo.dataUrl ? (
                                  <img src={photo.dataUrl} alt={photo.name || `Claim photo ${index + 1}`} className="photo-card__image" style={{ width: '100%', borderRadius: 12, aspectRatio: '1/1', objectFit: 'cover' }} />
                                ) : (
                                  <div className="photo-card__image review-photo-placeholder" style={{ display: 'grid', placeItems: 'center', minHeight: 120, border: '1px dashed #ccc', borderRadius: 12 }}>Preview unavailable</div>
                                )}
                                <div className="photo-card__meta" style={{ marginTop: 8, fontSize: '0.85rem' }}>
                                  <strong style={{ display: 'block' }}>{photo.name || `Photo ${index + 1}`}</strong>
                                  <span className="p-helper-copy">{Math.max(1, Math.round((photo.sizeBytes || 0) / 1024))} KB</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-helper-copy">No photo evidence was attached to this claim.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
