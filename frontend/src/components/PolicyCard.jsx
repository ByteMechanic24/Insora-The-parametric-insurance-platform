import React from 'react';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { formatDate, formatRupees, formatTier } from '../utils/formatting';

export default function PolicyCard({ policy }) {
  if (!policy) {
    return null;
  }

  const tier = formatTier(policy.tier);
  const isActive = policy.status === 'active';

  return (
    <div className="app-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Current policy</p>
          <h3 className="page-title" style={{ fontSize: '2rem' }}>
            {tier.label}
          </h3>
        </div>
        <span className={`status-chip ${isActive ? 'status-chip--active' : 'status-chip--muted'}`}>
          <ShieldCheck size={14} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="app-stats-grid" style={{ marginTop: 20 }}>
        <div className="app-metric">
          <p className="app-metric__label">Weekly premium</p>
          <div className="app-metric__value">{formatRupees(policy.premiumAmount)}</div>
          <p className="app-metric__caption">{tier.price}</p>
        </div>
        <div className="app-metric">
          <p className="app-metric__label">Coverage window</p>
          <div className="app-metric__value" style={{ fontSize: '1.35rem' }}>
            <CalendarDays size={18} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
            {formatDate(policy.weekStart, { day: 'numeric', month: 'short' })}
          </div>
          <p className="app-metric__caption">
            Ends {formatDate(policy.weekEnd, { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="app-metric">
          <p className="app-metric__label">Risk score</p>
          <div className="app-metric__value">
            {typeof policy.riskScore === 'number' ? policy.riskScore.toFixed(2) : '0.50'}
          </div>
          <p className="app-metric__caption">Used to price weekly coverage</p>
        </div>
      </div>
    </div>
  );
}
