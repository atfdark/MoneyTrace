import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { RecoveryCalculatorModal } from '../components/recovery/RecoveryCalculatorModal';
import { RecoveryCommandCenter, RecoveryBranch, ScoreBreakdown } from '../components/dashboard/RecoveryCommandCenter';
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
  recovered_amount?: number;
  lien_amount?: number;
  recovery_branches?: RecoveryBranch[];
  score_breakdown?: ScoreBreakdown;
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
  const [isDossierLienPlacing, setIsDossierLienPlacing] = useState(false);
  const [isDossierRestituting, setIsDossierRestituting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [dossierLienMode, setDossierLienMode] = useState<'LIEN' | 'FULL_FREEZE'>('LIEN');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchCases = async (preserveSelectedId?: string) => {
    setIsLoading(true);
    try {
      const res = await api.get<any>('/recovery/cases');
      const data: RecoveryCase[] = res.data?.cases || res.data || [];
      setCases(data);
      if (data.length > 0) {
        if (preserveSelectedId) {
          const match = data.find((c) => c.case_id === preserveSelectedId || c.id === preserveSelectedId);
          setSelectedCase(match || data[0]);
        } else {
          setSelectedCase((prev) => {
            if (!prev) return data[0];
            const match = data.find((c) => c.case_id === prev.case_id);
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
    return cases.filter((c) => {
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

  // Execute Statutory Lien / Freeze from Dossier
  const handleDossierLienOrFreeze = async (mode: 'LIEN' | 'FULL_FREEZE') => {
    if (!selectedCase) return;
    setIsDossierLienPlacing(true);
    try {
      await api.post('/recovery/action/freeze-and-protect', {
        case_id: selectedCase.case_id,
        alert_id: selectedCase.alert_id,
        account_number: selectedCase.current_holder_account,
        mode,
        reason:
          mode === 'LIEN'
            ? `Statutory Lien Directive issued under Section 106 BNSS for Case ${selectedCase.case_id}`
            : `Emergency Full Freeze Directive issued under Section 91 CrPC for Case ${selectedCase.case_id}`,
      });
      soundAlarm.playSuccessChime();
      showNotification(
        mode === 'LIEN'
          ? `✓ Statutory Lien placed on ${selectedCase.current_holder_account} under Section 106 BNSS.`
          : `✓ Account ${selectedCase.current_holder_account} frozen under Section 91 CrPC.`
      );
      await fetchCases(selectedCase.case_id);
    } catch (err: any) {
      console.error('Failed to execute directive:', err);
      showNotification('Failed to execute directive.');
    } finally {
      setIsDossierLienPlacing(false);
    }
  };

  // Execute Pro-Rata Restitution from Dossier
  const handleDossierRestitute = async () => {
    if (!selectedCase) return;
    setIsDossierRestituting(true);
    try {
      const res = await api.post(`/recovery/cases/${selectedCase.case_id}/restitute`);
      soundAlarm.playSuccessChime();
      const recoveredAmt = (res.data as any)?.amount_restituted || selectedCase.amount_at_risk;
      const pct = (res.data as any)?.recovery_percentage || 80;
      showNotification(`🎉 PRO-RATA CAPITAL RESTITUTED: ₹${formatCurrency(recoveredAmt)} (${pct}%) credited to victim!`);
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
      showNotification(`✓ AI recovery score recalculated: ${res.data?.recovery_score?.toFixed(0) || 88}/100.`);
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
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-700 via-teal-800 to-emerald-700 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-[32px]">shield_with_heart</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-headline-sm font-bold text-gray-900">
                Multi-Branch Asset Recovery & Statutory Lien Command Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                I4C / NPCI Protocol Active
              </span>
            </div>
            <p className="text-body-sm text-gray-500 mt-1">
              Multi-mule fan-out intercept, targeted statutory liens under Section 106 BNSS, and pro-rata capital restitution.
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
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">calculate</span>
            <span>Recovery AI Simulator</span>
          </button>
        </div>
      </div>

      {/* Institutional Recovery Command Center Banner */}
      {activeCaseForCommandCenter ? (
        <RecoveryCommandCenter
          caseId={activeCaseForCommandCenter.case_id}
          alertId={activeCaseForCommandCenter.alert_id}
          stolenAmount={activeCaseForCommandCenter.amount_at_risk}
          currentHolder={activeCaseForCommandCenter.current_holder_account}
          holderBank="State Bank of India (Primary Node)"
          recoveryProbability={Math.round(activeCaseForCommandCenter.recovery_score || 88)}
          status={activeCaseForCommandCenter.status}
          recoveredAmount={activeCaseForCommandCenter.recovered_amount || 0}
          lienAmount={activeCaseForCommandCenter.lien_amount || 0}
          recoveryBranches={activeCaseForCommandCenter.recovery_branches}
          scoreBreakdown={activeCaseForCommandCenter.score_breakdown}
          onFreezeSuccess={() => {
            showNotification(`✓ Node ${activeCaseForCommandCenter.current_holder_account} frozen.`);
            fetchCases(activeCaseForCommandCenter.case_id);
          }}
          onLienSuccess={(mode) => {
            showNotification(
              mode === 'LIEN'
                ? `✓ Statutory Lien placed under Section 106 BNSS.`
                : `✓ Full account freeze executed under Section 91 CrPC.`
            );
            fetchCases(activeCaseForCommandCenter.case_id);
          }}
          onRestituteSuccess={() => {
            showNotification(`🎉 Pro-rata capital restitution completed for Case ${activeCaseForCommandCenter.case_id}!`);
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

      {/* Main Grid: Cases List & Comprehensive Case Intelligence Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases List (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-gray-200 shadow-card p-6 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-title-md font-bold text-gray-900">Active Asset Recovery Dockets</h2>
              <p className="text-xs text-gray-500">Showing {filteredCases.length} incident dockets</p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-[11px] font-bold">
              {['ALL', 'OPEN', 'ACTION_TAKEN', 'RECOVERED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All'
                    : st === 'ACTION_TAKEN'
                    ? 'Lien Placed'
                    : st === 'RECOVERED'
                    ? 'Restituted'
                    : 'Open'}
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
              placeholder="Search Docket ID, Alert ID, or Holding Account..."
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
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
              {filteredCases.map((c) => {
                const isSelected = selectedCase?.case_id === c.case_id;
                const isRec = c.status === 'RECOVERED';
                const isAct = c.status === 'ACTION_TAKEN';
                const branchCount = c.recovery_branches?.length || 3;

                return (
                  <div
                    key={c.id || c.case_id}
                    onClick={() => setSelectedCase(c)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? isRec
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                          : isAct
                          ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-indigo-50/80 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-gray-50/70 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-gray-900">{c.case_id}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isRec
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isAct
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isAct ? 'LIEN MARKED' : c.status}
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-200 text-gray-700">
                          {branchCount} Branches
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.recovery_probability === 'HIGH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.recovery_probability === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {c.recovery_probability} ({c.recovery_score?.toFixed(0)}/100)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Primary Node: <b className="text-amber-800 font-mono font-bold">{c.current_holder_account}</b>
                      </span>
                      <span>
                        At Risk: <b className="text-gray-900 font-bold">{formatCurrency(c.amount_at_risk)}</b>
                      </span>
                    </div>

                    {/* Pro-Rata or Lien Indicator */}
                    {(c.recovered_amount || c.lien_amount) ? (
                      <div className="mt-2 pt-2 border-t border-gray-200/80 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-gray-500">
                          {isRec ? 'Recovered Capital:' : 'Statutory Lien Placed:'}
                        </span>
                        <span className={`font-black ${isRec ? 'text-emerald-700' : 'text-blue-700'}`}>
                          {formatCurrency(isRec ? (c.recovered_amount || 0) : (c.lien_amount || 0))}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Case Intelligence Dossier (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-gray-200 shadow-card p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title-md font-bold text-gray-900">Institutional Forensic Dossier</h2>
            {selectedCase && (
              <span className="font-mono text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold">
                {selectedCase.case_id}
              </span>
            )}
          </div>

          {selectedCase ? (
            <div className="space-y-4 text-xs">
              {/* Statutory Directive Banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-1.5">
                <div className="text-[10px] text-gray-500 uppercase font-black tracking-wider flex items-center justify-between">
                  <span>STATUTORY DIRECTIVE & PROTOCOL</span>
                  <span className="text-indigo-600 font-mono">Section 106 BNSS / 91 CrPC</span>
                </div>
                <div
                  className={`text-xs font-bold leading-relaxed ${
                    selectedCase.status === 'RECOVERED'
                      ? 'text-emerald-700'
                      : selectedCase.status === 'ACTION_TAKEN'
                      ? 'text-blue-700'
                      : 'text-indigo-900'
                  }`}
                >
                  {selectedCase.recommended_action}
                </div>
              </div>

              {/* Recovery Score & Capital Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Recovery Score</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-emerald-800">
                      {selectedCase.recovery_score?.toFixed(0)}
                    </span>
                    <span className="text-xs text-gray-400">/ 100</span>
                    <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {selectedCase.recovery_probability}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Disputed Sum At Risk</span>
                  <span className="text-base font-black text-gray-900 block mt-1 font-mono">
                    {formatCurrency(selectedCase.amount_at_risk)}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Recoverable: {formatCurrency(Math.round(selectedCase.amount_at_risk * 0.8))} (80%)
                  </span>
                </div>
              </div>

              {/* Score X-Ray Algorithmic Breakdown */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-indigo-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                    <span className="material-symbols-outlined text-[16px]">troubleshoot</span>
                    <span>SCORE X-RAY / ALGORITHMIC BREAKDOWN</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">
                    Base: 50.0 • Final: {selectedCase.recovery_score?.toFixed(0)}/100
                  </span>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {(selectedCase.score_breakdown?.factors || [
                    { label: 'Golden Hour Window (< 30m elapsed)', impact: '+25', type: 'positive', category: 'TIMING' },
                    { label: 'Liquidity Coverage (80% in banking rails)', impact: '+18', type: 'positive', category: 'LIQUIDITY' },
                    { label: 'Batch Settlement Window (NEFT/RTGS)', impact: '+15', type: 'positive', category: 'RAIL' },
                    { label: 'Multi-Mule Fan-Out (3 branches)', impact: '-12', type: 'negative', category: 'STRUCTURE' },
                    { label: 'Instant Rail Velocity (UPI/IMPS)', impact: '-5', type: 'negative', category: 'VELOCITY' },
                    { label: 'ATM Cash-Out Leakage (20% shortfall)', impact: '-10', type: 'negative', category: 'LEAKAGE' },
                  ]).map((f, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-white/10 text-cyan-200">
                          {f.category || 'RULE'}
                        </span>
                        <span className="truncate text-gray-200" title={f.label}>
                          {f.label}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-xs font-black px-1.5 py-0.5 rounded ${
                          f.type === 'positive'
                            ? 'text-emerald-300 bg-emerald-500/20'
                            : f.type === 'negative'
                            ? 'text-rose-300 bg-rose-500/20'
                            : 'text-gray-300 bg-gray-500/20'
                        }`}
                      >
                        {f.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-Branch Nodes in Dossier */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
                  <span>Layering Fan-Out Tree Nodes</span>
                  <span>Targeted Lien vs Full Freeze</span>
                </div>

                <div className="space-y-2">
                  {(selectedCase.recovery_branches || [
                    {
                      branch_id: 'BR-01',
                      account_number: selectedCase.current_holder_account,
                      bank_name: 'State Bank of India',
                      rail: 'NEFT',
                      hop_level: 1,
                      tainted_amount: Math.round(selectedCase.amount_at_risk * 0.5),
                      actual_balance: Math.round(selectedCase.amount_at_risk * 0.5 * 1.18),
                      recoverable_amount: Math.round(selectedCase.amount_at_risk * 0.5),
                      status: selectedCase.status === 'RECOVERED' ? 'RESTITUTED' : selectedCase.status === 'ACTION_TAKEN' ? 'LIEN_MARKED' : 'ACTIVE',
                      npci_ref: 'NPCI-ISO20022-L1-51291',
                    },
                    {
                      branch_id: 'BR-02',
                      account_number: 'ACC5212',
                      bank_name: 'HDFC Bank',
                      rail: 'IMPS',
                      hop_level: 2,
                      tainted_amount: Math.round(selectedCase.amount_at_risk * 0.3),
                      actual_balance: Math.round(selectedCase.amount_at_risk * 0.3 * 1.05),
                      recoverable_amount: Math.round(selectedCase.amount_at_risk * 0.3),
                      status: selectedCase.status === 'RECOVERED' ? 'RESTITUTED' : selectedCase.status === 'ACTION_TAKEN' ? 'LIEN_MARKED' : 'ACTIVE',
                      npci_ref: 'NPCI-ISO20022-L2-68310',
                    },
                    {
                      branch_id: 'BR-03',
                      account_number: 'ATM-CASH-9012',
                      bank_name: 'ATM Terminal',
                      rail: 'ATM_EXIT',
                      hop_level: 3,
                      tainted_amount: Math.round(selectedCase.amount_at_risk * 0.2),
                      actual_balance: 0,
                      recoverable_amount: 0,
                      status: 'LEAKED_ATM',
                      npci_ref: 'NPCI-ALERT-LEAK-79344',
                    },
                  ]).map((branch) => {
                    const isLeaked = branch.status === 'LEAKED_ATM' || branch.rail === 'ATM_EXIT';
                    const isLien = branch.status === 'LIEN_MARKED';
                    const isRest = branch.status === 'RESTITUTED';

                    return (
                      <div
                        key={branch.branch_id}
                        className="p-2.5 rounded-lg bg-white border border-gray-200 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-gray-500">
                              Hop {branch.hop_level}
                            </span>
                            <span className="font-bold text-gray-900">{branch.bank_name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-gray-100 text-gray-700">
                              {branch.rail}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-gray-500">
                            {branch.account_number} • Tainted: <b className="text-gray-900">{formatCurrency(branch.tainted_amount)}</b>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isRest
                              ? 'bg-emerald-100 text-emerald-800'
                              : isLien
                              ? 'bg-blue-100 text-blue-800'
                              : isLeaked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {branch.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Controls */}
              <div className="space-y-2.5 pt-2">
                {/* 1. Statutory Lien or Full Freeze Action */}
                {selectedCase.status === 'OPEN' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleDossierLienOrFreeze('LIEN')}
                        disabled={isDossierLienPlacing}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer text-xs"
                      >
                        <span className="material-symbols-outlined text-[17px]">lock</span>
                        <span>{isDossierLienPlacing ? 'Placing Lien...' : 'Place Statutory Lien (Sec 106)'}</span>
                      </button>

                      <button
                        onClick={() => handleDossierLienOrFreeze('FULL_FREEZE')}
                        disabled={isDossierLienPlacing}
                        className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer text-xs"
                      >
                        <span className="material-symbols-outlined text-[17px]">ac_unit</span>
                        <span>{isDossierLienPlacing ? 'Freezing...' : 'Full Freeze (Sec 91)'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Pro-Rata Restitution Button */}
                {selectedCase.status !== 'RECOVERED' && (
                  <button
                    onClick={handleDossierRestitute}
                    disabled={isDossierRestituting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-700 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">savings</span>
                    <span>
                      {isDossierRestituting
                        ? 'Executing Restitution...'
                        : 'Execute Pro-Rata Restitution to Victim'}
                    </span>
                  </button>
                )}

                {/* 3. Multi-Bank Statutory Legal Notice Viewer */}
                <button
                  onClick={handleOpenLegalNotice}
                  className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">gavel</span>
                  <span>View Section 106 BNSS / 91 CrPC Multi-Bank Notice</span>
                </button>

                {/* 4. Recalculate AI Recovery Score */}
                <button
                  onClick={handleRecalculateScore}
                  disabled={isRecalculating}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-xs disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isRecalculating ? 'sync' : 'auto_mode'}
                  </span>
                  <span>{isRecalculating ? 'Recalculating Score...' : 'Recalculate AI Recovery Score'}</span>
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
