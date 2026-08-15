import { api } from '../api';
import type {
  Transaction,
  SendTransactionRequest,
  TransactionHistoryParams,
  TransactionHistoryResponse,
  LiveTransactionFeed,
  ApiResponse,
} from '../types';

const TRANSACTION_BASE = '/transactions';

export const transactionService = {
  /**
   * Send a new transaction
   */
  async sendTransaction(data: SendTransactionRequest): Promise<ApiResponse<Transaction>> {
    const response = await api.post<ApiResponse<Transaction>>(`${TRANSACTION_BASE}/send`, data);
    return response.data;
  },

  /**
   * Get transaction history with filters
   */
  async getHistory(params: TransactionHistoryParams = {}): Promise<ApiResponse<TransactionHistoryResponse>> {
    const response = await api.get<ApiResponse<TransactionHistoryResponse>>(`${TRANSACTION_BASE}/history`, { params });
    return response.data;
  },

  /**
   * Get live transaction feed
   */
  async getLiveFeed(limit: number = 50): Promise<ApiResponse<LiveTransactionFeed[]>> {
    const response = await api.get<ApiResponse<LiveTransactionFeed[]>>(`${TRANSACTION_BASE}/live`, { params: { limit } });
    return response.data;
  },

  /**
   * Get transaction by ID
   */
  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    const response = await api.get<ApiResponse<Transaction>>(`${TRANSACTION_BASE}/${id}`);
    return response.data;
  },

  /**
   * Get transaction by hash
   */
  async getTransactionByHash(txHash: string): Promise<ApiResponse<Transaction>> {
    const response = await api.get<ApiResponse<Transaction>>(`${TRANSACTION_BASE}/hash/${txHash}`);
    return response.data;
  },

  /**
   * Flag a transaction manually
   */
  async flagTransaction(id: string, reason: string): Promise<ApiResponse<Transaction>> {
    const response = await api.post<ApiResponse<Transaction>>(`${TRANSACTION_BASE}/${id}/flag`, { reason });
    return response.data;
  },

  /**
   * Approve a flagged transaction
   */
  async approveTransaction(id: string): Promise<ApiResponse<Transaction>> {
    const response = await api.post<ApiResponse<Transaction>>(`${TRANSACTION_BASE}/${id}/approve`);
    return response.data;
  },

  /**
   * Freeze a transaction
   */
  async freezeTransaction(id: string, reason: string): Promise<ApiResponse<Transaction>> {
    const response = await api.post<ApiResponse<Transaction>>(`${TRANSACTION_BASE}/${id}/freeze`, { reason });
    return response.data;
  },

  /**
   * Get transaction statistics
   */
  async getStats(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<{
    total_count: number;
    total_volume: number;
    by_status: Record<string, number>;
    by_network: Record<string, number>;
    by_currency: Record<string, number>;
    avg_risk_score: number;
  }>> {
    const response = await api.get<ApiResponse<any>>(`${TRANSACTION_BASE}/stats`, { params });
    return response.data;
  },

  /**
   * Export transactions
   */
  async exportTransactions(params: TransactionHistoryParams, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const response = await api.get(`${TRANSACTION_BASE}/export`, {
      params: { ...params, format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default transactionService;