import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { RecoveryCalculatorModal } from '../components/recovery/RecoveryCalculatorModal';
import { RecoveryCommandCenter } from '../components/dashboard/RecoveryCommandCenter';
import { LegalNoticeModal } from '../components/recovery/LegalNoticeModal';
import { soundAlarm } from '../utils/soundAlarm';
import { formatCurrency } from '../utils/formatters';
import { useLiveTelemetry } from '../hooks/useWebSocket';

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
  const navigate = useNavigate();
  useLiveTelemetry(); // Keeps socket connection alive

  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Action States
  const [showCalculator, setShowCalculator] = useState(false);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeData, setNoticeData] = useState<any>(null);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [isDossierFreezing, setIsDossierFreezing] = useState(false);
  const [isDossierRestituting, setIsDossierRestituting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchCases = async (preserveSelectedId?: string) => {
    setIsLoading(true);
    try {
      const res = await api.get<any>('/recovery/cases');
      const data: RecoveryCase[] = res.data?.cases || res.data || [];
      setCases(data);
      if (data.length > 0) {
        if (preserveSelectedId) {
          const match = data.find(c => c.case_id === preserveSelectedId || c.id === preserveSelectedId);
          setSelectedCase(match || data[0]);
        } else {
          setSelectedCase(prev => {
            if (!prev) return data[0];
            const match = data.find(c => c.case_id === prev.case_id);
            return match || data[0];
          });
        }
      }
    } catch (err) {
      console.error('Error fetching recovery cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Filtered cases
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchesStatus =
        statusFilter === 'ALL' || c.status.toUpperCase() === statusFilter.toUpperCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.case_id.toLowerCase().includes(q) ||
        c.current_holder_account.toLowerCase().includes(q) ||
        (c.alert_id && c.alert_id.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [cases, statusFilter, searchQuery]);

  // Execute Freeze from Dossier
  const handleDossierFreeze = async () => {
    if (!selectedCase) return;
    setIsDossierFreezing(true);
    try {
      await api.post('/recovery/action/freeze-and-protect', {
        alert_id: selectedCase.alert_id,
        account_number: selectedCase.current_holder_account,
        reason: `Emergency Freeze Directive issued under Section 91 CrPC for Case ${selectedCase.case_id}`,
      });
      soundAlarm.playSuccessChime();
      showNotification(`✓ Account ${selectedCase.current_holder_account} frozen under Section 91 CrPC.`);
      await fetchCases(selectedCase.case_id);
    } catch (err: any) {
      console.error('Failed to freeze node:', err);
      showNotification('Failed to execute freeze directive.');
    } finally {
      setIsDossierFreezing(false);
    }
  };

  // Execute Restitution from Dossier
  const handleDossierRestitute = async () => {
    if (!selectedCase) return;
    setIsDossierRestituting(true);
    try {
      await api.post(`/recovery/cases/${selectedCase.case_id}/restitute`);
      soundAlarm.playSuccessChime();
      showNotification(`🎉 WE HAVE RECOVERED: Stolen funds for Case ${selectedCase.case_id} restituted!`);
      await fetchCases(selectedCase.case_id);
    } catch (err: any) {
      console.error('Failed to restitute case:', err);
      showNotification('Failed to restitute case.');
    } finally {
      setIsDossierRestituting(false);
    }
  };

  // Recalculate AI Score
  const handleRecalculateScore = async () => {
    if (!selectedCase) return;
    setIsRecalculating(true);
    try {
      const res = await api.post<any>(`/recovery/recalculate/${selectedCase.case_id}`);
      soundAlarm.playBlip();
      showNotification(`✓ AI score recalculated: ${res.data?.recovery_score?.toFixed(0) || 90}/100.`);
      await fetchCases(selectedCase.case_id);
    } catch (err: any) {
      console.error('Failed to recalculate:', err);
      showNotification('Unable to recalculate score.');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Open Legal Notice Modal
  const handleOpenLegalNotice = async () => {
    if (!selectedCase) return;
    setNoticeModalOpen(true);
    setNoticeLoading(true);
    try {
      const res = await api.get(`/recovery/cases/${selectedCase.case_id}/legal-notice`);
      setNoticeData(res.data);
    } catch (err) {
      console.error('Failed to load legal notice:', err);
    } finally {
      setNoticeLoading(false);
    }
  };

  const activeCaseForCommandCenter = selectedCase || (cases.length > 0 ? cases[0] : null);

  return (
    <div className="flex flex-col max-w-7xl mx-auto gap-6 p-4 lg:p-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-emerald-400">verified</span>
          <span className="text-xs font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 shadow-card p-6 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-[32px]">monetization_on</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-headline-sm font-bold text-gray-900">Asset Recovery Intelligence</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Phase 7 Engine Active
              </span>
            </div>
            <p className="text-body-sm text-gray-500 mt-1">
              Multi-hop asset preservation scores, target freeze directives, and CrPC legal notices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => fetchCases()}
            className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Refresh Cases"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowCalculator(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">calculate</span>
            <span>Recovery AI Simulator</span>
          </button>
        </div>
      </div>

      {/* Dynamic Instant Directive Interceptor Bar */}
      {activeCaseForCommandCenter ? (
        <RecoveryCommandCenter
          caseId={activeCaseForCommandCenter.case_id}
          alertId={activeCaseForCommandCenter.alert_id}
          stolenAmount={activeCaseForCommandCenter.amount_at_risk}
          currentHolder={activeCaseForCommandCenter.current_holder_account}
          holderBank="Partner Holding Node"
          recoveryProbability={Math.round(activeCaseForCommandCenter.recovery_score || 92)}
          status={activeCaseForCommandCenter.status}
          onFreezeSuccess={() => {
            showNotification(`✓ Node ${activeCaseForCommandCenter.current_holder_account} frozen.`);
            fetchCases(activeCaseForCommandCenter.case_id);
          }}
          onRestituteSuccess={() => {
            showNotification(`🎉 100% CAPITAL RESTITUTED for Case ${activeCaseForCommandCenter.case_id}!`);
            fetchCases(activeCaseForCommandCenter.case_id);
          }}
        />
      ) : (
        <div className="p-6 bg-slate-900 border border-slate-700 rounded-2xl text-center text-gray-400 text-sm">
          No incident cases currently active. Run a simulation from the phone or dashboard to trigger an incident.
        </div>
      )}

      {/* Calculator Modal */}
      <RecoveryCalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />

      {/* Legal Notice Modal */}
      <LegalNoticeModal
        isOpen={noticeModalOpen}
        onClose={() => setNoticeModalOpen(false)}
        noticeData={noticeData}
        isLoading={noticeLoading}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases List (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 shadow-card p-6 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-title-md font-bold text-gray-900">Active Asset Recovery Cases</h2>
              <p className="text-xs text-gray-500">Showing {filteredCases.length} incident cases</p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-[11px] font-bold">
              {['ALL', 'OPEN', 'ACTION_TAKEN', 'RECOVERED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === st
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'ACTION_TAKEN' ? 'Frozen' : st === 'RECOVERED' ? 'Recovered' : 'Open'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Filter by Case ID, Alert ID, or Holding Account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-500 animate-pulse">Loading recovery cases...</div>
          ) : filteredCases.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <span className="material-symbols-outlined text-4xl text-gray-300">folder_off</span>
              <p className="text-xs font-semibold">No recovery cases match the current filter.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredCases.map((c) => {
                const isSelected = selectedCase?.case_id === c.case_id;
                const isRec = c.status === 'RECOVERED';
                const isAct = c.status === 'ACTION_TAKEN';

                return (
                  <div
                    key={c.id || c.case_id}
                    onClick={() => setSelectedCase(c)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? isRec
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-sm'
                          : 'bg-indigo-50/80 border-indigo-500 shadow-sm'
                        : 'bg-gray-50/70 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-gray-900">{c.case_id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isRec
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isAct
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {c.status}
                        </span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.recovery_probability === 'HIGH' ? 'bg-emerald-100 text-emerald-800' :
                        c.recovery_probability === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {c.recovery_probability} ({c.recovery_score?.toFixed(0)}/100)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Holder: <b className="text-amber-700 font-mono font-bold">{c.current_holder_account}</b>
                      </span>
                      <span>
                        At Risk: <b className="text-gray-900 font-bold">{formatCurrency(c.amount_at_risk)}</b>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Case Detail Dossier (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 shadow-card p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title-md font-bold text-gray-900">Case Intelligence Dossier</h2>
            {selectedCase && (
              <span className="font-mono text-xs text-gray-500 font-bold">{selectedCase.case_id}</span>
            )}
          </div>

          {selectedCase ? (
            <div className="space-y-4 text-xs">
              {/* Recommended Action Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-1.5">
                <div className="text-[10px] text-gray-500 uppercase font-black tracking-wider">
                  STATUTORY DIRECTIVE & ACTION
                </div>
                <div className={`text-xs font-bold leading-relaxed ${
                  selectedCase.status === 'RECOVERED' ? 'text-emerald-700' : 'text-indigo-900'
                }`}>
                  {selectedCase.recommended_action}
                </div>
              </div>

              {/* Status & Score Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Recovery Score</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black text-emerald-800">
                      {selectedCase.recovery_score?.toFixed(0)}
                    </span>
                    <span className="text-xs text-gray-400">/ 100</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Docket Status</span>
                  <span className={`text-sm font-black block mt-1 ${
                    selectedCase.status === 'RECOVERED'
                      ? 'text-emerald-700'
                      : selectedCase.status === 'ACTION_TAKEN'
                      ? 'text-blue-700'
                      : 'text-red-700'
                  }`}>
                    {selectedCase.status}
                  </span>
                </div>
              </div>

              {/* Node Details */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Current Holding Node</span>
                  <span className="text-[10px] font-mono text-gray-400">Section 91 Target</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-amber-700 font-mono">
                    {selectedCase.current_holder_account}
                  </span>
                  <span className="text-xs font-bold text-gray-800">
                    {formatCurrency(selectedCase.amount_at_risk)}
                  </span>
                </div>
              </div>

              {/* Dossier Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {/* 1. Freeze Holding Node Button */}
                {selectedCase.status === 'OPEN' && (
                  <button
                    onClick={handleDossierFreeze}
                    disabled={isDossierFreezing}
                    className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">ac_unit</span>
                    <span>{isDossierFreezing ? 'Freezing Node...' : `Freeze ${selectedCase.current_holder_account} (Sec 91)`}</span>
                  </button>
                )}

                {/* 2. Restitute / Recover Button */}
                {selectedCase.status !== 'RECOVERED' && (
                  <button
                    onClick={handleDossierRestitute}
                    disabled={isDossierRestituting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">savings</span>
                    <span>{isDossierRestituting ? 'Restituting Funds...' : 'Restitute / Recover Capital to Victim'}</span>
                  </button>
                )}

                {/* 3. Statutory Legal Notice Viewer */}
                <button
                  onClick={handleOpenLegalNotice}
                  className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">gavel</span>
                  <span>View Section 91 CrPC Legal Notice</span>
                </button>

                {/* 4. Recalculate AI Score */}
                <button
                  onClick={handleRecalculateScore}
                  disabled={isRecalculating}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-xs disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isRecalculating ? 'sync' : 'auto_mode'}
                  </span>
                  <span>{isRecalculating ? 'Recalculating...' : 'Recalculate AI Recovery Score'}</span>
                </button>

                {/* 5. Trace in Money Flow */}
                <button
                  onClick={() => navigate('/flow')}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">account_tree</span>
                  <span>Trace Trail in Money Flow Graph</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">touch_app</span>
              <span>Select an incident case to view intelligence details and legal directives.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Recovery;
