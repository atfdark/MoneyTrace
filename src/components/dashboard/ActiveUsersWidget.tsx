import React from 'react';
import { useLiveTelemetry, ActiveUserItem } from '../../hooks/useWebSocket';
import { useAuth } from '../../contexts/AuthContext';

export const ActiveUsersWidget: React.FC = () => {
  const { activeUsers } = useLiveTelemetry();
  const { user: currentUser } = useAuth();

  // If activeUsers list from server is empty, fallback to current logged in user
  const displayList: ActiveUserItem[] = activeUsers.length > 0
    ? activeUsers
    : currentUser
    ? [
        {
          user_id: currentUser.id || 'curr-1',
          username: currentUser.full_name || 'Active Investigator',
          account_number: (currentUser as any).account_number || currentUser.email || 'ACC_ACTIVE',
          role: currentUser.role || 'ADMIN',
          connected_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          online_status: 'online',
        },
      ]
    : [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-600 text-[18px]">group</span>
          </div>
          <h3 className="text-[13px] font-semibold text-gray-900">Active Users</h3>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
          {displayList.length} Online
        </span>
      </div>

      {/* Users List */}
      {displayList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
          {displayList.map((u: any, i: number) => {
            const initials = u.username
              ? u.username.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              : 'US';

            const roleBadgeColor = u.role === 'ADMIN'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : u.role === 'INVESTIGATOR' || u.role === 'ANALYST'
              ? 'bg-purple-50 text-purple-700 border border-purple-200'
              : 'bg-gray-50 text-gray-600 border border-gray-200';

            return (
              <div
                key={u.account_number || u.user_id || i}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors"
              >
                {/* Avatar with presence dot */}
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-700">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-900 truncate">{u.username}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-gray-400 truncate">{u.account_number}</span>
                    <span className={`text-[9px] font-semibold uppercase px-1 py-0.5 rounded ${roleBadgeColor}`}>
                      {u.role}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-gray-400 text-[12px]">
          No other active users online. Connect from another device to see live presence.
        </div>
      )}
    </div>
  );
};

export default ActiveUsersWidget;
