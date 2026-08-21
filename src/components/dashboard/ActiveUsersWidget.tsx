import React from 'react';
import { useLiveTelemetry, ActiveUserItem } from '../../hooks/useWebSocket';

export const ActiveUsersWidget: React.FC = () => {
  const { activeUsers } = useLiveTelemetry();

  // Fallback demo users if none yet loaded
  const defaultUsers = [
    { username: 'Rahul Sharma', account_number: 'ACC1001', role: 'CUSTOMER', online_status: 'online' },
    { username: 'Sneha Patel', account_number: 'ACC1002', role: 'CUSTOMER', online_status: 'online' },
    { username: 'Aman Verma', account_number: 'ACC1003', role: 'CUSTOMER', online_status: 'online' },
    { username: 'Priya Nair', account_number: 'ACC1004', role: 'CUSTOMER', online_status: 'online' },
    { username: 'Karan Malhotra', account_number: 'ACC1005', role: 'CUSTOMER', online_status: 'online' },
    { username: 'Vikram Singh', account_number: 'ACC1006', role: 'CUSTOMER', online_status: 'online' },
  ];

  const list = activeUsers.length > 0 ? activeUsers : defaultUsers;

  return (
    <div className="glass-panel bg-[#0B1020]/90 border border-slate-800 rounded-2xl p-4 shadow-xl text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Active Users Monitor
          </h3>
        </div>
        <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          {list.length} Online
        </span>
      </div>

      {/* Users Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
        {list.map((u: any, i: number) => {
          const initials = u.username
            ? u.username.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            : 'US';

          const roleBadgeColor = u.role === 'ADMIN'
            ? 'bg-purple-500/20 text-purple-300'
            : u.role === 'INVESTIGATOR' || u.role === 'ANALYST'
            ? 'bg-blue-500/20 text-blue-300'
            : 'bg-slate-800 text-slate-400';

          return (
            <div
              key={u.account_number || i}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
            >
              {/* Avatar with presence dot */}
              <div className="relative flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{u.username}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-mono text-slate-400 truncate">{u.account_number}</span>
                  <span className={`text-[8px] font-bold uppercase px-1 rounded ${roleBadgeColor}`}>
                    {u.role}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveUsersWidget;
