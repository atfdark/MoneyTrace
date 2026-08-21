import React from 'react';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { useTransactions } from '../hooks/useTransactions';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Transactions: React.FC = () => {
  const { data, isLoading, error, refetch } = useTransactions({});

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Transactions</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Monitor and analyze all transaction activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 glass-panel border border-outline-variant/50 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[18px] align-middle">filter_list</span>
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-body-sm text-body-sm font-medium hover:bg-secondary-container/80 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">New Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4">
          <p className="font-label-caps text-label-caps text-on-surface-variant">Total Transactions</p>
          <p className="font-headline-lg text-headline-lg text-on-surface mt-1 tabular-nums">
            {(data as any)?.total?.toLocaleString() || '—'}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="font-label-caps text-label-caps text-on-surface-variant">Total Volume</p>
          <p className="font-headline-lg text-headline-lg text-on-surface mt-1 tabular-nums">
            {(data as any)?.total_volume ? `₹${((data as any).total_volume / 1e6).toFixed(1)}M` : '—'}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="font-label-caps text-label-caps text-on-surface-variant">Flagged</p>
          <p className="font-headline-lg text-headline-lg text-error mt-1 tabular-nums">
            {(data as any)?.flagged_count || 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="font-label-caps text-label-caps text-on-surface-variant">Avg Risk Score</p>
          <p className="font-headline-lg text-headline-lg text-warning mt-1 tabular-nums">
            {(data as any)?.avg_risk_score || 0}%
          </p>
        </div>
      </div>

      {/* Transaction Table */}
      <TransactionTable
        initialFilters={{}}
        pageSize={25}
        showFilters={true}
        onRowClick={(tx) => {
          // Navigate to transaction detail
          console.log('Transaction clicked:', tx);
        }}
      />

      {error && (
        <div className="glass-panel rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-error text-[48px] block mb-2">error</span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Failed to load transactions</h3>
          <p className="font-body-md text-on-surface-variant mb-4">{(error as any)?.message || String(error)}</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-body-sm font-medium hover:bg-secondary-container/80 transition-colors">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Transactions;