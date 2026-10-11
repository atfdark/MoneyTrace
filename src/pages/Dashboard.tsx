import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboardStats, useRecentTransactions, useRecentAlerts } from '../hooks/useDashboard';
import { useUser } from '../hooks/useAuth';
import { StatCard } from '../components/dashboard/StatCard';
import { LoadingSpinner, StatCardSkeleton } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';

// Live Operations & Demo Widgets
import { LiveTicker } from '../components/dashboard/LiveTicker';
import { ThreatRadarWidget } from '../components/dashboard/ThreatRadarWidget';
import { ActiveUsersWidget } from '../components/dashboard/ActiveUsersWidget';
import { FraudGeoHeatmap } from '../components/dashboard/FraudGeoHeatmap';
import { LiveRecoveryTracker } from '../components/dashboard/LiveRecoveryTracker';
import { DemoControlPanel } from '../components/dashboard/DemoControlPanel';
import { ToastCenter } from '../components/common/ToastCenter';
import { useLiveTelemetry } from '../hooks/useWebSocket';
import { RecoveryCommandCenter } from '../components/dashboard/RecoveryCommandCenter';
import { InvestigatorLeaderboard } from '../components/dashboard/InvestigatorLeaderboard';
import { ThreatIntelFeed } from '../components/dashboard/ThreatIntelFeed';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';

