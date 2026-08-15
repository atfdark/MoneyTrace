import { api } from '../api';
import type {
  DashboardStats,
  DashboardTrends,
  FraudSummary,
  ApiResponse,
} from '../types';

const DASHBOARD_BASE = '/dashboard';

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await api.get<ApiResponse<DashboardStats>>(`${DASHBOARD_BASE}/stats`);
    return response.data;
  },

  /**
   * Get dashboard trends for charts
   */
  async getTrends(params?: {
    period?: '7d' | '30d' | '90d' | '1y';
  }): Promise<ApiResponse<DashboardTrends>> {
    const response = await api.get<ApiResponse<DashboardTrends>>(`${DASHBOARD_BASE}/trends`, { params });
    return response.data;
  },

  /**
   * Get fraud summary
   */
  async getFraudSummary(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<FraudSummary>> {
    const response = await api.get<ApiResponse<FraudSummary>>(`${DASHBOARD_BASE}/fraud-summary`, { params });
    return response.data;
  },

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<ApiResponse<{
    transactions_per_minute: number;
    alerts_per_minute: number;
    active_investigations: number;
    system_health: 'healthy' | 'degraded' | 'critical';
  }>> {
    const response = await api.get<ApiResponse<any>>(`${DASHBOARD_BASE}/realtime`);
    return response.data;
  },
};

export default dashboardService;