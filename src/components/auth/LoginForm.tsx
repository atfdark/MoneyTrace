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
          setFormError('Login failed. Please try again.');
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
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Email Field */}
      <div className="space-y-1 group">
        <label
          htmlFor="email"
          className="font-label-caps text-label-caps text-on-surface-variant group-focus-within:text-secondary transition-colors"
        >
          Username / Email
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-secondary transition-colors">
            account_circle
          </span>
          <input
            type="email"
            name="email"
            id="email"
            value={credentials.email}
            onChange={handleChange}
            placeholder="investigator@agency.gov"
            className="w-full bg-surface-container/50 border border-outline-variant/50 rounded-DEFAULT py-3 pl-12 pr-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all font-body-md"
            disabled={isPending}
            autoComplete="email"
            required
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-1 group">
        <div className="flex justify-between items-center">
          <label
            htmlFor="password"
            className="font-label-caps text-label-caps text-on-surface-variant group-focus-within:text-secondary transition-colors"
          >
            Password
          </label>
          <Link
            to="/forgot-password"
            className="font-label-caps text-label-caps text-secondary hover:text-secondary-container transition-colors"
          >
            Forgot?
          </Link>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-secondary transition-colors">
            lock
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="password"
            value={credentials.password}
            onChange={handleChange}
            placeholder="••••••••••••"
            className="w-full bg-surface-container/50 border border-outline-variant/50 rounded-DEFAULT py-3 pl-12 pr-10 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 transition-all font-body-md"
            disabled={isPending}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface transition-colors"
            disabled={isPending}
          >
            <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility' : 'visibility_off'}</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {(formError || error) && (
        <div
          className="bg-error-container/20 border border-error/30 text-error px-4 py-3 rounded-lg font-body-sm flex items-center gap-2 animate-in slide-in-from-top-2"
          role="alert"
        >
          <span className="material-symbols-outlined">error</span>
          {formError || (error instanceof ApiError ? error.getUserMessage() : 'Login failed')}
        </div>
      )}

      {/* Remember Me */}
      <div className="flex items-center">
        <input
          type="checkbox"
          name="remember_me"
          id="remember"
          checked={credentials.remember_me}
          onChange={handleChange}
          className="h-4 w-4 bg-surface-container border-outline-variant rounded text-secondary focus:ring-secondary focus:ring-offset-background"
          disabled={isPending}
        />
        <label
          htmlFor="remember"
          className="ml-2 font-body-sm text-body-sm text-on-surface-variant cursor-pointer"
        >
          Remember device for 30 days
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container font-headline-md text-body-md py-3 rounded-DEFAULT transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-secondary-container/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isPending ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Authenticating...
          </>
        ) : (
          <>
            <span>Authenticate</span>
            <span className="material-symbols-outlined text-[20px]">login</span>
          </>
        )}
      </button>

      {/* Register Link */}
      <div className="text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-secondary hover:text-secondary-container font-medium transition-colors">
            Register
          </Link>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;