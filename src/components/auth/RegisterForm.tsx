import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../../hooks/useAuth';
import { ApiError } from '../../api/errors';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { mutate: register, isPending, error } = useRegister();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (name: string, value: string): string | null => {
    switch (name) {
      case 'full_name':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Full name must be at least 2 characters';
        return null;
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
        return null;
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
        return null;
      case 'confirm_password':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return null;
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    const fieldError = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: fieldError || '',
    }));

    if (formError) setFormError(null);
  };

  const handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldError = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: fieldError || '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors: Record<string, string> = {};
    let hasErrors = false;

    (Object.keys(formData) as Array<keyof typeof formData>).forEach((key) => {
      const fieldError = validateField(key, formData[key]);
      if (fieldError) {
        errors[key] = fieldError;
        hasErrors = true;
      }
    });

    setFieldErrors(errors);

    if (hasErrors) return;

    const registerData = {
      full_name: formData.full_name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    };

    register(registerData, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/dashboard', { replace: true });
        }
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          setFormError(err.getUserMessage());
          if (err.statusCode === 409 || (err as any).status === 409) {
            setFieldErrors((prev) => ({
              ...prev,
              email: 'An account with this email already exists',
            }));
          }
        } else {
          setFormError('Registration failed. Please check your details and try again.');
        }
      },
    });
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

      {/* Full Name Field */}
      <div className="space-y-1 group">
        <label
          htmlFor="full_name"
          className="text-xs font-bold uppercase tracking-wider text-blue-600 group-focus-within:text-blue-600 transition-colors block"
        >
          Full Name
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-600 transition-colors text-[20px]">
            badge
          </span>
          <input
            type="text"
            name="full_name"
            id="full_name"
            value={formData.full_name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="John Doe"
            className={`w-full bg-[#1E293B] border rounded-xl py-3 pl-12 pr-4 text-gray-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-medium shadow-inner ${
              fieldErrors.full_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-slate-600 focus:border-purple-400'
            }`}
            disabled={isPending}
            autoComplete="name"
            required
          />
        </div>
        {fieldErrors.full_name && (
          <p className="text-xs font-semibold text-red-400 mt-1 pl-1" role="alert">{fieldErrors.full_name}</p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-1 group">
        <label
          htmlFor="email"
          className="text-xs font-bold uppercase tracking-wider text-blue-600 group-focus-within:text-blue-600 transition-colors block"
        >
          Email Address
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-600 transition-colors text-[20px]">
            account_circle
          </span>
          <input
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="investigator@agency.gov"
            className={`w-full bg-[#1E293B] border rounded-xl py-3 pl-12 pr-4 text-gray-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-medium shadow-inner ${
              fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-slate-600 focus:border-purple-400'
            }`}
            disabled={isPending}
            autoComplete="email"
            required
          />
        </div>
        {fieldErrors.email && (
          <p className="text-xs font-semibold text-red-400 mt-1 pl-1" role="alert">{fieldErrors.email}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-1 group">
        <label
          htmlFor="password"
          className="text-xs font-bold uppercase tracking-wider text-blue-600 group-focus-within:text-blue-600 transition-colors block"
        >
          Password
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-600 transition-colors text-[20px]">
            lock
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••••••••"
            className={`w-full bg-[#1E293B] border rounded-xl py-3 pl-12 pr-11 text-gray-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-medium shadow-inner ${
              fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-slate-600 focus:border-purple-400'
            }`}
            disabled={isPending}
            autoComplete="new-password"
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
        {fieldErrors.password && (
          <p className="text-xs font-semibold text-red-400 mt-1 pl-1" role="alert">{fieldErrors.password}</p>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-1 group">
        <label
          htmlFor="confirm_password"
          className="text-xs font-bold uppercase tracking-wider text-blue-600 group-focus-within:text-blue-600 transition-colors block"
        >
          Confirm Password
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-600 transition-colors text-[20px]">
            lock_reset
          </span>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirm_password"
            id="confirm_password"
            value={formData.confirm_password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••••••••"
            className={`w-full bg-[#1E293B] border rounded-xl py-3 pl-12 pr-11 text-gray-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-medium shadow-inner ${
              fieldErrors.confirm_password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-slate-600 focus:border-purple-400'
            }`}
            disabled={isPending}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            disabled={isPending}
            tabIndex={-1}
          >
            <span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility' : 'visibility_off'}</span>
          </button>
        </div>
        {fieldErrors.confirm_password && (
          <p className="text-xs font-semibold text-red-400 mt-1 pl-1" role="alert">{fieldErrors.confirm_password}</p>
        )}
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
            <span>Creating Investigator Account...</span>
          </>
        ) : (
          <>
            <span>Complete Registration</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </>
        )}
      </button>

      {/* Login Link */}
      <div className="text-center pt-2">
        <p className="text-xs text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-600 font-bold transition-colors">
            Sign In Here
          </Link>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;