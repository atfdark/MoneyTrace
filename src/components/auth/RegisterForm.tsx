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

    // Clear field error on change
    const fieldError = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: fieldError || '',
    }));

    // Clear form error
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

    // Validate all fields
    const errors: Record<string, string> = {};
    let hasErrors = false;

    (Object.keys(formData) as Array<keyof typeof formData>).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        errors[key] = error;
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
          if (err.statusCode === 422 && err.code === 'VALIDATION_ERROR') {
            // Handle field-specific validation errors from backend
            setFieldErrors(err.code as any); // Type assertion for dynamic keys
          } else {
            setFormError(err.getUserMessage());
          }
        } else {
          setFormError('Registration failed. Please try again.');
        }
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Full Name Field */}
      <div className="space-y-1 group">
        <label
          htmlFor="full_name"
          className="font-label-caps text-label-caps text-on-surface-variant group-focus-within:text-secondary transition-colors"
        >
          Full Name
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-secondary transition-colors">
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
            className={`w-full bg-surface-container/50 border rounded-DEFAULT py-3 pl-12 pr-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-body-md ${
              fieldErrors.full_name ? 'border-error focus:border-error focus:ring-error/50' : 'border-outline-variant/50 focus:border-secondary/50'
            }`}
            disabled={isPending}
            autoComplete="name"
            required
          />
        </div>
        {fieldErrors.full_name && (
          <p className="font-body-sm text-error ml-2" role="alert">{fieldErrors.full_name}</p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-1 group">
        <label
          htmlFor="email"
          className="font-label-caps text-label-caps text-on-surface-variant group-focus-within:text-secondary transition-colors"
        >
          Email Address
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-secondary transition-colors">
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
            className={`w-full bg-surface-container/50 border rounded-DEFAULT py-3 pl-12 pr-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-body-md ${
              fieldErrors.email ? 'border-error focus:border-error focus:ring-error/50' : 'border-outline-variant/50 focus:border-secondary/50'
            }`}
            disabled={isPending}
            autoComplete="email"
            required
          />
        </div>
        {fieldErrors.email && (
          <p className="font-body-sm text-error ml-2" role="alert">{fieldErrors.email}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-1 group">
        <label
          htmlFor="password"
          className="font-label-caps text-label-caps text-on-surface-variant group-focus-within:text-secondary transition-colors"
        >
          Password
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-secondary transition-colors">
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
            className={`w-full bg-surface-container/50 border rounded-DEFAULT py-3 pl-12 pr-10 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-body-md ${
              fieldErrors.password ? 'border-error focus:border-error focus:ring-error/50' : 'border-outline-variant/50 focus:border-secondary/50'
            }`}
            disabled={isPending}
            autoComplete="new-password"
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
        {fieldErrors.password && (
          <p className="font-body-sm text-error ml-2" role="alert">{fieldErrors.password}</p>
        )}
        {!fieldErrors.password && formData.password && (
          <div className="ml-2 mt-1 h-1 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary transition-all duration-300"
              style={{
                width: `${Math.min(100, (formData.password.length / 16) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-1 group">
        <label
          htmlFor="confirm_password"
          className="font-label-caps text-label-caps text-on-surface-variant group-focus-within:text-secondary transition-colors"
        >
          Confirm Password
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-secondary transition-colors">
            lock_outline
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirm_password"
            id="confirm_password"
            value={formData.confirm_password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••••••••"
            className={`w-full bg-surface-container/50 border rounded-DEFAULT py-3 pl-12 pr-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-body-md ${
              fieldErrors.confirm_password ? 'border-error focus:border-error focus:ring-error/50' : 'border-outline-variant/50 focus:border-secondary/50'
            }`}
            disabled={isPending}
            autoComplete="new-password"
            required
          />
        </div>
        {fieldErrors.confirm_password && (
          <p className="font-body-sm text-error ml-2" role="alert">{fieldErrors.confirm_password}</p>
        )}
      </div>

      {/* Error Message */}
      {(formError || error) && (
        <div
          className="bg-error-container/20 border border-error/30 text-error px-4 py-3 rounded-lg font-body-sm flex items-center gap-2 animate-in slide-in-from-top-2"
          role="alert"
        >
          <span className="material-symbols-outlined">error</span>
          {formError || (error instanceof ApiError ? error.getUserMessage() : 'Registration failed')}
        </div>
      )}

      {/* Terms Checkbox */}
      <div className="flex items-start">
        <input
          type="checkbox"
          name="terms"
          id="terms"
          className="h-4 w-4 mt-0.5 bg-surface-container border-outline-variant rounded text-secondary focus:ring-secondary focus:ring-offset-background"
          disabled={isPending}
          required
        />
        <label
          htmlFor="terms"
          className="ml-2 font-body-sm text-body-sm text-on-surface-variant cursor-pointer"
        >
          I agree to the{' '}
          <Link to="/terms" className="text-secondary hover:text-secondary-container underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-secondary hover:text-secondary-container underline">
            Privacy Policy
          </Link>
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
            Creating Account...
          </>
        ) : (
          <>
            <span>Create Account</span>
            <span className="material-symbols-outlined text-[20px]">person_add</span>
          </>
        )}
      </button>

      {/* Login Link */}
      <div className="text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Already have an account?{' '}
          <Link to="/login" className="text-secondary hover:text-secondary-container font-medium transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </form>
  );
};

export default RegisterForm;