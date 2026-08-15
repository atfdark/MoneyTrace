import { api } from '../api';
import type {
  User,
  ApiResponse,
  PaginatedResponse,
} from '../types';

const USER_BASE = '/users';

export const userService = {
  /**
   * Get all users (admin only)
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await api.get<ApiResponse<PaginatedResponse<User>>>(USER_BASE, { params });
    return response.data;
  },

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>(`${USER_BASE}/${id}`);
    return response.data;
  },

  /**
   * Update user (admin only)
   */
  async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await api.patch<ApiResponse<User>>(`${USER_BASE}/${id}`, data);
    return response.data;
  },

  /**
   * Delete user (admin only)
   */
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`${USER_BASE}/${id}`);
    return response.data;
  },

  /**
   * Get user activity/logs
   */
  async getUserActivity(id: string, params?: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    const response = await api.get<ApiResponse<PaginatedResponse<any>>>(`${USER_BASE}/${id}/activity`, { params });
    return response.data;
  },

  /**
   * Get user's assigned investigations
   */
  async getUserInvestigations(id: string): Promise<ApiResponse<any[]>> {
    const response = await api.get<ApiResponse<any[]>>(`${USER_BASE}/${id}/investigations`);
    return response.data;
  },
};

export default userService;