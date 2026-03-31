import React, { useState } from 'react';
import { ArrowRight, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../App';
import { persistWorkerAuth, signUpWorker, warmServices } from '../utils/api';

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
      <section className="sign-in-shell">
        <div className="sign-in-grid">
          <div className="sign-in-intro hero-card">
            <div>
              <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Create your worker account
              </p>
              <h2 className="page-title" style={{ color: 'white', maxWidth: 560 }}>
                Sign up first, then we’ll take you to onboarding.
              </h2>
              <p className="hero-card__subtext" style={{ maxWidth: 520, marginTop: 14 }}>
                Your email, phone number, and password are saved to your worker account in MongoDB Atlas.
              </p>
            </div>
          </div>

          <section className="panel-card sign-in-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Sign up</p>
                <h3 className="page-title" style={{ fontSize: '2.1rem' }}>
                  Get protected
                </h3>
              </div>
            </div>

            {error ? <div className="alert alert--error sign-in-alert">{error}</div> : null}

            <form className="sign-in-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="signup-email">Email</label>
                <div className="input-prefix">
                  <span><Mail size={16} /></span>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="signup-phone">Mobile number</label>
                <div className="input-prefix">
                  <span><Phone size={16} /></span>
                  <input
                    id="signup-phone"
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
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="signup-confirm-password">Confirm password</label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>

              <div className="inline-actions sign-in-actions">
                <button type="submit" className="button button--primary" disabled={loading}>
                  <ShieldCheck size={16} />
                  {loading ? 'Creating account...' : 'Sign up and continue'}
                </button>
                <button type="button" className="button button--ghost" onClick={() => navigate('/sign-in')}>
                  Already have an account
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
