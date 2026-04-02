import React from 'react';
import {
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  MapPinned,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import '../styles/landing-page.css';

/* ── Static data – unchanged from original ─────────────── */

const highlights = [
  {
    title: 'Weekly cover, not paperwork',
    copy: 'Start a rider policy in minutes with city-based pricing and a payout route already attached.',
    icon: ShieldCheck,
  },
  {
    title: 'Proof captured on the spot',
    copy: 'Submit order ID, disruption type, and live location from a phone-first claim screen.',
    icon: MapPinned,
  },
  {
    title: 'Fast outcomes',
    copy: 'See whether a claim is approved, sent for auto recheck, or routed for manual review.',
    icon: BadgeIndianRupee,
  },
];

/* ── Stat data for the hero sidebar ────────────────────── */

const heroStats = [
  { label: 'Cities supported', value: '7', icon: Building2 },
  { label: 'Claim inputs',     value: '4', icon: MapPinned },
  { label: 'Platform',         value: 'Mobile-first', icon: Waypoints },
];

/* ── Component ─────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="page-stack">

      {/* ═══ Hero Section ════════════════════════════════ */}
      <section className="lp-hero">

        {/* Left: copy */}
        <div className="lp-hero__copy">
          <p className="lp-eyebrow">
            <span className="lp-eyebrow__dot" aria-hidden="true" />
            Income protection for delivery workers
          </p>

          <h2 className="lp-title">
            A calm, modern safety net for orders blocked by{' '}
            <mark>rain, heat, strikes,</mark> and road closures.
          </h2>

          <p className="lp-subtext">
            GigShield is designed for riders who need a clear screen, a short
            flow, and trustworthy claim status on a phone. No cluttered
            dashboard before you even get started.
          </p>

          <div className="lp-hero__actions">
            <a href="/get-started" className="button button--secondary" id="lp-start-coverage">
              Start coverage
              <ArrowRight size={16} />
            </a>
            <a href="/admin" className="button button--ghost" id="lp-ops-demo">
              Open ops demo
            </a>
          </div>

          <div className="lp-pill-row">
            <span className="lp-tag">
              <Waypoints size={13} />
              Built for phone screens
            </span>
            <span className="lp-tag">
              <ShieldCheck size={13} />
              Weekly parametric cover
            </span>
            <span className="lp-tag">
              <BadgeIndianRupee size={13} />
              UPI-ready payouts
            </span>
          </div>
        </div>

        {/* Right: stat cards */}
        <div className="lp-hero__stats">
          {heroStats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="lp-stat">
              <div className="lp-stat__icon" aria-hidden="true">
                <Icon size={18} />
              </div>
              <div>
                <span className="lp-stat__label">{label}</span>
                <strong className="lp-stat__value">{value}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Divider ════════════════════════════════════ */}
      <div className="lp-divider" role="separator">Key capabilities</div>

      {/* ═══ Feature Grid ════════════════════════════════ */}
      <section className="lp-grid" aria-label="Feature highlights">
        {highlights.map(({ title, copy, icon: Icon }) => (
          <article key={title} className="lp-panel">
            <div className="lp-panel__icon-wrap" aria-hidden="true">
              <Icon size={20} />
            </div>
            <div>
              <h3 className="lp-panel__title">{title}</h3>
              <p className="lp-panel__copy">{copy}</p>
            </div>
          </article>
        ))}
      </section>

      {/* ═══ CTA Banner ═══════════════════════════════════ */}
      <section className="lp-cta" aria-label="Call to action">
        <div>
          <p className="lp-cta__badge">
            <ShieldCheck size={11} />
            Rider-first experience
          </p>
          <h3 className="lp-cta__title">Each section becomes its own screen.</h3>
          <p className="lp-cta__copy">
            On smaller devices, navigation stays tucked away in a smooth side
            drawer. Open it when you need it, choose where you want to go, and
            it retracts so the content gets the full screen again.
          </p>
        </div>
        <a href="/get-started" className="button button--secondary" id="lp-continue-onboarding">
          Continue to onboarding
          <ArrowRight size={16} />
        </a>
      </section>

    </div>
  );
}
