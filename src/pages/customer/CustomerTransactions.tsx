import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
import { TransactionReceiptModal } from '../../components/customer/TransactionReceiptModal';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const CustomerTransactions: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Fetch account data to identify user's account
  const { data: accountData } = useQuery<any>({
    queryKey: ['my-account'],
    queryFn: async () => {
      const res = await api.get<any>('/transactions/accounts/me');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // Fetch full transaction history
  const { data: historyData, isLoading } = useQuery<any>({
    queryKey: ['my-transactions-full'],
    queryFn: async () => {
      const res = await api.get<any>('/transactions/history', { params: { page: 1, page_size: 100 } });
      return res.data?.transactions || [];
    },
    staleTime: 10 * 1000,
  });

  const accountNumber = accountData?.account_number || '';
  const allTransactions = historyData || [];

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx: any) => {
      const isDebit = tx.sender_account_id === accountData?.id || tx.sender_account?.account_number === accountNumber;

      if (filterType === 'sent' && !isDebit) return false;
      if (filterType === 'received' && isDebit) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const counterpart = isDebit
          ? (tx.receiver_account?.user?.full_name || tx.receiver_account?.account_number || '').toLowerCase()
          : (tx.sender_account?.user?.full_name || tx.sender_account?.account_number || '').toLowerCase();
        const txId = (tx.transaction_id || tx.id || '').toLowerCase();
        const remark = (tx.remark || '').toLowerCase();

        return counterpart.includes(q) || txId.includes(q) || remark.includes(q);
      }

      return true;
    });
  }, [allTransactions, filterType, searchQuery, accountData, accountNumber]);

  const handleOpenReceipt = (tx: any) => {
    const isSender = tx.sender_account_id === accountData?.id || tx.sender_account?.account_number === accountNumber;
    setSelectedTx({
      ...tx,
      is_sender: isSender,
      amount: Number(tx.amount),
      sender_name: tx.sender_account?.user?.full_name || tx.sender_account?.account_number || 'Sender',
      receiver_name: tx.receiver_account?.user?.full_name || tx.receiver_account?.account_number || 'Receiver',
    });
    setReceiptModalOpen(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-base font-black text-white">Bank Passbook</h2>
        <p className="text-[10px] text-slate-400">Complete statement of account debits & credits</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 bg-[#0D1424] border border-slate-800 rounded-2xl px-3.5 py-2.5">
          <span className="material-symbols-outlined text-slate-400 text-base">search</span>
          <input
            type="text"
            placeholder="Search transactions, names, remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white text-xs placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex bg-[#0D1424] p-1 rounded-2xl border border-slate-800 text-xs">
          {(['all', 'sent', 'received'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 py-1.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 bg-[#0D1424] rounded-3xl border border-slate-800 text-slate-500 text-xs">
            <span className="material-symbols-outlined text-3xl block mb-1 opacity-40">receipt_long</span>
            No transactions found.
          </div>
        ) : (
          filteredTransactions.map((tx: any) => {
            const isDebit = tx.sender_account_id === accountData?.id || tx.sender_account?.account_number === accountNumber;
            const counterpartyName = isDebit
              ? tx.receiver_account?.user?.full_name || tx.receiver_account?.account_number || 'Receiver'
              : tx.sender_account?.user?.full_name || tx.sender_account?.account_number || 'Sender';

            return (
              <div
                key={tx.id || tx.transaction_id}
                onClick={() => handleOpenReceipt(tx)}
                className="p-3.5 rounded-2xl bg-[#0D1424] hover:bg-[#131E35] border border-slate-800/80 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-md ${
                      isDebit
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isDebit ? 'arrow_outward' : 'arrow_downward'}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                      {isDebit ? `Paid to ${counterpartyName}` : `Received from ${counterpartyName}`}
                    </p>
                    <p className="text-[10px] text-slate-500">{formatDate(tx.timestamp)}</p>
                    {tx.remark && (
                      <p className="text-[9px] text-slate-400 italic truncate max-w-[150px]">
                        "{tx.remark}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-mono text-sm font-extrabold ${
                      isDebit ? 'text-white' : 'text-emerald-400'
                    }`}
                  >
                    {isDebit ? `- ${formatCurrency(tx.amount)}` : `+ ${formatCurrency(tx.amount)}`}
                  </p>
                  <span className="text-[8px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    SUCCESS
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Receipt Modal */}
      <TransactionReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        transaction={selectedTx}
      />
    </div>
  );
};

export default CustomerTransactions;
