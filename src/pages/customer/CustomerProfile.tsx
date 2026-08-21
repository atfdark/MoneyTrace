import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useAuth';
import { api } from '../../api';
import { formatCurrency } from '../../utils/formatters';

export const CustomerProfile: React.FC = () => {
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Fetch account data
  const { data: accountData, isLoading } = useQuery<any>({
    queryKey: ['my-account'],
    queryFn: async () => {
      const res = await api.get('/transactions/accounts/me');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  const accountNumber = accountData?.account_number || '';
  const balance = accountData ? Number(accountData.balance) : 0;
  const upiId = user?.email ? `${user.email.split('@')[0]}@moneytrace` : 'user@moneytrace';

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-base font-black text-white">My Bank Profile</h2>
        <p className="text-[10px] text-slate-400">Account details & Virtual Banking Card</p>
      </div>

      {/* ───── Virtual Debit Card ───── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-[#161D2F] to-indigo-950 p-6 text-white shadow-2xl border border-slate-700/60 flex flex-col justify-between h-52">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400 text-2xl">contactless</span>
            <span className="font-extrabold text-xs tracking-wider uppercase text-slate-300">MoneyTrace Platinum</span>
          </div>
          <span className="font-bold text-xs italic tracking-widest text-indigo-300">DEBIT</span>
        </div>

        {/* Chip & NFC */}
        <div className="flex items-center gap-3 my-2">
          <div className="w-10 h-7 rounded-md bg-gradient-to-r from-amber-300 to-yellow-500 border border-amber-600 shadow-inner flex items-center justify-center">
            <div className="w-7 h-4 border-t border-b border-amber-700 opacity-60" />
          </div>
        </div>

        {/* Card Number & Info */}
        <div>
          <p className="font-mono text-base tracking-widest text-white font-bold mb-1">
            {accountNumber ? `•••• •••• •••• ${accountNumber.slice(-4)}` : '•••• •••• •••• 4242'}
          </p>
          <div className="flex justify-between items-end text-[10px] text-slate-400">
            <div>
              <span className="uppercase text-[8px] text-slate-500 block">Card Holder</span>
              <span className="font-bold text-white uppercase">{user?.full_name || 'Cardholder'}</span>
            </div>
            <div>
              <span className="uppercase text-[8px] text-slate-500 block">Valid Thru</span>
              <span className="font-mono font-bold text-white">08/31</span>
            </div>
          </div>
        </div>
      </div>

      {/* ───── Account Details List ───── */}
      <div className="bg-[#0D1424] rounded-3xl p-5 border border-slate-800/80 space-y-3.5 text-xs">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
          Account Specifications
        </h3>

        <div className="space-y-2.5">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
            <span className="text-slate-400">Account Name:</span>
            <span className="font-bold text-white">{user?.full_name}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
            <span className="text-slate-400">Email Address:</span>
            <span className="font-mono text-slate-200">{user?.email}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
            <span className="text-slate-400">Account Number:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-white">{accountNumber}</span>
              <button
                onClick={handleCopyAccount}
                className="text-purple-400 hover:text-white transition-colors cursor-pointer"
                title="Copy account"
              >
                <span className="material-symbols-outlined text-xs">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
            <span className="text-slate-400">UPI ID:</span>
            <span className="font-mono font-bold text-purple-300">{upiId}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
            <span className="text-slate-400">Bank IFSC:</span>
            <span className="font-mono font-bold text-white">MTRC0001001</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
            <span className="text-slate-400">Account Balance:</span>
            <span className="font-mono font-black text-emerald-400">{formatCurrency(balance)}</span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-400">Account Status:</span>
            <span className="font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
              {accountData?.status || 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* ───── Logout & Switcher ───── */}
      <div className="space-y-2 pt-2">
        <button
          onClick={() => {
            logoutMutation.mutate();
            navigate('/customer/login');
          }}
          className="w-full py-3.5 rounded-2xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span>Logout from Bank Account</span>
        </button>
      </div>
    </div>
  );
};

export default CustomerProfile;
