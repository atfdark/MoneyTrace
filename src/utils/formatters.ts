// Currency formatting
export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    notation: value >= 1e6 || value <= -1e6 ? 'compact' : 'standard',
  }).format(value);
};

// Number formatting
export const formatNumber = (
  value: number,
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions
): string => {
  if (value === null || value === undefined || isNaN(value)) return '0';

  return new Intl.NumberFormat(locale, {
    notation: value >= 1e6 || value <= -1e6 ? 'compact' : 'standard',
    ...options,
  }).format(value);
};

// Percentage formatting
export const formatPercent = (
  value: number,
  locale: string = 'en-US',
  decimals: number = 1
): string => {
  if (value === null || value === undefined || isNaN(value)) return '0%';

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

// Date formatting
export const formatDate = (
  date: string | Date,
  format: 'short' | 'long' | 'relative' | 'time' | 'MMM d' = 'short',
  locale: string = 'en-US'
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid date';

  if (format === 'relative') {
    return formatRelativeTime(d);
  }

  if (format === 'time') {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  if (format === 'MMM d') {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
    }).format(d);
  }

  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' };

  return new Intl.DateTimeFormat(locale, options).format(d);
};

// Relative time formatting (e.g., "2 hours ago")
export const formatRelativeTime = (date: Date, locale: string = 'en-US'): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffSecs < 60) return rtf.format(-diffSecs, 'second');
  if (diffMins < 60) return rtf.format(-diffMins, 'minute');
  if (diffHours < 24) return rtf.format(-diffHours, 'hour');
  if (diffDays < 7) return rtf.format(-diffDays, 'day');
  if (diffWeeks < 4) return rtf.format(-diffWeeks, 'week');
  if (diffMonths < 12) return rtf.format(-diffMonths, 'month');
  return rtf.format(-diffYears, 'year');
};

// Address formatting (truncate with ellipsis)
export const formatAddress = (
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

// Transaction hash formatting
export const formatTxHash = (hash: string, chars: number = 10): string => {
  if (!hash) return '';
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
};

// File size formatting
export const formatFileSize = (bytes: number, locale: string = 'en-US'): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(bytes / Math.pow(k, i)) + ' ' + sizes[i];
};

// Duration formatting (milliseconds to human readable)
export const formatDuration = (ms: number, locale: string = 'en-US'): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  return `${Math.floor(ms / 86400000)}d ${Math.floor((ms % 86400000) / 3600000)}h`;
};

// Risk score formatting
export const formatRiskScore = (score: number): { label: string; color: string } => {
  if (score >= 80) return { label: 'Critical', color: 'error' };
  if (score >= 60) return { label: 'High', color: 'warning' };
  if (score >= 40) return { label: 'Medium', color: 'secondary' };
  if (score >= 20) return { label: 'Low', color: 'success' };
  return { label: 'Minimal', color: 'outline' };
};

// Phone number formatting
export const formatPhoneNumber = (phone: string, locale: string = 'en-US'): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return new Intl.NumberFormat(locale).format(
      parseInt(cleaned.slice(0, 3))
    ) + '-' +
    new Intl.NumberFormat(locale).format(
      parseInt(cleaned.slice(3, 6))
    ) + '-' +
    cleaned.slice(6);
  }
  return phone;
};