import React, { useState } from 'react';
import { ArrowRight, Mail, Phone, ShieldCheck, Bike, BadgeIndianRupee, CheckCircle2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../App';
import { persistWorkerAuth, signUpWorker, warmServices } from '../utils/api';
import { primeWorkerReads } from '../utils/workerDataPrefetch';
import '../styles/auth.css';

const perks = [
  {
    icon: ShieldCheck,
    title: 'Weekly parametric cover',
    copy: 'Rain, heat, air quality, strikes — activate protection for the week in minutes.',
  },
  {
    icon: BadgeIndianRupee,
    title: 'UPI-ready payouts',
    copy: 'Approved claims go directly to your UPI ID. No branch visits, no waiting.',
  },
  {
    icon: Bike,
    title: 'Built for riders',
    copy: 'Swiggy, Zomato, delivery platforms — one account covers your whole week.',
  },
];

export default function SignUp() {
  const navigate = useNavigate();
  const { setWorker } = useWorker();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await signUpWorker({
        email: email.toLowerCase(),
        phone,
        password,
      });

      persistWorkerAuth(response);
      warmServices();
      primeWorkerReads();
      setWorker(response.worker);
      navigate('/onboarding', { replace: true });
    } catch (signUpError) {
      setError(signUpError.message || 'Unable to create your account right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="auth-grid">

        {/* ── LEFT: Intro panel ── */}
        <div className="auth-intro">
          <div>
            <div className="auth-intro__badge">
              <Bike size={13} />
              Rider account setup
            </div>
            <h2 className="auth-intro__title">
              Get protected,<br /><span>start earning safely</span>
            </h2>
            <p className="auth-intro__sub">
              Your email, mobile number, and password create your GigShield worker account — stored securely in MongoDB Atlas.
            </p>
          </div>

          <div className="auth-perks">
            {perks.map(({ icon: Icon, title, copy }) => (
              <div className="auth-perk" key={title}>
                <div className="auth-perk__icon">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="auth-perk__title">{title}</p>
                  <p className="auth-perk__copy">{copy}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-trust">
            <span className="auth-trust__item">
              <CheckCircle2 size={13} />
              No credit card required
            </span>
            <span className="auth-trust__item">
              <ShieldCheck size={13} />
              Secure &amp; encrypted
            </span>
            <span className="auth-trust__item">
              <BadgeIndianRupee size={13} />
              Free to start
            </span>
          </div>
        </div>

        {/* ── RIGHT: Form card ── */}
        <section className="auth-card">
          <div className="auth-card__header">
            <p className="eyebrow">Create account</p>
            <h3 className="auth-card__title">Get protected today</h3>
            <p className="auth-card__sub">Sign up to activate weekly income cover for your delivery shifts.</p>
          </div>

          {error ? (
            <div className="auth-error" role="alert">
              <ShieldCheck size={16} style={{ color: '#c45b4e', flexShrink: 0 }} />
              {error}
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="signup-email">Email address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Mail size={16} /></span>
                <input
                  id="signup-email"
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="signup-phone">Mobile number</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Phone size={16} /></span>
                <input
                  id="signup-phone"
                  className="auth-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit number (e.g. 9876543210)"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="signup-password">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Lock size={16} /></span>
                <input
                  id="signup-password"
                  className="auth-input"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="signup-confirm-password">Confirm password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Lock size={16} /></span>
                <input
                  id="signup-confirm-password"
                  className="auth-input"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </div>

            <div className="auth-actions">
              <button type="submit" className="button button--primary" disabled={loading}>
                <ShieldCheck size={16} />
                {loading ? 'Creating account…' : 'Sign up and continue'}
              </button>

              <div className="auth-divider">or</div>

              <button
                type="button"
                className="button button--ghost"
                onClick={() => navigate('/sign-in')}
              >
                Already have an account
                <ArrowRight size={16} />
              </button>

              <p className="auth-note">
                No hidden fees · Your data is encrypted · Cancel anytime
              </p>
            </div>
          </form>
        </section>

      </div>
    </div>
  );
}
