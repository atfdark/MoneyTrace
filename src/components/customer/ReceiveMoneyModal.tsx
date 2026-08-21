import React, { useState } from 'react';

export interface ReceiveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  accountNumber: string;
  userEmail: string;
}

export const ReceiveMoneyModal: React.FC<ReceiveMoneyModalProps> = ({
  isOpen,
  onClose,
  userName,
  accountNumber,
  userEmail,
}) => {
  const [copied, setCopied] = useState(false);
  const upiId = `${userEmail.split('@')[0]}@moneytrace`;

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm glass-panel rounded-3xl p-6 border border-purple-500/40 shadow-2xl bg-[#0C1222] flex flex-col items-center text-center relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Bank Badge */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg mb-3">
          <span className="material-symbols-outlined text-2xl">account_balance</span>
        </div>

        <h3 className="text-base font-bold text-white mb-0.5">{userName}</h3>
        <p className="text-xs text-slate-400 font-mono mb-4">MoneyTrace Banking UPI</p>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl shadow-inner mb-4 flex items-center justify-center border border-slate-200">
          <svg className="w-48 h-48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="white" />
            {/* Standard QR Pattern Simulation for visual appeal */}
            <rect x="10" y="10" width="26" height="26" fill="#0F172A" rx="4" />
            <rect x="14" y="14" width="18" height="18" fill="white" />
            <rect x="18" y="18" width="10" height="10" fill="#4F46E5" />

            <rect x="64" y="10" width="26" height="26" fill="#0F172A" rx="4" />
            <rect x="68" y="14" width="18" height="18" fill="white" />
            <rect x="72" y="18" width="10" height="10" fill="#4F46E5" />

            <rect x="10" y="64" width="26" height="26" fill="#0F172A" rx="4" />
            <rect x="14" y="68" width="18" height="18" fill="white" />
            <rect x="18" y="72" width="10" height="10" fill="#4F46E5" />

            {/* Pattern Dots */}
            <rect x="42" y="12" width="6" height="6" fill="#0F172A" />
            <rect x="52" y="12" width="6" height="6" fill="#0F172A" />
            <rect x="42" y="24" width="6" height="6" fill="#0F172A" />
            <rect x="48" y="32" width="6" height="6" fill="#0F172A" />
            <rect x="12" y="44" width="6" height="6" fill="#0F172A" />
            <rect x="24" y="48" width="6" height="6" fill="#0F172A" />
            <rect x="36" y="44" width="8" height="8" fill="#4F46E5" />
            <rect x="48" y="48" width="8" height="8" fill="#0F172A" />
            <rect x="60" y="44" width="8" height="8" fill="#4F46E5" />
            <rect x="74" y="48" width="6" height="6" fill="#0F172A" />
            <rect x="84" y="44" width="6" height="6" fill="#0F172A" />
            <rect x="42" y="62" width="6" height="6" fill="#0F172A" />
            <rect x="54" y="68" width="6" height="6" fill="#0F172A" />
            <rect x="68" y="64" width="6" height="6" fill="#0F172A" />
            <rect x="80" y="74" width="8" height="8" fill="#0F172A" />
            <rect x="44" y="80" width="6" height="6" fill="#0F172A" />
            <rect x="60" y="80" width="8" height="8" fill="#4F46E5" />
            <rect x="76" y="84" width="6" height="6" fill="#0F172A" />
          </svg>
        </div>

        {/* UPI ID Details */}
        <div className="w-full bg-[#131D33] p-3 rounded-2xl border border-slate-800 flex items-center justify-between mb-4">
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block">UPI ID</span>
            <span className="font-mono font-bold text-white text-xs">{upiId}</span>
          </div>
          <button
            onClick={handleCopyUpi}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-xs">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Bank & Account Info */}
        <div className="w-full text-left text-xs space-y-1 text-slate-400 bg-[#0E1626] p-3 rounded-xl border border-slate-800/80">
          <div className="flex justify-between">
            <span>Account Number:</span>
            <span className="font-mono font-bold text-white">{accountNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Bank IFSC:</span>
            <span className="font-mono font-bold text-purple-300">MTRC0001001</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveMoneyModal;
