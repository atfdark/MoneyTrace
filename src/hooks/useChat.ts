import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../services';
import type { ChatMessage, ChatRequest, ChatContext } from '../types';

export const useChat = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['chat', 'conversation', conversationId],
    queryFn: () => chatService.getConversation(conversationId!),
    enabled: !!conversationId,
    staleTime: 30 * 1000,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ChatRequest) => chatService.sendMessage(request),
    onSuccess: (response, variables) => {
      if (variables.conversation_id) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversation', variables.conversation_id] });
      }
    },
  });
};

export const useSuggestedQuestions = (context: ChatContext | null) => {
  return useQuery({
    queryKey: ['chat', 'suggestions', context],
    queryFn: () => chatService.getSuggestedQuestions(context!),
    enabled: !!context,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateConversation = () => {
  return useMutation({
    mutationFn: (context?: ChatContext) => chatService.createConversation(context),
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => chatService.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};