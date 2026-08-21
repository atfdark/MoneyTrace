import { api } from '../api';
import type {
  Report,
  GenerateReportRequest,
  ReportsResponse,
  ReportFilters,
  ApiResponse,
} from '../types';

const REPORT_BASE = '/reports';

export const reportService = {
  /**
   * Get all reports
   */
  async getReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<ApiResponse<ReportsResponse>> {
    const response = await api.get<ApiResponse<ReportsResponse>>(REPORT_BASE, { params });
    return response.data;
  },

  /**
   * Get report by ID
   */
  async getReport(id: string): Promise<ApiResponse<Report>> {
    const response = await api.get<ApiResponse<Report>>(`${REPORT_BASE}/${id}`);
    return response.data;
  },

  /**
   * Generate a new report
   */
  async generateReport(data: GenerateReportRequest): Promise<ApiResponse<Report>> {
    const response = await api.post<ApiResponse<Report>>(`${REPORT_BASE}/generate`, data);
    return response.data;
  },

  /**
   * Download report
   */
  async downloadReport(id: string): Promise<Blob> {
    const response = await api.get<Blob>(`${REPORT_BASE}/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Preview report (get preview data)
   */
  async previewReport(id: string): Promise<ApiResponse<any>> {
    const response = await api.get<ApiResponse<any>>(`${REPORT_BASE}/${id}/preview`);
    return response.data;
  },

  /**
   * Delete report
   */
  async deleteReport(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`${REPORT_BASE}/${id}`);
    return response.data;
  },

  /**
   * Get report templates
   */
  async getTemplates(): Promise<ApiResponse<{ id: string; name: string; description: string; filters: ReportFilters }[]>> {
    const response = await api.get<ApiResponse<any[]>>(`${REPORT_BASE}/templates`);
    return response.data;
  },
};

export default reportService;