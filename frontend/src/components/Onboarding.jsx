import React, { useEffect, useState } from 'react';
import { ArrowRight, Shield, Sparkles, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../App';
import { registerWorker } from '../utils/api';
import { formatTier } from '../utils/formatting';

const CITIES = {
  Mumbai: ['Andheri', 'Bandra', 'Powai', 'South Mumbai', 'Borivali'],
  Delhi: ['Connaught Place', 'South Extension', 'Dwarka', 'Rohini', 'Vasant Kunj'],
  Bangalore: ['Indiranagar', 'Koramangala', 'Whitefield', 'Jayanagar', 'HSR Layout'],
  Chennai: ['T Nagar', 'Adyar', 'Anna Nagar', 'Velachery', 'OMR'],
  Hyderabad: ['Banjara Hills', 'Jubilee Hills', 'HITEC City', 'Gachibowli', 'Madhapur'],
  Pune: ['Kothrud', 'Viman Nagar', 'Hinjewadi', 'Baner', 'Koregaon Park'],
  Kolkata: ['Salt Lake', 'New Town', 'Park Street', 'Ballygunge', 'Alipore'],
};

const PREMIUM_ESTIMATES = {
  Mumbai: { basic: 34, standard: 51, premium: 84 },
  Delhi: { basic: 32, standard: 48, premium: 79 },
  Bangalore: { basic: 31, standard: 47, premium: 78 },
  default: { basic: 28, standard: 44, premium: 72 },
};

const PLAN_FEATURES = {
  basic: ['Covers single-order disruption loss', 'Best for occasional riders'],
  standard: ['Adds stranded-time protection', 'Best fit for daily workers'],
  premium: ['Higher weekly limit', 'Priority manual review support'],
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { worker, setWorker } = useWorker();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [upiHandle, setUpiHandle] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [operatingZones, setOperatingZones] = useState(['Andheri']);
  const [tier, setTier] = useState('standard');
  const [estimatedPremium, setEstimatedPremium] = useState(51);

  useEffect(() => {
    const byCity = PREMIUM_ESTIMATES[city] || PREMIUM_ESTIMATES.default;
    setEstimatedPremium(byCity[tier]);
  }, [city, tier]);

  const validateStepOne = () => {
    if (!upiHandle.includes('@')) {
      setError('Enter a valid UPI ID, for example rider@oksbi.');
      return false;
    }

    if (!city) {
      setError('Choose the city where you work most often.');
      return false;
    }

    if (operatingZones.length === 0) {
      setError('Pick at least one active delivery zone.');
      return false;
    }

    setError('');
    return true;
  };

  const toggleZone = (zone) => {
    setOperatingZones((current) =>
      current.includes(zone) ? current.filter((item) => item !== zone) : [...current, zone]
    );
  };

  const handleContinue = () => {
    if (step === 1 && !validateStepOne()) {
      return;
    }

    setStep((current) => Math.min(current + 1, 3));
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await registerWorker({
        upiHandle,
        deviceFingerprint: `DEV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        tier,
        city,
        operatingZones,
      });

      setWorker({
        ...worker,
        ...response.worker,
        onboardingCompleted: true,
        activePolicyId: response.worker?.activePolicyId || response.policy?._id || null,
        tier,
        city,
      });
      navigate('/dashboard', { replace: true });
    } catch (registrationError) {
      setError(registrationError.message || 'Unable to create coverage right now.');
    } finally {
      setLoading(false);
    }
  };

  const plan = formatTier(tier);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-card__grid">
          <div>
            <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Built for India’s delivery workforce
            </p>
            <h2 className="page-title" style={{ color: 'white', maxWidth: 620 }}>
              Protect each working week with faster claims and cleaner proof capture.
            </h2>
            <p className="hero-card__subtext" style={{ maxWidth: 560, marginTop: 14 }}>
              Insora gives riders a calm place to enroll, prove a disruption, and understand what
              happens next. The experience stays mobile-first without looking like a temporary demo.
            </p>
            <div className="pill-row" style={{ marginTop: 18 }}>
              <span className="tag">
                <Shield size={14} />
                Weekly coverage
              </span>
              <span className="tag">
                <Wallet size={14} />
                UPI payout setup
              </span>
              <span className="tag">
                <Sparkles size={14} />
                Faster evidence capture
              </span>
            </div>
          </div>

          <div className="panel-card" style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}>
            <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Why riders use it
            </p>
            <div className="stats-grid">
              <div className="metric-card" style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}>
                <p className="metric-card__label" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  Setup time
                </p>
                <div className="metric-card__value">3 min</div>
                <p className="metric-card__caption" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  Guided onboarding
                </p>
              </div>
              <div className="metric-card" style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}>
                <p className="metric-card__label" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  Claim inputs
                </p>
                <div className="metric-card__value">4</div>
                <p className="metric-card__caption" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  Order, platform, disruption, GPS
                </p>
              </div>
              <div className="metric-card" style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}>
                <p className="metric-card__label" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  Designed for
                </p>
                <div className="metric-card__value">7 cities</div>
                <p className="metric-card__caption" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  With zone-based pricing
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Onboarding</p>
            <h3 className="page-title" style={{ fontSize: '2.2rem' }}>
              Start your coverage
            </h3>
            <p className="card-copy">We’ll set up your payout destination, working city, and weekly plan.</p>
          </div>
          <div className="stepper">
            {['Profile', 'Plan', 'Review'].map((label, index) => (
              <div key={label} className={`step-chip${step === index + 1 ? ' step-chip--active' : ''}`}>
                <span className="step-chip__index">{index + 1}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {error ? <div className="alert alert--error" style={{ marginTop: 20 }}>{error}</div> : null}

        {step === 1 ? (
          <div className="form-grid" style={{ marginTop: 24 }}>
            <div className="field">
              <label htmlFor="upi">UPI payout ID</label>
              <input
                id="upi"
                type="text"
                placeholder="rider@oksbi"
                value={upiHandle}
                onChange={(event) => setUpiHandle(event.target.value.toLowerCase())}
              />
            </div>

            <div className="field">
              <label htmlFor="city">Primary city</label>
              <select
                id="city"
                value={city}
                onChange={(event) => {
                  const nextCity = event.target.value;
                  setCity(nextCity);
                  setOperatingZones(CITIES[nextCity]?.slice(0, 1) || []);
                }}
              >
                {Object.keys(CITIES).map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Estimated weekly premium</label>
              <div className="metric-card">
                <p className="metric-card__label">{plan.label}</p>
                <div className="metric-card__value">₹{estimatedPremium}</div>
                <p className="metric-card__caption">Adjusted for {city} rider density and disruption risk.</p>
              </div>
            </div>

            <div className="field field--full">
              <div className="fieldset">
                <span className="fieldset__label">Active delivery zones</span>
                <div className="zone-grid">
                  {(CITIES[city] || []).map((zone) => (
                    <button
                      key={zone}
                      type="button"
                      className={`zone-pill${operatingZones.includes(zone) ? ' zone-pill--active' : ''}`}
                      onClick={() => toggleZone(zone)}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : null}

        {step === 2 ? (
          <div className="selection-grid selection-grid--two" style={{ marginTop: 24 }}>
            {['basic', 'standard', 'premium'].map((planKey) => {
              const tierMeta = formatTier(planKey);
              const active = tier === planKey;

              return (
                <button
                  key={planKey}
                  type="button"
                  className={`selection-card${active ? ' selection-card--active' : ''}`}
                  onClick={() => setTier(planKey)}
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">{planKey === 'standard' ? 'Best balance' : 'Coverage plan'}</p>
                      <h3 style={{ margin: 0, fontSize: '1.5rem', fontFamily: "'Space Grotesk', sans-serif" }}>
                        {tierMeta.label}
                      </h3>
                    </div>
                    <span className="status-pill">{tierMeta.price}</span>
                  </div>
                  <div className="helper-copy" style={{ marginTop: 16 }}>
                    {PLAN_FEATURES[planKey].map((feature) => (
                      <div key={feature} style={{ marginTop: 8 }}>
                        {feature}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="stats-grid" style={{ marginTop: 24 }}>
            <div className="metric-card">
              <p className="metric-card__label">Weekly plan</p>
              <div className="metric-card__value">{plan.label}</div>
              <p className="metric-card__caption">Estimated premium ₹{estimatedPremium}</p>
            </div>
            <div className="metric-card">
              <p className="metric-card__label">Payout destination</p>
              <div className="metric-card__value" style={{ fontSize: '1.35rem' }}>
                {upiHandle}
              </div>
              <p className="metric-card__caption">Linked to your worker account</p>
            </div>
            <div className="metric-card">
              <p className="metric-card__label">Delivery zones</p>
              <div className="metric-card__value" style={{ fontSize: '1.35rem' }}>
                {operatingZones.length}
              </div>
              <p className="metric-card__caption">{operatingZones.join(', ')}</p>
            </div>
            <div className="field field--full">
              <div className="alert alert--info">
                Insora only covers verified disruption-related income loss. Health incidents, vehicle damage,
                and generic accidents are outside this policy.
              </div>
            </div>
            <div className="field field--full">
              <div className="alert alert--info">
                Coverage stays linked to your worker account and you’ll return using your email and password.
              </div>
            </div>
          </div>
        ) : null}

        <div className="inline-actions" style={{ gridTemplateColumns: 'auto 1fr', marginTop: 28 }}>
          {step > 1 ? (
            <button type="button" className="button button--ghost" onClick={() => setStep((current) => current - 1)}>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button type="button" className="button button--secondary" onClick={handleContinue}>
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="button button--primary" onClick={handleRegister} disabled={loading}>
              {loading ? 'Creating coverage...' : 'Activate coverage'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
