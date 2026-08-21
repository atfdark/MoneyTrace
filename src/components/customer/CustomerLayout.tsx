import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useAuth';
import { useLiveEvents } from '../../hooks/useWebSocket';

export const CustomerLayout: React.FC = () => {
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  // Enable live WebSocket background event synchronization
  useLiveEvents();

  const navItems = [
    { to: '/customer/home', label: 'Home', icon: 'home' },
    { to: '/customer/send-money', label: 'Pay', icon: 'send' },
    { to: '/customer/transactions', label: 'Passbook', icon: 'receipt_long' },
    { to: '/customer/profile', label: 'Profile', icon: 'person' },
  ];

  const firstName = user?.full_name?.split(' ')[0] || 'User';

  return (
    <div className="min-h-screen bg-[#040711] flex justify-center selection:bg-purple-500 selection:text-white">
      {/* Mobile-Sized UPI Application Frame (Full-width on mobile, max-w-md on desktop) */}
      <div className="w-full max-w-md min-h-screen bg-[#080D1A] flex flex-col relative border-x border-slate-800/80 shadow-2xl shadow-purple-950/20 pb-20">
        
        {/* ───── Top Header Bar ───── */}
        <header className="sticky top-0 z-40 bg-[#080D1A]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3.5 flex items-center justify-between">
          <div
            onClick={() => navigate('/customer/profile')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-purple-900/30 group-hover:scale-105 transition-all">
              {firstName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-white leading-tight">Hi, {firstName}</h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 font-mono leading-tight">
                {user?.email ? `${user.email.split('@')[0]}@moneytrace` : 'upi@moneytrace'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/customer/transactions')}
              className="w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
              title="Passbook history"
            >
              <span className="material-symbols-outlined text-lg">history</span>
            </button>

            <button
              onClick={() => {
                logoutMutation.mutate();
                navigate('/customer/login');
              }}
              className="w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer"
              title="Logout"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </header>

        {/* ───── Main Viewport Content ───── */}
        <main className="flex-1 p-4 space-y-5 overflow-y-auto">
          <Outlet />
        </main>

        {/* ───── Bottom UPI Tab Bar (Fixed) ───── */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-[#090E1C]/95 backdrop-blur-2xl border-t border-slate-800 px-6 py-2 flex items-center justify-between shadow-2xl">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'text-purple-400 font-bold scale-105'
                    : 'text-slate-500 hover:text-slate-300 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
                      isActive ? 'bg-purple-600/20 text-purple-400' : 'bg-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

      </div>
    </div>
  );
};

export default CustomerLayout;
