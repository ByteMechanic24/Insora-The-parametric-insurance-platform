import React from 'react';
import {
  ArrowRight,
  BadgeIndianRupee,
  MapPinned,
  ShieldCheck,
  Waypoints,
  Bike,
  CloudRain,
  CheckCircle2,
  Clock3,
  Star,
  Zap,
} from 'lucide-react';
import '../styles/landing.css';

const highlights = [
  {
    title: 'Weekly cover, not paperwork',
    copy: 'Start a rider policy in minutes with city-based pricing and a payout route already attached.',
    icon: ShieldCheck,
    accent: '#0e7c86',
    bg: 'rgba(14,124,134,0.08)',
  },
  {
    title: 'Proof captured on the spot',
    copy: 'Submit order ID, disruption type, and live location from a phone-first claim screen.',
    icon: MapPinned,
    accent: '#ff8e3c',
    bg: 'rgba(255,142,60,0.08)',
  },
  {
    title: 'Fast outcomes',
    copy: 'See whether a claim is approved, sent for auto recheck, or routed for manual review.',
    icon: BadgeIndianRupee,
    accent: '#178062',
    bg: 'rgba(23,128,98,0.08)',
  },
];

const stats = [
  { value: '7', label: 'Cities active', icon: MapPinned },
  { value: '4', label: 'Claim inputs', icon: CheckCircle2 },
  { value: '₹0', label: 'Hidden fees', icon: BadgeIndianRupee },
  { value: '24h', label: 'Avg. resolution', icon: Clock3 },
];

const steps = [
  {
    num: '01',
    title: 'Pick your city & week',
    copy: 'Choose your delivery zone and activate weekly parametric protection in under 3 minutes.',
    icon: MapPinned,
  },
  {
    num: '02',
    title: 'Ride through disruptions',
    copy: 'Rain, heat, air quality alerts, road closures — keep delivering. We track the conditions.',
    icon: CloudRain,
  },
  {
    num: '03',
    title: 'Claim with 4 taps',
    copy: 'Open the app, add your order ID, pick the disruption type, and confirm your live location.',
    icon: Zap,
  },
  {
    num: '04',
    title: 'Get paid to your UPI',
    copy: 'Approval goes straight to your UPI ID — no branch visits, no long queues, no wait.',
    icon: BadgeIndianRupee,
  },
];

export default function LandingPage() {
  return (
    <div className="page-stack">

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__inner">
          <div>
            <div className="lp-hero__badge">
              <Bike size={13} />
              Income protection for delivery workers
            </div>

            <h2 className="lp-hero__title">
              Your earnings, protected from <span>rain, road blocks &amp; more</span>
            </h2>

            <p className="lp-hero__sub">
              Insora is built for riders on Swiggy, Zomato, and beyond. Activate weekly cover in minutes — no paperwork, no agent, straight to your phone.
            </p>

            <div className="lp-hero__actions">
              <a href="/get-started" className="button button--primary">
                Start coverage
                <ArrowRight size={16} />
              </a>
              <a href="/sign-in" className="button button--ghost">
                Sign in
              </a>
            </div>

            <div className="lp-hero__tags">
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

          <div className="lp-hero__visual">
            <div className="lp-stat-card">
              <div className="lp-stat-card__label">
                <MapPinned size={13} />
                Cities active
              </div>
              <div className="lp-stat-card__value">7</div>
            </div>
            <div className="lp-stat-card">
              <div className="lp-stat-card__label">
                <CheckCircle2 size={13} />
                Claim inputs
              </div>
              <div className="lp-stat-card__value">4</div>
            </div>
            <div className="lp-stat-card">
              <div className="lp-stat-card__label">
                <Bike size={13} />
                Built for
              </div>
              <div className="lp-stat-card__value" style={{ fontSize: '1.1rem', lineHeight: 1.3 }}>
                mobile-first riders
              </div>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="lp-trust" style={{ marginTop: 28, position: 'relative', zIndex: 1 }}>
          <span className="lp-trust__item">
            <ShieldCheck size={14} />
            Parametric model — no claims adjuster
          </span>
          <span className="lp-trust__dot" />
          <span className="lp-trust__item">
            <BadgeIndianRupee size={14} />
            Direct UPI payout
          </span>
          <span className="lp-trust__dot" />
          <span className="lp-trust__item">
            <Clock3 size={14} />
            Avg. 24-hour resolution
          </span>
        </div>
      </section>

      {/* ── STATS ROW ─────────────────────────────────── */}
      <div className="lp-stats-grid">
        {stats.map(({ value, label, icon: Icon }) => (
          <div className="lp-metric" key={label}>
            <div className="lp-metric__icon">
              <Icon size={20} />
            </div>
            <div className="lp-metric__value">{value}</div>
            <div className="lp-metric__label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURE CARDS ─────────────────────────────── */}
      <section>
        <div style={{ marginBottom: 20 }}>
          <p className="eyebrow">Why Insora</p>
          <h3 className="page-title" style={{ fontSize: 'clamp(1.6rem, 2.2vw, 2.4rem)', marginBottom: 4 }}>
            Designed for life on the road
          </h3>
        </div>
        <div className="lp-features">
          {highlights.map(({ title, copy, icon: Icon, accent, bg }) => (
            <article className="lp-feature" key={title}>
              <div className="lp-feature__icon" style={{ background: bg, color: accent }}>
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────── */}
      <section className="lp-steps">
        <div className="lp-steps__header">
          <p className="eyebrow">How it works</p>
          <h3 className="page-title" style={{ fontSize: 'clamp(1.6rem, 2.2vw, 2.4rem)', marginBottom: 6 }}>
            4 steps from disruption to payout
          </h3>
          <p style={{ margin: 0, color: '#61708a', lineHeight: 1.6 }}>
            No branches. No human middlemen. Just a calm phone flow.
          </p>
        </div>

        <div className="lp-steps__grid">
          {steps.map(({ num, title, copy, icon: Icon }) => (
            <div className="lp-step" key={num}>
              <div>
                <div className="lp-step__num">{num}</div>
                <div className="lp-step__bubble">
                  <Icon size={22} />
                </div>
              </div>
              <h4>{title}</h4>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="lp-cta">
        <div>
          <p className="eyebrow">How it feels on a phone</p>
          <h3 className="page-title" style={{ fontSize: 'clamp(1.5rem, 2vw, 2.2rem)', marginBottom: 10 }}>
            Each section becomes its own screen.
          </h3>
          <p className="card-copy" style={{ maxWidth: 520 }}>
            On smaller devices, navigation stays tucked in a smooth side drawer. Open it when you need it, choose where to go, and it retracts so the content gets the full screen again.
          </p>
          <div className="lp-cta__rating">
            <div className="lp-cta__stars">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            Trusted by riders across 7 cities
          </div>
        </div>

        <div className="lp-cta__actions">
          <a href="/get-started" className="button button--secondary">
            Continue to onboarding
            <ArrowRight size={16} />
          </a>
          <a href="/sign-in" className="button button--ghost">
            Already have an account
          </a>
          <p className="lp-ghost-note">Free to start · No credit card</p>
        </div>
      </section>

    </div>
  );
}
