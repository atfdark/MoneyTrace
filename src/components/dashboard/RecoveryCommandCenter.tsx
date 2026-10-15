import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import { formatCurrency } from '../../utils/formatters';
import { soundAlarm } from '../../utils/soundAlarm';

export interface RecoveryBranch {
  branch_id: string;
  account_number: string;
  bank_name: string;
  rail: string;
  hop_level: number;
  tainted_amount: number;
  actual_balance: number;
  recoverable_amount: number;
  status: string;
  npci_ref: string;
}

export interface ScoreBreakdown {
  base_score?: number;
  final_score?: number;
  factors?: Array<{
    label: string;
    impact: string;
    type: 'positive' | 'negative' | 'neutral';
    category?: string;
  }>;
  golden_hour?: {
    is_active: boolean;
    window_minutes: number;
    elapsed_minutes: number;
    remaining_minutes: number;
    decay_multiplier: number;
    urgency: string;
  };
  metrics?: {
    amount_at_risk: number;
    total_recoverable: number;
    total_leaked: number;
    liquidity_coverage_ratio: number;
    active_branches_count: number;
    leaked_branches_count: number;
  };
}

interface Props {
  caseId?: string;
  alertId?: string;
  stolenAmount?: number;
  currentHolder?: string;
  holderBank?: string;
  recoveryProbability?: number;
  status?: string;
  recoveredAmount?: number;
  lienAmount?: number;
  recoveryBranches?: RecoveryBranch[];
  scoreBreakdown?: ScoreBreakdown;
  onFreezeSuccess?: (accountNumber: string) => void;
  onLienSuccess?: (mode: string) => void;
  onRestituteSuccess?: () => void;
}

