import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export interface TransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    transaction_id?: string;
    sender_account_number?: string;
    receiver_account_number?: string;
    sender_name?: string;
    receiver_name?: string;
    amount: number;
    remark?: string;
    timestamp: string;
    is_sender?: boolean;
    status?: string;
  } | null;
}

export const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!isOpen || !transaction) return null;

  const isSent = transaction.is_sender ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm glass-panel rounded-3xl p-6 border border-slate-700/60 shadow-2xl bg-[#0C1222] flex flex-col relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Status Badge & Icon */}
        <div className="flex flex-col items-center text-center my-2">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/40 mb-3 animate-in zoom-in duration-300">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
          </div>

          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-1">
            Payment Successful
          </h3>
          <p className="text-3xl font-black font-mono text-white mb-2">
            {formatCurrency(transaction.amount)}
          </p>
          <p className="text-[11px] text-slate-400">
            {formatDate(transaction.timestamp)}
          </p>
        </div>

        {/* Receipt Details Card */}
        <div className="bg-[#131D33] rounded-2xl p-4 border border-slate-800 space-y-3 my-3 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-slate-400">Transaction ID:</span>
            <span className="font-mono font-bold text-white text-[11px] select-all">
              {transaction.transaction_id || transaction.id}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-slate-400">{isSent ? 'Sent To:' : 'Received From:'}</span>
            <span className="font-bold text-white">
              {isSent
                ? transaction.receiver_name || transaction.receiver_account_number
                : transaction.sender_name || transaction.sender_account_number}
            </span>
          </div>

          {transaction.remark && (
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400">Remark / Purpose:</span>
              <span className="text-slate-200 italic font-medium">"{transaction.remark}"</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Payment Mode:</span>
            <span className="font-bold text-purple-300">MoneyTrace Instant UPI</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-900/40 transition-all cursor-pointer mt-2"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default TransactionReceiptModal;
