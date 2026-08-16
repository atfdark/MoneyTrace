import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await dashboardService.getStats();
      // Backend returns flat OverviewResponse, or wrapped in { data: ... }
      return res?.data || res;
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useDashboardTrends = (period: '7d' | '30d' | '90d' | '1y' = '30d') => {
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  return useQuery({
    queryKey: ['dashboard', 'trends', period],
    queryFn: async () => {
      const res = await dashboardService.getTrends({ days: daysMap[period] || 30 });
      return res?.data || res;
    },
    staleTime: 60 * 1000,
  });
};

export const useDashboardFraudSummary = (params?: { start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['dashboard', 'fraud-summary', params],
    queryFn: async () => {
      const res = await dashboardService.getFraudSummary(params);
      return res?.data || res;
    },
    staleTime: 60 * 1000,
  });
};

export const useRealTimeMetrics = () => {
  return useQuery({
    queryKey: ['dashboard', 'realtime'],
    queryFn: async () => {
      const res = await dashboardService.getRealTimeMetrics();
      return res?.data || res;
    },
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
};

export const useRecentTransactions = (limit: number = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'recent-transactions', limit],
    queryFn: async () => {
      const res = await dashboardService.getStats();
      const payload = res?.data || res;
      return payload?.recent_transactions || [];
    },
    staleTime: 30 * 1000,
  });
};

export const useRecentAlerts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'recent-alerts', limit],
    queryFn: async () => {
      const res = await dashboardService.getStats();
      const payload = res?.data || res;
      return payload?.recent_alerts || [];
    },
    staleTime: 30 * 1000,
  });
};

export const useInvestigators = () => {
  return useQuery({
    queryKey: ['dashboard', 'investigators'],
    queryFn: async () => {
      const res = await dashboardService.getInvestigatorLeaderboard();
      return res?.data || res;
    },
    staleTime: 60 * 1000,
  });
};