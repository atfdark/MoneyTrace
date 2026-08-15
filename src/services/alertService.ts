import { api } from '../api';
import type {
  FraudAlert,
  AlertsParams,
  AlertsResponse,
  ResolveAlertRequest,
  FraudSummary,
  ApiResponse,
} from '../types';

const ALERT_BASE = '/alerts';

export const alertService = {
  /**
   * Get all alerts with filters
   */
  async getAlerts(params: AlertsParams = {}): Promise<ApiResponse<AlertsResponse>> {
    const response = await api.get<ApiResponse<AlertsResponse>>(ALERT_BASE, { params });
    return response.data;
  },

  /**
   * Get alert by ID
   */
  async getAlert(id: string): Promise<ApiResponse<FraudAlert>> {
    const response = await api.get<ApiResponse<FraudAlert>>(`${ALERT_BASE}/${id}`);
    return response.data;
  },

  /**
   * Resolve an alert
   */
  async resolveAlert(id: string, data: ResolveAlertRequest): Promise<ApiResponse<FraudAlert>> {
    const response = await api.post<ApiResponse<FraudAlert>>(`${ALERT_BASE}/${id}/resolve`, data);
    return response.data;
  },

  /**
   * Bulk resolve alerts
   */
  async bulkResolveAlerts(ids: string[], data: ResolveAlertRequest): Promise<ApiResponse<{ resolved: number }>> {
    const response = await api.post<ApiResponse<{ resolved: number }>>(`${ALERT_BASE}/bulk-resolve`, {
      ids,
      ...data,
    });
    return response.data;
  },

  /**
   * Escalate an alert
   */
  async escalateAlert(id: string, reason: string): Promise<ApiResponse<FraudAlert>> {
    const response = await api.post<ApiResponse<FraudAlert>>(`${ALERT_BASE}/${id}/escalate`, { reason });
    return response.data;
  },

  /**
   * Get fraud summary statistics
   */
  async getFraudSummary(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<FraudSummary>> {
    const response = await api.get<ApiResponse<FraudSummary>>(`${ALERT_BASE}/summary`, { params });
    return response.data;
  },

  /**
   * Get alert statistics
   */
  async getAlertStats(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<{
    total: number;
    by_status: Record<string, number>;
    by_risk_level: Record<string, number>;
    by_type: Record<string, number>;
    avg_risk_score: number;
    critical_count: number;
  }>> {
    const response = await api.get<ApiResponse<any>>(`${ALERT_BASE}/stats`, { params });
    return response.data;
  },

  /**
   * Get recent critical alerts
   */
  async getCriticalAlerts(limit: number = 10): Promise<ApiResponse<FraudAlert[]>> {
    const response = await api.get<ApiResponse<FraudAlert[]>>(`${ALERT_BASE}/critical`, { params: { limit } });
    return response.data;
  },

  /**
   * Export alerts
   */
  async exportAlerts(params: AlertsParams, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const response = await api.get(`${ALERT_BASE}/export`, {
      params: { ...params, format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default alertService;