import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Mail,
  Lock,
  Bike,
  BadgeIndianRupee,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../App';
import { loginWorker, persistWorkerAuth, warmServices } from '../utils/api';
import { primeWorkerReads } from '../utils/workerDataPrefetch';
import '../styles/auth.css';

const trustPoints = [
  {
    icon: CheckCircle2,
    title: 'Dashboard after validation',
    copy: 'Fully onboarded workers go straight into their overview workspace.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure account check',
    copy: 'Your sign-in is validated against your encrypted worker record.',
  },
  {
    icon: KeyRound,
    title: 'Email + password access',
    copy: 'Simple, fast sign-in path — no external identity providers needed.',
  },
];

export default function SignIn() {
  const navigate = useNavigate();
  const { worker, setWorker } = useWorker();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (worker) {
      navigate(worker.onboardingCompleted ? '/dashboard' : '/onboarding', { replace: true });
    }
  }, [worker, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await loginWorker({
        email: email.toLowerCase(),
        password,
      });
      persistWorkerAuth(response);
      warmServices();
      primeWorkerReads();
      setWorker(response.worker);
      navigate(response.worker?.onboardingCompleted ? '/dashboard' : '/onboarding', { replace: true });
    } catch (signInError) {
      setError(signInError.message || 'Unable to sign in right now.');
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
              Rider workspace
            </div>
            <h2 className="auth-intro__title">
              Welcome back,<br /><span>let's get you riding</span>
            </h2>
            <p className="auth-intro__sub">
              Returning riders sign in with the email and password from their GigShield account. Onboarding incomplete? We'll guide you there first.
            </p>
          </div>

          <div className="auth-perks">
            {trustPoints.map(({ icon: Icon, title, copy }) => (
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
              <Zap size={13} />
              Instant sign-in
            </span>
            <span className="auth-trust__item">
              <ShieldCheck size={13} />
              Encrypted session
            </span>
            <span className="auth-trust__item">
              <BadgeIndianRupee size={13} />
              UPI payouts ready
            </span>
          </div>
        </div>

        {/* ── RIGHT: Form card ── */}
        <section className="auth-card">
          <div className="auth-card__header">
            <p className="eyebrow">Worker sign in</p>
            <h3 className="auth-card__title">Re-enter your workspace</h3>
            <p className="auth-card__sub">
              Sign in to check your coverage status, track claims, and manage your weekly protection.
            </p>
          </div>

          {error ? (
            <div className="auth-error" role="alert">
              <ShieldCheck size={16} style={{ color: '#c45b4e', flexShrink: 0 }} />
              {error}
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="signin-email">Email address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Mail size={16} /></span>
                <input
                  id="signin-email"
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="signin-password">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Lock size={16} /></span>
                <input
                  id="signin-password"
                  className="auth-input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>

            <div className="signin-info">
              <span className="signin-info__tag">
                <KeyRound size={12} />
                Returning user access
              </span>
              <p>If the account doesn't exist yet, you'll need to sign up first.</p>
            </div>

            <div className="auth-actions">
              <button type="submit" className="button button--primary" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
                {!loading && <ArrowRight size={16} />}
              </button>

              <div className="auth-divider">or</div>

              <button
                type="button"
                className="button button--ghost"
                onClick={() => navigate('/get-started')}
              >
                Create new coverage
                <ArrowRight size={16} />
              </button>

              <p className="auth-note">
                New rider? Sign up — it takes under 3 minutes.
              </p>
            </div>
          </form>
        </section>

      </div>
    </div>
  );
}
