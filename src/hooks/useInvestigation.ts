import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investigationService } from '../services';
import type { InvestigationDetail, EntityDetail, AIAnalysisReport } from '../types';

export const useInvestigation = (transactionId: string | null) => {
  return useQuery({
    queryKey: ['investigation', 'detail', transactionId],
    queryFn: () => investigationService.getInvestigation(transactionId!),
    enabled: !!transactionId,
    staleTime: 60 * 1000,
  });
};

export const useEntity = (entityId: string | null) => {
  return useQuery({
    queryKey: ['investigation', 'entity', entityId],
    queryFn: () => investigationService.getEntity(entityId!),
    enabled: !!entityId,
    staleTime: 60 * 1000,
  });
};

export const useAIAnalysis = (transactionId: string | null) => {
  return useQuery({
    queryKey: ['investigation', 'ai-analysis', transactionId],
    queryFn: () => investigationService.getAIAnalysis(transactionId!),
    enabled: !!transactionId,
    staleTime: 60 * 1000,
  });
};

export const useEntityHistory = (entityId: string | null, params?: {
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: ['investigation', 'entity-history', entityId, params],
    queryFn: () => investigationService.getEntityHistory(entityId!, params),
    enabled: !!entityId,
    staleTime: 60 * 1000,
  });
};

export const useCreateInvestigation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      transaction_id: string;
      title: string;
      description?: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      assigned_to?: string;
    }) => investigationService.createInvestigation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation'] });
    },
  });
};

export const useUpdateInvestigation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: {
      status?: 'open' | 'in_progress' | 'closed' | 'archived';
      notes?: string;
      assigned_to?: string;
    }}) => investigationService.updateInvestigation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investigation', 'detail'] });
    },
  });
};

export const useAddInvestigationNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investigationId, note }: { investigationId: string; note: string }) =>
      investigationService.addNote(investigationId, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investigation', 'detail'] });
    },
  });
};