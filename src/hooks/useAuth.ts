import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services';
import type { LoginCredentials, RegisterData, User, AuthTokens } from '../types';
import { setTokens, clearTokens, getAccessToken } from '../api/axios';
import { useAuthStore } from '../contexts/AuthContext';

export const useLogin = () => {
  const queryClient = useQueryClient();
  const { setUser, setTokens: setAuthTokens } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await authService.login(credentials);
      return res;
    },
    onSuccess: async (response: any) => {
      const payload = response.data || response;
      const tokens: AuthTokens = payload.tokens || (payload.access_token ? payload : null);
      let user: User | null = payload.user || null;

      if (tokens && tokens.access_token) {
        setTokens(tokens.access_token, tokens.refresh_token);
        setAuthTokens(tokens);
      }

      // If user profile is not directly in login response, fetch /auth/me
      if (!user && tokens && tokens.access_token) {
        try {
          const meRes = await authService.getMe();
          user = (meRes as any).data || meRes;
        } catch (err) {
          console.warn('Could not fetch user profile immediately:', err);
        }
      }

      if (user) {
        setUser(user);
      }

      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  const { setUser, setTokens: setAuthTokens } = useAuthStore();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await authService.register(data);
      return res;
    },
    onSuccess: async (response: any) => {
      const payload = response.data || response;
      const tokens: AuthTokens = payload.tokens || (payload.access_token ? payload : null);
      let user: User | null = payload.user || (!payload.tokens && payload.id ? payload : null);

      if (tokens && tokens.access_token) {
        setTokens(tokens.access_token, tokens.refresh_token);
        setAuthTokens(tokens);
      }

      if (!user && tokens && tokens.access_token) {
        try {
          const meRes = await authService.getMe();
          user = (meRes as any).data || meRes;
        } catch (err) {
          console.warn('Could not fetch user profile after register:', err);
        }
      }

      if (user) {
        setUser(user);
      }

      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearTokens();
      clearAuth();
      queryClient.clear();
    },
    onError: () => {
      clearTokens();
      clearAuth();
      queryClient.clear();
    },
  });
};

export const useCurrentUser = () => {
  const { user, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => authService.getMe(),
    enabled: isAuthenticated && !!getAccessToken(),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof Error && 'isAuthError' in error && (error as any).isAuthError) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (data: Partial<User>) => authService.updateProfile(data),
    onSuccess: (response: any) => {
      const payload = response.data || response;
      setUser(payload);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(currentPassword, newPassword),
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email: string) => authService.requestPasswordReset(email),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authService.resetPassword(token, newPassword),
  });
};

export const useUser = useCurrentUser;