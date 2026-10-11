import React, { useState } from 'react';

interface LegalNoticeData {
  case_id: string;
  reference_no: string;
  statute: string;
  target_account: string;
  amount: number;
  status: string;
  issued_at: string;
  officer: string;
  notice_text: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  noticeData: LegalNoticeData | null;
  isLoading?: boolean;
}

export const LegalNoticeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  noticeData,
  isLoading = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (noticeData?.notice_text) {
      navigator.clipboard.writeText(noticeData.notice_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    if (!noticeData?.notice_text) return;
    const blob = new Blob([noticeData.notice_text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Section91_Notice_${noticeData.case_id}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <span className="material-symbols-outlined text-[24px]">gavel</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                  STATUTORY LEGAL DIRECTIVE
                </span>
                <span className="text-[12px] font-mono text-gray-300">
                  {noticeData?.reference_no || 'SEC 91 CrPC'}
                </span>
              </div>
              <h3 className="text-base font-bold mt-0.5">Section 91 CrPC / Section 94 BNSS Order</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={isLoading || !noticeData}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isLoading || !noticeData}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Download Directive</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 font-mono text-[12px] leading-relaxed text-gray-800">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 animate-pulse">
              Generating statutory Section 91 CrPC directive...
            </div>
          ) : noticeData?.notice_text ? (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm whitespace-pre-wrap font-mono">
              {noticeData.notice_text}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              No notice content available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Digitally Authenticated by FIU-IND / MoneyTrace SOC Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
