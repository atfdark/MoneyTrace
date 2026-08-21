import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface QuickActionsProps {
  onReceiveClick: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onReceiveClick }) => {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'send',
      label: 'Send Money',
      icon: 'send',
      color: 'from-blue-600 to-indigo-600',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-950/40 border-blue-500/30',
      onClick: () => navigate('/customer/send-money'),
    },
    {
      id: 'receive',
      label: 'Receive / QR',
      icon: 'qr_code_2',
      color: 'from-purple-600 to-pink-600',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-950/40 border-purple-500/30',
      onClick: onReceiveClick,
    },
    {
      id: 'history',
      label: 'Passbook',
      icon: 'receipt_long',
      color: 'from-emerald-600 to-teal-600',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
      onClick: () => navigate('/customer/transactions'),
    },
    {
      id: 'profile',
      label: 'My Account',
      icon: 'account_circle',
      color: 'from-amber-600 to-orange-600',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
      onClick: () => navigate('/customer/profile'),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map(action => (
        <button
          key={action.id}
          onClick={action.onClick}
          className="flex flex-col items-center gap-2 group cursor-pointer"
        >
          <div
            className={`w-14 h-14 rounded-2xl ${action.bgColor} border flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-all`}
          >
            <span className={`material-symbols-outlined text-2xl ${action.textColor}`}>
              {action.icon}
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors text-center leading-tight">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
