import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogin, useRegister } from '../hooks/useAuth';
import { ApiError } from '../api/errors';

export type PortalType = 'customer' | 'admin';
export type TabType = 'signin' | 'register';

interface AuthPortalProps {
  initialPortal?: PortalType;
  initialTab?: TabType;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  initialPortal,
  initialTab,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine initial portal & tab based on props or current path
  const path = location.pathname;
  const isCustomerPath = path.startsWith('/customer');
  const isRegisterPath = path.includes('register');

  const [portal, setPortal] = useState<PortalType>(
    initialPortal || (isCustomerPath ? 'customer' : 'admin')
  );
  const [tab, setTab] = useState<TabType>(
    initialTab || (isRegisterPath ? 'register' : 'signin')
  );

  // Sync state if URL changes
  useEffect(() => {
    if (initialPortal) {
      setPortal(initialPortal);
    } else if (location.pathname.startsWith('/customer')) {
      setPortal('customer');
    } else if (location.pathname.startsWith('/login') || location.pathname.startsWith('/register')) {
      setPortal('admin');
    }

    if (initialTab) {
      setTab(initialTab);
    } else if (location.pathname.includes('register')) {
      setTab('register');
    }
  }, [location.pathname, initialPortal, initialTab]);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleQuickFill = (emailVal: string, passVal: string) => {
    setFormData((prev) => ({
      ...prev,
      email: emailVal,
      password: passVal,
    }));
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailTrimmed = formData.email.trim();
    if (!emailTrimmed) {
      setErrorMessage('Please enter your email, username, or account number.');
      return;
    }

    if (!formData.password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (tab === 'register') {
      if (!formData.fullName.trim()) {
        setErrorMessage('Please provide your full legal name.');
        return;
      }
      if (formData.password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    try {
      if (tab === 'signin') {
        await loginMutation.mutateAsync({
          email: emailTrimmed,
          password: formData.password,
          remember_me: formData.rememberMe,
        });

        // Navigate based on selected portal
        if (portal === 'customer') {
          navigate('/customer/home', { replace: true });
        } else {
          const from = (location.state as any)?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      } else {
        // Registering
        const role = portal === 'customer' ? 'customer' : 'investigator';
        await registerMutation.mutateAsync({
          full_name: formData.fullName.trim(),
          email: emailTrimmed.toLowerCase(),
          password: formData.password,
          role,
        });

        if (portal === 'customer') {
          navigate('/customer/home', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.getUserMessage());
      } else {
        setErrorMessage(
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          'Authentication failed. Please check your credentials.'
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-white flex items-center justify-center p-3 sm:p-6 relative overflow-hidden selection:bg-purple-600 selection:text-white">
      {/* Dynamic Background Glowing Ambient Auras */}
      <div
        className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-all duration-700 ${
          portal === 'customer'
            ? 'bg-emerald-500/20'
            : 'bg-purple-600/25'
        }`}
      />
      <div
        className={`absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-all duration-700 ${
          portal === 'customer'
            ? 'bg-cyan-500/20'
            : 'bg-blue-600/25'
        }`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-lg z-10 relative">
        {/* Top Master Dual-Portal Switcher */}
        <div className="mb-4 bg-[#0F172A]/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-800 shadow-2xl relative">
          <div className="grid grid-cols-2 gap-1.5 relative">
            {/* Sliding Highlight Background Pill */}
            <div
              className={`absolute top-0 bottom-0 w-1/2 rounded-xl transition-all duration-300 ease-out shadow-lg ${
                portal === 'customer'
                  ? 'left-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-emerald-950/50'
                  : 'left-1/2 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 shadow-purple-950/50'
              }`}
            />

            {/* Customer Portal Button */}
            <button
              type="button"
              onClick={() => {
                setPortal('customer');
                setErrorMessage(null);
              }}
              className={`relative z-10 py-3 px-2 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                portal === 'customer'
                  ? 'text-white font-black'
                  : 'text-slate-400 hover:text-slate-200 font-semibold'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                smartphone
              </span>
              <div className="text-left">
                <span className="block text-xs leading-none font-bold">Customer Portal</span>
                <span className="text-[10px] opacity-80 font-normal hidden sm:inline">Personal Banking</span>
              </div>
            </button>

            {/* Investigator & Admin Portal Button */}
            <button
              type="button"
              onClick={() => {
                setPortal('admin');
                setErrorMessage(null);
              }}
              className={`relative z-10 py-3 px-2 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                portal === 'admin'
                  ? 'text-white font-black'
                  : 'text-slate-400 hover:text-slate-200 font-semibold'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                shield
              </span>
              <div className="text-left">
                <span className="block text-xs leading-none font-bold">Investigator SOC</span>
                <span className="text-[10px] opacity-80 font-normal hidden sm:inline">Crime Intelligence</span>
              </div>
            </button>
          </div>
        </div>

        {/* Form Body Panel */}
        <div className="bg-[#0B1120]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-2xl transition-all duration-300">
          {/* Header Branding with Animated Icons */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-3">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-500 transform ${
                  portal === 'customer'
                    ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 shadow-emerald-500/30'
                    : 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 shadow-purple-500/30'
                }`}
              >
                <span className="material-symbols-outlined text-3xl">
                  {portal === 'customer' ? 'account_balance_wallet' : 'security'}
                </span>
              </div>
              {portal === 'admin' && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-violet-500 border-2 border-[#0B1120]"></span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>MoneyTrace</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  portal === 'customer'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                }`}
              >
                {portal === 'customer' ? 'UPI Banking' : 'SOC Command'}
              </span>
            </h1>

            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {portal === 'customer'
                ? 'Send & receive money, check balance, and view instant digital receipts.'
                : 'Forensic intelligence, financial crime surveillance, and live flow tracing.'}
            </p>
          </div>

          {/* Sub-Tab Switcher (Sign In vs Register Account) */}
          <div className="bg-[#111A2E] p-1 rounded-2xl border border-slate-800/80 mb-5 flex relative">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'signin'
                  ? portal === 'customer'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                    : 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">login</span>
              <span>{portal === 'customer' ? 'Banking Sign In' : 'Investigator Sign In'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('register');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'register'
                  ? portal === 'customer'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                    : 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              <span>{portal === 'customer' ? 'Open Bank Account' : 'Register Analyst'}</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-rose-400 text-base flex-shrink-0">
                error
              </span>
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name for Registration */}
            {tab === 'register' && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Full Legal Name
                </label>
                <div className="flex items-center gap-2.5 bg-[#111A2E] border border-slate-700/80 rounded-2xl px-4 py-3 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
                  <span className="material-symbols-outlined text-slate-400 text-lg">
                    badge
                  </span>
                  <input
                    type="text"
                    name="fullName"
                    placeholder={portal === 'customer' ? 'e.g. Rahul Sharma' : 'e.g. Det. Alex Cross'}
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    disabled={isPending}
                    className="flex-1 bg-transparent text-white text-xs placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Email / Username / Identifier Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {tab === 'signin' ? 'Username, Email, or Account #' : 'Email Address'}
                </label>
                {tab === 'signin' && portal === 'admin' && (
                  <span className="text-[10px] text-purple-400 font-mono">
                    Node: soc-01.mt
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 bg-[#111A2E] border border-slate-700/80 rounded-2xl px-4 py-3 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
                <span className="material-symbols-outlined text-slate-400 text-lg">
                  account_circle
                </span>
                <input
                  type={tab === 'register' ? 'email' : 'text'}
                  name="email"
                  placeholder={
                    tab === 'signin'
                      ? portal === 'customer'
                        ? 'Email, phone, or ACC100200'
                        : 'admin or admin@moneytrace.dev'
                      : 'name@example.com'
                  }
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isPending}
                  autoComplete="username"
                  className="flex-1 bg-transparent text-white text-xs placeholder-slate-500 focus:outline-none font-sans"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {portal === 'customer' ? 'PIN / Password' : 'Password'}
                </label>
                {tab === 'signin' && (
                  <span className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer">
                    Forgot?
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 bg-[#111A2E] border border-slate-700/80 rounded-2xl px-4 py-3 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
                <span className="material-symbols-outlined text-slate-400 text-lg">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isPending}
                  autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                  className="flex-1 bg-transparent text-white text-xs placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm Password for Registration */}
            {tab === 'register' && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Confirm Password
                </label>
                <div className="flex items-center gap-2.5 bg-[#111A2E] border border-slate-700/80 rounded-2xl px-4 py-3 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
                  <span className="material-symbols-outlined text-slate-400 text-lg">
                    lock_reset
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="••••••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    disabled={isPending}
                    autoComplete="new-password"
                    className="flex-1 bg-transparent text-white text-xs placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showConfirmPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me Checkbox */}
            {tab === 'signin' && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-slate-700 bg-[#111A2E] text-purple-600 focus:ring-purple-500/30"
                  />
                  <span className="text-xs text-slate-400">Keep me signed in</span>
                </label>
                {portal === 'admin' && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    256-bit Encrypted
                  </span>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-3.5 px-4 font-bold text-xs rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                portal === 'customer'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-950/40'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-purple-950/40'
              }`}
            >
              {isPending ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">
                    sync
                  </span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>
                    {tab === 'signin'
                      ? portal === 'customer'
                        ? 'Enter Customer Banking'
                        : 'Sign In to MoneyTrace SOC'
                      : portal === 'customer'
                      ? 'Create Bank Account (₹100,000)'
                      : 'Enroll Forensic Investigator'}
                  </span>
                  <span className="material-symbols-outlined text-base">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Bar */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-amber-400">bolt</span>
                Quick Demo Credentials
              </span>
              <span className="text-[10px] text-slate-500 font-mono">1-click fill</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Admin Chip */}
              <button
                type="button"
                onClick={() => {
                  setPortal('admin');
                  setTab('signin');
                  handleQuickFill('admin', 'Admin123');
                }}
                className="p-2 bg-[#111A2E] hover:bg-[#18233C] border border-slate-800 hover:border-purple-500/50 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 group-hover:text-purple-200">
                  <span>👑 Admin SOC</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">admin / Admin123</div>
              </button>

              {/* Customer Chip */}
              <button
                type="button"
                onClick={() => {
                  setPortal('customer');
                  setTab('signin');
                  handleQuickFill('alice.johnson@moneytrace.dev', 'Customer123');
                }}
                className="p-2 bg-[#111A2E] hover:bg-[#18233C] border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                  <span>📱 Customer</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">alice.j / Customer123</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;
