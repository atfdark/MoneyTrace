import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuthStore } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatters';

interface ScenarioType {
  id: string;
  name: string;
  description: string;
  total_steps: number;
}

interface ScenarioRun {
  scenario_id: string;
  scenario_type: string;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'failed' | 'completed';
  current_step: number;
  total_steps: number;
}

interface TwoPhaseState {
  phase: 'idle' | 'draining' | 'drained' | 'recovering' | 'recovered';
  countdown: number;
  caseId?: string;
  alertId?: string;
  victimAccount?: string;
  victimBalance?: number;
  amountDrained?: number;
  splits?: Array<{ to: string; amount: number; role: string }>;
  mulesFrozen?: string[];
  message?: string;
}

export const ScenarioController: React.FC = () => {
  const [types, setTypes] = useState<ScenarioType[]>([]);
  const [activeRun, setActiveRun] = useState<ScenarioRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clearAuth, user } = useAuthStore();

  // Two-Phase Simulation State
  const [twoPhaseState, setTwoPhaseState] = useState<TwoPhaseState>({
    phase: 'idle',
    countdown: 0,
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const res = await api.get('/scenarios/types');
      setTypes(res.data as ScenarioType[]);
    } catch {
      // Keep silent on mobile remote if standard types fail
    }
  };

  // =========================================================================
  // TWO-PHASE ATTACK & RECOVERY SIMULATION HANDLERS
  // =========================================================================

  // Step 1: Drain & Split
  const handleExecuteDrain = async (): Promise<any> => {
    setLoading(true);
    setError(null);
    setTwoPhaseState(prev => ({ ...prev, phase: 'draining', message: 'Executing siphon attack on victim account...' }));

    try {
      const res = await api.post('/simulation/two-phase/drain');
      const data: any = res.data;
      setTwoPhaseState({
        phase: 'drained',
        countdown: 0,
        caseId: data.case_id,
        alertId: data.alert_id,
        victimAccount: data.victim_account,
        victimBalance: data.victim_balance,
        amountDrained: data.total_stolen || 150000,
        splits: data.splits || [
          { to: 'ACC1002', amount: 60000, role: 'Mule Hop 1' },
          { to: 'ACC1003', amount: 50000, role: 'Mule Hop 2' },
          { to: 'ACC1004', amount: 40000, role: 'Terminal Mule Hop 3' },
        ],
        message: `Step 1 Executed: ₹1,50,000 drained from ${data.victim_account} and split into 3 mules. Siren active on SOC display!`,
      });
      return data;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to execute drain simulation');
      setTwoPhaseState(prev => ({ ...prev, phase: 'idle' }));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Emergency Freeze & Full Recovery
  const handleExecuteRecover = async (targetCaseId?: string): Promise<any> => {
    setLoading(true);
    setError(null);
    setTwoPhaseState(prev => ({ ...prev, phase: 'recovering', message: 'Executing Sec 91 CrPC freezes and capital restitution...' }));

    try {
      const caseToUse = targetCaseId || twoPhaseState.caseId;
      const qs = caseToUse ? `?case_id=${caseToUse}` : '';
      const res = await api.post(`/simulation/two-phase/recover${qs}`);
      const data: any = res.data;
      setTwoPhaseState(prev => ({
        ...prev,
        phase: 'recovered',
        countdown: 0,
        caseId: data.case_id || prev.caseId,
        alertId: data.alert_id || prev.alertId,
        victimAccount: data.victim_account || prev.victimAccount,
        victimBalance: data.victim_new_balance || 250000,
        mulesFrozen: data.mules_frozen || ['ACC1002', 'ACC1003', 'ACC1004'],
        message: `🎉 WE HAVE RECOVERED: 100% of capital (₹1,50,000) restituted to victim! All 3 mule accounts frozen under Section 91 CrPC.`,
      }));
      return data;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to execute recovery simulation');
      setTwoPhaseState(prev => ({ ...prev, phase: 'drained' }));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 1-Click End-to-End Runner (Step 1 -> Auto Delay 4s -> Step 2)
  const handleRunFullLifecycle = async () => {
    try {
      // 1. Run Drain
      const drainData = await handleExecuteDrain();
      const generatedCaseId = drainData.case_id;

      // 2. Start 4-second countdown with visual feedback
      let count = 4;
      setTwoPhaseState(prev => ({
        ...prev,
        countdown: count,
        message: `Phase 1 Active: ₹1,50,000 split across 3 mules. Siren wailing on SOC workstation! Auto-recovering in ${count}s...`,
      }));

      const interval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setTwoPhaseState(prev => ({
            ...prev,
            countdown: count,
            message: `Phase 1 Active: ₹1,50,000 split across 3 mules. Siren wailing on SOC workstation! Auto-recovering in ${count}s...`,
          }));
        } else {
          clearInterval(interval);
          // 3. Automatically trigger Step 2 (Full Recovery)
          handleExecuteRecover(generatedCaseId);
        }
      }, 1000);
    } catch (e) {
      console.error('Lifecycle error:', e);
    }
  };

  const handleResetLifecycle = () => {
    setTwoPhaseState({
      phase: 'idle',
      countdown: 0,
    });
    setError(null);
  };

  // =========================================================================
  // STANDARD SCENARIO ENGINE COMMANDS
  // =========================================================================
  const startScenario = async (typeId: string) => {
    try {
      setLoading(true);
      const res = await api.post('/scenarios/start', { scenario_type: typeId });
      setActiveRun(res.data as ScenarioRun);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start scenario');
    } finally {
      setLoading(false);
    }
  };

  const sendCommand = async (command: 'pause' | 'resume' | 'step' | 'stop') => {
    if (!activeRun) return;
    try {
      setLoading(true);
      const res = await api.post(`/scenarios/${activeRun.scenario_id}/command`, { command });
      setActiveRun(res.data as ScenarioRun);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to send ${command}`);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = async () => {
    try {
      setLoading(true);
      await api.post('/scenarios/reset');
      setActiveRun(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset scenarios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col p-4 sm:p-6 pb-24">
      {/* Header */}
      <header className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[20px]">phone_iphone</span>
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>SOC Remote Control</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h1>
            <p className="text-[11px] text-slate-400">Tactical Simulation Controller</p>
          </div>
        </div>

        <button
          onClick={clearAuth}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          title="Sign out"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </header>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-3.5 rounded-xl mb-5 text-xs flex justify-between items-center animate-in fade-in">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold text-base hover:text-white ml-2">
            &times;
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1-CLICK TWO-PHASE ATTACK & RECOVERY SIMULATOR (HERO SECTION) */}
      {/* =================================================================== */}
      <section className="bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-5 mb-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
              2-STEP STORY ENGINE
            </span>
            <span className="text-[11px] font-mono text-slate-400">Live Presentation</span>
          </div>

          {twoPhaseState.phase !== 'idle' && (
            <button
              onClick={handleResetLifecycle}
              className="text-[11px] text-slate-400 hover:text-white underline font-semibold"
            >
              Reset
            </button>
          )}
        </div>

        <h2 className="text-lg font-black text-white tracking-tight mb-1">
          Attack &amp; Asset Recovery Simulator
        </h2>
        <p className="text-[12px] text-slate-400 mb-4 leading-relaxed">
          Simulates victim account balance siphon across 3 mule accounts, activates SOC siren on workstation, then executes Section 91 CrPC freeze &amp; 100% fund restitution.
        </p>

        {/* Live Phase Visual Banner */}
        <div className={`p-3.5 rounded-xl border mb-4 transition-all duration-300 ${
          twoPhaseState.phase === 'recovered'
            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
            : twoPhaseState.phase === 'drained'
            ? 'bg-red-950/70 border-red-500 text-red-200'
            : twoPhaseState.phase === 'draining' || twoPhaseState.phase === 'recovering'
            ? 'bg-amber-950/70 border-amber-500 text-amber-200 animate-pulse'
            : 'bg-slate-950/80 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                twoPhaseState.phase === 'recovered' ? 'bg-emerald-400' :
                twoPhaseState.phase === 'drained' ? 'bg-red-500 animate-ping' :
                twoPhaseState.phase === 'idle' ? 'bg-slate-500' : 'bg-amber-400'
              }`} />
              {twoPhaseState.phase === 'recovered'
                ? 'PHASE 2 COMPLETE: ASSETS RECOVERED'
                : twoPhaseState.phase === 'drained'
                ? 'PHASE 1 ACTIVE: FUNDS DRAINED & SPLIT'
                : twoPhaseState.phase === 'draining'
                ? 'EXECUTING PHASE 1 ATTACK...'
                : twoPhaseState.phase === 'recovering'
                ? 'EXECUTING PHASE 2 RECOVERY...'
                : 'READY TO SIMULATE'}
            </span>

            {twoPhaseState.countdown > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                AUTO-RECOVER IN {twoPhaseState.countdown}s
              </span>
            )}
          </div>

          <p className="text-[12px] font-semibold leading-relaxed">
            {twoPhaseState.message || 'Tap the 1-Click button below to launch the complete end-to-end incident & recovery story.'}
          </p>

          {/* Siphon details preview if drained or recovered */}
          {twoPhaseState.splits && twoPhaseState.splits.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-white/10 grid grid-cols-3 gap-2 text-[10px]">
              {twoPhaseState.splits.map((s, idx) => (
                <div key={idx} className="bg-black/40 p-2 rounded-lg text-center">
                  <span className="text-slate-400 block">{s.role}</span>
                  <span className="font-mono font-bold text-amber-300">{s.to}</span>
                  <span className="font-mono block text-white font-extrabold">{formatCurrency(s.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Frozen mules badge if recovered */}
          {twoPhaseState.mulesFrozen && twoPhaseState.mulesFrozen.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-emerald-500/30 flex items-center justify-between text-[11px] font-mono">
              <span className="text-emerald-300 font-bold">❄️ Frozen Under Sec 91:</span>
              <span className="text-white font-extrabold">{twoPhaseState.mulesFrozen.join(', ')}</span>
            </div>
          )}
        </div>

        {/* THE 1-CLICK BIG ACTION BUTTON */}
        <button
          onClick={handleRunFullLifecycle}
          disabled={loading || twoPhaseState.countdown > 0}
          className="w-full py-4 bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-xl shadow-indigo-950/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer transform active:scale-95 border border-white/20 mb-3"
        >
          <span className="material-symbols-outlined text-[22px]">
            {loading ? 'sync' : 'bolt'}
          </span>
          <span>1-CLICK FULL LIFECYCLE (Drain → Split → 100% Recover)</span>
        </button>

        {/* TWO DEDICATED STEP BUTTONS (For manual control during presentation) */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Step 1 Button */}
          <button
            onClick={handleExecuteDrain}
            disabled={loading || twoPhaseState.countdown > 0}
            className="py-3 px-3 bg-red-950/80 hover:bg-red-900 border border-red-500/50 hover:border-red-400 text-red-200 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 cursor-pointer text-center"
          >
            <div className="flex items-center gap-1 font-black">
              <span className="material-symbols-outlined text-[16px] text-red-400">call_split</span>
              <span>Step 1: Siphon Funds</span>
            </div>
            <span className="text-[10px] text-red-400/80 font-normal">
              Drain ₹1.5L &amp; Split to 3 Mules
            </span>
          </button>

          {/* Step 2 Button */}
          <button
            onClick={() => handleExecuteRecover()}
            disabled={loading || twoPhaseState.countdown > 0}
            className="py-3 px-3 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-200 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 cursor-pointer text-center"
          >
            <div className="flex items-center gap-1 font-black">
              <span className="material-symbols-outlined text-[16px] text-emerald-400">verified_user</span>
              <span>Step 2: Full Recovery</span>
            </div>
            <span className="text-[10px] text-emerald-400/80 font-normal">
              Freeze Mules &amp; Restitute 100%
            </span>
          </button>
        </div>
      </section>

      {/* =================================================================== */}
      {/* STANDARD SCENARIO ENGINE RUNNER */}
      {/* =================================================================== */}
      {activeRun ? (
        <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold mb-1 text-white">
                {types.find(t => t.id === activeRun.scenario_type)?.name || activeRun.scenario_type}
              </h2>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${
                  activeRun.status === 'running' ? 'bg-green-500 animate-pulse' :
                  activeRun.status === 'paused' ? 'bg-yellow-500' :
                  activeRun.status === 'failed' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></span>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  {activeRun.status}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-light text-indigo-400 font-mono">
                {activeRun.current_step} <span className="text-slate-500 text-base">/ {activeRun.total_steps}</span>
              </div>
              <div className="text-[10px] tracking-wider text-slate-500 uppercase mt-0.5">Steps Done</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-2 mb-6 overflow-hidden">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                activeRun.status === 'completed' ? 'bg-indigo-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${(activeRun.current_step / activeRun.total_steps) * 100}%` }}
            ></div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => sendCommand('step')}
              disabled={loading || activeRun.status === 'completed' || activeRun.status === 'stopped'}
              className="col-span-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-colors shadow-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">fast_forward</span>
              <span>Execute Next Step</span>
            </button>

            {activeRun.status === 'running' ? (
              <button
                onClick={() => sendCommand('pause')}
                disabled={loading}
                className="py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-yellow-400 text-[18px]">pause</span>
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={() => sendCommand('resume')}
                disabled={loading || activeRun.status === 'completed' || activeRun.status === 'stopped'}
                className="py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-green-400 text-[18px]">play_arrow</span>
                <span>Resume</span>
              </button>
            )}

            <button
              onClick={() => sendCommand('stop')}
              disabled={loading || activeRun.status === 'completed' || activeRun.status === 'stopped'}
              className="py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors text-red-400 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">stop</span>
              <span>Stop</span>
            </button>
          </div>

          <button
            onClick={resetAll}
            disabled={loading}
            className="mt-auto py-3 text-slate-500 hover:text-white transition-colors uppercase tracking-widest text-[11px] font-bold flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reset Controller</span>
          </button>
        </div>
      ) : (
        /* Scenarios List UI */
        <div className="flex-1 overflow-y-auto">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
            Standard Scenario Library
          </h2>
          <div className="space-y-3">
            {types.map(type => (
              <button
                key={type.id}
                onClick={() => startScenario(type.id)}
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-xl text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {type.name}
                  </h3>
                  <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono">
                    {type.total_steps} steps
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{type.description}</p>

                <div className="mt-3 flex items-center text-indigo-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[16px] mr-1">play_circle</span>
                  Launch Scenario
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioController;
