import React, { useState, useEffect } from 'react';

export interface OnlineUser {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'investigating' | 'idle';
  avatarColor: string;
}

const DEFAULT_USERS: OnlineUser[] = [
  { id: 'u1', name: 'Rahul Sharma', role: 'Lead Investigator', status: 'investigating', avatarColor: 'from-blue-600 to-indigo-600' },
  { id: 'u2', name: 'Sneha Patel', role: 'Fraud Analyst', status: 'active', avatarColor: 'from-purple-600 to-pink-600' },
  { id: 'u3', name: 'Karan Verma', role: 'Compliance Officer', status: 'active', avatarColor: 'from-emerald-600 to-teal-600' },
  { id: 'u4', name: 'Aditya Roy', role: 'Cyber Forensics', status: 'idle', avatarColor: 'from-amber-600 to-orange-600' },
];

export interface OnlineUsersPanelProps {
  demoMode?: boolean;
}

export const OnlineUsersPanel: React.FC<OnlineUsersPanelProps> = ({ demoMode = false }) => {
  const [users, setUsers] = useState<OnlineUser[]>(DEFAULT_USERS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Demo user activities
  useEffect(() => {
    if (!demoMode) return;

    const interval = setInterval(() => {
      const actions = [
        'Rahul Sharma opened investigation on ACC355642',
        'Sneha Patel flagged rapid layering chain',
        'Karan Verma requested freeze for ACC_RING_B',
        'Aditya Roy ran AI Copilot graph analysis',
        'Pooja Nair joined the investigation room',
      ];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      setToastMessage(randomAction);

      const timeout = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timeout);
    }, 9000);

    return () => clearInterval(interval);
  }, [demoMode]);

  return (
    <div className="glass-panel rounded-2xl border border-slate-700/50 p-3.5 shadow-xl flex flex-col gap-2.5 relative overflow-hidden">
      {/* Slide-in Toast for Live Activity */}
      {toastMessage && (
        <div className="absolute top-2 left-2 right-2 z-20 bg-gradient-to-r from-purple-900/90 to-blue-900/90 border border-purple-500/50 rounded-xl p-2 text-[10px] text-white flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-2 duration-300">
          <span className="material-symbols-outlined text-purple-400 text-sm animate-pulse">security</span>
          <span className="truncate flex-1">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Active Investigators</h4>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          {users.length} Online
        </span>
      </div>

      {/* Users List */}
      <div className="space-y-1.5">
        {users.map(u => (
          <div
            key={u.id}
            className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-br ${u.avatarColor} flex items-center justify-center text-white text-[10px] font-bold shadow-md`}
              >
                {u.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none mb-0.5">{u.name}</p>
                <p className="text-[9px] text-slate-400 leading-none">{u.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  u.status === 'investigating'
                    ? 'bg-purple-400 animate-ping'
                    : u.status === 'active'
                    ? 'bg-emerald-400'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-[9px] font-mono uppercase text-slate-400 capitalize">
                {u.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnlineUsersPanel;
