import React, { useMemo } from 'react';
import { useTransactions, useTransactionFilters } from '../../hooks/useTransactions';
import { formatCurrency, formatDate, formatAddress, formatTxHash } from '../../utils/formatters';
import { LoadingSpinner, TableRowSkeleton } from '../common/LoadingSpinner';
import { Pagination } from '../common/Pagination';

interface TransactionTableProps {
  initialFilters?: Record<string, any>;
  pageSize?: number;
  showFilters?: boolean;
  onRowClick?: (transaction: any) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  initialFilters = {},
  pageSize = 20,
  showFilters = true,
  onRowClick,
}) => {
  const { data, isLoading, error, refetch } = useTransactions({
    ...initialFilters,
    limit: pageSize,
  });
  const { filters, setFilters, clearFilters, hasActiveFilters } = useTransactionFilters();

  // Merge initial filters with hook filters
  const mergedFilters = useMemo(
    () => ({ ...initialFilters, ...filters }),
    [initialFilters, filters]
  );

  const columns = [
    { key: 'hash', header: 'Hash', width: '140px' },
    { key: 'amount', header: 'Amount', width: '140px', align: 'right' },
    { key: 'from_address', header: 'From', width: '200px' },
    { key: 'to_address', header: 'To', width: '200px' },
    { key: 'status', header: 'Status', width: '120px' },
    { key: 'risk_score', header: 'Risk', width: '100px', align: 'center' },
    { key: 'timestamp', header: 'Time', width: '140px' },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { class: string; label: string }> = {
      confirmed: { class: 'bg-green-50 text-green-700 border border-green-200', label: 'Confirmed' },
      completed: { class: 'bg-green-50 text-green-700 border border-green-200', label: 'Completed' },
      pending: { class: 'bg-amber-50 text-amber-700 border border-amber-200', label: 'Pending' },
      failed: { class: 'bg-red-50 text-red-700 border border-red-200', label: 'Failed' },
      flagged: { class: 'bg-red-50 text-red-700 border border-red-200', label: 'Flagged' },
    };
    const config = statusConfig[status] || { class: 'bg-gray-50 text-gray-700 border border-gray-200', label: status };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const getRiskBadge = (score: number) => {
    let color = 'bg-green-500';
    let textColor = 'text-green-700';
    let label = 'Low';
    if (score >= 80) {
      color = 'bg-red-500';
      textColor = 'text-red-700';
      label = 'Critical';
    } else if (score >= 60) {
      color = 'bg-amber-500';
      textColor = 'text-amber-700';
      label = 'High';
    } else if (score >= 40) {
      color = 'bg-blue-500';
      textColor = 'text-blue-700';
      label = 'Medium';
    }
    return (
      <div className="flex items-center justify-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className={`text-[12px] font-medium ${textColor}`}>{label}</span>
      </div>
    );
  };

  const renderCell = (tx: any, column: typeof columns[0]) => {
    switch (column.key) {
      case 'hash':
        return (
          <span className="font-mono text-[12px] text-gray-500" title={tx.hash}>
            {formatTxHash(tx.hash, 8)}
          </span>
        );
      case 'amount':
        return (
          <span className="text-[13px] text-gray-900 tabular-nums font-semibold">
            {formatCurrency(tx.amount, tx.currency)}
          </span>
        );
      case 'from_address':
        return (
          <span className="font-mono text-[12px] text-gray-500 truncate block max-w-[180px]" title={tx.from_address}>
            {formatAddress(tx.from_address)}
          </span>
        );
      case 'to_address':
        return (
          <span className="font-mono text-[12px] text-gray-500 truncate block max-w-[180px]" title={tx.to_address}>
            {formatAddress(tx.to_address)}
          </span>
        );
      case 'status':
        return getStatusBadge(tx.status);
      case 'risk_score':
        return getRiskBadge(tx.risk_score || 0);
      case 'timestamp':
        return (
          <span className="text-[12px] text-gray-400 whitespace-nowrap">
            {formatDate(tx.timestamp, 'short')}
          </span>
        );
      default:
        return tx[column.key];
    }
  };

  const handleSort = (key: string) => {
    // Sorting would be handled by the API
    console.log('Sort by:', key);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-card">
      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Search</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search by hash, address, amount..."
                  value={mergedFilters.search || ''}
                  onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
                  className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-gray-900 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
              <select
                value={mergedFilters.status || ''}
                onChange={(e) => setFilters({ status: e.target.value || undefined, page: 1 })}
                className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-900 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>

            <div className="min-w-[150px]">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Risk Level</label>
              <select
                value={mergedFilters.risk_level || ''}
                onChange={(e) => setFilters({ risk_level: e.target.value || undefined, page: 1 })}
                className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-900 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">All Levels</option>
                <option value="critical">Critical (80+)</option>
                <option value="high">High (60-79)</option>
                <option value="medium">Medium (40-59)</option>
                <option value="low">Low (&lt;40)</option>
              </select>
            </div>

            <div className="min-w-[180px]">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={mergedFilters.date_from || ''}
                  onChange={(e) => setFilters({ date_from: e.target.value || undefined, page: 1 })}
                  className="flex-1 bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-900 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <input
                  type="date"
                  value={mergedFilters.date_to || ''}
                  onChange={(e) => setFilters({ date_to: e.target.value || undefined, page: 1 })}
                  className="flex-1 bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-900 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 text-[12px] font-semibold transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left text-gray-500">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-4 text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors ${col.align ? `text-${col.align}` : ''}`}
                  style={{ width: col.width }}
                  onClick={() => handleSort(col.key)}
                  aria-sort="none"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={columns.length} />)
            ) : ((data as any)?.transactions || (data as any)?.data?.transactions || []).length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-gray-400">
                  <span className="material-symbols-outlined text-gray-300 text-[48px] block mb-2">receipt_long</span>
                  No transactions found
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-2 text-blue-600 hover:text-blue-800 font-medium block mx-auto"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              ((data as any)?.transactions || (data as any)?.data?.transactions || []).map((tx: any) => (
                <tr
                  key={tx.id}
                  className="border-t border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onRowClick?.(tx)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`p-4 ${col.align ? `text-${col.align}` : ''}`}>
                      {renderCell(tx, col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && !isLoading && (
        <Pagination
          currentPage={(data as any)?.page || (data as any)?.data?.page || 1}
          totalPages={(data as any)?.total_pages || (data as any)?.data?.total_pages || 1}
          totalItems={(data as any)?.total || (data as any)?.data?.total || 0}
          pageSize={(data as any)?.page_size || (data as any)?.data?.page_size || 25}
          onPageChange={(page) => setFilters({ page })}
          onPageSizeChange={(size) => setFilters({ page: 1, limit: size })}
        />
      )}

      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200 text-red-700 text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          Failed to load transactions.{' '}
          <button onClick={() => refetch()} className="underline hover:no-underline font-medium">
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;