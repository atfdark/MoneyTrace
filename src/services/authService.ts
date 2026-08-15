import { api } from '../api';
import type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  ApiResponse,
} from '../types';

const AUTH_BASE = '/auth';

export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    const response = await api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      `${AUTH_BASE}/register`,
      data
    );
    return response.data;
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    const response = await api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      `${AUTH_BASE}/login`,
      credentials
    );
    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>(`${AUTH_BASE}/logout`);
    return response.data;
  },

  /**
   * Get current user profile
   */
  async getMe(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>(`${AUTH_BASE}/me`);
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    const response = await api.post<ApiResponse<AuthTokens>>(`${AUTH_BASE}/refresh`, {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await api.patch<ApiResponse<User>>(`${AUTH_BASE}/profile`, data);
    return response.data;
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>(`${AUTH_BASE}/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>(`${AUTH_BASE}/forgot-password`, { email });
    return response.data;
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>(`${AUTH_BASE}/reset-password`, {
      token,
      new_password: newPassword,
    });
    return response.data;
  },
};

export default authService;