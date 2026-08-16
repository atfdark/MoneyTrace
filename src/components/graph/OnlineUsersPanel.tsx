import React, { useMemo } from 'react';
import { useInvestigators } from '../../hooks/useDashboard';
import { useUser } from '../../hooks/useAuth';

export interface OnlineUser {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'investigating' | 'idle';
  avatarColor: string;
}

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-pink-600',
  'from-emerald-600 to-teal-600',
  'from-amber-600 to-orange-600',
  'from-cyan-600 to-blue-600',
  'from-rose-600 to-red-600',
];

export interface OnlineUsersPanelProps {
  demoMode?: boolean;
}

export const OnlineUsersPanel: React.FC<OnlineUsersPanelProps> = () => {
  const { data: investigatorsData, isLoading } = useInvestigators();
  const { data: currentUser } = useUser();

  const investigatorsList = (investigatorsData?.leaderboard || (Array.isArray(investigatorsData) ? investigatorsData : [])) as any[];

  const users: OnlineUser[] = useMemo(() => {
    if (Array.isArray(investigatorsList) && investigatorsList.length > 0) {
      return investigatorsList.map((inv: any, idx: number) => ({
        id: String(inv.investigator_id || inv.id || `inv-${idx}`),
        name: inv.name || inv.full_name || 'Investigator',
        role: inv.assigned_cases > 0 ? `${inv.assigned_cases} Active Cases` : 'Forensic Investigator',
        status: inv.assigned_cases > 0 ? ('investigating' as const) : ('active' as const),
        avatarColor: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length],
      }));
    }

    if (currentUser) {
      return [
        {
          id: String(currentUser.id || 'curr-user'),
          name: currentUser.full_name || currentUser.email || 'Investigator',
          role: typeof currentUser.role === 'string' ? currentUser.role.toUpperCase() : 'INVESTIGATOR',
          status: 'active' as const,
          avatarColor: AVATAR_GRADIENTS[0],
        },
      ];
    }

    return [];
  }, [investigatorsList, currentUser]);

  return (
    <div className="glass-panel rounded-2xl border border-slate-700/50 p-3.5 shadow-xl flex flex-col gap-2.5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Active Investigators</h4>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          {isLoading ? '...' : `${users.length} Online`}
        </span>
      </div>

      {/* Users List */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto">
        {users.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-[11px]">
            No active investigators detected.
          </div>
        ) : (
          users.map(u => (
            <div
              key={u.id}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${u.avatarColor} flex items-center justify-center text-white text-[10px] font-bold shadow-md`}
                >
                  {u.name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-none mb-0.5 truncate max-w-[130px]" title={u.name}>
                    {u.name}
                  </p>
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
          ))
        )}
      </div>
    </div>
  );
};

export default OnlineUsersPanel;
