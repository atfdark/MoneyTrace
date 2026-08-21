import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export const useInvestigations = (params?: any) => {
  return useQuery({
    queryKey: ['investigations-list', params],
    queryFn: async () => {
      const res = await api.get<any>('/recovery/cases');
      return {
        investigations: res.data?.cases || res.data || [],
        total: (res.data?.cases || res.data || []).length,
        page: 1,
        total_pages: 1,
        page_size: 20,
      };
    },
  });
};

export const useInvestigationFilters = () => {
  const [filters, setFilters] = useState<any>({
    status: '',
    priority: '',
    search: '',
  });

  const clearFilters = () => setFilters({ status: '', priority: '', search: '' });

  return {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters: Object.values(filters).some(Boolean),
  };
};
