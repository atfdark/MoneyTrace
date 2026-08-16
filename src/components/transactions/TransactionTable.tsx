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
      confirmed: { class: 'bg-success-container text-on-success-container', label: 'Confirmed' },
      pending: { class: 'bg-warning-container text-on-warning-container', label: 'Pending' },
      failed: { class: 'bg-error-container text-on-error-container', label: 'Failed' },
      flagged: { class: 'bg-error-container text-on-error-container', label: 'Flagged' },
    };
    const config = statusConfig[status] || { class: 'bg-surface-container-high text-on-surface', label: status };
    return (
      <span className={`px-2 py-0.5 rounded-full font-label-caps text-label-caps ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const getRiskBadge = (score: number) => {
    let color = 'success';
    let label = 'Low';
    if (score >= 80) {
      color = 'error';
      label = 'Critical';
    } else if (score >= 60) {
      color = 'warning';
      label = 'High';
    } else if (score >= 40) {
      color = 'secondary';
      label = 'Medium';
    }
    return (
      <div className="flex items-center justify-center gap-1">
        <span
          className={`w-2 h-2 rounded-full ${
            color === 'error' ? 'bg-error' : color === 'warning' ? 'bg-warning' : color === 'secondary' ? 'bg-secondary' : 'bg-success'
          }`}
        />
        <span className="font-body-xs text-body-xs font-medium">{label}</span>
      </div>
    );
  };

  const renderCell = (tx: any, column: typeof columns[0]) => {
    switch (column.key) {
      case 'hash':
        return (
          <span className="font-mono text-body-sm text-on-surface-variant" title={tx.hash}>
            {formatTxHash(tx.hash, 8)}
          </span>
        );
      case 'amount':
        return (
          <span className="font-body-md text-body-md text-on-surface tabular-nums font-medium">
            {formatCurrency(tx.amount, tx.currency)}
          </span>
        );
      case 'from_address':
        return (
          <span className="font-mono text-body-sm text-on-surface-variant truncate block max-w-[180px]" title={tx.from_address}>
            {formatAddress(tx.from_address)}
          </span>
        );
      case 'to_address':
        return (
          <span className="font-mono text-body-sm text-on-surface-variant truncate block max-w-[180px]" title={tx.to_address}>
            {formatAddress(tx.to_address)}
          </span>
        );
      case 'status':
        return getStatusBadge(tx.status);
      case 'risk_score':
        return getRiskBadge(tx.risk_score || 0);
      case 'timestamp':
        return (
          <span className="font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
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
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b border-outline-variant/20 bg-surface-container/30">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">Search</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
                <input
                  type="text"
                  placeholder="Search by hash, address, amount..."
                  value={mergedFilters.search || ''}
                  onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 pl-10 pr-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">Status</label>
              <select
                value={mergedFilters.status || ''}
                onChange={(e) => setFilters({ status: e.target.value || undefined, page: 1 })}
                className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>

            <div className="min-w-[150px]">
              <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">Risk Level</label>
              <select
                value={mergedFilters.risk_level || ''}
                onChange={(e) => setFilters({ risk_level: e.target.value || undefined, page: 1 })}
                className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
              >
                <option value="">All Levels</option>
                <option value="critical">Critical (80+)</option>
                <option value="high">High (60-79)</option>
                <option value="medium">Medium (40-59)</option>
                <option value="low">Low (&lt;40)</option>
              </select>
            </div>

            <div className="min-w-[180px]">
              <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={mergedFilters.date_from || ''}
                  onChange={(e) => setFilters({ date_from: e.target.value || undefined, page: 1 })}
                  className="flex-1 bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
                />
                <input
                  type="date"
                  value={mergedFilters.date_to || ''}
                  onChange={(e) => setFilters({ date_to: e.target.value || undefined, page: 1 })}
                  className="flex-1 bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-secondary hover:text-secondary-container font-label-caps text-label-caps transition-colors"
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
          <thead className="bg-surface-container/50">
            <tr className="text-left text-on-surface-variant">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-4 font-label-caps text-label-caps cursor-pointer hover:text-on-surface transition-colors ${col.align ? `text-${col.align}` : ''}`}
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
            ) : data?.transactions?.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-outline-variant text-[48px] block mb-2">receipt_long</span>
                  No transactions found
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-2 text-secondary hover:text-secondary-container font-medium"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              data?.transactions?.map((tx: any) => (
                <tr
                  key={tx.id}
                  className="border-t border-outline-variant/20 hover:bg-surface-container/50 transition-colors cursor-pointer"
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
          currentPage={data.page}
          totalPages={data.total_pages}
          totalItems={data.total}
          pageSize={data.page_size}
          onPageChange={(page) => setFilters({ page })}
          onPageSizeChange={(size) => setFilters({ page: 1, limit: size })}
        />
      )}

      {error && (
        <div className="p-4 bg-error-container/20 border border-error/30 text-error rounded-lg font-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          Failed to load transactions. {' '}
          <button onClick={() => refetch()} className="underline hover:no-underline">
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;