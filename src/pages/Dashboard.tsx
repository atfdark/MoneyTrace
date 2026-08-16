import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboardStats, useRecentTransactions, useRecentAlerts } from '../hooks/useDashboard';
import { useUser } from '../hooks/useAuth';
import { StatCard } from '../components/dashboard/StatCard';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { AlertCard } from '../components/alerts/AlertCard';
import { LoadingSpinner, StatCardSkeleton } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentTransactions, isLoading: txLoading } = useRecentTransactions(5);
  const { data: recentAlerts, isLoading: alertsLoading } = useRecentAlerts(5);
  const { data: user } = useUser();

  const statCards = [
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
    <div className="space-y-6 animate-in fade-in">
      {/* Welcome Section */}
      <div className="glass-panel rounded-xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Analyst'}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Here's your financial crime intelligence overview
            </p>
          </div>
          <div className="flex items-center gap-3 lg:ml-auto">
            <Link
              to="/reports/new"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-body-sm font-medium hover:bg-secondary-container/80 transition-colors"
            >
              <span className="material-symbols-outlined">add</span>
              New Report
            </Link>
            <Link
              to="/investigation/new"
              className="flex items-center gap-2 px-4 py-2 glass-panel border border-outline-variant/50 text-on-surface rounded-lg font-body-sm font-medium hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined">add</span>
              New Case
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Transaction Volume Chart */}
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-md text-headline-md text-on-surface">Transaction Volume</h2>
            <select defaultValue="7d" className="bg-surface-container border border-outline-variant/50 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50">
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-center gap-2" style={{ height: '256px' }}>
            {stats?.volume_chart_data?.map((point, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end min-w-0">
                <div
                  className="w-full bg-secondary rounded-t transition-all duration-300 hover:bg-secondary-container"
                  style={{
                    height: `${Math.max(4, (point.value / Math.max(...stats.volume_chart_data.map(d => d.value))) * 100)}%`,
                    minHeight: '4px',
                  }}
                  title={`${formatCurrency(point.value)} on ${formatDate(point.date)}`}
                />
                <span className="font-body-xs text-body-xs text-on-surface-variant mt-2 text-center whitespace-nowrap">
                  {formatDate(point.date, 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Severity Distribution */}
        <div className="glass-panel rounded-xl p-6">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Alert Severity Distribution</h2>
          <div className="h-64 flex items-center justify-center gap-8">
            {/* Donut Chart Placeholder */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg width="192" height="192" viewBox="0 0 192 192">
                <circle
                  cx="96"
                  cy="96"
                  r="70"
                  stroke="#E8EAF6"
                  strokeWidth="20"
                  fill="none"
                />
                {stats?.alert_severity_data?.map((item, i) => {
                  const total = stats.alert_severity_data.reduce((sum, d) => sum + d.value, 0);
                  const percentage = item.value / total;
                  const strokeDasharray = 2 * Math.PI * 70;
                  const strokeDashoffset = strokeDasharray * (1 - percentage);
                  const startAngle = stats.alert_severity_data
                    .slice(0, i)
                    .reduce((sum, d) => sum + (d.value / total) * 360, 0);
                  return (
                    <circle
                      key={item.severity}
                      cx="96"
                      cy="96"
                      r="70"
                      stroke={item.color}
                      strokeWidth="20"
                      fill="none"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      transform={`rotate(${-90 + startAngle} 96 96)`}
                      style={{ strokeLinecap: 'round' }}
                    />
                  );
                })}
              </svg>
              <div className="absolute text-center">
                <p className="font-headline-lg text-headline-lg text-on-surface">{stats?.active_alerts || 0}</p>
                <p className="font-body-xs text-body-xs text-on-surface-variant">Total Alerts</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-3">
              {stats?.alert_severity_data?.map((item) => (
                <div key={item.severity} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="font-body-sm text-body-sm text-on-surface capitalize">{item.severity}</p>
                    <p className="font-body-xs text-body-xs text-on-surface-variant">
                      {item.value} alerts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface">Recent Transactions</h2>
            <Link
              to="/transactions"
              className="font-label-caps text-label-caps text-secondary hover:text-secondary-container transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-on-surface-variant">
                  <th className="p-4 font-label-caps text-label-caps">Hash</th>
                  <th className="p-4 font-label-caps text-label-caps">Amount</th>
                  <th className="p-4 font-label-caps text-label-caps">From / To</th>
                  <th className="p-4 font-label-caps text-label-caps">Status</th>
                  <th className="p-4 font-label-caps text-label-caps">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions?.map((tx) => (
                  <tr key={tx.id} className="border-t border-outline-variant/20 hover:bg-surface-container/50">
                    <td className="p-4 font-mono text-body-sm text-on-surface-variant truncate max-w-[120px]">
                      {tx.hash.slice(0, 12)}...
                    </td>
                    <td className="p-4 font-body-md text-body-md text-on-surface">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="p-4">
                      <div className="font-body-sm text-body-sm text-on-surface truncate max-w-[150px]">
                        {tx.from_address.slice(0, 10)}...
                      </div>
                      <div className="font-body-xs text-body-xs text-on-surface-variant truncate max-w-[150px]">
                        → {tx.to_address.slice(0, 10)}...
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-label-caps text-label-caps ${
                          tx.status === 'confirmed'
                            ? 'bg-success-container text-on-success-container'
                            : tx.status === 'pending'
                            ? 'bg-warning-container text-on-warning-container'
                            : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-4 font-body-sm text-body-sm text-on-surface-variant">
                      {formatDate(tx.timestamp, 'relative')}
                    </td>
                  </tr>
                ))}
                {txLoading && Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-4">
                      <div className="h-4 w-1/4 bg-surface-container-high rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))}
                {!recentTransactions?.length && !txLoading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                      No recent transactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface">Recent Alerts</h2>
            <Link
              to="/alerts"
              className="font-label-caps text-label-caps text-secondary hover:text-secondary-container transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {recentAlerts?.map((alert) => (
              <Link
                key={alert.id}
                to={`/alerts/${alert.id}`}
                className="p-4 hover:bg-surface-container/50 transition-colors flex items-center gap-4"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'critical'
                      ? 'bg-error-container text-error'
                      : alert.severity === 'high'
                      ? 'bg-warning-container text-warning'
                      : 'bg-secondary-container text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-body-md text-on-surface truncate">{alert.title}</p>
                  <p className="font-body-xs text-body-xs text-on-surface-variant truncate">
                    {alert.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full font-label-caps text-label-caps ${
                      alert.severity === 'critical'
                        ? 'bg-error-container text-on-error-container'
                        : alert.severity === 'high'
                        ? 'bg-warning-container text-on-warning-container'
                        : 'bg-secondary-container text-on-secondary-container'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span className="font-body-xs text-body-xs text-on-surface-variant">
                    {formatDate(alert.created_at, 'relative')}
                  </span>
                </div>
              </Link>
            ))}
            {alertsLoading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="h-4 w-1/3 bg-surface-container-high rounded"></div>
                <div className="h-3 w-1/2 bg-surface-container-high rounded mt-1"></div>
              </div>
            ))}
            {!recentAlerts?.length && !alertsLoading && (
              <div className="p-8 text-center text-on-surface-variant">
                No recent alerts
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/transactions/new"
            className="glass-panel border border-outline-variant/20 rounded-xl p-6 hover:border-secondary/50 hover:bg-surface-container-high transition-all duration-200 flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-secondary text-[28px]">add_circle</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mt-4">Add Transaction</h3>
            <p className="font-body-xs text-body-xs text-on-surface-variant mt-1">Record a new transaction</p>
          </Link>

          <Link
            to="/investigation/new"
            className="glass-panel border border-outline-variant/20 rounded-xl p-6 hover:border-secondary/50 hover:bg-surface-container-high transition-all duration-200 flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-warning-container flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-warning text-[28px]">search</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mt-4">Start Investigation</h3>
            <p className="font-body-xs text-body-xs text-on-surface-variant mt-1">Open a new case file</p>
          </Link>

          <Link
            to="/flow/new"
            className="glass-panel border border-outline-variant/20 rounded-xl p-6 hover:border-secondary/50 hover:bg-surface-container-high transition-all duration-200 flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-success-container flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-success text-[28px]">account_tree</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mt-4">Map Money Flow</h3>
            <p className="font-body-xs text-body-xs text-on-surface-variant mt-1">Visualize transaction networks</p>
          </Link>

          <Link
            to="/reports/new"
            className="glass-panel border border-outline-variant/20 rounded-xl p-6 hover:border-secondary/50 hover:bg-surface-container-high transition-all duration-200 flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-error text-[28px]">description</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mt-4">Generate Report</h3>
            <p className="font-body-xs text-body-xs text-on-surface-variant mt-1">Create investigation report</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;