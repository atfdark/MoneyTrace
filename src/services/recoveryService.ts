import { api } from '../api';
import type {
  RecoveryIntelligence,
  RecoveryAction,
  ApiResponse,
} from '../types';

const RECOVERY_BASE = '/recovery';

export const recoveryService = {
  /**
   * Get recovery intelligence for a transaction
   */
  async getRecoveryIntelligence(transactionId: string): Promise<ApiResponse<RecoveryIntelligence>> {
    const response = await api.get<ApiResponse<RecoveryIntelligence>>(`${RECOVERY_BASE}/${transactionId}`);
    return response.data;
  },

  /**
   * Execute a recovery action
   */
  async executeAction(transactionId: string, actionId: string, data?: any): Promise<ApiResponse<RecoveryAction>> {
    const response = await api.post<ApiResponse<RecoveryAction>>(
      `${RECOVERY_BASE}/${transactionId}/actions/${actionId}/execute`,
      data
    );
    return response.data;
  },

  /**
   * Update action status
   */
  async updateActionStatus(
    transactionId: string,
    actionId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled',
    notes?: string
  ): Promise<ApiResponse<RecoveryAction>> {
    const response = await api.patch<ApiResponse<RecoveryAction>>(
      `${RECOVERY_BASE}/${transactionId}/actions/${actionId}`,
      { status, notes }
    );
    return response.data;
  },

  /**
   * Get jurisdiction analysis
   */
  async getJurisdictionAnalysis(jurisdiction: string): Promise<ApiResponse<any>> {
    const response = await api.get<ApiResponse<any>>(`${RECOVERY_BASE}/jurisdiction/${jurisdiction}`);
    return response.data;
  },

  /**
   * Request account freeze
   */
  async requestFreeze(transactionId: string, accountId: string, reason: string): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>(`${RECOVERY_BASE}/${transactionId}/freeze`, {
      account_id: accountId,
      reason,
    });
    return response.data;
  },

  /**
   * Generate recovery report
   */
  async generateReport(transactionId: string, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> {
    const response = await api.get<Blob>(`${RECOVERY_BASE}/${transactionId}/report`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default recoveryService;