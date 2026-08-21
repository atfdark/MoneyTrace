import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

export interface BalanceCardProps {
  balance: number;
  accountNumber: string;
  userName: string;
  onReceiveClick: () => void;
  isLoading?: boolean;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  accountNumber,
  userName,
  onReceiveClick,
  isLoading = false,
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-indigo-900 via-[#1E1B4B] to-purple-900 p-6 text-white shadow-2xl border border-indigo-500/30">
      {/* Decorative Glow Elements */}
      <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full gap-4">
        {/* Card Header: Bank Branding & Eye Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-lg text-purple-300">account_balance</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">MoneyTrace Bank</p>
              <p className="text-[9px] text-slate-300 font-mono">IFSC: MTRC0001001</p>
            </div>
          </div>

          <button
            onClick={() => setShowBalance(!showBalance)}
            className="flex items-center gap-1 text-xs text-indigo-200 hover:text-white bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">
              {showBalance ? 'visibility_off' : 'visibility'}
            </span>
            <span className="text-[10px] font-medium">{showBalance ? 'Hide' : 'Show'}</span>
          </button>
        </div>

        {/* Card Body: Balance Display */}
        <div className="my-1">
          <p className="text-[11px] font-medium text-indigo-200">Available Account Balance</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            {isLoading ? (
              <div className="h-8 w-36 bg-white/10 animate-pulse rounded-lg" />
            ) : showBalance ? (
              <h2 className="text-3xl font-black font-mono tracking-tight text-white">
                {formatCurrency(balance)}
              </h2>
            ) : (
              <h2 className="text-3xl font-black font-mono tracking-widest text-white">
                ₹ • • • • • •
              </h2>
            )}
          </div>
        </div>

        {/* Card Footer: Account Number with Copy & QR Button */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-indigo-300">Primary Account</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-xs font-bold text-white tracking-wider">{accountNumber || 'ACC••••••••'}</span>
              <button
                onClick={handleCopyAccount}
                className="text-indigo-300 hover:text-white transition-colors cursor-pointer"
                title="Copy Account Number"
              >
                <span className="material-symbols-outlined text-xs">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>

          <button
            onClick={onReceiveClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold backdrop-blur-md border border-white/20 shadow-lg transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
            <span>Receive</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;
