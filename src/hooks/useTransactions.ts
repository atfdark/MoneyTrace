import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../services';
import type {
  Transaction,
  SendTransactionRequest,
  TransactionHistoryParams,
  TransactionHistoryResponse,
  LiveTransactionFeed,
} from '../types';

export const useTransactionHistory = (params: TransactionHistoryParams = {}) => {
  return useQuery({
    queryKey: ['transactions', 'history', params],
    queryFn: () => transactionService.getHistory(params),
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });
};

export const useTransaction = (id: string | null) => {
  return useQuery({
    queryKey: ['transactions', 'detail', id],
    queryFn: () => transactionService.getTransaction(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useTransactionByHash = (txHash: string | null) => {
  return useQuery({
    queryKey: ['transactions', 'hash', txHash],
    queryFn: () => transactionService.getTransactionByHash(txHash!),
    enabled: !!txHash,
    staleTime: 60 * 1000,
  });
};

export const useLiveTransactionFeed = (limit: number = 50) => {
  return useQuery({
    queryKey: ['transactions', 'live', limit],
    queryFn: () => transactionService.getLiveFeed(limit),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
  });
};

export const useSendTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendTransactionRequest) => transactionService.sendTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'live'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
};

export const useFlagTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => transactionService.flagTransaction(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useApproveTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionService.approveTransaction(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useFreezeTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => transactionService.freezeTransaction(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'history'] });
    },
  });
};

export const useTransactionStats = (params?: { start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['transactions', 'stats', params],
    queryFn: () => transactionService.getStats(params),
    staleTime: 60 * 1000,
  });
};

export const useExportTransactions = () => {
  return useMutation({
    mutationFn: ({ params, format }: { params: TransactionHistoryParams; format?: 'csv' | 'excel' }) =>
      transactionService.exportTransactions(params, format),
  });
};