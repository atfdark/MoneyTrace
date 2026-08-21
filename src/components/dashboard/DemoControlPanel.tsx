import React, { useState } from 'react';
import { api } from '../../api';
import { soundAlarm } from '../../utils/soundAlarm';

export const DemoControlPanel: React.FC = () => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleTrigger = async (type: string) => {
    setLoadingAction(type);
    setStatusMsg(null);
    try {
      if (type === 'high_risk') {
        await api.post('/simulation/transaction?scenario=high_risk');
        setStatusMsg('✓ High risk ₹85,000 transaction dispatched to live WebSocket feed!');
      } else if (type === 'velocity') {
        await api.post('/simulation/transaction?scenario=velocity');
        setStatusMsg('✓ High velocity transaction generated!');
      } else if (type === 'mule_chain') {
        await api.post('/simulation/mule-chain');
        setStatusMsg('✓ 3-hop mule chain (ACC1001 → ACC1004) executed!');
      } else if (type === 'critical_alert') {
        await api.post('/simulation/alert');
        setStatusMsg('🚨 Critical Alert and Emergency Siren triggered!');
      }
    } catch (e: any) {
      setStatusMsg(`Error: ${e?.response?.data?.message || e.message || 'Simulation failed'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="glass-panel bg-[#0B0A1A]/95 border-2 border-purple-500/40 rounded-3xl p-4 shadow-2xl text-white space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400 text-xl animate-spin">
            settings_suggest
          </span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-300">
              Demo Simulation Control Center
            </h3>
            <p className="text-[10px] text-slate-400">1-Click Live Event Triggers for Presentations & Viva</p>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/50">
          ADMIN TOOL
        </span>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => handleTrigger('high_risk')}
          disabled={!!loadingAction}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-left transition-all hover:scale-102 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="material-symbols-outlined text-rose-400 text-base">warning</span>
            <span className="text-[8px] font-bold uppercase text-rose-400">₹85,000</span>
          </div>
          <p className="text-[11px] font-bold text-white mt-1">High Risk Txn</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Rahul → Aman</p>
        </button>

        <button
          onClick={() => handleTrigger('mule_chain')}
          disabled={!!loadingAction}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/40 text-left transition-all hover:scale-102 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="material-symbols-outlined text-purple-400 text-base">account_tree</span>
            <span className="text-[8px] font-bold uppercase text-purple-400">3-HOP</span>
          </div>
          <p className="text-[11px] font-bold text-white mt-1">Mule Layer Chain</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Layer 1 → 4</p>
        </button>

        <button
          onClick={() => handleTrigger('critical_alert')}
          disabled={!!loadingAction}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-red-500/40 text-left transition-all hover:scale-102 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="material-symbols-outlined text-red-400 text-base">emergency</span>
            <span className="text-[8px] font-bold uppercase text-red-400 animate-pulse">SIREN</span>
          </div>
          <p className="text-[11px] font-bold text-white mt-1">Critical Siren</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Test SOC Alarm</p>
        </button>

        <button
          onClick={() => handleTrigger('velocity')}
          disabled={!!loadingAction}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-left transition-all hover:scale-102 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="material-symbols-outlined text-amber-400 text-base">speed</span>
            <span className="text-[8px] font-bold uppercase text-amber-400">SPEED</span>
          </div>
          <p className="text-[11px] font-bold text-white mt-1">Velocity Drain</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Bot Script Burst</p>
        </button>
      </div>

      {statusMsg && (
        <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-[11px] text-purple-200 font-mono animate-in fade-in">
          {statusMsg}
        </div>
      )}
    </div>
  );
};

export default DemoControlPanel;
