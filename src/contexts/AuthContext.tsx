import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, AuthTokens, AuthState } from '../types';
import { getAccessToken, getRefreshToken, clearTokens, isTokenExpired } from '../api/axios';

interface AuthContextType extends AuthState {
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  initializeAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const setUser = useCallback((user: User | null) => {
    setState((prev) => ({ ...prev, user, isAuthenticated: !!user }));
  }, []);

  const setTokens = useCallback((tokens: AuthTokens | null) => {
    setState((prev) => ({ ...prev, tokens }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const clearAuth = useCallback(() => {
    clearTokens();
    setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const initializeAuth = useCallback(async () => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (!accessToken || !refreshToken) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Check if token is expired
    if (isTokenExpired(accessToken)) {
      // Token expired, we'll let the axios interceptor handle refresh
      // But we need to verify if we can actually refresh
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    setState((prev) => ({
      ...prev,
      tokens: { access_token: accessToken, refresh_token: refreshToken, token_type: 'bearer', expires_in: 3600 },
      isLoading: false,
    }));

    // Note: Actual user fetching will be done by useCurrentUser hook
    // This just initializes the token state
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Listen for storage changes (e.g., logout in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'moneytrace_access_token' && !e.newValue) {
        clearAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [clearAuth]);

  const value: AuthContextType = {
    ...state,
    setUser,
    setTokens,
    setLoading,
    setError,
    clearAuth,
    initializeAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthStore = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthStore must be used within an AuthProvider');
  }
  return context;
};

// Hook for checking authentication status
export const useAuth = () => {
  const { isAuthenticated, user, isLoading, tokens } = useAuthStore();
  return { isAuthenticated, user, isLoading, tokens };
};

// Hook for requiring authentication (redirects if not authenticated)
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
};

export default AuthProvider;