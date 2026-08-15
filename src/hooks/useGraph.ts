import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphService } from '../services';
import type { GraphData } from '../types';

export const useGraph = (transactionId: string | null, params?: {
  depth?: number;
  max_nodes?: number;
  include_frozen?: boolean;
}) => {
  return useQuery({
    queryKey: ['graph', 'flow', transactionId, params],
    queryFn: () => graphService.getGraph(transactionId!, params),
    enabled: !!transactionId,
    staleTime: 60 * 1000,
  });
};

export const useEntityGraph = (entityId: string | null, params?: {
  depth?: number;
  direction?: 'incoming' | 'outgoing' | 'both';
}) => {
  return useQuery({
    queryKey: ['graph', 'entity', entityId, params],
    queryFn: () => graphService.getEntityGraph(entityId!, params),
    enabled: !!entityId,
    staleTime: 60 * 1000,
  });
};

export const useFindPath = () => {
  return useMutation({
    mutationFn: ({ fromAccount, toAccount, params }: {
      fromAccount: string;
      toAccount: string;
      params?: { max_depth?: number; max_paths?: number };
    }) => graphService.findPath(fromAccount, toAccount, params),
  });
};

export const useClusters = (params?: { min_cluster_size?: number; risk_threshold?: number }) => {
  return useQuery({
    queryKey: ['graph', 'clusters', params],
    queryFn: () => graphService.getClusters(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useExportGraph = () => {
  return useMutation({
    mutationFn: ({ transactionId, format }: { transactionId: string; format?: 'json' | 'graphml' | 'csv' }) =>
      graphService.exportGraph(transactionId, format),
  });
};