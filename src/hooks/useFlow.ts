import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export const useFlowGraphs = () => {
  return useQuery({
    queryKey: ['flow-graphs'],
    queryFn: async () => {
      const res = await api.get('/graph/network');
      return res.data;
    },
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
  });
};
