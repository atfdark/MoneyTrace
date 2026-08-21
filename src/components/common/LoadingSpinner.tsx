import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-[2.5px]',
  lg: 'w-12 h-12 border-[3px]',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-blue-200 border-t-blue-600 rounded-full animate-spin`}
      />
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
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 min-w-[200px] shadow-elevated border border-gray-200">
        <LoadingSpinner size="lg" />
        <p className="text-[13px] text-gray-500">{message}</p>
      </div>
    </div>
  );
};

// Skeleton loader for cards
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 animate-pulse ${className}`}>
      <div className="h-4 w-1/4 bg-gray-100 rounded mb-4"></div>
      <div className="h-8 w-1/2 bg-gray-100 rounded mb-2"></div>
      <div className="h-4 w-3/4 bg-gray-100 rounded"></div>
    </div>
  );
};

// Skeleton for table rows
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse"></div>
        </td>
      ))}
    </tr>
  );
};

// Skeleton for stat cards
export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
      <div className="h-3 w-1/3 bg-gray-100 rounded mb-4"></div>
      <div className="h-8 w-1/2 bg-gray-100 rounded mb-2"></div>
      <div className="h-3 w-2/3 bg-gray-100 rounded"></div>
    </div>
  );
};