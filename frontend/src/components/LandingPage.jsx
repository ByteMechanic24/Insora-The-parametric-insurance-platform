import React from 'react';
import { ArrowRight, BadgeIndianRupee, MapPinned, ShieldCheck, Waypoints } from 'lucide-react';

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

export default function LandingPage() {
  return (
    <div className="page-stack">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="eyebrow">Income protection for delivery workers</p>
          <h2 className="page-title" style={{ maxWidth: 720 }}>
            A calm, modern safety net for orders blocked by rain, heat, air quality, strikes, and road closures.
          </h2>
          <p className="landing-hero__text">
            Insora is designed for riders who need a clear screen, a short flow, and trustworthy claim status on a phone. No cluttered dashboard before you even get started.
          </p>

          <div className="landing-hero__actions">
            <a href="/get-started" className="button button--primary">
              Start coverage
              <ArrowRight size={16} />
            </a>
            <a href="/sign-in" className="button button--ghost">
              Sign in
            </a>
          </div>

          <div className="pill-row" style={{ marginTop: 20 }}>
            <span className="tag landing-tag">
              <Waypoints size={14} />
              Built for phone screens
            </span>
            <span className="tag landing-tag">
              <ShieldCheck size={14} />
              Weekly parametric cover
            </span>
            <span className="tag landing-tag">
              <BadgeIndianRupee size={14} />
              UPI-ready payouts
            </span>
          </div>
        </div>

        <div className="landing-hero__card">
          <div className="landing-stat">
            <span className="landing-stat__label">Cities supported</span>
            <strong>7</strong>
          </div>
          <div className="landing-stat">
            <span className="landing-stat__label">Claim inputs</span>
            <strong>4</strong>
          </div>
          <div className="landing-stat">
            <span className="landing-stat__label">Built for</span>
            <strong>mobile-first riders</strong>
          </div>
        </div>
      </section>

      <section className="landing-grid">
        {highlights.map(({ title, copy, icon: Icon }) => (
          <article key={title} className="panel-card landing-panel">
            <div className="landing-panel__icon">
              <Icon size={18} />
            </div>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="panel-card landing-cta">
        <div>
          <p className="eyebrow">How it feels on a phone</p>
          <h3 className="page-title" style={{ fontSize: '2rem' }}>
            Each section becomes its own screen.
          </h3>
          <p className="card-copy">
            On smaller devices, navigation stays tucked away in a smooth side drawer. Open it when you need it, choose where you want to go, and it retracts so the content gets the full screen again.
          </p>
        </div>
        <a href="/get-started" className="button button--secondary">
          Continue to onboarding
          <ArrowRight size={16} />
        </a>
      </section>
    </div>
  );
}
