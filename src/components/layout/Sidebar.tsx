import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useAuth';

const navSections = [
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: 'space_dashboard' },
      { name: 'Transactions', href: '/transactions', icon: 'receipt_long' },
      { name: 'Alerts', href: '/alerts', icon: 'notification_important' },
    ],
  },
  {
    label: 'INVESTIGATIONS',
    items: [
      { name: 'Cases', href: '/investigation', icon: 'case' },
      { name: 'Money Flow', href: '/flow', icon: 'account_tree' },
      { name: 'Recovery', href: '/recovery', icon: 'shield' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { name: 'AI Copilot', href: '/chat', icon: 'psychology' },
      { name: 'Reports', href: '/reports', icon: 'summarize' },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { name: 'Settings', href: '/settings', icon: 'settings' },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const logoutMutation = useLogout();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="material-symbols-outlined text-gray-900 text-[18px]">account_balance</span>
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-gray-900 leading-tight">MoneyTrace</h1>
          <p className="text-[10px] font-medium text-gray-400 leading-tight tracking-wide">Financial Crime Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 tracking-widest uppercase">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={() => `
                      relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
                      ${isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />
                    )}
                    <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="px-3 py-3 border-t border-gray-100">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-700 text-xs font-bold">
                  {user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
                </span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{user.full_name}</p>
              <p className="text-[11px] text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => logoutMutation.mutate()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;