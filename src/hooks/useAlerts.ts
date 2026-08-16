import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertService } from '../services';
import type {
  FraudAlert,
  AlertsParams,
  AlertsResponse,
  ResolveAlertRequest,
  FraudSummary,
} from '../types';

export const useAlerts = (params: AlertsParams = {}) => {
  return useQuery({
    queryKey: ['alerts', 'list', params],
    queryFn: () => alertService.getAlerts(params),
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useAlert = (id: string | null) => {
  return useQuery({
    queryKey: ['alerts', 'detail', id],
    queryFn: () => alertService.getAlert(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useFraudSummary = (params?: { start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['alerts', 'summary', params],
    queryFn: () => alertService.getFraudSummary(params),
    staleTime: 60 * 1000,
  });
};

export const useAlertStats = (params?: { start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['alerts', 'stats', params],
    queryFn: () => alertService.getAlertStats(params),
    staleTime: 60 * 1000,
  });
};

export const useCriticalAlerts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['alerts', 'critical', limit],
    queryFn: () => alertService.getCriticalAlerts(limit),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveAlertRequest }) => alertService.resolveAlert(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
};

export const useBulkResolveAlerts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: { ids: string[]; data: ResolveAlertRequest }) =>
      alertService.bulkResolveAlerts(ids, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
};

export const useEscalateAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => alertService.escalateAlert(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'list'] });
    },
  });
};

export const useExportAlerts = () => {
  return useMutation({
    mutationFn: ({ params, format }: { params: AlertsParams; format?: 'csv' | 'excel' }) =>
      alertService.exportAlerts(params, format),
  });
};

export const useAlertFilters = () => {
  const [filters, setFilters] = React.useState<any>({
    severity: '',
    status: '',
    alert_type: '',
    search: '',
  });

  const clearFilters = () => setFilters({ severity: '', status: '', alert_type: '', search: '' });

  return {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters: Object.values(filters).some(Boolean),
  };
};