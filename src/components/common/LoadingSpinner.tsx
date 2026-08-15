import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        className={`${sizeClasses[size]} border-secondary-container border-t-transparent rounded-full animate-spin`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Full page loading overlay
export const LoadingOverlay: React.FC<{ isLoading: boolean; message?: string }> = ({
  isLoading,
  message = 'Loading...',
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel rounded-xl p-8 flex flex-col items-center gap-4 min-w-[200px]">
        <LoadingSpinner size="lg" />
        <p className="font-body-md text-on-surface-variant">{message}</p>
      </div>
    </div>
  );
};

// Skeleton loader for cards
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`glass-panel rounded-xl p-card-padding animate-pulse ${className}`}>
      <div className="h-4 w-1/4 bg-surface-container-high rounded mb-4"></div>
      <div className="h-8 w-1/2 bg-surface-container-high rounded mb-2"></div>
      <div className="h-4 w-3/4 bg-surface-container-high rounded"></div>
    </div>
  );
};

// Skeleton for table rows
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 w-full bg-surface-container-high rounded animate-pulse"></div>
        </td>
      ))}
    </tr>
  );
};

// Skeleton for stat cards
export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel rounded-xl p-card-padding animate-pulse">
      <div className="h-3 w-1/3 bg-surface-container-high rounded mb-4"></div>
      <div className="h-8 w-1/2 bg-surface-container-high rounded mb-2"></div>
      <div className="h-3 w-2/3 bg-surface-container-high rounded"></div>
    </div>
  );
};