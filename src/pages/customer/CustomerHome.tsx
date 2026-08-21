import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { BalanceCard } from '../../components/customer/BalanceCard';
import { QuickActions } from '../../components/customer/QuickActions';
import { FrequentRecipients } from '../../components/customer/FrequentRecipients';
import { ReceiveMoneyModal } from '../../components/customer/ReceiveMoneyModal';
import { TransactionReceiptModal } from '../../components/customer/TransactionReceiptModal';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const CustomerHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  // Fetch real account balance from DB
  const { data: accountData, isLoading: accountLoading } = useQuery<any>({
    queryKey: ['my-account'],
    queryFn: async () => {
      const res = await api.get<any>('/transactions/accounts/me');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // Fetch recent transaction history
  const { data: historyData, isLoading: historyLoading } = useQuery<any>({
    queryKey: ['my-transactions-recent'],
    queryFn: async () => {
      const res = await api.get<any>('/transactions/history', { params: { page: 1, page_size: 5 } });
      return res.data?.transactions || [];
    },
    staleTime: 10 * 1000,
  });

  const transactions = historyData || [];
  const balance = accountData ? Number(accountData.balance) : 0;
  const accountNumber = accountData?.account_number || '';

  const handleSelectRecipient = (recipient: {
    account_number: string;
    full_name: string;
    email: string;
  }) => {
    navigate('/customer/send-money', { state: { recipient } });
  };

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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Account Balance UPI Card */}
      <BalanceCard
        balance={balance}
        accountNumber={accountNumber}
        userName={user?.full_name || 'Customer'}
        onReceiveClick={() => setReceiveModalOpen(true)}
        isLoading={accountLoading}
      />

      {/* 2. UPI Quick Actions */}
      <div className="bg-[#0D1424] p-4 rounded-3xl border border-slate-800/80 shadow-xl">
        <QuickActions onReceiveClick={() => setReceiveModalOpen(true)} />
      </div>

      {/* 3. Frequent Contacts Carousel (Real Accounts from DB) */}
      <FrequentRecipients onSelectRecipient={handleSelectRecipient} />

      {/* 4. Recent Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent Activity
          </h3>
          <button
            onClick={() => navigate('/customer/transactions')}
            className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            View All →
          </button>
        </div>

        <div className="space-y-2">
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 bg-[#0D1424] rounded-2xl border border-slate-800 text-slate-500 text-xs">
              <span className="material-symbols-outlined text-3xl block mb-1 opacity-40">receipt_long</span>
              No transactions yet. Tap "Send Money" above to begin.
            </div>
          ) : (
            transactions.slice(0, 5).map((tx: any) => {
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
                      <p className="text-[10px] text-slate-500">
                        {formatDate(tx.timestamp)}
                      </p>
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
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      SUCCESS
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Receive Modal */}
      <ReceiveMoneyModal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        userName={user?.full_name || 'Customer'}
        accountNumber={accountNumber}
        userEmail={user?.email || 'user@moneytrace.dev'}
      />

      {/* Receipt Modal */}
      <TransactionReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        transaction={selectedTx}
      />
    </div>
  );
};

export default CustomerHome;
