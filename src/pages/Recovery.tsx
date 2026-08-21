import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface RecoveryCase {
  id: string;
  case_id: string;
  alert_id: string;
  transaction_id: string;
  recovery_score: number;
  recovery_probability: string;
  current_holder_account: string;
  amount_at_risk: number;
  recommended_action: string;
  status: string;
  created_at: string;
}

export const Recovery: React.FC = () => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>('/recovery/cases');
      const data = res.data?.cases || res.data || [];
      setCases(data);
      if (data.length > 0) setSelectedCase(data[0]);
    } catch (err) {
      console.error('Error fetching recovery cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  return (
    <div className="flex flex-col max-w-7xl mx-auto gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 shadow-card p-6 rounded-xl border border-outline-variant/30 shadow-card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-tertiary to-emerald-800 flex items-center justify-center text-gray-900 shadow-lg shadow-tertiary/20">
            <span className="material-symbols-outlined text-[32px]">monetization_on</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-headline-sm font-bold text-gray-900">Asset Recovery Intelligence</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-tertiary/20 text-tertiary border border-tertiary/30">
                Phase 7 Engine Active
              </span>
            </div>
            <p className="text-body-sm text-gray-500 mt-1">
              Multi-hop asset preservation scores, target freeze directives, and CrPC legal notices.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases List (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 shadow-card p-6 rounded-xl border border-outline-variant/30 space-y-4 shadow-card">
          <h2 className="text-title-md font-bold text-gray-900">Active Asset Recovery Cases</h2>
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse">Loading recovery cases...</div>
          ) : cases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No active recovery cases.</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {cases.map((c) => (
                <div
                  key={c.id || c.case_id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedCase?.case_id === c.case_id
                      ? 'bg-tertiary/10 border-tertiary shadow-sm'
                      : 'bg-surface-variant/40 hover:bg-surface-variant border-outline-variant/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-gray-900">{c.case_id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      c.recovery_probability === 'HIGH' ? 'bg-tertiary/20 text-tertiary' :
                      c.recovery_probability === 'MEDIUM' ? 'bg-warning/20 text-amber-600' : 'bg-error/20 text-red-600'
                    }`}>
                      {c.recovery_probability} ({c.recovery_score?.toFixed(0)}/100)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Holder: <b className="text-red-600 font-mono">{c.current_holder_account}</b></span>
                    <span>At Risk: <b className="text-gray-900">₹{c.amount_at_risk?.toLocaleString()}</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Case Detail Card (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 shadow-card p-6 rounded-xl border border-outline-variant/30 space-y-4 shadow-card">
          <h2 className="text-title-md font-bold text-gray-900">Case Intelligence Dossier</h2>
          {selectedCase ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-variant/50 border border-outline-variant/30 space-y-2">
                <div className="text-[10px] text-outline uppercase font-bold">Recommended Action</div>
                <div className="text-sm font-bold text-tertiary">{selectedCase.recommended_action}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-variant/30 border border-gray-100">
                  <span className="text-[10px] text-outline block">Recovery Score</span>
                  <span className="text-sm font-bold text-gray-900">{selectedCase.recovery_score?.toFixed(0)} / 100</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-variant/30 border border-gray-100">
                  <span className="text-[10px] text-outline block">Status</span>
                  <span className="text-sm font-bold text-primary">{selectedCase.status}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-variant/30 border border-gray-100 space-y-1">
                <span className="text-[10px] text-outline block">Current Holding Node</span>
                <span className="text-sm font-bold text-red-600 font-mono">{selectedCase.current_holder_account}</span>
              </div>

              <a
                href={`/reports`}
                className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all text-xs"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                <span>Export Recovery PDF Report</span>
              </a>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">Select a case to view recovery details.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Recovery;
