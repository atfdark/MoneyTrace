import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import { ApiError } from '../../api/errors';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: login, isPending, error } = useLogin();

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    remember_me: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!credentials.email || !credentials.password) {
      setFormError('Please enter both email and password');
      return;
    }

    login(credentials, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate(from, { replace: true });
        }
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          setFormError(err.getUserMessage());
        } else {
          setFormError('Login failed. Please check your credentials.');
        }
      },
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Global Form Error Banner */}
      {formError && (
        <div className="p-3.5 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-red-400 text-base flex-shrink-0">error</span>
          <span>{formError}</span>
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-1 group">
        <label
          htmlFor="email"
          className="text-xs font-bold uppercase tracking-wider text-blue-600 group-focus-within:text-blue-600 transition-colors block"
        >
          Username / Email Address
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-600 transition-colors text-[20px]">
            account_circle
          </span>
          <input
            type="text"
            name="email"
            id="email"
            value={credentials.email}
            onChange={handleChange}
            placeholder="admin or admin@moneytrace.dev"
            className="w-full bg-[#1E293B] border border-slate-600 rounded-xl py-3 pl-12 pr-4 text-gray-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-all text-sm font-medium shadow-inner font-sans"
            disabled={isPending}
            autoComplete="username"
            required
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-1 group">
        <div className="flex justify-between items-center">
          <label
            htmlFor="password"
            className="text-xs font-bold uppercase tracking-wider text-blue-600 group-focus-within:text-blue-600 transition-colors block"
          >
            Password
          </label>
          <span className="text-[11px] text-blue-600 hover:text-blue-600 font-medium cursor-pointer">
            Forgot Password?
          </span>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-600 transition-colors text-[20px]">
            lock
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="password"
            value={credentials.password}
            onChange={handleChange}
            placeholder="••••••••••••"
            className="w-full bg-[#1E293B] border border-slate-600 rounded-xl py-3 pl-12 pr-11 text-gray-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-all text-sm font-medium shadow-inner"
            disabled={isPending}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            disabled={isPending}
            tabIndex={-1}
          >
            <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility' : 'visibility_off'}</span>
          </button>
        </div>
      </div>

      {/* Remember Me */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="remember_me"
            checked={credentials.remember_me}
            onChange={handleChange}
            className="w-4 h-4 rounded border-slate-600 bg-[#1E293B] text-purple-600 focus:ring-purple-500/40"
          />
          <span className="text-xs text-gray-600">Remember session</span>
        </label>
        <span className="text-xs font-mono text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-purple-800/40">
          SOC Node Active
        </span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-gray-900 font-bold rounded-xl text-sm shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
      >
        {isPending ? (
          <>
            <span className="material-symbols-outlined text-lg animate-spin">sync</span>
            <span>Authenticating Investigator...</span>
          </>
        ) : (
          <>
            <span>Sign In to MoneyTrace</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </>
        )}
      </button>

      {/* Register Link */}
      <div className="text-center pt-2">
        <p className="text-xs text-gray-500">
          Need an investigator account?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-600 font-bold transition-colors">
            Register Here
          </Link>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;