import React, { useState } from 'react';
import { useAlerts, useAlertFilters } from '../hooks/useAlerts';
import { AlertCard } from '../components/alerts/AlertCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { formatDate } from '../utils/formatters';

export const Alerts: React.FC = () => {
  const { data, isLoading, error, refetch } = useAlerts({});
  const { filters, setFilters, clearFilters, hasActiveFilters } = useAlertFilters();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const severityOptions = [
    { value: '', label: 'All Severities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'dismissed', label: 'Dismissed' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'structuring', label: 'Structuring' },
    { value: 'layering', label: 'Layering' },
    { value: 'smurfing', label: 'Smurfing' },
    { value: 'round_tripping', label: 'Round Tripping' },
    { value: 'velocity', label: 'Velocity' },
    { value: 'sanction', label: 'Sanctions' },
    { value: 'pep', label: 'PEP' },
    { value: 'mixer', label: 'Mixer' },
    { value: 'darknet', label: 'Darknet' },
  ];

  const handleAcknowledge = async (id: string) => {
    // Call acknowledge API
    console.log('Acknowledge alert:', id);
    refetch();
  };

  const handleDismiss = async (id: string) => {
    // Call dismiss API
    console.log('Dismiss alert:', id);
    refetch();
  };

  const handleInvestigate = (id: string) => {
    // Navigate to investigation with alert context
    window.location.href = `/investigation?alert=${id}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-bold text-gray-900">Fraud Alerts</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Real-time fraud detection and alert management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 shadow-card border border-gray-200 rounded-lg text-[13px] text-gray-900 hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined text-[18px] align-middle">filter_list</span>
            <span className="hidden sm:inline">Filters</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              aria-label="List view"
            >
              <span className="material-symbols-outlined text-[20px]">view_list</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              aria-label="Grid view"
            >
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Total Alerts</p>
          <p className="text-[17px] font-bold text-gray-900 mt-1 tabular-nums">
            {(data as any)?.total?.toLocaleString() || '—'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Critical</p>
          <p className="text-[17px] font-bold text-red-600 mt-1 tabular-nums">
            {(data as any)?.critical_count || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">High</p>
          <p className="text-[17px] font-bold text-amber-600 mt-1 tabular-nums">
            {(data as any)?.high_count || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Acknowledged</p>
          <p className="text-[17px] font-bold text-blue-600 mt-1 tabular-nums">
            {(data as any)?.acknowledged_count || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">New (24h)</p>
          <p className="text-[17px] font-bold text-green-600 mt-1 tabular-nums">
            {(data as any)?.new_24h || 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-card p-4 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1 block">Search</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
              <input
                type="text"
                placeholder="Search alerts..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
              />
            </div>
          </div>

          <div className="min-w-[160px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1 block">Severity</label>
            <select
              value={filters.severity || ''}
              onChange={(e) => setFilters({ severity: e.target.value || undefined, page: 1 })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
            >
              {severityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1 block">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ status: e.target.value || undefined, page: 1 })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1 block">Alert Type</label>
            <select
              value={filters.alert_type || ''}
              onChange={(e) => setFilters({ alert_type: e.target.value || undefined, page: 1 })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1 block">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ date_from: e.target.value || undefined, page: 1 })}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
              />
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilters({ date_to: e.target.value || undefined, page: 1 })}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-blue-600 hover:text-blue-600-container text-[11px] font-semibold uppercase tracking-wider transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Alerts List/Grid */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
        {viewMode === 'list' ? (
          <div className="divide-y divide-outline-variant/20">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-4 w-1/3 bg-gray-100 rounded"></div>
                  <div className="h-3 w-1/2 bg-gray-100 rounded mt-1"></div>
                </div>
              ))
            ) : ((data as any)?.alerts || (data as any)?.data?.alerts || []).length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-outline-variant text-[48px] block mb-2">notifications_off</span>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-1">No alerts found</h3>
                <p className="font-body-md text-gray-500 mb-4">Try adjusting your filters</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-blue-600 hover:text-blue-600-container font-medium">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              ((data as any)?.alerts || (data as any)?.data?.alerts || []).map((alert: any) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  variant="default"
                  onAcknowledge={handleAcknowledge}
                  onDismiss={handleDismiss}
                  onInvestigate={handleInvestigate}
                />
              ))
            )}
          </div>
        ) : (
          <div className="p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse">
                    <div className="h-4 w-1/3 bg-gray-100 rounded"></div>
                    <div className="h-3 w-1/2 bg-gray-100 rounded mt-1"></div>
                  </div>
                ))}
              </div>
            ) : ((data as any)?.alerts || (data as any)?.data?.alerts || []).length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-outline-variant text-[48px] block mb-2">notifications_off</span>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-1">No alerts found</h3>
                <p className="font-body-md text-gray-500 mb-4">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {((data as any)?.alerts || (data as any)?.data?.alerts || []).map((alert: any) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    variant="compact"
                    onAcknowledge={handleAcknowledge}
                    onDismiss={handleDismiss}
                    onInvestigate={handleInvestigate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {data && !isLoading && (
          <Pagination
            currentPage={(data as any)?.page || (data as any)?.data?.page || 1}
            totalPages={(data as any)?.total_pages || (data as any)?.data?.total_pages || 1}
            totalItems={(data as any)?.total || (data as any)?.data?.total || 0}
            pageSize={(data as any)?.page_size || (data as any)?.data?.page_size || 10}
            onPageChange={(page) => setFilters({ page })}
            onPageSizeChange={(size) => setFilters({ page: 1, limit: size })}
          />
        )}
      </div>

      {error && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-card p-6 text-center">
          <span className="material-symbols-outlined text-red-600 text-[48px] block mb-2">error</span>
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Failed to load alerts</h3>
          <p className="font-body-md text-gray-500 mb-4">{(error as any)?.message || String(error)}</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-body-sm font-medium hover:bg-blue-500 transition-colors">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Alerts;