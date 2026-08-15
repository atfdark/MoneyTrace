import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '../services';
import type { Report, GenerateReportRequest, ReportFilters } from '../types';

export const useReports = (params?: { page?: number; limit?: number; status?: string; type?: string }) => {
  return useQuery({
    queryKey: ['reports', 'list', params],
    queryFn: () => reportService.getReports(params),
    staleTime: 60 * 1000,
  });
};

export const useReport = (id: string | null) => {
  return useQuery({
    queryKey: ['reports', 'detail', id],
    queryFn: () => reportService.getReport(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useGenerateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateReportRequest) => reportService.generateReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'list'] });
    },
  });
};

export const useDownloadReport = () => {
  return useMutation({
    mutationFn: (id: string) => reportService.downloadReport(id),
  });
};

export const usePreviewReport = (id: string | null) => {
  return useQuery({
    queryKey: ['reports', 'preview', id],
    queryFn: () => reportService.previewReport(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useDeleteReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reportService.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'list'] });
    },
  });
};

export const useReportTemplates = () => {
  return useQuery({
    queryKey: ['reports', 'templates'],
    queryFn: () => reportService.getTemplates(),
    staleTime: 5 * 60 * 1000,
  });
};