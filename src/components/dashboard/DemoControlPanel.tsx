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

  const actions = [
    { type: 'high_risk', icon: 'warning', label: 'High Risk Txn', sub: '₹85,000 • Rahul → Aman', color: 'text-red-600 bg-red-50 border-red-200' },
    { type: 'mule_chain', icon: 'account_tree', label: 'Mule Chain', sub: '3-Hop Layer 1 → 4', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { type: 'critical_alert', icon: 'emergency', label: 'Critical Siren', sub: 'Test SOC Alarm', color: 'text-red-600 bg-red-50 border-red-200' },
    { type: 'velocity', icon: 'speed', label: 'Velocity Drain', sub: 'Bot Script Burst', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600 text-[18px]">settings_suggest</span>
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-900">Simulation Controls</h3>
            <p className="text-[11px] text-gray-400">1-click live event triggers for demonstrations</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
          Admin
        </span>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map((a) => (
          <button
            key={a.type}
            onClick={() => handleTrigger(a.type)}
            disabled={!!loadingAction}
            className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-left transition-all cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${a.color.split(' ')[0]}`}>{a.icon}</span>
            <p className="text-[12px] font-semibold text-gray-900 mt-1.5">{a.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{a.sub}</p>
          </button>
        ))}
      </div>

      {statusMsg && (
        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[12px] text-blue-700 font-medium">
          {statusMsg}
        </div>
      )}
    </div>
  );
};

export default DemoControlPanel;
