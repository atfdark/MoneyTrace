import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export const useFlowGraphs = () => {
  return useQuery({
    queryKey: ['flow-graphs'],
    queryFn: async () => {
      const res = await api.get('/graph/network');
      return res.data;
    },
    retry: 1,
  });
};

export const useFlowGraph = (graphId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['flow-graph', graphId],
    queryFn: async () => {
      const res = await api.get(`/graph/trace/${graphId}`);
      return res.data;
    },
    enabled: options?.enabled,
    retry: 1,
  });
};

export const useSuspiciousPatterns = () => {
  return useQuery({
    queryKey: ['flow-suspicious'],
    queryFn: async () => {
      const res = await api.get('/graph/suspicious');
      return res.data;
    },
    retry: 1,
  });
};

export const useAccountSubgraph = (accountNumber: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['flow-account', accountNumber],
    queryFn: async () => {
      const res = await api.get(`/graph/account/${accountNumber}`);
      return res.data;
    },
    enabled: options?.enabled,
    retry: 1,
  });
};
