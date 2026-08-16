import React, { useState } from 'react';
import { chatService } from '../../services';

export interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
  selectedAccountId?: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const DEFAULT_SUGGESTIONS = [
  'Why was this account flagged as a mule?',
  'Explain the circular laundering loop detected.',
  'What is the optimal fund recovery strategy?',
  'List high velocity structuring transactions.',
];

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  initialQuestion,
  selectedAccountId,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content:
        '👋 Hello Investigator! I am your AI Financial Crime Copilot. I analyze live money flow graphs, mule rings, layering chains, and asset recovery probabilities. Ask me anything about the network.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState(initialQuestion || '');
  const [loading, setLoading] = useState(false);

  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || input).trim();
    if (!q) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Call real backend assistant API
      const res = await chatService.sendMessage({
        message: q,
        context: {
          account_number: selectedAccountId,
          investigation_type: 'graph_money_flow',
        } as any,
      });

      const reply =
        res?.data?.response ||
        res?.data?.message ||
        (res as any)?.response ||
        (res as any)?.message ||
        'No detailed AI response returned from the server.';

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **AI Copilot Error**: ${
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            'Unable to reach AI assistant engine. Please verify network connectivity.'
          }`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 max-w-full bg-[#090D16]/95 backdrop-blur-2xl border-l border-purple-500/30 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      {/* ───── Header ───── */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-purple-950/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-900/40">
            <span className="material-symbols-outlined text-lg">psychology</span>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              AI Investigator Copilot
              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">v2.0</span>
            </h3>
            <p className="text-[10px] text-slate-400">Contextual Graph Intelligence</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* ───── Conversation Body ───── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-none shadow-lg shadow-purple-900/30'
                  : 'bg-[#131B2E] border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
            <span className="text-[8px] text-slate-500 mt-1 font-mono">
              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-purple-400 p-2">
            <span className="material-symbols-outlined text-base animate-spin">sync</span>
            <span>Synthesizing topological graph evidence...</span>
          </div>
        )}
      </div>

      {/* ───── Suggested Chips ───── */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
          Suggested Queries
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {DEFAULT_SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              className="text-[9px] text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 px-2 py-1 rounded-lg text-left transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ───── Input Footer ───── */}
      <div className="p-3 border-t border-slate-800 bg-[#0F172A] flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask Copilot about any account, hop, or pattern..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">send</span>
        </button>
      </div>
    </div>
  );
};

export default AICopilotDrawer;
