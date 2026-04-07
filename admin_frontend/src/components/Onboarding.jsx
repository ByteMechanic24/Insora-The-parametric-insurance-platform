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
  const { setWorker } = useWorker();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
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
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return false;
    }

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
        phone: `+91${phone}`,
        upiHandle,
        deviceFingerprint: `DEV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        tier,
        city,
        operatingZones,
      });

      setWorker(response.worker);
      navigate('/');
    } catch (registrationError) {
      setError(registrationError.message || 'Unable to create coverage right now.');
    } finally {
      setLoading(false);
    }
  };

  const plan = formatTier(tier);

  return (
    <div className="p-page-stack">


      <section className="p-card">
        <div className="p-section-heading">
          <div>
            <p className="p-eyebrow">Onboarding</p>
            <h3 className="p-title p-title--section">
              Start your coverage
            </h3>
            <p className="p-subtext">We’ll set up your payout destination, working city, and weekly plan.</p>
          </div>
          <div className="stepper" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['Profile', 'Plan', 'Review'].map((label, index) => (
              <div key={label} className={`p-tag${step === index + 1 ? ' p-tag--brand' : ''}`} style={{ padding: '8px 14px' }}>
                <span style={{ 
                  display: 'inline-grid', placeItems: 'center', width: 22, height: 22, borderRadius: 11, 
                  background: step === index + 1 ? '#ffffff' : 'rgba(23,32,51,0.1)',
                  marginRight: 8, fontSize: '0.85rem'
                }}>
                  {index + 1}
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {error ? <div className="p-alert p-alert--error" style={{ marginTop: 20 }}>{error}</div> : null}

        {step === 1 ? (
          <div className="form-grid" style={{ marginTop: 24, gap: 24 }}>
            <div className="field">
              <label htmlFor="phone">Mobile number</label>
              <div className="input-prefix">
                <span>+91</span>
                <input
                  id="phone"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

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
              <div className="p-metric">
                <p className="p-metric__label">{plan.label}</p>
                <div className="p-metric__value">₹{estimatedPremium}</div>
                <p className="p-metric__caption">Adjusted for {city} rider density and disruption risk.</p>
              </div>
            </div>

            <div className="field field--full">
              <div className="fieldset">
                <span className="p-metric__label" style={{ marginBottom: 12 }}>Active delivery zones</span>
                <div className="zone-grid" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {(CITIES[city] || []).map((zone) => (
                    <button
                      key={zone}
                      type="button"
                      className={`p-toggle${operatingZones.includes(zone) ? ' p-toggle--active' : ''}`}
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
          <div className="p-grid-2" style={{ marginTop: 24, padding: '12px 0' }}>
            {['basic', 'standard', 'premium'].map((planKey) => {
              const tierMeta = formatTier(planKey);
              const active = tier === planKey;

              return (
                <button
                  key={planKey}
                  type="button"
                  className={`selection-card${active ? ' selection-card--active' : ''}`}
                  onClick={() => setTier(planKey)}
                  style={{ textAlign: 'left', display: 'block', width: '100%' }}
                >
                  <div className="p-section-heading" style={{ marginBottom: 16 }}>
                    <div>
                      <p className="p-eyebrow" style={{ marginBottom: 8, padding: '4px 8px', fontSize: '0.65rem' }}>{planKey === 'standard' ? 'Best balance' : 'Coverage plan'}</p>
                      <h3 className="p-title p-title--card">
                        {tierMeta.label}
                      </h3>
                    </div>
                    <span className="p-tag p-tag--brand">{tierMeta.price}</span>
                  </div>
                  <div className="p-helper-copy" style={{ marginTop: 16 }}>
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
          <div className="p-stats-grid" style={{ marginTop: 24 }}>
            <div className="p-metric">
              <p className="p-metric__label">Weekly plan</p>
              <div className="p-metric__value">{plan.label}</div>
              <p className="p-metric__caption">Estimated premium ₹{estimatedPremium}</p>
            </div>
            <div className="p-metric">
              <p className="p-metric__label">Payout destination</p>
              <div className="p-metric__value" style={{ fontSize: '1.35rem' }}>
                {upiHandle}
              </div>
              <p className="p-metric__caption">Linked to your worker account</p>
            </div>
            <div className="p-metric">
              <p className="p-metric__label">Delivery zones</p>
              <div className="p-metric__value" style={{ fontSize: '1.35rem' }}>
                {operatingZones.length}
              </div>
              <p className="p-metric__caption">{operatingZones.join(', ')}</p>
            </div>
            <div className="field field--full" style={{ marginTop: 12 }}>
              <div className="p-alert p-alert--error" style={{ background: 'rgba(14, 124, 134, 0.08)', borderColor: 'rgba(14, 124, 134, 0.15)', color: 'var(--brand-deep)' }}>
                GigShield only covers verified disruption-related income loss. Health incidents, vehicle damage,
                and generic accidents are outside this policy.
              </div>
            </div>
          </div>
        ) : null}

        <div className="p-grid-actions" style={{ gridTemplateColumns: 'auto 1fr', marginTop: 32, display: 'grid' }}>
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
