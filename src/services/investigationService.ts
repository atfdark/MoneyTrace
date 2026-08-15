import { api } from '../api';
import type {
  InvestigationDetail,
  EntityDetail,
  AIAnalysisReport,
  ApiResponse,
} from '../types';

const INVESTIGATION_BASE = '/investigation';

export const investigationService = {
  /**
   * Get full investigation details for a transaction
   */
  async getInvestigation(transactionId: string): Promise<ApiResponse<InvestigationDetail>> {
    const response = await api.get<ApiResponse<InvestigationDetail>>(`${INVESTIGATION_BASE}/${transactionId}`);
    return response.data;
  },

  /**
   * Get entity details
   */
  async getEntity(entityId: string): Promise<ApiResponse<EntityDetail>> {
    const response = await api.get<ApiResponse<EntityDetail>>(`${INVESTIGATION_BASE}/entity/${entityId}`);
    return response.data;
  },

  /**
   * Get AI analysis report
   */
  async getAIAnalysis(transactionId: string): Promise<ApiResponse<AIAnalysisReport>> {
    const response = await api.get<ApiResponse<AIAnalysisReport>>(`${INVESTIGATION_BASE}/${transactionId}/ai-analysis`);
    return response.data;
  },

  /**
   * Get historical activity for an entity
   */
  async getEntityHistory(entityId: string, params?: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<any>> {
    const response = await api.get<ApiResponse<any>>(`${INVESTIGATION_BASE}/entity/${entityId}/history`, { params });
    return response.data;
  },

  /**
   * Create a new investigation case
   */
  async createInvestigation(data: {
    transaction_id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    assigned_to?: string;
  }): Promise<ApiResponse<{ id: string }>> {
    const response = await api.post<ApiResponse<{ id: string }>>(`${INVESTIGATION_BASE}`, data);
    return response.data;
  },

  /**
   * Update investigation
   */
  async updateInvestigation(id: string, data: {
    status?: 'open' | 'in_progress' | 'closed' | 'archived';
    notes?: string;
    assigned_to?: string;
  }): Promise<ApiResponse<void>> {
    const response = await api.patch<ApiResponse<void>>(`${INVESTIGATION_BASE}/${id}`, data);
    return response.data;
  },

  /**
   * Add investigation note
   */
  async addNote(investigationId: string, note: string): Promise<ApiResponse<{ id: string }>> {
    const response = await api.post<ApiResponse<{ id: string }>>(`${INVESTIGATION_BASE}/${investigationId}/notes`, { note });
    return response.data;
  },
};

export default investigationService;