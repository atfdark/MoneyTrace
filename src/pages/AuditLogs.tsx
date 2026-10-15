import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { formatDate } from '../utils/formatters';

interface AuditLogItem {
  id: string;
  user_name: string;
  user_email?: string | null;
  user_role: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: any;
  ip_address?: string | null;
  user_agent?: string | null;
  timestamp: string;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selection for modal inspection
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load available distinct action types on mount
  useEffect(() => {
    let isMounted = true;
    const fetchActionTypes = async () => {
      try {
        const res = await api.get<{ actions: string[] }>('/audit-logs/actions/types');
        if (isMounted && res.data?.actions) {
          setAvailableActions(res.data.actions);
        }
      } catch {
        // Fallback default action types
        if (isMounted) {
          setAvailableActions([
            'LOGIN',
            'LOGIN_FAILED',
            'LOGOUT',
            'CASE_CREATED',
            'CASE_UPDATED',
            'ACCOUNT_FROZEN',
            'ACCOUNT_UNFROZEN',
            'ALERT_ACKNOWLEDGED',
            'ALERT_RESOLVED',
            'REPORT_GENERATED',
            'REPORT_EXPORTED',
            'NOTE_ADDED',
            'PIN_SET',
            'TRANSACTION_INITIATED',
            'WATCHLIST_ADDED',
            'SCENARIO_STARTED',
            'SCENARIO_STEPPED',
            'SCENARIO_RESET',
            'USER_ROLE_CHANGED',
          ]);
        }
      }
    };
    fetchActionTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/audit-logs', {
        params: {
          page,
          page_size: pageSize,
          search: debouncedSearch ? debouncedSearch.trim() : undefined,
          action: actionFilter || undefined,
        },
      });

      const data = res.data;
      setLogs(data?.logs || []);
      setTotal(data?.total || 0);
      setTotalPages(data?.total_pages || 1);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      const errMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to retrieve audit records from security API.';
      setError(errMsg);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleActionChange = (val: string) => {
    setActionFilter(val);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setActionFilter('');
    setPage(1);
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('FAILED') || act.includes('ALERT_CREATED')) {
      return 'bg-red-50 text-red-700 border-red-200';
    } else if (act.includes('FREEZE') || act.includes('CRITICAL')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (act.includes('UNFROZEN') || act.includes('RESOLVED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (act.includes('CASE') || act.includes('PLAYBOOK')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (act.includes('REPORT') || act.includes('EVIDENCE')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (act.includes('LOGIN') || act.includes('PIN')) {
      return 'bg-green-50 text-green-700 border-green-200';
    } else if (act.includes('ROLE')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Enterprise Audit Logs</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              COMPLIANCE AUDIT TRAIL — SYSTEM OF RECORD
            </span>
          </div>
          <p className="text-[13px] text-gray-500 mt-1">
            Verified compliance record capturing logins, fraud alerts, freeze directives, case updates, and forensic report exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-3.5 py-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-700 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, target entity or IP..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-[13px] text-gray-700 font-medium"
          >
            <option value="">All Action Types ({availableActions.length})</option>
            {availableActions.map((act) => (
              <option key={act} value={act}>
                {act.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {(search || actionFilter) && (
            <button
              onClick={handleClearFilters}
              className="text-[12px] text-gray-500 hover:text-gray-800 underline font-medium px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error Feedback Banner */}
      {error && !isLoading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-800 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchLogs}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[12px] font-semibold"
          >
            Retry Request
          </button>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-gray-50/70 text-gray-500 font-bold text-[11px] uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC / Local)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    <div className="inline-flex items-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[20px] text-blue-600">
                        progress_activity
                      </span>
                      <span>Loading audit trail records...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-red-600">
                    <p className="font-semibold">Unable to display audit logs due to an API error.</p>
                    <p className="text-[12px] text-gray-500 mt-1">{error}</p>
                    <button
                      onClick={fetchLogs}
                      className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[12px] font-medium"
                    >
                      Try Again
                    </button>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    {search || actionFilter ? (
                      <div className="space-y-2">
                        <p className="text-[14px] font-medium text-gray-600">
                          No audit logs matching current filter.
                        </p>
                        <p className="text-[12px] text-gray-400">
                          Try adjusting your search query or selecting "All Action Types".
                        </p>
                        <button
                          onClick={handleClearFilters}
                          className="mt-2 px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-[12px] font-semibold"
                        >
                          Reset Filters
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[14px] font-medium text-gray-600">No audit logs yet.</p>
                        <p className="text-[12px] text-gray-400">
                          System activity, logins, and forensic investigations will record here automatically.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[12px] text-gray-600 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-900">{log.user_name}</p>
                      <p className="text-[11px] text-gray-400 capitalize">{log.user_role}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      <span className="text-[10px] font-semibold uppercase text-gray-400 mr-1.5">
                        {log.target_type}:
                      </span>
                      {log.target_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[12px] text-gray-500 whitespace-nowrap">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!isLoading && !error && total > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-gray-600">
            <div>
              Showing <span className="font-semibold text-gray-900">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">{Math.min(page * pageSize, total)}</span> of{' '}
              <span className="font-semibold text-gray-900">{total}</span> records
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-gray-200 rounded px-2 py-1 text-[12px] font-medium"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  Prev
                </button>
                <span className="px-2 text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-elevated border border-gray-200 w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Audit Record Inspector</span>
                <h3 className="text-[15px] font-bold text-gray-900">{selectedLog.action}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-[13px]">
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg text-[12px]">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Actor</span>
                  <span className="font-bold text-gray-900">{selectedLog.user_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Role</span>
                  <span className="font-bold text-gray-900 capitalize">{selectedLog.user_role}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Target Entity</span>
                  <span className="font-mono font-bold text-blue-600">
                    {selectedLog.target_type}: {selectedLog.target_id}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Client IP</span>
                  <span className="font-mono text-gray-700">{selectedLog.ip_address || '127.0.0.1'}</span>
                </div>
                {selectedLog.user_agent && (
                  <div className="col-span-2">
                    <span className="text-gray-400 block text-[10px] uppercase">User Agent</span>
                    <span className="font-mono text-gray-600 text-[11px] truncate block">
                      {selectedLog.user_agent}
                    </span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-gray-400 block text-[10px] uppercase">Record UUID</span>
                  <span className="font-mono text-gray-500 text-[11px]">{selectedLog.id}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase text-gray-500 block mb-1">
                  Event Payload Metadata
                </span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[13px] font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
