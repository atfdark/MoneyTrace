import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatCurrency, formatAddress } from '../../utils/formatters';

interface AlertCardProps {
  alert: any;
  variant?: 'default' | 'compact' | 'detailed';
  onClick?: () => void;
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onInvestigate?: (id: string) => void;
}

const severityConfig = {
  critical: { bg: 'bg-error-container/20', border: 'border-error/30', text: 'text-red-600', iconColor: 'text-red-600', badge: 'bg-error-container text-on-error-container' },
  high: { bg: 'bg-warning-container/20', border: 'border-warning/30', text: 'text-amber-600', iconColor: 'text-amber-600', badge: 'bg-warning-container text-on-warning-container' },
  medium: { bg: 'bg-blue-600/20', border: 'border-secondary/30', text: 'text-blue-600', iconColor: 'text-blue-600', badge: 'bg-blue-600 text-white' },
  low: { bg: 'bg-success-container/20', border: 'border-success/30', text: 'text-green-600', iconColor: 'text-green-600', badge: 'bg-success-container text-on-success-container' },
};

const typeIcons: Record<string, string> = {
  structuring: 'account_tree',
  layering: 'layers',
  smurfing: 'group',
  round_tripping: 'sync',
  velocity: 'speed',
  sanction: 'gavel',
  pep: 'person_pin',
  mixer: 'blur_on',
  darknet: 'dark_mode',
  unusual_pattern: 'psychology',
  large_transfer: 'arrow_upward',
  new_entity: 'person_add',
  geographic_risk: 'public',
};

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  variant = 'default',
  onClick,
  onAcknowledge,
  onDismiss,
  onInvestigate,
}) => {
  const severity = alert.severity?.toLowerCase() || 'medium';
  const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.medium;
  const typeIcon = typeIcons[alert.alert_type] || 'warning';

  if (variant === 'compact') {
    return (
      <Link
        to={`/alerts/${alert.id}`}
        className={`flex items-center gap-3 p-3 rounded-xl ${config.bg} ${config.border} border hover:shadow-sm transition-all duration-200`}
        onClick={(e) => { e.preventDefault(); onClick?.(); }}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconColor}`}>
          <span className="material-symbols-outlined text-[20px]">{typeIcon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-gray-900 truncate">{alert.title}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${config.badge}`}>{severity}</span>
            <span className="text-[11px] text-gray-500">
              {formatDate(alert.created_at, 'relative')}
            </span>
            {alert.amount && (
              <span className="text-[11px] text-gray-900 font-medium">
                {formatCurrency(alert.amount)}
              </span>
            )}
          </div>
        </div>
        <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
      </Link>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-card p-6 ${config.border} border`}>
        <div className="flex gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${config.iconColor}`}>
            <span className="material-symbols-outlined text-[28px]">{typeIcon}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[15px] font-semibold text-gray-900">{alert.title}</h3>
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${config.badge}`}>{severity}</span>
                  {alert.case_id && (
                    <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                      Case: {alert.case_id}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-gray-500 mt-2">{alert.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[11px] text-gray-500">
                  {formatDate(alert.created_at, 'long')}
                </span>
                {alert.amount && (
                  <span className="font-headline-sm text-headline-sm text-gray-900 font-medium">
                    {formatCurrency(alert.amount)}
                  </span>
                )}
              </div>
            </div>

            {/* Alert Details */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {alert.from_address && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">From</p>
                  <p className="font-mono text-body-sm text-gray-900 truncate" title={alert.from_address}>
                    {formatAddress(alert.from_address)}
                  </p>
                </div>
              )}
              {alert.to_address && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">To</p>
                  <p className="font-mono text-body-sm text-gray-900 truncate" title={alert.to_address}>
                    {formatAddress(alert.to_address)}
                  </p>
                </div>
              )}
              {alert.risk_score !== undefined && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Risk Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-success to-error rounded-full transition-all duration-300"
                        style={{ width: `${alert.risk_score}%` }}
                      />
                    </div>
                    <span className="text-[13px] font-medium text-gray-900 w-12 text-right">
                      {alert.risk_score}%
                    </span>
                  </div>
                </div>
              )}
              {alert.transaction_hash && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tx Hash</p>
                  <p className="font-mono text-body-sm text-gray-900 truncate" title={alert.transaction_hash}>
                    {formatAddress(alert.transaction_hash, 12, 8)}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              {onAcknowledge && !alert.acknowledged && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 shadow-card border border-gray-200 rounded-lg text-[13px] text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Acknowledge
                </button>
              )}
              {onInvestigate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onInvestigate(alert.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[13px] font-medium hover:bg-blue-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">search</span>
                  Investigate
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 shadow-card border border-gray-200 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">dismiss</span>
                  Dismiss
                </button>
              )}
              <Link
                to={`/alerts/${alert.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 shadow-card border border-gray-200 rounded-lg text-[13px] text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
                Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <Link
      to={`/alerts/${alert.id}`}
      className={`block bg-white border border-gray-200 rounded-xl shadow-card p-4 ${config.border} border hover:shadow-lg transition-all duration-200`}
      onClick={(e) => { onClick?.(); }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.iconColor}`}>
          <span className="material-symbols-outlined text-[22px]">{typeIcon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-headline-sm text-headline-sm text-gray-900 truncate">{alert.title}</h3>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${config.badge} flex-shrink-0`}>{severity}</span>
          </div>
          <p className="text-[13px] text-gray-500 mt-1 line-clamp-2">{alert.description}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {alert.amount && (
              <span className="text-[13px] text-gray-900 font-medium">
                {formatCurrency(alert.amount)}
              </span>
            )}
            {alert.risk_score !== undefined && (
              <span className="text-[11px] text-gray-500">
                Risk: {alert.risk_score}%
              </span>
            )}
            <span className="text-[11px] text-gray-500">
              {formatDate(alert.created_at, 'relative')}
            </span>
            {alert.case_id && (
              <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                Case: {alert.case_id}
              </span>
            )}
          </div>
        </div>
        <span className="material-symbols-outlined text-outline-variant flex-shrink-0">chevron_right</span>
      </div>
    </Link>
  );
};

export default AlertCard;