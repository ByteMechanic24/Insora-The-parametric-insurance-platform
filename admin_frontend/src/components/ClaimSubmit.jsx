import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Crosshair, MapPinned, Radar } from 'lucide-react';
import useDeepLink from '../hooks/useDeepLink';
import useLocation from '../hooks/useLocation';
import { submitClaim } from '../utils/api';
import { formatDecision, formatDisruption, formatPlatform, formatRupees } from '../utils/formatting';

const DISRUPTION_OPTIONS = [
  { value: 'flooding', label: 'Flooding', description: 'Roads waterlogged or unsafe to continue.' },
  { value: 'heat', label: 'Heatwave', description: 'Extreme heat affecting platform operations.' },
  { value: 'aqi', label: 'Poor AQI', description: 'Air quality disruption triggered in your zone.' },
  { value: 'strike', label: 'Strike', description: 'Labor action or civil disruption delayed service.' },
  { value: 'road_closure', label: 'Road closure', description: 'Barricade, closure, or police diversion blocked the route.' },
];

export default function ClaimSubmit() {
  const { orderId: initialOrderId, platform: initialPlatform, isAutoFilled } = useDeepLink();
  const { gpsCoords, networkCoords, isLoading: locationLoading, error: locationError } = useLocation();

  const [orderId, setOrderId] = useState('');
  const [platform, setPlatform] = useState('zomato');
  const [disruptionType, setDisruptionType] = useState('flooding');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialOrderId) {
      setOrderId(initialOrderId);
    }

    if (initialPlatform === 'swiggy' || initialPlatform === 'zomato') {
      setPlatform(initialPlatform);
    }
  }, [initialOrderId, initialPlatform]);

  const locationSummary = useMemo(() => {
    if (locationLoading) {
      return 'Capturing live location evidence...';
    }

    if (gpsCoords) {
      return `GPS lock captured${gpsCoords.accuracy ? ` with ±${gpsCoords.accuracy}m accuracy` : ''}.`;
    }

    if (networkCoords) {
      return 'Network-based location captured as a fallback.';
    }

    return locationError || 'Location is unavailable.';
  }, [gpsCoords, networkCoords, locationError, locationLoading]);

  const handleSubmit = async () => {
    if (!orderId.trim()) {
      setError('Order ID is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      const normalizedOrderId = orderId.trim().toUpperCase();
      const response = await submitClaim({
        orderId: normalizedOrderId,
        platform,
        disruptionType,
        gps: {
          lat: gpsCoords?.lat ?? networkCoords?.lat ?? 19.1136,
          lng: gpsCoords?.lng ?? networkCoords?.lng ?? 72.8697,
          accuracy_metres: gpsCoords?.accuracy ?? null,
          network_lat: networkCoords?.lat ?? null,
          network_lng: networkCoords?.lng ?? null,
          network_accuracy_metres: networkCoords?.accuracy ?? null,
          google_geoloc_used: Boolean(networkCoords?.googleGeolocUsed),
        },
        claimTimestamp: new Date().toISOString(),
      });

      localStorage.setItem('last_order_id', response.orderId || normalizedOrderId);
      localStorage.setItem('last_platform', platform);
      setResult(response);
    } catch (submissionError) {
      setError(submissionError.message || 'Unable to submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const decision = formatDecision(result.decision);

    return (
      <div className="p-page-stack">
        <section className="p-card">
          <div className="p-section-heading">
            <div>
              <p className="p-eyebrow">Claim created</p>
              <h2 className="p-title p-title--section">
                {decision.label}
              </h2>
              <p className="p-subtext">
                Order {result.orderId} was submitted successfully and is now in the decision pipeline.
              </p>
            </div>
            <div className={`p-tag p-tag--${decision.tone === 'review' ? 'warning' : decision.tone}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} />
              {decision.label}
            </div>
          </div>

          <div className="p-grid-2" style={{ marginTop: 22 }}>
            <div className="p-metric">
              <p className="p-metric__label">Estimated payout</p>
              <div className="p-metric__value" style={{ marginTop: 4 }}>{formatRupees(result.payout?.total || 0)}</div>
              <p className="p-metric__caption">Calculated from the current policy rules.</p>
            </div>
            <div className="p-metric">
              <p className="p-metric__label">Composite score</p>
              <div className="p-metric__value" style={{ marginTop: 4 }}>
                {typeof result.compositeScore === 'number' ? result.compositeScore.toFixed(2) : 'N/A'}
              </div>
              <p className="p-metric__caption">Higher scores lead to faster auto decisions.</p>
            </div>
          </div>

          <div className="p-grid-actions" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 32 }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setResult(null);
                setOrderId('');
              }}
            >
              Submit another claim
            </button>
            <a href="/history" className="button button--ghost">
              View claim history
            </a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="p-page-stack">
      <section className="p-card">
        <div className="p-section-heading">
          <div>
            <p className="p-eyebrow">New claim</p>
            <h2 className="p-title p-title--section">
              Report a blocked order
            </h2>
            <p className="p-subtext">Attach the order, platform, disruption type, and live location in one flow.</p>
          </div>
        </div>

        {error ? <div className="p-alert p-alert--error" style={{ marginTop: 20 }}>{error}</div> : null}

        <div className="form-grid" style={{ marginTop: 24, gap: 24 }}>
          <div className="field">
            <label htmlFor="order-id">Order ID</label>
            <input
              id="order-id"
              type="text"
              value={orderId}
              onChange={(event) => setOrderId(event.target.value.toUpperCase())}
              placeholder="ZOM-20260403-000001"
            />
            <span className="p-helper-copy" style={{ marginTop: 6, display: 'block' }}>{isAutoFilled ? 'Pre-filled from your last order context.' : 'You can edit this before submitting.'}</span>
          </div>

          <div className="field">
            <label>Platform</label>
            <div className="selection-grid selection-grid--two">
              {['zomato', 'swiggy'].map((platformKey) => (
                <button
                  key={platformKey}
                  type="button"
                  className={`p-toggle${platform === platformKey ? ' p-toggle--active' : ''}`}
                  onClick={() => setPlatform(platformKey)}
                >
                  {formatPlatform(platformKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="field field--full">
            <label>Disruption type</label>
            <div className="selection-grid selection-grid--two">
              {DISRUPTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`selection-card${disruptionType === option.value ? ' selection-card--active' : ''}`}
                  onClick={() => setDisruptionType(option.value)}
                  style={{ textAlign: 'left' }}
                >
                  <strong className="p-title p-title--card" style={{ marginTop: 0, fontSize: '1.1rem' }}>{option.label}</strong>
                  <div className="p-helper-copy">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-stats-grid" style={{ marginTop: 32 }}>
          <div className="p-metric">
            <p className="p-metric__label">
              <Crosshair size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              GPS evidence
            </p>
            <div className="p-metric__value" style={{ fontSize: '1.2rem', marginTop: 4 }}>
              {gpsCoords ? `${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : 'Waiting'}
            </div>
            <p className="p-metric__caption">{locationSummary}</p>
          </div>
          <div className="p-metric">
            <p className="p-metric__label">
              <MapPinned size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Network fallback
            </p>
            <div className="p-metric__value" style={{ fontSize: '1.2rem', marginTop: 4 }}>
              {networkCoords ? `${networkCoords.lat.toFixed(4)}, ${networkCoords.lng.toFixed(4)}` : 'Unavailable'}
            </div>
            <p className="p-metric__caption">Used if a high-accuracy GPS lock is slow or blocked.</p>
          </div>
          <div className="p-metric">
            <p className="p-metric__label">
              <Radar size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Claim preview
            </p>
            <div className="p-metric__value" style={{ fontSize: '1.2rem', marginTop: 4 }}>
              {formatPlatform(platform)} · {formatDisruption(disruptionType)}
            </div>
            <p className="p-metric__caption">Order {orderId || 'not entered yet'}</p>
          </div>
        </div>

        <div className="p-grid-actions" style={{ marginTop: 36 }}>
          <button type="button" className="button button--primary" onClick={handleSubmit} disabled={submitting} style={{ minWidth: 200 }}>
            {submitting ? 'Submitting claim...' : 'Submit claim'}
          </button>
        </div>
      </section>
    </div>
  );
}
