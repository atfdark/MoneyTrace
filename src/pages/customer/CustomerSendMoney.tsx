import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { formatCurrency } from '../../utils/formatters';
import { soundAlarm } from '../../utils/soundAlarm';

interface Recipient {
  user_id?: string;
  account_number: string;
  full_name: string;
  email: string;
  avatar_color?: string;
}

export const CustomerSendMoney: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTx, setSuccessTx] = useState<any>(null);

  // Read initial recipient from router state (e.g. from Home frequent contact click)
  useEffect(() => {
    if (location.state?.recipient) {
      setSelectedRecipient(location.state.recipient);
    }
  }, [location.state]);

  // Fetch current user account balance
  const { data: accountData } = useQuery<any>({
    queryKey: ['my-account'],
    queryFn: async () => {
      const res = await api.get<any>('/transactions/accounts/me');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  const balance = accountData ? Number(accountData.balance) : 0;

  // Real-time live user search query
  const { data: searchResults, isLoading: searchLoading } = useQuery<any>({
    queryKey: ['user-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.trim().length < 1) return [];
      const res = await api.get<any>('/users/search', { params: { q: searchQuery.trim(), limit: 8 } });
      return res.data?.results || [];
    },
    enabled: searchQuery.trim().length >= 1 && !selectedRecipient,
    staleTime: 5 * 1000,
  });

  // Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRecipient) throw new Error('Please select a recipient');
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) throw new Error('Please enter a valid transfer amount');
      if (numAmount > balance) throw new Error('Insufficient account balance');

      const res = await api.post('/transactions/send', {
        receiver_account_number: selectedRecipient.account_number,
        amount: numAmount,
        remark: remark.trim() || 'Instant Transfer',
      });
      return res.data;
    },
    onSuccess: (data) => {
      setShowPinModal(false);
      setSuccessTx(data);
      soundAlarm.playSuccessChime();
      queryClient.invalidateQueries({ queryKey: ['my-account'] });
      queryClient.invalidateQueries({ queryKey: ['my-transactions-recent'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['flow-graphs'] });
    },
    onError: (err: any) => {
      setShowPinModal(false);
      setErrorMessage(err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Transaction failed. Please try again.');
    },
  });

  const handleSelectUser = (user: Recipient) => {
    setSelectedRecipient(user);
    setSearchQuery('');
    setErrorMessage(null);
  };

  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount);
    if (!selectedRecipient) {
      setErrorMessage('Please select a recipient to send money.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter an amount greater than ₹0.');
      return;
    }
    if (numAmount > balance) {
      setErrorMessage(`Insufficient funds. Your available balance is ${formatCurrency(balance)}.`);
      return;
    }

    setShowPinModal(true);
  };

  const handleConfirmPin = () => {
    if (pin.length < 4) {
      setErrorMessage('Please enter your 4-digit UPI PIN.');
      return;
    }
    transferMutation.mutate();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Success Screen
  // ═══════════════════════════════════════════════════════════════════════════
  if (successTx) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 animate-in zoom-in-95 duration-300">
        {/* Animated Checkmark Badge */}
        <div className="relative flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-950/60 animate-bounce">
            <span className="material-symbols-outlined text-5xl">check_circle</span>
          </div>
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">Payment Successful!</h2>
          <p className="text-3xl font-black font-mono text-emerald-400 mt-2">
            {formatCurrency(parseFloat(amount))}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Transferred to <span className="font-bold text-white">{selectedRecipient?.full_name}</span>
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
            TXN: {successTx?.transaction_id || successTx?.id}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5 max-w-xs pt-4">
          <button
            onClick={() => {
              setSuccessTx(null);
              setSelectedRecipient(null);
              setAmount('');
              setRemark('');
              setPin('');
            }}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
          >
            Send Another Payment
          </button>
          <button
            onClick={() => navigate('/customer/transactions')}
            className="w-full py-3 bg-[#0D1424] hover:bg-[#131E35] border border-slate-800 text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
          >
            View in Passbook
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (selectedRecipient) setSelectedRecipient(null);
            else navigate('/customer/home');
          }}
          className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h2 className="text-base font-black text-white">Send Money</h2>
          <p className="text-[10px] text-slate-400">Instant UPI Bank Transfer</p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-300 text-xs flex items-center gap-2 animate-in shake duration-300">
          <span className="material-symbols-outlined text-base text-rose-400">error</span>
          <span className="flex-1 font-medium">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* ───── STEP 1: Search / Select Recipient ───── */}
      {!selectedRecipient ? (
        <div className="space-y-4">
          <div className="relative">
            <div className="flex items-center gap-2 bg-[#0D1424] border border-slate-800 rounded-2xl px-4 py-3.5 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/30 transition-all">
              <span className="material-symbols-outlined text-purple-400 text-xl">search</span>
              <input
                type="text"
                placeholder="Search by Name, Email, or Account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent text-white placeholder-slate-500 text-xs focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Real-Time Live Results */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {searchLoading ? 'Searching Database...' : searchQuery ? 'Matching Users' : 'Type a name to search live users'}
            </h3>

            {searchLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((r: Recipient) => (
                <div
                  key={r.account_number}
                  onClick={() => handleSelectUser(r)}
                  className="p-3 rounded-2xl bg-[#0D1424] hover:bg-[#15203B] border border-slate-800/80 flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md"
                        style={{ backgroundColor: r.avatar_color || '#6366F1' }}
                      >
                        {r.full_name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0D1424]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                          {r.full_name}
                        </p>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px] font-mono text-emerald-400 font-bold">Online</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">{r.account_number}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-purple-400 text-base opacity-0 group-hover:opacity-100 transition-opacity">
                    arrow_forward
                  </span>
                </div>
              ))
            ) : searchQuery.trim().length >= 1 ? (
              <div className="text-center py-8 bg-[#0D1424] rounded-2xl border border-slate-800 text-slate-500 text-xs">
                No users found matching "{searchQuery}".
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* ───── STEP 2: Transfer Amount & Confirmation ───── */
        <form onSubmit={handleInitiateTransfer} className="space-y-5">
          {/* Selected Beneficiary Card */}
          <div className="p-4 rounded-2xl bg-[#0D1424] border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-lg"
                style={{ backgroundColor: selectedRecipient.avatar_color || '#6366F1' }}
              >
                {selectedRecipient.full_name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{selectedRecipient.full_name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{selectedRecipient.account_number}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRecipient(null)}
              className="text-[10px] font-bold text-purple-400 hover:text-purple-300 underline cursor-pointer"
            >
              Change
            </button>
          </div>

          {/* Amount Input Box */}
          <div className="bg-[#0D1424] p-5 rounded-3xl border border-slate-800/80 text-center space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Enter Transfer Amount
            </span>

            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold text-purple-400 font-mono">₹</span>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                min="1"
                step="any"
                className="w-48 text-3xl font-black font-mono text-white bg-transparent text-center focus:outline-none placeholder-slate-700"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              Available Balance:{' '}
              <span className="font-mono font-bold text-emerald-400">
                {formatCurrency(balance)}
              </span>
            </p>

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-slate-800/60">
              {[500, 2000, 10000, 25000, 65000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    amount === preset.toString()
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  +{formatCurrency(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Remark Input */}
          <div className="bg-[#0D1424] border border-slate-800 rounded-2xl px-4 py-3">
            <input
              type="text"
              placeholder="Add a remark (e.g. Rent, College Fees, Loan)..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Pay Button */}
          <button
            type="submit"
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">lock</span>
            <span>Pay {amount ? formatCurrency(parseFloat(amount)) : '₹0'}</span>
          </button>
        </form>
      )}

      {/* ───── STEP 3: Security PIN Confirmation Modal ───── */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xs glass-panel rounded-3xl p-6 border border-purple-500/40 shadow-2xl bg-[#0C1222] flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-2xl">pin</span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">Enter UPI Security PIN</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sending {formatCurrency(parseFloat(amount))} to {selectedRecipient?.full_name}
              </p>
            </div>

            <div className="flex justify-center gap-2 my-2">
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                placeholder="••••"
                className="w-36 text-center text-2xl font-black font-mono tracking-widest bg-slate-900 border border-purple-500/60 rounded-xl py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <div className="w-full flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPin}
                disabled={transferMutation.isPending || pin.length < 4}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                {transferMutation.isPending ? (
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSendMoney;
