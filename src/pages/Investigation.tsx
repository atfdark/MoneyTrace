import React, { useState } from 'react';
import { useInvestigations, useInvestigationFilters } from '../hooks/useInvestigations';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { formatDate, formatCurrency, formatAddress } from '../utils/formatters';

interface InvestigationCardProps {
  investigation: any;
  onClick?: () => void;
}

const InvestigationCard: React.FC<InvestigationCardProps> = ({ investigation, onClick }) => {
  const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
    open: { bg: 'bg-secondary-container/20', text: 'text-secondary', icon: 'folder_open' },
    in_progress: { bg: 'bg-warning-container/20', text: 'text-warning', icon: 'hourglass_top' },
    pending_review: { bg: 'bg-warning-container/20', text: 'text-warning', icon: 'pending' },
    closed: { bg: 'bg-success-container/20', text: 'text-success', icon: 'check_circle' },
    archived: { bg: 'bg-surface-container-high/50', text: 'text-on-surface-variant', icon: 'archive' },
  };

  const config = statusConfig[investigation.status] || statusConfig.open;

  return (
    <div
      className={`glass-panel rounded-xl p-6 border border-outline-variant/20 hover:shadow-lg transition-all duration-200 ${config.bg}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="font-headline-md text-headline-md text-on-surface">{investigation.title}</h3>
            <span
              className={`px-2 py-0.5 rounded-full font-label-caps text-label-caps ${config.text} bg-opacity-20`}
            >
              {investigation.status.replace('_', ' ')}
            </span>
            {investigation.priority && (
              <span className="px-2 py-0.5 rounded-full font-label-caps text-label-caps bg-error-container/20 text-error">
                {investigation.priority}
              </span>
            )}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">{investigation.description}</p>

          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            {investigation.assigned_to && (
              <div className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">person</span>
                <span>{investigation.assigned_to}</span>
              </div>
            )}
            {investigation.alert_count > 0 && (
              <div className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>{investigation.alert_count} alerts</span>
              </div>
            )}
            {investigation.transaction_count > 0 && (
              <div className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                <span>{investigation.transaction_count} transactions</span>
              </div>
            )}
            {investigation.total_amount && (
              <div className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">attach_money</span>
                <span>{formatCurrency(investigation.total_amount)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="font-body-xs text-body-xs text-on-surface-variant">
            Created: {formatDate(investigation.created_at, 'short')}
          </span>
          {investigation.updated_at && (
            <span className="font-body-xs text-body-xs text-on-surface-variant">
              Updated: {formatDate(investigation.updated_at, 'relative')}
            </span>
          )}
          <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
        </div>
      </div>
    </div>
  );
};

export const Investigation: React.FC = () => {
  const { data, isLoading, error, refetch } = useInvestigations({});
  const { filters, setFilters, clearFilters, hasActiveFilters } = useInvestigationFilters();
  const [selectedInvestigation, setSelectedInvestigation] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'closed', label: 'Closed' },
    { value: 'archived', label: 'Archived' },
  ];

  const handleCreateInvestigation = async (formData: any) => {
    console.log('Create investigation:', formData);
    setShowCreateModal(false);
    refetch();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Investigation</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Manage and track investigation cases
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-body-sm text-body-sm font-medium hover:bg-secondary-container/80 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Case</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4">
          <p className="font-label-caps text-label-caps text-on-surface-variant">Total Cases</p>
          <p className="font-headline-lg text-headline-lg text-on-surface mt-1 tabular-nums">
            {data?.total?.toLocaleString() || '—'}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="font-label-caps text-label-caps text-on-surface-variant">Open</p>
          <p className="font-headline-lg text-headline-lg text-secondary mt-1 tabular-nums">
            {data?.open_count || 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="font-label-caps text-label-caps text-on-surface-variant">In Progress</p>
          <p className="font-headline-lg text-headline-lg text-warning mt-1 tabular-nums">
            {data?.in_progress_count || 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="font-label-caps text-label-caps text-on-surface-variant">Closed (30d)</p>
          <p className="font-headline-lg text-headline-lg text-success mt-1 tabular-nums">
            {data?.closed_30d || 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-xl p-4 border border-outline-variant/20">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">Search</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
              <input
                type="text"
                placeholder="Search cases..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
                className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 pl-10 pr-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
              />
            </div>
          </div>

          <div className="min-w-[160px]">
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ status: e.target.value || undefined, page: 1 })}
              className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">Priority</label>
            <select
              value={filters.priority || ''}
              onChange={(e) => setFilters({ priority: e.target.value || undefined, page: 1 })}
              className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ date_from: e.target.value || undefined, page: 1 })}
                className="flex-1 bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-sm"
              />
              <input
                type="date"
                value={filters.date_to || ''}
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

      {/* Cases List */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="divide-y divide-outline-variant/20">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-6 animate-pulse">
                <div className="h-5 w-1/3 bg-surface-container-high rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-surface-container-high rounded"></div>
              </div>
            ))
          ) : data?.investigations?.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-outline-variant text-[48px] block mb-2">folder_open</span>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-1">No cases found</h3>
              <p className="font-body-md text-on-surface-variant mb-4">Create your first investigation case</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-body-sm font-medium hover:bg-secondary-container/80 transition-colors"
              >
                Create Case
              </button>
            </div>
          ) : (
            data?.investigations?.map((inv: any) => (
              <InvestigationCard
                key={inv.id}
                investigation={inv}
                onClick={() => setSelectedInvestigation(inv)}
              />
            ))
          )}
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
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="glass-panel rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">New Investigation Case</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); }}>
              <div className="space-y-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Case Title</label>
                  <input
                    type="text"
                    placeholder="Enter case title"
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-md"
                    required
                  />
                </div>

                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Description</label>
                  <textarea
                    placeholder="Describe the investigation..."
                    rows={4}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-md resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Priority</label>
                    <select className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-md">
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Assigned To</label>
                    <select className="w-full bg-surface-container border border-outline-variant/50 rounded-lg py-2 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body-md">
                      <option value="">Unassigned</option>
                      <option value="analyst_1">John Smith</option>
                      <option value="analyst_2">Jane Doe</option>
                      <option value="analyst_3">Robert Johnson</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <input type="checkbox" id="link_alerts" className="h-4 w-4 bg-surface-container border-outline-variant rounded text-secondary" />
                  <label htmlFor="link_alerts" className="ml-2 font-body-sm text-body-sm text-on-surface-variant">
                    Link related alerts automatically
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 glass-panel border border-outline-variant/50 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-body-sm text-body-sm font-medium hover:bg-secondary-container/80 transition-colors"
                  >
                    Create Case
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-panel rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-error text-[48px] block mb-2">error</span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Failed to load cases</h3>
          <p className="font-body-md text-on-surface-variant mb-4">{error}</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-body-sm font-medium hover:bg-secondary-container/80 transition-colors">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Investigation;