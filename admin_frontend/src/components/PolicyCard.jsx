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
    <div className="p-card">
      <div className="p-section-heading">
        <div>
          <p className="p-eyebrow">
            <span style={{ fontSize: 10 }}>●</span> Current policy
          </p>
          <h3 className="p-title p-title--section">
            {tier.label}
          </h3>
        </div>
        <span className={`p-tag ${isActive ? 'p-tag--success' : 'p-tag--brand'}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          <ShieldCheck size={14} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="p-stats-grid" style={{ marginTop: 20 }}>
        <div className="p-metric">
          <p className="p-metric__label">Weekly premium</p>
          <div className="p-metric__value" style={{ marginTop: 4 }}>{formatRupees(policy.premiumAmount)}</div>
          <p className="p-metric__caption">{tier.price}</p>
        </div>
        <div className="p-metric">
          <p className="p-metric__label">Coverage window</p>
          <div className="p-metric__value" style={{ fontSize: '1.35rem', marginTop: 4 }}>
            <CalendarDays size={18} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
            {formatDate(policy.weekStart, { day: 'numeric', month: 'short' })}
          </div>
          <p className="p-metric__caption">
            Ends {formatDate(policy.weekEnd, { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="p-metric">
          <p className="p-metric__label">Risk score</p>
          <div className="p-metric__value" style={{ marginTop: 4 }}>
            {typeof policy.riskScore === 'number' ? policy.riskScore.toFixed(2) : '0.50'}
          </div>
          <p className="p-metric__caption">Used to price weekly coverage</p>
        </div>
      </div>
    </div>
  );
}
