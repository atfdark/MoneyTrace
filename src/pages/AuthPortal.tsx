import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogin, useRegister } from '../hooks/useAuth';
import { ApiError } from '../api/errors';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load the 3D globe to keep initial bundle small
const IntelligenceGlobe = lazy(() => import('../components/login/IntelligenceGlobe'));

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

  const path = location.pathname;
  const isCustomerPath = path.startsWith('/customer');
  const isRegisterPath = path.includes('register');

  const [portal, setPortal] = useState<PortalType>(
    initialPortal || (isCustomerPath ? 'customer' : 'admin')
  );
  const [tab, setTab] = useState<TabType>(
    initialTab || (isRegisterPath ? 'register' : 'signin')
  );

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

        if (portal === 'customer') {
          navigate('/customer/home', { replace: true });
        } else {
          const from = (location.state as any)?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      } else {
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

  // System status ticker values
  const [liveConnections] = useState(Math.floor(Math.random() * 12) + 4);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative overflow-hidden selection:bg-blue-500/20">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* ─────────── LEFT SIDE: Login Form (40%) ─────────── */}
      <div className="relative z-10 w-full lg:w-[40%] min-h-screen flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-10">
        {/* Logo & Branding */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-[22px]">account_balance</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">MoneyTrace</h1>
              <p className="text-[11px] font-medium text-gray-400 tracking-wide">Financial Crime Intelligence Platform</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[28px] lg:text-[32px] font-bold text-gray-900 leading-tight tracking-tight">
              Monitor.<br />
              Detect.<br />
              Trace.<br />
              <span className="text-blue-600">Recover.</span>
            </p>
          </div>
        </motion.div>

        {/* Portal Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-5"
        >
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setPortal('admin')}
              className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all ${
                portal === 'admin'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Investigator
            </button>
            <button
              onClick={() => setPortal('customer')}
              className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all ${
                portal === 'customer'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Customer
            </button>
          </div>
        </motion.div>

        {/* Sign In / Register Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-6"
        >
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setTab('signin')}
              className={`pb-2.5 text-[14px] font-semibold transition-colors border-b-2 -mb-px ${
                tab === 'signin'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('register')}
              className={`pb-2.5 text-[14px] font-semibold transition-colors border-b-2 -mb-px ${
                tab === 'register'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Register
            </button>
          </div>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Error Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
              >
                <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
                <p className="text-[13px] text-red-700">{errorMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full Name (Register only) */}
          <AnimatePresence>
            {tab === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full legal name"
                  className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-300"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email / Username */}
          <div>
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
              {portal === 'customer' ? 'Email or Account Number' : 'Email or Username'}
            </label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={portal === 'customer' ? 'e.g. ACC1001 or email' : 'investigator@moneytrace.gov'}
              className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-300"
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 pr-12 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-300"
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Confirm Password (Register only) */}
          <AnimatePresence>
            {tab === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 pr-12 text-gray-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-300"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Remember Me + Quick Fill */}
          {tab === 'signin' && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[13px] text-gray-500">Remember session</span>
              </label>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg text-[14px] transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{tab === 'signin' ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>

          {/* Quick Fill for Demo */}
          {tab === 'signin' && portal === 'admin' && (
            <div className="pt-2">
              <p className="text-[11px] text-gray-400 mb-2">Demo Quick Access:</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@moneytrace.com', 'admin123')}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Admin Login
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('analyst@moneytrace.com', 'analyst123')}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Analyst Login
                </button>
              </div>
            </div>
          )}
        </motion.form>

        {/* System Status Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 pt-6 border-t border-gray-100"
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="font-medium text-gray-500">System Status:</span>
              <span className="text-green-600 font-semibold">Operational</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-gray-400">link</span>
              <span>Live Connections: <span className="font-semibold text-gray-600">{liveConnections}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Threat Monitoring: <span className="font-semibold text-blue-600">Active</span></span>
            </div>
          </div>

          <p className="text-[10px] text-gray-300 mt-4">
            © 2025 MoneyTrace Financial Crime Intelligence Platform. Authorized access only.
          </p>
        </motion.div>
      </div>

      {/* ─────────── RIGHT SIDE: 3D Intelligence Globe (60%) ─────────── */}
      <div className="hidden lg:flex w-[60%] min-h-screen items-center justify-center relative overflow-hidden bg-[#070C18] border-l border-gray-200/80">
        {/* Globe Container */}
        <div className="w-full h-full">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-[#070C18]">
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 border-2 border-blue-400/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                  <p className="text-[12px] text-slate-400 font-mono">Initializing 3D Telemetry Grid...</p>
                </div>
              </div>
            }
          >
            <IntelligenceGlobe />
          </Suspense>
        </div>

        {/* Floating Intelligence Metrics Overlay */}
        <div className="absolute bottom-8 right-8 z-20 flex gap-3 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-[#090E1A]/85 backdrop-blur-md border border-slate-800/90 rounded-xl px-4 py-2.5 shadow-2xl"
          >
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Active Nodes</p>
            <p className="text-[18px] font-bold text-white tabular-nums font-mono">7 Hubs</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-[#090E1A]/85 backdrop-blur-md border border-slate-800/90 rounded-xl px-4 py-2.5 shadow-2xl"
          >
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Live Routes</p>
            <p className="text-[18px] font-bold text-cyan-400 tabular-nums font-mono">12 Corridors</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="bg-[#090E1A]/85 backdrop-blur-md border border-slate-800/90 rounded-xl px-4 py-2.5 shadow-2xl"
          >
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Threat Level</p>
            <p className="text-[18px] font-bold text-amber-400 tabular-nums font-mono">Elevated</p>
          </motion.div>
        </div>

        {/* Top-right classification banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute top-6 right-8 z-20 pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-[#090E1A]/85 backdrop-blur-md border border-slate-800/90 rounded-lg px-3.5 py-1.5 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">
              Real-Time Financial Telemetry
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPortal;
