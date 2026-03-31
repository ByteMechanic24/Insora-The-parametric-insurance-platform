import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../App';
import { loginWorker, persistWorkerAuth, warmServices } from '../utils/api';
import { primeWorkerReads } from '../utils/workerDataPrefetch';

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
      <section className="sign-in-shell">
        <div className="sign-in-grid">
          <div className="sign-in-intro hero-card">
            <div>
              <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Welcome back
              </p>
              <h2 className="page-title" style={{ color: 'white', maxWidth: 560 }}>
                Sign in and continue with your worker account.
              </h2>
              <p className="hero-card__subtext" style={{ maxWidth: 520, marginTop: 14 }}>
                Returning users use the email and password created during sign-up. If onboarding is not
                finished yet, we’ll guide you there before the dashboard.
              </p>
            </div>

            <div className="sign-in-points">
              <div className="sign-in-point">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Dashboard after validation</strong>
                  <p>Fully onboarded workers go straight into their own overview workspace.</p>
                </div>
              </div>
              <div className="sign-in-point">
                <ShieldCheck size={18} />
                <div>
                  <strong>Atlas-backed account check</strong>
                  <p>Your sign-in is validated against the stored worker record in MongoDB Atlas.</p>
                </div>
              </div>
              <div className="sign-in-point">
                <KeyRound size={18} />
                <div>
                  <strong>Email plus password</strong>
                  <p>Simple sign-in path for returning workers without external identity providers.</p>
                </div>
              </div>
            </div>
          </div>

          <section className="panel-card sign-in-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Worker sign in</p>
                <h3 className="page-title" style={{ fontSize: '2.1rem' }}>
                  Re-enter your workspace
                </h3>
              </div>
            </div>

            {error ? <div className="alert alert--error sign-in-alert">{error}</div> : null}

            <form className="sign-in-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="signin-email">Email</label>
                <input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="signin-password">Password</label>
                <input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="sign-in-note">
                <span className="tag sign-in-note__tag">
                  <KeyRound size={14} />
                  Returning user access
                </span>
                <p>If the account doesn’t exist yet, you’ll need to sign up first.</p>
              </div>

              <div className="inline-actions sign-in-actions">
                <button type="submit" className="button button--primary" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <button type="button" className="button button--ghost" onClick={() => navigate('/get-started')}>
                  Create new coverage
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </div>
  );
}
