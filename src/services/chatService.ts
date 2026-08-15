import { api } from '../api';
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatContext,
  ApiResponse,
} from '../types';

const CHAT_BASE = '/assistant';

export const chatService = {
  /**
   * Send a chat message
   */
  async sendMessage(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    const response = await api.post<ApiResponse<ChatResponse>>(`${CHAT_BASE}/chat`, request);
    return response.data;
  },

  /**
   * Get conversation history
   */
  async getConversation(conversationId: string): Promise<ApiResponse<ChatMessage[]>> {
    const response = await api.get<ApiResponse<ChatMessage[]>>(`${CHAT_BASE}/conversations/${conversationId}`);
    return response.data;
  },

  /**
   * Get suggested questions for context
   */
  async getSuggestedQuestions(context: ChatContext): Promise<ApiResponse<string[]>> {
    const response = await api.post<ApiResponse<string[]>>(`${CHAT_BASE}/suggestions`, context);
    return response.data;
  },

  /**
   * Create new conversation
   */
  async createConversation(context?: ChatContext): Promise<ApiResponse<{ conversation_id: string }>> {
    const response = await api.post<ApiResponse<{ conversation_id: string }>>(`${CHAT_BASE}/conversations`, context || {});
    return response.data;
  },

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`${CHAT_BASE}/conversations/${conversationId}`);
    return response.data;
  },
};

export default chatService;