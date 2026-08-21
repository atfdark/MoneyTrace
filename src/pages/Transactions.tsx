import React from 'react';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { useTransactions } from '../hooks/useTransactions';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Transactions: React.FC = () => {
  const { data, isLoading, error, refetch } = useTransactions({});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Monitor and analyze all transaction activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button className="px-4 py-2 bg-blue-600 text-gray-900 rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">New Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Transactions</p>
          <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
            {(data as any)?.total?.toLocaleString() || '—'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Volume</p>
          <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
            {(data as any)?.total_volume ? `₹${((data as any).total_volume / 1e6).toFixed(1)}M` : '—'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Flagged</p>
          <p className="text-xl font-bold text-red-600 mt-1 tabular-nums">
            {(data as any)?.flagged_count || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Avg Risk Score</p>
          <p className="text-xl font-bold text-amber-600 mt-1 tabular-nums">
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
          console.log('Transaction clicked:', tx);
        }}
      />

      {error && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-card">
          <span className="material-symbols-outlined text-red-400 text-[48px] block mb-2">error</span>
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Failed to load transactions</h3>
          <p className="text-[13px] text-gray-500 mb-4">{(error as any)?.message || String(error)}</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-gray-900 rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Transactions;