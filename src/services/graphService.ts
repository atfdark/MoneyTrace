import { api } from '../api';
import type {
  GraphData,
  ApiResponse,
} from '../types';

const GRAPH_BASE = '/graph';

export const graphService = {
  /**
   * Get transaction flow graph
   */
  async getGraph(transactionId: string, params?: {
    depth?: number;
    max_nodes?: number;
    include_frozen?: boolean;
  }): Promise<ApiResponse<GraphData>> {
    const response = await api.get<ApiResponse<GraphData>>(`${GRAPH_BASE}/${transactionId}`, { params });
    return response.data;
  },

  /**
   * Get graph for entity
   */
  async getEntityGraph(entityId: string, params?: {
    depth?: number;
    direction?: 'incoming' | 'outgoing' | 'both';
  }): Promise<ApiResponse<GraphData>> {
    const response = await api.get<ApiResponse<GraphData>>(`${GRAPH_BASE}/entity/${entityId}`, { params });
    return response.data;
  },

  /**
   * Search for paths between two accounts
   */
  async findPath(fromAccount: string, toAccount: string, params?: {
    max_depth?: number;
    max_paths?: number;
  }): Promise<ApiResponse<{ paths: GraphData[] }>> {
    const response = await api.get<ApiResponse<{ paths: GraphData[] }>>(`${GRAPH_BASE}/path`, {
      params: { from: fromAccount, to: toAccount, ...params },
    });
    return response.data;
  },

  /**
   * Get cluster analysis
   */
  async getClusters(params?: {
    min_cluster_size?: number;
    risk_threshold?: number;
  }): Promise<ApiResponse<{ clusters: any[] }>> {
    const response = await api.get<ApiResponse<{ clusters: any[] }>>(`${GRAPH_BASE}/clusters`, { params });
    return response.data;
  },

  /**
   * Export graph data
   */
  async exportGraph(transactionId: string, format: 'json' | 'graphml' | 'csv' = 'json'): Promise<Blob> {
    const response = await api.get<Blob>(`${GRAPH_BASE}/${transactionId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default graphService;