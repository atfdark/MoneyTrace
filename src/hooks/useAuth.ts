import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services';
import type { LoginCredentials, RegisterData, User, AuthTokens } from '../types';
import { setTokens, clearTokens, getAccessToken } from '../api/axios';
import { useAuthStore } from '../contexts/AuthContext';

export const useLogin = () => {
  const queryClient = useQueryClient();
  const { setUser, setTokens: setAuthTokens } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (response) => {
      const { user, tokens } = response.data;
      setTokens(tokens.access_token, tokens.refresh_token);
      setAuthTokens(tokens);
      setUser(user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  const { setUser, setTokens: setAuthTokens } = useAuthStore();

  return useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: (response) => {
      const { user, tokens } = response.data;
      setTokens(tokens.access_token, tokens.refresh_token);
      setAuthTokens(tokens);
      setUser(user);
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
      // Even if logout fails on server, clear local state
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
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
    onSuccess: (response) => {
      setUser(response.data);
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