import React, { useEffect, useState } from 'react';
import { ArrowRight, Shield, Sparkles, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../App';
import { registerWorker } from '../utils/api';
import { formatTier } from '../utils/formatting';
import '../styles/app.css';

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
      <section className="app-panel">
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
              <div className="app-metric">
                <p className="app-metric__label">{plan.label}</p>
                <div className="app-metric__value">₹{estimatedPremium}</div>
                <p className="app-metric__caption">Adjusted for {city} rider density and disruption risk.</p>
              </div>
            </div>

            <div className="field field--full">
              <div className="fieldset">
                <span className="fieldset__label">Active delivery zones</span>
                <div className="ob-zone-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(CITIES[city] || []).map((zone) => (
                    <button
                      key={zone}
                      type="button"
                      className={`app-zone-pill${operatingZones.includes(zone) ? ' app-zone-pill--active' : ''}`}
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
                  className={`app-selection-card${active ? ' app-selection-card--active' : ''}`}
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
          <div className="app-stats-grid" style={{ marginTop: 24 }}>
            <div className="app-metric">
              <p className="app-metric__label">Weekly plan</p>
              <div className="app-metric__value">{plan.label}</div>
              <p className="app-metric__caption">Estimated premium ₹{estimatedPremium}</p>
            </div>
            <div className="app-metric">
              <p className="app-metric__label">Payout destination</p>
              <div className="app-metric__value" style={{ fontSize: '1.35rem' }}>
                {upiHandle}
              </div>
              <p className="app-metric__caption">Linked to your worker account</p>
            </div>
            <div className="app-metric">
              <p className="app-metric__label">Delivery zones</p>
              <div className="app-metric__value" style={{ fontSize: '1.35rem' }}>
                {operatingZones.length}
              </div>
              <p className="app-metric__caption">{operatingZones.join(', ')}</p>
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