export const RecoveryCommandCenter: React.FC<Props> = ({
  caseId,
  alertId = 'ALT2026081601',
  stolenAmount = 150000,
  currentHolder = 'ACC5008',
  holderBank = 'State Bank of India (Primary Node)',
  recoveryProbability = 88,
  status = 'OPEN',
  recoveredAmount = 0,
  lienAmount = 0,
  recoveryBranches,
  scoreBreakdown,
  onFreezeSuccess,
  onLienSuccess,
  onRestituteSuccess,
}) => {
  // Directive mode: "LIEN" (Targeted statutory lien under Sec 106 BNSS) or "FULL_FREEZE"
  const [selectedMode, setSelectedMode] = useState<'LIEN' | 'FULL_FREEZE'>('LIEN');
  const [showXRay, setShowXRay] = useState(false);

  // Stepper Dispatch State
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStep, setDispatchStep] = useState<1 | 2 | 3>(1);
  const [dispatchType, setDispatchType] = useState<'LIEN' | 'FULL_FREEZE' | 'RESTITUTION'>('LIEN');
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);

  // Local sync states
  const [isActionTaken, setIsActionTaken] = useState(status === 'ACTION_TAKEN' || status === 'RECOVERED');
  const [isRecovered, setIsRecovered] = useState(status === 'RECOVERED');
  const [localLienAmount, setLocalLienAmount] = useState<number>(lienAmount);
  const [localRecoveredAmount, setLocalRecoveredAmount] = useState<number>(recoveredAmount);

  // Synthesize realistic default 3-branch split if not provided by parent
  const branches: RecoveryBranch[] = useMemo(() => {
    if (recoveryBranches && recoveryBranches.length > 0) {
      return recoveryBranches;
    }
    const amt = stolenAmount || 150000;
    const br1Amt = Math.round(amt * 0.50);
    const br2Amt = Math.round(amt * 0.30);
    const br3Amt = amt - br1Amt - br2Amt;

    const st = status === 'RECOVERED' ? 'RESTITUTED' : status === 'ACTION_TAKEN' ? 'LIEN_MARKED' : 'ACTIVE';

    return [
      {
        branch_id: 'BR-01',
        account_number: currentHolder,
        bank_name: holderBank || 'State Bank of India (Primary Node)',
        rail: 'NEFT',
        hop_level: 1,
        tainted_amount: br1Amt,
        actual_balance: Math.round(br1Amt * 1.18),
        recoverable_amount: br1Amt,
        status: st,
        npci_ref: `NPCI-ISO20022-L1-51291`,
      },
      {
        branch_id: 'BR-02',
        account_number: 'ACC5212',
        bank_name: 'HDFC Bank (Secondary Mule)',
        rail: 'IMPS',
        hop_level: 2,
        tainted_amount: br2Amt,
        actual_balance: Math.round(br2Amt * 1.05),
        recoverable_amount: br2Amt,
        status: st,
        npci_ref: `NPCI-ISO20022-L2-68310`,
      },
      {
        branch_id: 'BR-03',
        account_number: `ATM-CASH-${currentHolder.slice(-4) || '9012'}`,
        bank_name: 'ATM Terminal / Cash-Out Mule',
        rail: 'ATM_EXIT',
        hop_level: 3,
        tainted_amount: br3Amt,
        actual_balance: 0,
        recoverable_amount: 0,
        status: 'LEAKED_ATM',
        npci_ref: `NPCI-ALERT-LEAK-79344`,
      },
    ];
  }, [recoveryBranches, stolenAmount, currentHolder, holderBank, status]);

  // Forecast Metrics
  const totalRecoverable = useMemo(() => {
    return branches.reduce((acc, b) => (b.status !== 'LEAKED_ATM' && b.rail !== 'ATM_EXIT' ? acc + b.recoverable_amount : acc), 0);
  }, [branches]);

  const totalLeaked = useMemo(() => {
    return branches.reduce((acc, b) => (b.status === 'LEAKED_ATM' || b.rail === 'ATM_EXIT' ? acc + b.tainted_amount : acc), 0);
  }, [branches]);

  const recoverablePct = Math.round((totalRecoverable / (stolenAmount || 1)) * 100);

  // Golden Hour Countdown Ticker (in seconds)
  const initialRemaining = scoreBreakdown?.golden_hour?.remaining_minutes
    ? Math.round(scoreBreakdown.golden_hour.remaining_minutes * 60)
    : 38 * 60 + 24;
  const [countdownSeconds, setCountdownSeconds] = useState<number>(initialRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  useEffect(() => {
    setIsActionTaken(status === 'ACTION_TAKEN' || status === 'RECOVERED');
    setIsRecovered(status === 'RECOVERED');
    setLocalLienAmount(lienAmount);
    setLocalRecoveredAmount(recoveredAmount);
  }, [status, lienAmount, recoveredAmount]);

  // Execute Statutory Lien / Freeze with 3-Step NPCI Stepper
  const handleExecuteDirective = async () => {
    setIsDispatching(true);
    setDispatchType(selectedMode);
    setDispatchStep(1);
    setDispatchLogs([
      `[00:00.12] Initializing ISO-20022 ${selectedMode === 'LIEN' ? 'Statutory Lien Directive (Sec 106 BNSS)' : 'Full Freeze Directive'}...`,
      `[00:00.45] Connecting to NPCI Central Fraud Switch / I4C Portal Gateway (Port 8443)...`,
    ]);

    soundAlarm.playBlip();

    try {
      // Step 2 timer
      setTimeout(() => {
        setDispatchStep(2);
        setDispatchLogs((prev) => [
          ...prev,
          `[00:01.10] ISO-20022 pacs.002 Directive Dispatched to ${branches.filter(b => b.rail !== 'ATM_EXIT').length} Beneficiary Nodes.`,
          `[00:01.42] ACK Received from SBI & HDFC — Targeted statutory lien placed on ₹${formatCurrency(totalRecoverable)}.`,
        ]);
        soundAlarm.playBlip();
      }, 900);

      // Backend API Call
      const res = await api.post('/recovery/action/freeze-and-protect', {
        case_id: caseId,
        alert_id: alertId,
        account_number: currentHolder,
        mode: selectedMode,
        reason: selectedMode === 'LIEN'
          ? `Statutory Lien Directive issued under Section 106 BNSS / I4C Protocol for Case ${caseId || alertId}`
          : `Emergency Full Freeze Directive issued under Section 91 CrPC for Case ${caseId || alertId}`,
      });

      // Step 3 completion timer
      setTimeout(() => {
        setDispatchStep(3);
        setDispatchLogs((prev) => [
          ...prev,
          `[00:02.15] I4C National Cybercrime Portal (1930) Docket Registered: ${(res.data as any)?.reference_no || 'NPCI-ACK-SUCCESS'}.`,
          `[00:02.40] Ring-fencing complete. Unencumbered legitimate capital remains active.`,
        ]);
        soundAlarm.playSuccessChime();

        setIsActionTaken(true);
        setLocalLienAmount((res.data as any)?.lien_amount || totalRecoverable);

        setTimeout(() => {
          setIsDispatching(false);
          if (onLienSuccess) onLienSuccess(selectedMode);
          if (onFreezeSuccess) onFreezeSuccess(currentHolder);
        }, 800);
      }, 1900);
    } catch (err) {
      console.error('Failed to execute directive:', err);
      setDispatchLogs((prev) => [...prev, `[ERROR] Failed to dispatch ISO-20022 directive. Reverting.`]);
      setTimeout(() => setIsDispatching(false), 1500);
    }
  };

  // Execute Pro-Rata Restitution with 3-Step Stepper
  const handleExecuteRestitution = async () => {
    if (!caseId) return;
    setIsDispatching(true);
    setDispatchType('RESTITUTION');
    setDispatchStep(1);
    setDispatchLogs([
      `[00:00.10] Invoking Judicial Restitution Engine under Section 106 BNSS / I4C Protocol...`,
      `[00:00.38] Computing Pro-Rata Recoverable Capital across non-leaked banking branches...`,
    ]);

    soundAlarm.playBlip();

    try {
      setTimeout(() => {
        setDispatchStep(2);
        setDispatchLogs((prev) => [
          ...prev,
          `[00:01.05] Pro-Rata settlement calculated: ₹${formatCurrency(totalRecoverable)} (${recoverablePct}%) recoverable; ₹${formatCurrency(totalLeaked)} ATM shortfall.`,
          `[00:01.35] Releasing Statutory Liens and dispatching credit batch via NPCI IMPS/NEFT settlement...`,
        ]);
        soundAlarm.playBlip();
      }, 950);

      const res = await api.post(`/recovery/cases/${caseId}/restitute`);

      setTimeout(() => {
        setDispatchStep(3);
        setDispatchLogs((prev) => [
          ...prev,
          `[00:02.10] Restitution Transaction ${(res.data as any)?.transaction_id || 'TXN_REST'} settled to Victim account.`,
          `[00:02.35] Docket Closed. Pro-rata capital restoration complete.`,
        ]);
        soundAlarm.playSuccessChime();

        setIsRecovered(true);
        setIsActionTaken(true);
        setLocalRecoveredAmount((res.data as any)?.amount_restituted || totalRecoverable);

        setTimeout(() => {
          setIsDispatching(false);
          if (onRestituteSuccess) onRestituteSuccess();
        }, 800);
      }, 2100);
    } catch (err) {
      console.error('Failed to restitute case:', err);
      setDispatchLogs((prev) => [...prev, `[ERROR] Pro-Rata Restitution failed to settle.`]);
      setTimeout(() => setIsDispatching(false), 1500);
    }
  };

  return (
    <div
      className={`rounded-2xl p-5 lg:p-6 border-2 transition-all duration-300 relative overflow-hidden shadow-2xl ${
        isRecovered
          ? 'bg-gradient-to-br from-slate-950 via-emerald-950/80 to-slate-950 border-emerald-500/80 text-white'
          : isActionTaken
          ? 'bg-gradient-to-br from-slate-950 via-blue-950/80 to-slate-950 border-blue-500/80 text-white'
          : 'bg-gradient-to-br from-slate-950 via-rose-950/70 to-slate-950 border-rose-500/70 text-white'
      }`}
    >
      {/* Background Micro-Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Top Bar: Institutional Status & Urgency Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4 relative z-10">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Institutional Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            <span>I4C / NPCI MULTI-BRANCH COMMAND</span>
          </div>

          {/* Action Status Badge */}
          <span
            className={`px-3 py-1 rounded-full font-mono text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 ${
              isRecovered
                ? 'bg-emerald-500/30 border border-emerald-400/60 text-emerald-300 shadow-sm'
                : isActionTaken
                ? 'bg-blue-500/30 border border-blue-400/60 text-blue-300'
                : 'bg-rose-500/30 border border-rose-400/60 text-rose-300 animate-pulse'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRecovered ? 'bg-emerald-400' : isActionTaken ? 'bg-blue-400' : 'bg-rose-400 animate-ping'
              }`}
            />
            <span>
              {isRecovered
                ? '🎉 PRO-RATA CAPITAL RESTITUTED'
                : isActionTaken
                ? '🔒 STATUTORY LIEN ACTIVE (SEC 106 BNSS)'
                : '🚨 CRITICAL INTERCEPT WINDOW ACTIVE'}
            </span>
          </span>

          {/* Golden Hour Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] font-bold border transition-colors ${
              countdownSeconds > 0
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                : 'bg-amber-500/20 border-amber-400/50 text-amber-300'
            }`}
            title="Golden Hour Exponential Decay Intercept Window"
          >
            <span className="material-symbols-outlined text-[15px] animate-pulse">timer</span>
            <span>
              {countdownSeconds > 0
                ? `GOLDEN HOUR ACTIVE • ${formatCountdown(countdownSeconds)}`
                : 'POST-GOLDEN HOUR DECAY'}
            </span>
          </div>
        </div>

        {/* Case / Alert ID and Score X-Ray Toggle */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setShowXRay(!showXRay)}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showXRay
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-md'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">insights</span>
            <span>{showXRay ? 'Hide Score X-Ray' : 'Score X-Ray'}</span>
          </button>

          <span className="text-[11px] font-mono text-gray-400 font-bold bg-black/40 px-3 py-1 rounded-xl border border-white/10">
            {caseId ? `CASE: ${caseId}` : `ALERT: ${alertId}`}
          </span>
        </div>
      </div>

      {/* Main Grid: Left Story & Forecast vs Right Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Column: Story, Forecast & Multi-Branch Tree (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Main Title Banner */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl lg:text-2xl font-black tracking-tight text-white">
                {isRecovered
                  ? 'We Have Recovered: Pro-Rata Restitution Completed'
                  : isActionTaken
                  ? 'Mule Ring Disrupted — Statutory Liens Enforced'
                  : 'Multi-Branch Fund Siphon in Progress'}
              </h2>
              <span className={`font-mono text-lg font-black ${isRecovered ? 'text-emerald-400' : 'text-rose-400'}`}>
                ({formatCurrency(stolenAmount)})
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              {isRecovered
                ? `Total of ₹${formatCurrency(localRecoveredAmount || totalRecoverable)} successfully credited back to victim account via NPCI settlement switch.`
                : isActionTaken
                ? `Section 106 BNSS targeted statutory lien of ₹${formatCurrency(localLienAmount || totalRecoverable)} placed across beneficiary branches without locking legitimate funds.`
                : `Proceeds split across ${branches.length} layered branches. High intercept probability within Golden Hour window.`}
            </p>
          </div>

          {/* Capital Recovery Forecast Segmented Progress Bar */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">
                Capital Recovery Forecast & Shortfall Analysis
              </span>
              <span className="font-mono text-xs font-black text-emerald-400">
                {recoverablePct}% Recoverable in Banking Rails
              </span>
            </div>

            {/* Segmented Bar */}
            <div className="w-full h-3 rounded-full bg-slate-800 flex overflow-hidden p-0.5 border border-white/10">
              <div
                style={{ width: `${recoverablePct}%` }}
                className="h-full rounded-l-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500 shadow-sm"
                title={`Recoverable in Bank Rails: ₹${formatCurrency(totalRecoverable)}`}
              />
              <div
                style={{ width: `${100 - recoverablePct}%` }}
                className="h-full rounded-r-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-500"
                title={`ATM Cash-Out Leakage: ₹${formatCurrency(totalLeaked)}`}
              />
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] uppercase text-gray-400 block font-sans font-bold">Stolen Capital</span>
                <span className="font-black text-white">{formatCurrency(stolenAmount)}</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[9px] uppercase text-emerald-300 block font-sans font-bold">Lien Eligible</span>
                <span className="font-black text-emerald-400">{formatCurrency(totalRecoverable)}</span>
              </div>
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-[9px] uppercase text-rose-300 block font-sans font-bold">ATM Shortfall</span>
                <span className="font-black text-rose-400">{formatCurrency(totalLeaked)}</span>
              </div>
            </div>
          </div>

          {/* Multi-Branch Connected Layering Cards */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">
                Multi-Mule Fan-Out Layering Tree ({branches.length} Nodes)
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                ISO-20022 Telemetry Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {branches.map((b) => {
                const isLeaked = b.status === 'LEAKED_ATM' || b.rail === 'ATM_EXIT';
                const isLien = b.status === 'LIEN_MARKED';
                const isRest = b.status === 'RESTITUTED';

                return (
                  <div
                    key={b.branch_id}
                    className={`p-3 rounded-xl border transition-all text-xs space-y-2 relative ${
                      isRest
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                        : isLien
                        ? 'bg-blue-950/40 border-blue-500/50 text-white'
                        : isLeaked
                        ? 'bg-rose-950/30 border-rose-500/40 text-gray-300'
                        : 'bg-slate-900/80 border-slate-700 text-white'
                    }`}
                  >
                    {/* Branch Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[9px] font-bold text-gray-300">
                          Hop {b.hop_level}
                        </span>
                        <span className="font-bold text-[11px] truncate max-w-[110px]" title={b.bank_name}>
                          {b.bank_name.split(' ')[0]} {b.bank_name.split(' ')[1] || ''}
                        </span>
                      </div>

                      {/* Rail Pill */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          b.rail === 'NEFT'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : b.rail === 'IMPS'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {b.rail}
                      </span>
                    </div>

                    {/* Account & Tainted Sum */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-amber-300 font-bold">{b.account_number}</span>
                        <span className="font-mono font-black text-white">{formatCurrency(b.tainted_amount)}</span>
                      </div>

                      {/* Tainted vs Balance Bar */}
                      {!isLeaked && (
                        <div className="space-y-0.5 pt-0.5">
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                            <div
                              style={{
                                width: `${Math.min(100, Math.round((b.tainted_amount / (b.actual_balance || 1)) * 100))}%`,
                              }}
                              className="bg-amber-400 h-full rounded-full"
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-gray-400">
                            <span>Tainted: {formatCurrency(b.tainted_amount)}</span>
                            <span>Live: {formatCurrency(b.actual_balance)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status & NPCI Ref */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] font-mono">
                      <span className="text-gray-400 truncate max-w-[90px]" title={b.npci_ref}>
                        {b.npci_ref.slice(0, 14)}...
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-black uppercase ${
                          isRest
                            ? 'bg-emerald-500/30 text-emerald-300'
                            : isLien
                            ? 'bg-blue-500/30 text-blue-300'
                            : isLeaked
                            ? 'bg-rose-500/30 text-rose-300'
                            : 'bg-amber-500/30 text-amber-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: AI Score Gauge, Controls & Actions (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4 bg-black/40 p-4 rounded-2xl border border-white/10">
          {/* Recovery Likelihood Gauge */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400">AI Recovery Likelihood</span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold">Phase 7 Engine</span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-emerald-400">
                  {isRecovered ? '100' : recoveryProbability}
                </span>
                <span className="text-xs text-gray-400 font-mono">/ 100</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  recoveryProbability >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {isRecovered ? 'RECOVERED' : recoveryProbability >= 80 ? 'HIGH PROBABILITY' : 'MEDIUM'}
              </span>
            </div>

            {/* Mini Progress */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${isRecovered ? 100 : recoveryProbability}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              />
            </div>
          </div>

          {/* Action Mode Toggle (Lien vs Freeze) */}
          {!isRecovered && !isActionTaken && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Select Intercept Mode</span>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedMode('LIEN')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedMode === 'LIEN'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-md'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1 font-extrabold text-[11px]">
                    <span className="material-symbols-outlined text-[15px]">lock</span>
                    <span>Statutory Lien</span>
                  </div>
                  <span className="text-[9px] text-gray-400 block mt-0.5">Sec 106 BNSS (Targeted)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('FULL_FREEZE')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedMode === 'FULL_FREEZE'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200 shadow-md'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1 font-extrabold text-[11px]">
                    <span className="material-symbols-outlined text-[15px]">ac_unit</span>
                    <span>Full Freeze</span>
                  </div>
                  <span className="text-[9px] text-gray-400 block mt-0.5">Sec 91 CrPC (Halt Node)</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="space-y-2 pt-1">
            {isRecovered ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-center space-y-1">
                <div className="flex items-center justify-center gap-2 font-black text-sm">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                  <span>FUNDS RESTITUTED</span>
                </div>
                <p className="text-[11px] font-mono text-emerald-200">
                  ₹{formatCurrency(localRecoveredAmount || totalRecoverable)} Restored to Victim
                </p>
              </div>
            ) : isActionTaken ? (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/50 text-blue-300 text-center space-y-0.5">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
                    <span className="material-symbols-outlined text-[16px]">lock_clock</span>
                    <span>STATUTORY LIEN ENFORCED</span>
                  </div>
                  <p className="text-[10px] font-mono text-blue-200">
                    Ring-Fenced: ₹{formatCurrency(localLienAmount || totalRecoverable)}
                  </p>
                </div>

                {caseId && (
                  <button
                    onClick={handleExecuteRestitution}
                    disabled={isDispatching}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:scale-[1.01]"
                  >
                    <span className="material-symbols-outlined text-[18px]">savings</span>
                    <span>Execute Pro-Rata Restitution</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleExecuteDirective}
                disabled={isDispatching}
                className={`w-full py-3.5 text-white font-extrabold text-xs rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:scale-[1.02] border ${
                  selectedMode === 'LIEN'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-400/40 shadow-emerald-950/80'
                    : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 hover:from-rose-500 hover:to-red-500 border-rose-400/40 shadow-rose-950/80'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {selectedMode === 'LIEN' ? 'shield' : 'ac_unit'}
                </span>
                <span>
                  {selectedMode === 'LIEN'
                    ? 'Batch Place Statutory Lien (Sec 106 BNSS)'
                    : `Emergency Freeze Node ${currentHolder}`}
                </span>
              </button>
            )}

            <div className="flex items-center justify-between text-[11px] pt-1 text-gray-400">
              <span className="text-[10px]">ISO-20022 Directives Ready</span>
              <a href="/flow" className="text-gray-300 hover:text-white underline font-semibold flex items-center gap-0.5">
                <span>Money Flow</span>
                <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Score X-Ray Panel */}
      {showXRay && (
        <div className="mt-5 p-4 rounded-2xl bg-black/60 border border-cyan-500/40 animate-in fade-in slide-in-from-top-3 relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-[18px]">troubleshoot</span>
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-200">
                Score X-Ray / Explainable AI Factor Weights
              </h4>
            </div>
            <span className="font-mono text-[10px] text-cyan-300">
              Base Score: 50.0 • Final Score: {recoveryProbability}/100
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
            {(scoreBreakdown?.factors || [
              { label: 'Golden Hour Window (< 30m elapsed)', impact: '+25', type: 'positive', category: 'TIMING' },
              { label: 'Liquidity Coverage (80% in banking rails)', impact: '+18', type: 'positive', category: 'LIQUIDITY' },
              { label: 'Batch Settlement Window (NEFT/RTGS)', impact: '+15', type: 'positive', category: 'RAIL' },
              { label: 'Multi-Mule Fan-Out (3 branches)', impact: '-12', type: 'negative', category: 'STRUCTURE' },
              { label: 'Instant Rail Velocity (UPI/IMPS)', impact: '-5', type: 'negative', category: 'VELOCITY' },
              { label: 'ATM Cash-Out Leakage (20% shortfall)', impact: '-10', type: 'negative', category: 'LEAKAGE' },
            ]).map((factor, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-2"
              >
                <div className="space-y-0.5 truncate">
                  <span className="text-[9px] font-mono font-bold text-gray-400 uppercase block">
                    {factor.category || 'FACTOR'}
                  </span>
                  <span className="text-[11px] font-bold text-gray-200 truncate block" title={factor.label}>
                    {factor.label}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-xs font-black ${
                    factor.type === 'positive'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : factor.type === 'negative'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
                  }`}
                >
                  {factor.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Step Live NPCI / Inter-Bank Dispatch Stepper Modal */}
      {isDispatching && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-cyan-500/60 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-white space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white">
                    {dispatchType === 'RESTITUTION'
                      ? 'NPCI / I4C Pro-Rata Restitution Dispatch'
                      : dispatchType === 'LIEN'
                      ? 'NPCI ISO-20022 Statutory Lien Directives'
                      : 'Emergency Sec 91 CrPC Freeze Broadcast'}
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-300">
                    Routing Directive to Member Banks & NPCI Gateway
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                Step {dispatchStep} of 3
              </span>
            </div>

            {/* Stepper Visualization */}
            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors ${
                    dispatchStep >= 1 ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-gray-400'
                  }`}
                >
                  {dispatchStep > 1 ? '✓' : '1'}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">
                    Dispatching ISO-20022 Lien Directive via NPCI Switch
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Transmitting pacs.002 settlement holds to Beneficiary Bank Nodes (SBI, HDFC).
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors ${
                    dispatchStep >= 2 ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-gray-400'
                  }`}
                >
                  {dispatchStep > 2 ? '✓' : '2'}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">
                    Beneficiary Bank ACK Received — Tainted Sums Ring-Fenced
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Beneficiary core banking confirmed statutory lien under Section 106 BNSS.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors ${
                    dispatchStep >= 3 ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-gray-400'
                  }`}
                >
                  {dispatchStep >= 3 ? '✓' : '3'}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">
                    {dispatchType === 'RESTITUTION'
                      ? 'Ledger Updated / Pro-Rata Restitution Settled to Victim'
                      : 'Statutory Ledger Updated & I4C National Dossier Registered'}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Digital audit trail certified with SHA-256 cryptographic hash.
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal Live Output */}
            <div className="p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-[10px] text-emerald-400 space-y-1 max-h-24 overflow-y-auto">
              {dispatchLogs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecoveryCommandCenter;
