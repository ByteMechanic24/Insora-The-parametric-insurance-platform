import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Activity, ClipboardList, LayoutDashboard, Menu, Sparkles, X } from 'lucide-react';
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import ClaimSubmit from './components/ClaimSubmit';
import ClaimHistory from './components/ClaimHistory';
import { clearWorkerAuth, restoreWorkerSession, signOutWorker, warmServices } from './utils/api';
import { clearWorkerSnapshots, primeWorkerReads } from './utils/workerDataPrefetch';

const WorkerContext = createContext(null);

export function useWorker() {
  const context = useContext(WorkerContext);

  if (!context) {
    throw new Error('useWorker must be used within WorkerProvider');
  }

  return context;
}

function WorkerProvider({ children }) {
  const [worker, setWorkerState] = useState(() => {
    try {
      const sessionToken = localStorage.getItem('gigshield_session');
      const saved = localStorage.getItem('gigshield_worker');
      if (!sessionToken || !saved) {
        return null;
      }
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });
  const [authReady, setAuthReady] = useState(() => {
    try {
      const sessionToken = localStorage.getItem('gigshield_session');
      const saved = localStorage.getItem('gigshield_worker');
      return Boolean(sessionToken && saved);
    } catch {
      return false;
    }
  });

  const setWorker = (nextWorker) => {
    if (nextWorker) {
      localStorage.setItem('gigshield_worker', JSON.stringify(nextWorker));
      primeWorkerReads();
    } else {
      clearWorkerAuth();
      clearWorkerSnapshots();
    }

    setWorkerState(nextWorker);
  };

  useEffect(() => {
    warmServices();
    const sessionToken = localStorage.getItem('gigshield_session');
    if (!sessionToken) {
      setWorkerState(null);
      clearWorkerAuth();
      setAuthReady(true);
      return;
    }

    restoreWorkerSession()
      .then((payload) => {
        if (payload?.worker) {
          localStorage.setItem('gigshield_worker', JSON.stringify(payload.worker));
          setWorkerState(payload.worker);
          warmServices();
          primeWorkerReads();
        } else {
          clearWorkerAuth();
          clearWorkerSnapshots();
          setWorkerState(null);
        }
      })
      .catch(() => {
        clearWorkerAuth();
        clearWorkerSnapshots();
        setWorkerState(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  const value = useMemo(
    () => ({
      worker,
      setWorker,
      isLoggedIn: Boolean(worker),
      authReady,
    }),
    [authReady, worker]
  );

  return <WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>;
}

function ProtectedRoute({ children }) {
  const { isLoggedIn, authReady, worker } = useWorker();
  if (!authReady) {
    return <div className="panel-card">Restoring your session...</div>;
  }
  if (!isLoggedIn) {
    return <Navigate to="/sign-in" replace />;
  }
  if (worker && !worker.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const { isLoggedIn, authReady } = useWorker();
  if (!authReady) {
    return <div className="panel-card">Checking your session...</div>;
  }
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : children;
}

function LandingRoute() {
  const { authReady } = useWorker();
  if (!authReady) {
    return <div className="panel-card">Loading Insora...</div>;
  }
  return <LandingPage />;
}

function OnboardingRoute() {
  const { isLoggedIn, authReady, worker } = useWorker();
  if (!authReady) {
    return <div className="panel-card">Restoring your session...</div>;
  }
  if (!isLoggedIn) {
    return <Navigate to="/get-started" replace />;
  }
  return worker?.onboardingCompleted ? <Navigate to="/dashboard" replace /> : <Onboarding />;
}

function AppShell() {
  const location = useLocation();
  const { worker, setWorker, isLoggedIn } = useWorker();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLandingScreen = location.pathname === '/';

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
    { to: '/dashboard/claim', label: 'New claim', icon: ClipboardList },
    { to: '/dashboard/history', label: 'Claim history', icon: Activity },
  ];

  const currentView = navItems.find((item) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const isOnboardingScreen = location.pathname === '/onboarding';
  const isStandaloneGuestView = !isLoggedIn || isLandingScreen || isOnboardingScreen;

  return (
    <div className="app-shell">
      <div className="app-shell__backdrop" />
      <header className="topbar">
        <div className="topbar__brand">
          {isLoggedIn ? (
            <button
              type="button"
              className="icon-button mobile-only"
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          ) : null}
          <div className="brand-mark">
            <Sparkles size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="eyebrow">Parametric income protection</p>
            <h1>Insora</h1>
          </div>
        </div>

        <div className="topbar__meta">
          {isLoggedIn ? (
            <>
              {isLandingScreen ? (
                <a href="/dashboard" className="button button--secondary">
                  Go to dashboard
                </a>
              ) : (
                <div className="presence-chip">
                  <span className="presence-chip__dot" />
                  <span>{worker?.city || 'Protected city'}</span>
                </div>
              )}
              <button
                type="button"
                className="button button--ghost"
                onClick={async () => {
                  try {
                    await signOutWorker();
                  } catch (_) {
                    // Session is cleared locally even if the network call fails.
                  }
                  setWorker(null);
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <a href="/sign-in" className="button button--ghost">
                Sign in
              </a>
              <a href="/get-started" className="button button--secondary">
                Get protected
              </a>
              <div className="presence-chip presence-chip--accent topbar__status">
                <span className="presence-chip__dot" />
                <span>Live demo mode</span>
              </div>
            </>
          )}
        </div>
      </header>

      <div className={`layout-grid${isStandaloneGuestView ? ' layout-grid--guest' : ''}`}>
        {isLoggedIn && !isStandaloneGuestView ? (
          <>
            <button
              type="button"
              className={`sidebar-scrim${sidebarOpen ? ' sidebar-scrim--visible' : ''}`}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            />
            <aside className={`sidebar glass-panel${sidebarOpen ? ' sidebar--open' : ''}`}>
              <div className="sidebar__summary">
                <p className="eyebrow">Control room</p>
                <h2>{currentView?.label || 'Coverage'}</h2>
                <p>
                  Track coverage, submit disruption claims, and review outcomes from one calm, readable
                  workspace.
                </p>
              </div>

              <nav className="sidebar__nav" aria-label="Primary">
                {navItems.map(({ to, label, icon: Icon, exact }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="sidebar__footnote">
                <span className="status-pill">Coverage active</span>
                <p>
                  Open the drawer when you need navigation, then let the active screen take the full
                  width again.
                </p>
              </div>
            </aside>
          </>
        ) : null}

        <main className={`page-frame${isStandaloneGuestView ? ' page-frame--guest' : ''}`}>
          <Routes>
            <Route path="/" element={<LandingRoute />} />
            <Route
              path="/get-started"
              element={
                <PublicOnlyRoute>
                  <SignUp />
                </PublicOnlyRoute>
              }
            />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route
              path="/sign-in"
              element={
                <PublicOnlyRoute>
                  <SignIn />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/claim"
              element={
                <ProtectedRoute>
                  <ClaimSubmit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/history"
              element={
                <ProtectedRoute>
                  <ClaimHistory />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.title = 'Insora';
  }, []);

  return (
    <WorkerProvider>
      <Router>
        <AppShell />
      </Router>
    </WorkerProvider>
  );
}
