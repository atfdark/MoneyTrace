import React from 'react';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';

interface StatCardProps {
  title: string;
  value: number | string;
  format: 'currency' | 'number' | 'percent';
  change?: number;
  changeLabel?: string;
  icon: string;
  color: 'secondary' | 'error' | 'warning' | 'success' | 'primary';
  isLoading?: boolean;
}

const formatValue = (value: number | string, format: 'currency' | 'number' | 'percent') => {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'number':
      return formatNumber(value);
    case 'percent':
      return formatPercent(value);
    default:
      return value.toString();
  }
};

const colorClasses = {
  secondary: 'bg-secondary-container text-on-secondary-container',
  error: 'bg-error-container text-on-error-container',
  warning: 'bg-warning-container text-on-warning-container',
  success: 'bg-success-container text-on-success-container',
  primary: 'bg-primary-container text-on-primary-container',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  format,
  change,
  changeLabel,
  icon,
  color = 'secondary',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="glass-panel rounded-xl p-6 animate-pulse">
        <div className="h-4 w-1/3 bg-surface-container-high rounded mb-4"></div>
        <div className="h-8 w-1/2 bg-surface-container-high rounded mb-2"></div>
        <div className="h-3 w-2/3 bg-surface-container-high rounded"></div>
      </div>
    );
  }

  const formattedValue = formatValue(value, format);
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="glass-panel rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-label-caps text-label-caps text-on-surface-variant">{title}</p>
          <p className="font-headline-lg text-headline-lg text-on-surface mt-1 tabular-nums">
            {formattedValue}
          </p>
          {change !== undefined && changeLabel && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`font-body-xs text-body-xs ${
                  isPositive ? 'text-success' : isNegative ? 'text-error' : 'text-on-surface-variant'
                }`}
              >
                {isPositive ? '↑' : isNegative ? '↓' : '→'} {Math.abs(change || 0).toFixed(1)}%
              </span>
              <span className="font-body-xs text-body-xs text-on-surface-variant">{changeLabel}</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}
        >
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;