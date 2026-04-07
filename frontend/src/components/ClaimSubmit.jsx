import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Crosshair, MapPinned, Radar, Sparkles } from 'lucide-react';
import useDeepLink from '../hooks/useDeepLink';
import useLocation from '../hooks/useLocation';
import { compressImageFile } from '../utils/imageCompression';
import { generateDemoOrder, submitClaim } from '../utils/api';
import { getCachedClaimsSnapshot, updateClaimsSnapshot } from '../utils/workerDataPrefetch';
import { formatDecision, formatDisruption, formatPlatform, formatRupees } from '../utils/formatting';
import '../styles/app.css';
import '../styles/auth.css';

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
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoToast, setDemoToast] = useState('');
  const [latestDemoOrderId, setLatestDemoOrderId] = useState('');
  const [photos, setPhotos] = useState([]);
  const [compressingPhotos, setCompressingPhotos] = useState(false);

  const showDemoToast = (message) => {
    setDemoToast(message);
    window.setTimeout(() => setDemoToast(''), 3200);
  };

  const copyDemoOrderId = async (value) => {
    if (!value || !navigator?.clipboard?.writeText) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  };

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
        photos,
        claimTimestamp: new Date().toISOString(),
      });

      localStorage.setItem('last_order_id', response.orderId || normalizedOrderId);
      localStorage.setItem('last_platform', platform);
      const existingClaims = getCachedClaimsSnapshot() || [];
      updateClaimsSnapshot([response, ...existingClaims.filter((claim) => claim._id !== response._id)]);
      setResult(response);
    } catch (submissionError) {
      setError(submissionError.message || 'Unable to submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateDemoId = async () => {
    setDemoLoading(true);
    setError('');

    try {
      const demoOrder = await generateDemoOrder(platform, {
        lat: gpsCoords?.lat ?? networkCoords?.lat ?? null,
        lng: gpsCoords?.lng ?? networkCoords?.lng ?? null,
      });
      setOrderId(demoOrder.orderId);
      setPlatform(demoOrder.platform);
      setLatestDemoOrderId(demoOrder.orderId);

      const copied = await copyDemoOrderId(demoOrder.orderId);
      showDemoToast(
        copied
          ? `Demo ID copied: ${demoOrder.orderId}`
          : `Demo ID ready: ${demoOrder.orderId}`
      );
    } catch (demoError) {
      setError(demoError.message || 'Unable to generate a demo order right now.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleCopyDemoId = async () => {
    if (!latestDemoOrderId) {
      return;
    }

    const copied = await copyDemoOrderId(latestDemoOrderId);
    showDemoToast(
      copied
        ? `Demo ID copied: ${latestDemoOrderId}`
        : `Copy failed. Use the filled order ID field instead.`
    );
  };

  const handlePhotoChange = async (event) => {
    const incomingFiles = Array.from(event.target.files || []);
    if (!incomingFiles.length) {
      return;
    }

    setCompressingPhotos(true);

    try {
      const nextPhotos = await Promise.all(incomingFiles.map((file) => compressImageFile(file)));
      setPhotos((current) => [...current, ...nextPhotos]);
    } catch (photoError) {
      setError(photoError.message || 'Unable to process one or more selected photos.');
    } finally {
      setCompressingPhotos(false);
      event.target.value = '';
    }
  };

  const removePhoto = (indexToRemove) => {
    setPhotos((current) => current.filter((_, index) => index !== indexToRemove));
  };

  if (result) {
    const decision = formatDecision(result.decision);

    return (
      <div className="page-stack">
        <section className="app-panel">
          <div className="result-card__headline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="eyebrow">Claim created</p>
              <h2 className="app-hero__title" style={{ fontSize: '2.2rem', margin: '4px 0 12px' }}>
                {decision.label}
              </h2>
              <p className="app-hero__sub">
                Order {result.orderId} was submitted successfully and is now in the decision pipeline.
              </p>
            </div>
            <div className={`decision-chip decision-chip--${decision.tone}`}>
              <CheckCircle2 size={16} />
              {decision.label}
            </div>
          </div>

          <div className="app-stats-grid" style={{ marginTop: 22 }}>
            <div className="app-metric">
              <p className="app-metric__label">Estimated payout</p>
              <div className="app-metric__value">{formatRupees(result.payout?.total || 0)}</div>
              <p className="app-metric__caption">Calculated from the current policy rules.</p>
            </div>
            <div className="app-metric">
              <p className="app-metric__label">Composite score</p>
              <div className="app-metric__value">
                {typeof result.compositeScore === 'number' ? result.compositeScore.toFixed(2) : 'N/A'}
              </div>
              <p className="app-metric__caption">Higher scores lead to faster auto decisions.</p>
            </div>
          </div>

          <div className="inline-actions" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 22 }}>
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
            <a href="/dashboard/history" className="button button--ghost">
              View claim history
            </a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="app-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">New claim</p>
            <h2 className="app-hero__title" style={{ fontSize: '2.2rem' }}>
              Report a blocked order
            </h2>
            <p className="card-copy">Attach the order, platform, disruption type, and live location in one flow.</p>
          </div>
        </div>

        {error ? <div className="alert alert--error" style={{ marginTop: 20 }}>{error}</div> : null}

        <div className="form-grid" style={{ marginTop: 24 }}>
          <div className="auth-field">
            <label htmlFor="order-id">Order ID</label>
            <div className="auth-input-wrap">
              <input
                id="order-id"
                className="auth-input"
                type="text"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value.toUpperCase())}
                placeholder="ZOM-20260403-000001"
              />
            </div>
            <span className="helper-copy">
              {isAutoFilled
                ? 'Pre-filled from your last valid order context.'
                : 'Enter the platform order ID you received from the employer app, or use the small Demo ID helper.'}
            </span>
          </div>

          <div className="auth-field">
            <label>Platform</label>
            <div className="selection-grid selection-grid--two">
              {['zomato', 'swiggy'].map((platformKey) => (
                <button
                  key={platformKey}
                  type="button"
                  className={`toggle-chip${platform === platformKey ? ' toggle-chip--active' : ''}`}
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
                  className={`app-selection-card${disruptionType === option.value ? ' app-selection-card--active' : ''}`}
                  onClick={() => setDisruptionType(option.value)}
                >
                  <strong>{option.label}</strong>
                  <div className="helper-copy">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="field field--full">
            <label htmlFor="claim-photos">Incident photos</label>
            <input
              id="claim-photos"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoChange}
            />
            <span className="helper-copy">
              Add as many photos as you want. Images are compressed before upload so claims submit more reliably on phones and slower networks.
            </span>
            {compressingPhotos ? (
              <span className="helper-copy" style={{ marginTop: 8, display: 'block' }}>
                Compressing selected photos...
              </span>
            ) : null}
            {photos.length ? (
              <div className="photo-grid" style={{ marginTop: 14 }}>
                {photos.map((photo, index) => (
                  <div key={`${photo.name}-${index}`} className="photo-card">
                    <img src={photo.dataUrl} alt={photo.name} className="photo-card__image" />
                    <div className="photo-card__meta">
                      <strong>{photo.name}</strong>
                      <span>
                        {Math.max(1, Math.round((photo.sizeBytes || 0) / 1024))} KB
                        {photo.originalSizeBytes && photo.originalSizeBytes > photo.sizeBytes
                          ? ` from ${Math.max(1, Math.round(photo.originalSizeBytes / 1024))} KB`
                          : ''}
                      </span>
                    </div>
                    <button type="button" className="button button--ghost" onClick={() => removePhoto(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="app-stats-grid" style={{ marginTop: 24 }}>
          <div className="app-metric">
            <p className="app-metric__label">
              <Crosshair size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Your Location  
            </p>
            <div className="app-metric__value" style={{ fontSize: '1.1rem' }}>
              {gpsCoords ? `${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : 'Waiting'}
            </div>
            <p className="app-metric__caption">{locationSummary}</p>
          </div>
          <div className="app-metric">
            <p className="app-metric__label">
              <MapPinned size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Network fallback
            </p>
            <div className="app-metric__value" style={{ fontSize: '1.1rem' }}>
              {networkCoords ? `${networkCoords.lat.toFixed(4)}, ${networkCoords.lng.toFixed(4)}` : 'Unavailable'}
            </div>
            <p className="app-metric__caption">Used if a high-accuracy GPS lock is slow or blocked.</p>
          </div>
          <div className="app-metric">
            <p className="app-metric__label">
              <Radar size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Claim preview
            </p>
            <div className="app-metric__value" style={{ fontSize: '1.1rem' }}>
              {formatPlatform(platform)} · {formatDisruption(disruptionType)}
            </div>
            <p className="app-metric__caption">Order {orderId || 'not entered yet'} · {photos.length} photos attached</p>
          </div>
          <div className="app-metric">
            <p className="app-metric__label">
              <Camera size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Photo evidence
            </p>
            <div className="app-metric__value" style={{ fontSize: '1.1rem' }}>
              {photos.length ? `${photos.length} ready` : 'Optional'}
            </div>
            <p className="app-metric__caption">Photos are reviewed by humans if the claim enters the decision pipeline.</p>
          </div>
        </div>

        <div className="inline-actions" style={{ gridTemplateColumns: '1fr', marginTop: 28 }}>
          <button type="button" className="button button--primary" onClick={handleSubmit} disabled={submitting || compressingPhotos}>
            {compressingPhotos ? 'Preparing photos...' : submitting ? 'Submitting claim...' : 'Submit claim'}
          </button>
        </div>
      </section>

      <button
        type="button"
        className="demo-fab"
        onClick={handleGenerateDemoId}
        disabled={demoLoading}
        title="Generate a demo-valid order ID"
      >
        <Sparkles size={16} />
        <span>{demoLoading ? 'Loading...' : 'Demo ID'}</span>
      </button>

      {demoToast ? (
        <div className="demo-toast">
          <span>{demoToast}</span>
          {latestDemoOrderId ? (
            <button type="button" className="demo-toast__action" onClick={handleCopyDemoId}>
              Copy
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
