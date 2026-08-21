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
import { EmergencyInvestigationOverlay } from '../components/alerts/EmergencyInvestigationOverlay';
import { ToastCenter } from '../components/common/ToastCenter';

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentTransactions, isLoading: txLoading } = useRecentTransactions(6);
  const { data: recentAlerts, isLoading: alertsLoading } = useRecentAlerts(5);
  const { data: userData } = useUser();
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

  return (
    <div className="space-y-5 animate-in fade-in pb-12">
      {/* ───── Toast Center & Emergency Investigation Siren Overlay ───── */}
      <ToastCenter />
      <EmergencyInvestigationOverlay />

      {/* ───── 1. Live Continuous Scrolling Ticker ───── */}
      <LiveTicker />

      {/* ───── 2. Welcome & Command Center Header ───── */}
      <div className="glass-panel bg-[#0A0E1A]/90 border border-slate-800 rounded-3xl p-6 lg:p-7 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                SOC COMMAND CENTER ACTIVE • 20 NODES ONLINE
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-white">
              Welcome, {user?.full_name?.split(' ')[0] || 'Investigator'}
            </h1>
            <p className="text-xs text-slate-400">
              Live multi-node banking telemetry, automated fraud scoring, and asset recovery
            </p>
          </div>

          <div className="flex items-center gap-2.5 lg:ml-auto">
            <Link
              to="/flow"
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs shadow-lg shadow-purple-900/40 flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-base">route</span>
              Live Flow Visualizer
            </Link>
            <Link
              to="/alerts"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-base text-rose-400">gpp_bad</span>
              Alert Center
            </Link>
          </div>
        </div>
      </div>

      {/* ───── 3. Live Threat Radar & Active Users Telemetry Row ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ThreatRadarWidget />
        <ActiveUsersWidget />
      </div>

      {/* ───── 4. KPI Stat Cards Row ───── */}
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

      {/* ───── 5. Live Recovery & Regional Heatmap Row ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LiveRecoveryTracker />
        <FraudGeoHeatmap />
      </div>

      {/* ───── 6. Demo Presentation Simulation Control Panel ───── */}
      <DemoControlPanel />

      {/* ───── 7. Recent Transactions & Alerts Tables ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions Table */}
        <div className="glass-panel bg-[#0B1020]/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400 text-lg">receipt_long</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Recent Ingested Transactions
              </h2>
            </div>
            <Link
              to="/transactions"
              className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors"
            >
              View All Feed
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800/60 text-[10px] uppercase font-bold tracking-wider">
                  <th className="p-3.5">Hash / ID</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Route</th>
                  <th className="p-3.5">Risk</th>
                  <th className="p-3.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {recentTransactions?.map((tx: any) => {
                  const isHigh = (tx.risk_score || 0) >= 50;
                  return (
                    <tr key={tx.id || tx.transaction_id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-300 truncate max-w-[100px]">
                        {tx.transaction_id || tx.hash || tx.id}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-white">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-300">
                        <span className="font-mono text-blue-400">{tx.sender_account_number || tx.from_address || 'ACC1001'}</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="font-mono text-purple-400">{tx.receiver_account_number || tx.to_address || 'ACC1002'}</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                            isHigh
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {tx.risk_score ? `${tx.risk_score}%` : 'SAFE'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {formatDate(tx.timestamp || tx.created_at, 'relative')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts Feed */}
        <div className="glass-panel bg-[#0B1020]/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400 text-lg">warning</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Live Fraud Alert Stream
              </h2>
            </div>
            <Link
              to="/alerts"
              className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors"
            >
              Alert Center
            </Link>
          </div>

          <div className="divide-y divide-slate-800/40">
            {recentAlerts?.map((alert: any) => {
              const isCrit = alert.severity === 'critical' || alert.severity === 'CRITICAL';
              const isHigh = alert.severity === 'high' || alert.severity === 'HIGH';

              return (
                <Link
                  key={alert.id || alert.alert_id}
                  to={`/alerts/${alert.id || alert.alert_id}`}
                  className="p-3.5 hover:bg-slate-900/60 transition-colors flex items-center gap-3.5"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isCrit
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isCrit ? 'emergency' : 'warning'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {alert.alert_type || alert.title || 'Suspicious Transaction Funnel'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {alert.description}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-extrabold uppercase ${
                        isCrit
                          ? 'bg-rose-500/20 text-rose-300'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {formatDate(alert.created_at, 'relative')}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ───── 8. Quick Actions Bar ───── */}
      <div className="glass-panel bg-[#080D1A]/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Forensic Investigation Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/flow"
            className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 transition-all flex items-center gap-3 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">account_tree</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Map Money Flow</p>
              <p className="text-[10px] text-slate-400">Inspect graph nodes</p>
            </div>
          </Link>

          <Link
            to="/recovery"
            className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center gap-3 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">verified_user</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Asset Recovery</p>
              <p className="text-[10px] text-slate-400">Preservation scores</p>
            </div>
          </Link>

          <Link
            to="/chat"
            className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 transition-all flex items-center gap-3 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">psychology</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">AI Copilot Pro</p>
              <p className="text-[10px] text-slate-400">Forensic reasoning</p>
            </div>
          </Link>

          <Link
            to="/reports"
            className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 transition-all flex items-center gap-3 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">description</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Court Dossiers</p>
              <p className="text-[10px] text-slate-400">PDF, DOCX & Excel</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;