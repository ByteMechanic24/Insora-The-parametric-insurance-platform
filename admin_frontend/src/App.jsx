import React, { useEffect, useState } from 'react';
import { LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';
import AdminDashboard from './components/AdminDashboard';
import { loginAdmin, removeAdminKey } from './utils/api';
import './index.css';
import './styles/premium-ui.css';

const STORAGE_KEY = 'gigshield_admin_key';

export default function App() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [inputKey, setInputKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!adminKey) {
        setIsLoading(false);
        return;
      }

      try {
        await loginAdmin(adminKey);
        setIsAuthenticated(true);
      } catch (authError) {
        removeAdminKey();
        setAdminKey('');
        setError('Admin session expired. Enter the admin access key again.');
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [adminKey]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const trimmedKey = inputKey.trim();
      await loginAdmin(trimmedKey);
      localStorage.setItem(STORAGE_KEY, trimmedKey);
      setAdminKey(trimmedKey);
      setIsAuthenticated(true);
      setInputKey('');
    } catch (authError) {
      setError(authError.message || 'Admin authentication failed.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    removeAdminKey();
    localStorage.removeItem(STORAGE_KEY);
    setAdminKey('');
    setIsAuthenticated(false);
    setError('');
  };

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell">
        <div className="app-shell__backdrop" />
        <main className="page-frame page-frame--guest" style={{ maxWidth: 680 }}>
          <section className="p-card p-card--hero" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <p className="p-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" style={{ background: 'var(--brand)', width: 6, height: 6, borderRadius: '50%' }} />
              Org-side control plane
            </p>
            <h1 className="p-title p-title--hero">
              Insora Admin Console
            </h1>
            <p className="p-subtext">
              This environment is reserved for insurer and operations users only. Worker accounts do not have access here.
            </p>
          </section>

          <section className="p-card" style={{ marginTop: 20, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <div className="p-section-heading">
              <div>
                <h2 className="p-title p-title--section">
                  Enter the access key
                </h2>
              </div>
            </div>

            {error ? <div className="p-alert p-alert--error" style={{ marginBottom: 18 }}>{error}</div> : null}

            <form onSubmit={handleLogin} className="form-grid">
              <div className="field field--full">
                <label htmlFor="admin-key">Admin access key</label>
                <div className="input-prefix">
                  <span>
                    <LockKeyhole size={16} />
                  </span>
                  <input
                    id="admin-key"
                    type="password"
                    value={inputKey}
                    onChange={(event) => setInputKey(event.target.value)}
                    placeholder="Enter admin key"
                  />
                </div>
              </div>
              <div className="p-grid-actions" style={{ marginTop: 8 }}>
                <button type="submit" className="button button--secondary" disabled={!inputKey.trim()} style={{ width: '100%' }}>
                  <ShieldCheck size={16} />
                  Open admin console
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-shell__backdrop" />
      <header className="topbar">
        <div className="topbar__brand">
          <div className="brand-mark">
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="eyebrow">Private admin environment</p>
            <h1 className="p-title" style={{ fontSize: '1.4rem' }}>Insora Admin</h1>
          </div>
        </div>
        <div className="topbar__meta">
          <div className="presence-chip">
            <span className="presence-chip__dot" />
            <span>Org access active</span>
          </div>
          <button type="button" className="button button--ghost" onClick={handleLogout}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <main className="page-frame page-frame--guest">
        <AdminDashboard />
      </main>
    </div>
  );
}
