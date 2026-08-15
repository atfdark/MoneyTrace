import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recoveryService } from '../services';
import type { RecoveryIntelligence, RecoveryAction } from '../types';

export const useRecoveryIntelligence = (transactionId: string | null) => {
  return useQuery({
    queryKey: ['recovery', 'intelligence', transactionId],
    queryFn: () => recoveryService.getRecoveryIntelligence(transactionId!),
    enabled: !!transactionId,
    staleTime: 60 * 1000,
  });
};

export const useExecuteRecoveryAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, actionId, data }: { transactionId: string; actionId: string; data?: any }) =>
      recoveryService.executeAction(transactionId, actionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recovery', 'intelligence', variables.transactionId] });
    },
  });
};

export const useUpdateRecoveryActionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      actionId,
      status,
      notes,
    }: {
      transactionId: string;
      actionId: string;
      status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
      notes?: string;
    }) => recoveryService.updateActionStatus(transactionId, actionId, status, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recovery', 'intelligence', variables.transactionId] });
    },
  });
};

export const useRequestFreeze = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, accountId, reason }: { transactionId: string; accountId: string; reason: string }) =>
      recoveryService.requestFreeze(transactionId, accountId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recovery', 'intelligence', variables.transactionId] });
    },
  });
};

export const useJurisdictionAnalysis = (jurisdiction: string | null) => {
  return useQuery({
    queryKey: ['recovery', 'jurisdiction', jurisdiction],
    queryFn: () => recoveryService.getJurisdictionAnalysis(jurisdiction!),
    enabled: !!jurisdiction,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGenerateRecoveryReport = () => {
  return useMutation({
    mutationFn: ({ transactionId, format }: { transactionId: string; format?: 'pdf' | 'excel' }) =>
      recoveryService.generateReport(transactionId, format),
  });
};