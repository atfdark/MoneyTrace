import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services';
import type { DashboardStats, DashboardTrends, FraudSummary } from '../types';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardService.getStats(),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const useDashboardTrends = (period: '7d' | '30d' | '90d' | '1y' = '30d') => {
  return useQuery({
    queryKey: ['dashboard', 'trends', period],
    queryFn: () => dashboardService.getTrends({ period }),
    staleTime: 60 * 1000,
  });
};

export const useFraudSummary = (params?: { start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['dashboard', 'fraud-summary', params],
    queryFn: () => dashboardService.getFraudSummary(params),
    staleTime: 60 * 1000,
  });
};

export const useRealTimeMetrics = () => {
  return useQuery({
    queryKey: ['dashboard', 'realtime'],
    queryFn: () => dashboardService.getRealTimeMetrics(),
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
};