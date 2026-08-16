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
   * Get dashboard overview statistics
   * Backend endpoint: GET /api/v1/dashboard/overview
   */
  async getStats(): Promise<any> {
    const response = await api.get(`${DASHBOARD_BASE}/overview`);
    return response.data;
  },

  /**
   * Get dashboard trends for charts
   * Backend endpoint: GET /api/v1/dashboard/trends
   */
  async getTrends(params?: {
    period?: '7d' | '30d' | '90d' | '1y';
    days?: number;
  }): Promise<any> {
    const response = await api.get(`${DASHBOARD_BASE}/trends`, { params: { days: params?.days || 30 } });
    return response.data;
  },

  /**
   * Get fraud analytics summary
   * Backend endpoint: GET /api/v1/dashboard/fraud
   */
  async getFraudSummary(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const response = await api.get(`${DASHBOARD_BASE}/fraud`, { params });
    return response.data;
  },

  /**
   * Get real-time SOC monitoring metrics
   * Backend endpoint: GET /api/v1/dashboard/live
   */
  async getRealTimeMetrics(): Promise<any> {
    const response = await api.get(`${DASHBOARD_BASE}/live`);
    return response.data;
  },

  /**
   * Get transaction analytics
   * Backend endpoint: GET /api/v1/dashboard/transactions
   */
  async getTransactionAnalytics(): Promise<any> {
    const response = await api.get(`${DASHBOARD_BASE}/transactions`);
    return response.data;
  },

  /**
   * Get recovery analytics
   * Backend endpoint: GET /api/v1/dashboard/recovery
   */
  async getRecoveryAnalytics(): Promise<any> {
    const response = await api.get(`${DASHBOARD_BASE}/recovery`);
    return response.data;
  },

  /**
   * Get location analytics
   * Backend endpoint: GET /api/v1/dashboard/locations
   */
  async getLocationAnalytics(): Promise<any> {
    const response = await api.get(`${DASHBOARD_BASE}/locations`);
    return response.data;
  },

  /**
   * Get top risky accounts
   * Backend endpoint: GET /api/v1/dashboard/risky-accounts
   */
  async getRiskyAccounts(limit: number = 20): Promise<any> {
    const response = await api.get(`${DASHBOARD_BASE}/risky-accounts`, { params: { limit } });
    return response.data;
  },

  /**
   * Get investigator leaderboard
   * Backend endpoint: GET /api/v1/dashboard/investigators
   */
  async getInvestigatorLeaderboard(): Promise<any> {
    const response = await api.get(`${DASHBOARD_BASE}/investigators`);
    return response.data;
  },
};

export default dashboardService;