export const Dashboard: React.FC = () => {
  const [isCustomizing, setIsCustomizing] = React.useState(false);
  const [widgets, setWidgets] = React.useState({
    commandCenter: true,
    lossPrevention: true,
    threatRadar: true,
    activeUsers: true,
    kpiStats: true,
    leaderboard: true,
    threatFeed: true,
    recoveryTracker: true,
    geoHeatmap: true,
    recentActivity: true,
  });

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentTransactions, isLoading: txLoading } = useRecentTransactions(6);
  const { data: recentAlerts, isLoading: alertsLoading } = useRecentAlerts(5);
  const { data: userData } = useUser();
  const { activeUsers } = useLiveTelemetry();
  const user = (userData as any)?.data || userData;

  const statCards: Array<{
    title: string;
    value: number;
    format: 'currency' | 'number' | 'percent';
    change?: number;
    changeLabel: string;
    icon: string;
    color: 'error' | 'warning' | 'secondary' | 'success' | 'primary';
  }> = [
    {
      title: 'Total Volume',
      value: stats?.total_volume || 0,
      format: 'currency',
      change: stats?.volume_change,
      changeLabel: 'vs last period',
      icon: 'attach_money',
      color: 'secondary',
    },
    {
      title: 'Active Alerts',
      value: stats?.active_alerts || 0,
      format: 'number',
      change: stats?.alerts_change,
      changeLabel: 'vs yesterday',
      icon: 'warning',
      color: 'error',
    },
    {
      title: 'Open Cases',
      value: stats?.open_cases || 0,
      format: 'number',
      change: stats?.cases_change,
      changeLabel: 'vs last week',
      icon: 'folder_open',
      color: 'warning',
    },
    {
      title: 'Recovery Rate',
      value: stats?.recovery_rate || 0,
      format: 'percent',
      change: stats?.recovery_change,
      changeLabel: 'vs last month',
      icon: 'trending_up',
      color: 'success',
    },
  ];

  if (statsLoading || txLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Center */}
      <ToastCenter />

      {/* Live Ticker */}
      <LiveTicker />

      {/* Welcome Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card relative">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-green-700">
                SOC Active • {activeUsers.length > 0 ? `${activeUsers.length} Connected` : 'Live Telemetry'}
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Investigator'}
            </h1>
            <p className="text-[13px] text-gray-500">
              Live transaction monitoring, automated fraud scoring, and asset recovery intelligence
            </p>
          </div>

          <div className="flex items-center gap-2.5 lg:ml-auto">
            <button
              onClick={() => setIsCustomizing(!isCustomizing)}
              className={`px-4 py-2.5 font-semibold rounded-lg text-[13px] shadow-sm flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 ${isCustomizing ? 'bg-blue-100 text-blue-700' : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'}`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Customize
            </button>
            <Link
              to="/flow"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[13px] shadow-sm flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">route</span>
              Money Flow
            </Link>
          </div>
        </div>
        
        {/* Widget Customization Panel */}
        {isCustomizing && (
          <div className="absolute top-full right-6 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4">
            <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">Toggle Widgets</h3>
            <div className="space-y-2">
              {Object.entries(widgets).map(([key, isVisible]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${isVisible ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isVisible}
                      onChange={() => setWidgets(prev => ({ ...prev, [key]: !isVisible }))}
                    />
                    <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${isVisible ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {widgets.commandCenter && (
        <RecoveryCommandCenter
          alertId="ALT2026081601"
          stolenAmount={150000}
          currentHolder="ACC5008"
          holderBank="ICICI Bank (Bangalore)"
          recoveryProbability={92}
        />
      )}

      {widgets.lossPrevention && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/30 flex items-center justify-between shadow-card">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                  MONEY PROTECTED TODAY
                </span>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-emerald-800 font-mono">
                ₹12,45,000
              </p>
              <p className="text-[11px] text-emerald-700 font-medium">
                3 Syndicate Mule Off-Ramps Blocked
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30 flex items-center justify-between shadow-card">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-800">
                  MONEY SAVED THIS MONTH
                </span>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-blue-800 font-mono">
                ₹1.20 Cr
              </p>
              <p className="text-[11px] text-blue-700 font-medium">
                85% Intercepted Under Section 91 CrPC
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-2xl">savings</span>
            </div>
          </div>
        </div>
      )}

      {(widgets.threatRadar || widgets.activeUsers) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {widgets.threatRadar ? <ThreatRadarWidget /> : <div />}
          {widgets.activeUsers ? <ActiveUsersWidget /> : <div />}
        </div>
      )}

      {widgets.kpiStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <StatCard
              key={stat.title}
              {...stat}
              isLoading={statsLoading}
            />
          ))}
          {statsLoading && Array.from({ length: 4 - statCards.length }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}

      {(widgets.leaderboard || widgets.threatFeed) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {widgets.leaderboard ? <InvestigatorLeaderboard /> : <div />}
          {widgets.threatFeed ? <ThreatIntelFeed /> : <div />}
        </div>
      )}

      {(widgets.recoveryTracker || widgets.geoHeatmap) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {widgets.recoveryTracker ? <LiveRecoveryTracker /> : <div />}
          {widgets.geoHeatmap ? <FraudGeoHeatmap /> : <div />}
        </div>
      )}

      {/* Demo Controls */}
      <DemoControlPanel />

      {widgets.recentActivity && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Transactions */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[18px]">receipt_long</span>
                <h2 className="text-[13px] font-semibold text-gray-900">Recent Transactions</h2>
              </div>
              <Link
                to="/transactions"
                className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                View All →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100 text-[11px] uppercase font-semibold tracking-wider bg-gray-50">
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Route</th>
                    <th className="p-3.5">Risk</th>
                    <th className="p-3.5">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[12px]">
                  {recentTransactions?.map((tx: any) => {
                    const isHigh = (tx.risk_score || 0) >= 50;
                    return (
                      <tr key={tx.id || tx.transaction_id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3.5 font-mono text-[11px] text-gray-500 truncate max-w-[100px]">
                          {tx.transaction_id || tx.hash || tx.id}
                        </td>
                        <td className="p-3.5 font-mono font-semibold text-gray-900">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-3.5 text-[11px] text-gray-500">
                          <span className="font-mono text-blue-600">{tx.sender_account_number || tx.from_address || 'ACC1001'}</span>
                          <span className="text-gray-300 mx-1">→</span>
                          <span className="font-mono text-gray-600">{tx.receiver_account_number || tx.to_address || 'ACC1002'}</span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold ${
                              isHigh
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-green-50 text-green-700 border border-green-200'
                            }`}
                          >
                            {tx.risk_score ? `${tx.risk_score}%` : 'Safe'}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-400 text-[11px]">
                          {formatDate(tx.timestamp || tx.created_at, 'relative')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-[18px]">notification_important</span>
                <h2 className="text-[13px] font-semibold text-gray-900">Recent Alerts</h2>
              </div>
              <Link
                to="/alerts"
                className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Alert Center →
              </Link>
            </div>

            <div className="divide-y divide-gray-50">
              {recentAlerts?.map((alert: any) => {
                const isCrit = alert.severity === 'critical' || alert.severity === 'CRITICAL';
                const isHigh = alert.severity === 'high' || alert.severity === 'HIGH';

                return (
                  <Link
                    key={alert.id || alert.alert_id}
                    to={`/alerts/${alert.id || alert.alert_id}`}
                    className="p-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3.5"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isCrit
                          ? 'bg-red-50 text-red-600'
                          : isHigh
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isCrit ? 'emergency' : 'warning'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-900 truncate">
                        {alert.alert_type || alert.title || 'Suspicious Transaction'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {alert.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                          isCrit
                            ? 'bg-red-50 text-red-700'
                            : isHigh
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(alert.created_at, 'relative')}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/flow"
            className="p-3.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 transition-all flex items-center gap-3 text-left group hover:shadow-card-hover"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">account_tree</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Map Money Flow</p>
              <p className="text-[11px] text-gray-400">Inspect graph nodes</p>
            </div>
          </Link>

          <Link
            to="/recovery"
            className="p-3.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 hover:border-green-300 transition-all flex items-center gap-3 text-left group hover:shadow-card-hover"
          >
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">verified_user</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Asset Recovery</p>
              <p className="text-[11px] text-gray-400">Preservation scores</p>
            </div>
          </Link>

          <Link
            to="/chat"
            className="p-3.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 transition-all flex items-center gap-3 text-left group hover:shadow-card-hover"
          >
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">psychology</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">AI Copilot</p>
              <p className="text-[11px] text-gray-400">Forensic reasoning</p>
            </div>
          </Link>

          <Link
            to="/reports"
            className="p-3.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all flex items-center gap-3 text-left group hover:shadow-card-hover"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">summarize</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Reports</p>
              <p className="text-[11px] text-gray-400">PDF, DOCX & Excel</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;