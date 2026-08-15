import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { name: 'Transactions', href: '/transactions', icon: 'receipt_long' },
  { name: 'Alerts', href: '/alerts', icon: 'warning' },
  { name: 'Investigation', href: '/investigation', icon: 'search' },
  { name: 'Money Flow', href: '/flow', icon: 'account_tree' },
  { name: 'Recovery', href: '/recovery', icon: 'restore' },
  { name: 'AI Assistant', href: '/chat', icon: 'smart_toy' },
  { name: 'Reports', href: '/reports', icon: 'description' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 glass-panel border-r border-outline-variant/20 flex flex-col z-40 lg:w-64 transition-all duration-300">
      {/* Logo */}
      <div className="p-4 border-b border-outline-variant/20 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-on-secondary text-[24px]">account_balance</span>
        </div>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">MoneyTrace</h1>
          <p className="font-body-xs text-body-xs text-on-surface-variant">Financial Crime Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive: active }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-body-sm text-body-sm transition-all duration-200
                ${active
                  ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="material-symbols-outlined text-[20px] flex-shrink-0">{item.icon}</span>
              <span className="font-medium truncate">{item.name}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 bg-secondary rounded-full" aria-hidden="true" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-outline-variant/20">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-secondary-container flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-on-secondary text-[18px]">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body-md text-body-md text-on-surface truncate">{user.full_name}</p>
              <p className="font-body-xs text-body-xs text-on-surface-variant capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;