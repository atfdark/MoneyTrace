import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';

export interface FrequentRecipientsProps {
  onSelectRecipient: (recipient: {
    account_number: string;
    full_name: string;
    email: string;
  }) => void;
}

export const FrequentRecipients: React.FC<FrequentRecipientsProps> = ({ onSelectRecipient }) => {
  const { data: recipientsData, isLoading } = useQuery<any>({
    queryKey: ['frequent-recipients'],
    queryFn: async () => {
      const res = await api.get<any>('/users/recipients');
      return res.data?.results || [];
    },
    staleTime: 60 * 1000,
  });

  const recipients = recipientsData || [];

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 animate-pulse" />
            <div className="w-12 h-2.5 bg-slate-800/60 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (recipients.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Frequent Contacts
        </h3>
        <span className="text-[10px] text-purple-400 font-medium">Quick Transfer</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {recipients.map((r: any) => (
          <button
            key={r.account_number}
            onClick={() =>
              onSelectRecipient({
                account_number: r.account_number,
                full_name: r.full_name,
                email: r.email,
              })
            }
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xs font-black shadow-lg border border-white/10 group-hover:scale-105 group-active:scale-95 transition-all"
              style={{ backgroundColor: r.avatar_color || '#6366F1' }}
            >
              {r.full_name
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors truncate max-w-[64px] text-center">
              {r.full_name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FrequentRecipients;
