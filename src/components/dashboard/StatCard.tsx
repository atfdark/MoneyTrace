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

const iconBgClasses: Record<string, string> = {
  secondary: 'bg-blue-50 text-blue-600',
  error: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  success: 'bg-green-50 text-green-600',
  primary: 'bg-blue-50 text-blue-600',
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
      <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse shadow-card">
        <div className="h-3 w-1/3 bg-gray-100 rounded mb-4"></div>
        <div className="h-7 w-1/2 bg-gray-100 rounded mb-2"></div>
        <div className="h-3 w-2/3 bg-gray-100 rounded"></div>
      </div>
    );
  }

  const formattedValue = formatValue(value, format);
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-card-hover transition-shadow duration-200 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-[22px] font-bold text-gray-900 mt-1 tabular-nums leading-tight">
            {formattedValue}
          </p>
          {change !== undefined && changeLabel && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`text-[12px] font-semibold ${
                  isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-400'
                }`}
              >
                {isPositive ? '↑' : isNegative ? '↓' : '→'} {Math.abs(change || 0).toFixed(1)}%
              </span>
              <span className="text-[11px] text-gray-400">{changeLabel}</span>
            </div>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClasses[color]}`}
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;