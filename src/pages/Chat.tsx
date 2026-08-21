import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

interface RAGCitation {
  doc_id: string;
  title: string;
  category: string;
  source: string;
  content: string;
  relevance_score: number;
}

interface XAIWeight {
  feature: string;
  weight: number;
  impact: string;
}

interface SimilarCase {
  case_id: string;
  similarity_percentage: number;
  shared_patterns: string[];
  fraud_type: string;
  amount_at_risk: number;
  status: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  intent?: string;
  suggestions?: string[];
  predicted_fraud_type?: string;
  confidence_score?: number;
  rag_citations?: RAGCitation[];
  xai_weights?: XAIWeight[];
  similar_cases?: SimilarCase[];
  recommendations?: string[];
  context_data?: any;
  created_at: string;
}

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `### 🛡️ MoneyTrace AI Forensic Copilot is Ready.

I can assist you with real-time financial crime triage, asset recovery evaluation, and regulatory compliance:
- **Explain Flags**: \`Why was transaction TXN_TRACE_HOP1 flagged?\`
- **Money Trails**: \`Show money trail for TXN_TRACE_HOP1\`
- **Recovery Intelligence**: \`Can money be recovered for case REC202608168920?\`
- **Mule Accounts**: \`Why is ACC1002 suspicious?\`
- **Case Summaries**: \`Summarize Case REC202608168920\`
- **Compliance Search**: \`What is the RBI guideline for unauthorized digital fraud?\``,
      intent: 'GENERAL_QUERY',
      suggestions: [
        'Why was transaction TXN_TRACE_HOP1 flagged?',
        'Show money trail for TXN_TRACE_HOP1',
        'Can this money be recovered?',
        'Why is ACC1002 suspicious?',
        'Summarize Case REC202608168920',
      ],
      recommendations: [
        '1. Inspect open CRITICAL alerts in the SOC Queue',
        '2. Execute asset freeze on high recovery probability cases',
        '3. Cross-reference mule nodes against I4C guidelines',
      ],
      created_at: new Date().toISOString(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCaseContext, setActiveCaseContext] = useState<any>({
    caseId: 'REC202608168920',
    victim: 'ACC1001',
    holder: 'ACC1004',
    amount: 100000.0,
    score: 85,
    prob: 'HIGH',
  });
  const [activeTab, setActiveTab] = useState<'copilot' | 'rag' | 'similarity'>('copilot');
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<RAGCitation[]>([]);
  const [isSearchingRag, setIsSearchingRag] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage.trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await api.post<any>('/assistant/chat', { message: query });
      const data = res.data;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.answer,
        intent: data.intent,
        suggestions: data.suggestions || [],
        predicted_fraud_type: data.predicted_fraud_type,
        confidence_score: data.confidence_score,
        rag_citations: data.rag_citations || [],
        xai_weights: data.xai_weights || [],
        similar_cases: data.similar_cases || [],
        recommendations: data.recommendations || [],
        context_data: data.context_data,
        created_at: data.created_at || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Update case context if present in data
      if (data.context_data && data.context_data.case_id) {
        setActiveCaseContext({
          caseId: data.context_data.case_id,
          victim: data.context_data.victim_account || 'ACC1001',
          holder: data.context_data.current_holder || 'ACC1004',
          amount: data.context_data.amount_lost || 100000.0,
          score: data.context_data.recovery_score || 85,
          prob: data.context_data.recovery_probability || 'HIGH',
        });
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `**Error communicating with AI Copilot**: ${err?.response?.data?.detail || err?.message || 'Server offline'}. Please verify backend status.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRagSearch = async () => {
    if (!ragQuery.trim()) return;
    setIsSearchingRag(true);
    try {
      const res = await api.get<any>(`/assistant/rag-search?query=${encodeURIComponent(ragQuery)}`);
      setRagResults(res.data?.citations || res.data || []);
    } catch (err) {
      console.error('RAG search error:', err);
    } finally {
      setIsSearchingRag(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-7xl mx-auto gap-4 p-2 lg:p-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-gray-200 shadow-card p-4 rounded-xl border border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-[28px]">psychology</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-title-lg font-bold text-gray-900">MoneyTrace AI Copilot Pro</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-tertiary/20 text-tertiary border border-tertiary/30">
                Offline Forensic AI
              </span>
            </div>
            <p className="text-body-sm text-gray-500">
              NLU Intelligence • RAG Compliance • Graph Tracing • Asset Recovery Decision Engine
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-surface-variant/40 p-1 rounded-xl border border-gray-100">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'copilot' ? 'bg-primary text-on-primary shadow' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Investigation Chat
          </button>
          <button
            onClick={() => setActiveTab('rag')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'rag' ? 'bg-primary text-on-primary shadow' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            RAG Compliance (RBI/AML)
          </button>
          <button
            onClick={() => setActiveTab('similarity')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'similarity' ? 'bg-primary text-on-primary shadow' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Case Similarity
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left / Center Chat Stream (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white border border-gray-200 rounded-xl shadow-card border border-outline-variant/30 overflow-hidden shadow-card">
          {activeTab === 'copilot' && (
            <>
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-semibold text-gray-500">
                        {msg.sender === 'user' ? 'Investigator' : 'MoneyTrace AI Copilot'}
                      </span>
                      <span className="text-[10px] text-outline">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[90%] rounded-xl p-4 text-sm leading-relaxed shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-primary text-on-primary rounded-tr-none'
                          : 'bg-surface-variant/70 text-gray-900 border border-outline-variant/40 rounded-tl-none'
                      }`}
                    >
                      {/* Markdown / Text Body */}
                      <div className="whitespace-pre-line font-sans space-y-2">
                        {msg.text}
                      </div>

                      {/* ML Fraud Typology Badge */}
                      {msg.predicted_fraud_type && (
                        <div className="mt-3 pt-3 border-t border-outline-variant/30 flex items-center justify-between bg-surface/50 p-2.5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600 text-base">verified_user</span>
                            <span className="text-xs font-bold text-gray-900">ML Predicted Typology:</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary/20 text-blue-600 border border-secondary/30">
                              {msg.predicted_fraud_type}
                            </span>
                          </div>
                          {msg.confidence_score && (
                            <span className="text-xs font-bold text-primary">{msg.confidence_score}% Confidence</span>
                          )}
                        </div>
                      )}

                      {/* Explainable AI (XAI) Feature Importance Bars */}
                      {msg.xai_weights && msg.xai_weights.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-outline-variant/30">
                          <div className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-tertiary">analytics</span>
                            Explainable AI (XAI) Feature Attributions:
                          </div>
                          <div className="space-y-1.5">
                            {msg.xai_weights.map((x, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className="w-44 truncate text-gray-500">{x.feature}</span>
                                <div className="flex-1 bg-surface-variant rounded-full h-2 overflow-hidden border border-gray-100">
                                  <div
                                    className={`h-full rounded-full ${
                                      x.impact === 'CRITICAL' ? 'bg-error' : x.impact === 'POSITIVE' ? 'bg-primary' : 'bg-tertiary'
                                    }`}
                                    style={{ width: `${Math.min(Math.abs(x.weight), 100)}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[11px] font-bold w-12 text-right">
                                  {x.weight > 0 ? `+${x.weight.toFixed(0)}` : x.weight.toFixed(0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actionable Investigator Checklist */}
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-outline-variant/30 bg-primary-container/20 p-3 rounded-xl border border-primary/20">
                          <div className="text-xs font-bold text-primary flex items-center gap-1 mb-2">
                            <span className="material-symbols-outlined text-sm">checklist</span>
                            Recommended Investigator Next Steps:
                          </div>
                          <ul className="space-y-1">
                            {msg.recommendations.map((rec, rIdx) => (
                              <li key={rIdx} className="text-xs text-gray-900 flex items-start gap-2">
                                <span className="material-symbols-outlined text-sm text-primary flex-shrink-0 mt-0.5">
                                  check_circle
                                </span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* RAG Policy Badges */}
                      {msg.rag_citations && msg.rag_citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-outline-variant/30">
                          <div className="text-[11px] font-bold text-gray-500 flex items-center gap-1 mb-1.5">
                            <span className="material-symbols-outlined text-xs text-blue-600">gavel</span>
                            Regulatory Citations (RAG Knowledge):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.rag_citations.map((doc, dIdx) => (
                              <div
                                key={dIdx}
                                className="text-[10px] px-2 py-1 rounded-lg bg-surface border border-outline-variant/40 text-gray-900 flex items-center gap-1 shadow-sm"
                                title={doc.content}
                              >
                                <span className="font-bold text-blue-600">[{doc.doc_id}]</span>
                                <span className="truncate max-w-[200px]">{doc.title}</span>
                                <span className="text-primary font-mono font-bold">({doc.relevance_score}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contextual Suggestion Pills */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(sug)}
                            className="text-xs px-2.5 py-1 rounded-full bg-surface-variant/80 hover:bg-primary/20 hover:text-primary hover:border-primary/40 border border-outline-variant/30 text-gray-500 transition-all cursor-pointer text-left"
                          >
                            💡 {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 p-3 bg-surface-variant/40 rounded-xl border border-gray-100 max-w-sm animate-pulse">
                    <span className="material-symbols-outlined text-primary animate-spin">sync</span>
                    <span className="text-xs text-gray-500">AI Copilot is analyzing graph flows & regulations...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-surface/80 border-t border-outline-variant/30 backdrop-blur-md">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask Copilot (e.g. 'Why was TXN_TRACE_HOP1 flagged?', 'Show money trail', 'Can we recover?')..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-surface-variant/50 border border-outline-variant/40 text-gray-900 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-outline"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm flex items-center gap-1.5 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
                  >
                    <span>Send</span>
                    <span className="material-symbols-outlined text-base">send</span>
                  </button>
                </form>
              </div>
            </>
          )}

          {/* RAG Knowledge Base Search View */}
          {activeTab === 'rag' && (
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="Search RBI Circulars, PMLA Section 12, Bank SOPs..."
                  className="flex-1 px-4 py-2 rounded-xl bg-surface-variant/50 border border-outline-variant/40 text-gray-900 text-sm"
                />
                <button
                  onClick={handleRagSearch}
                  disabled={isSearchingRag}
                  className="px-4 py-2 bg-secondary text-white rounded-xl text-sm font-semibold hover:bg-secondary/90 transition-all"
                >
                  Search Policy
                </button>
              </div>

              <div className="space-y-3">
                {(ragResults.length > 0 ? ragResults : [
                  {
                    doc_id: 'RAG-RBI-001',
                    title: 'RBI Master Direction on Customer Protection (RBI/2021-22/108)',
                    category: 'RBI_CIRCULAR',
                    source: 'Reserve Bank of India',
                    content: 'Zero liability applies when reported within 3 days. Mandatory debit freeze on recipient accounts.',
                    relevance_score: 95.0,
                  },
                  {
                    doc_id: 'RAG-PMLA-002',
                    title: 'PMLA Section 12 & FIU-IND Suspicious Transaction Reporting (STR)',
                    category: 'PMLA_AML',
                    source: 'FIU-IND',
                    content: 'Mandatory STR filing within 7 days for rapid multi-hop layering and smurfing transfers.',
                    relevance_score: 88.0,
                  },
                  {
                    doc_id: 'RAG-I4C-003',
                    title: 'I4C Mule Account Identification Matrix',
                    category: 'I4C_CYBER',
                    source: 'Ministry of Home Affairs',
                    content: 'Inbound credits forwarded > 70% within 60 mins qualifies as a high-risk mule account.',
                    relevance_score: 84.0,
                  },
                ]).map((doc, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-surface-variant/40 border border-outline-variant/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-secondary/20 text-blue-600">
                        {doc.doc_id} • {doc.category}
                      </span>
                      <span className="text-xs font-bold text-primary">{doc.relevance_score}% Relevance</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{doc.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{doc.content}</p>
                    <div className="text-[11px] text-outline">Source: {doc.source}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Case Similarity Search View */}
          {activeTab === 'similarity' && (
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Historical Case Similarity Engine</h3>
                  <p className="text-xs text-gray-500">Multi-dimensional cosine matching against historical fraud cases</p>
                </div>
                <span className="text-xs font-mono font-bold bg-surface-variant px-2.5 py-1 rounded-lg">
                  Target: {activeCaseContext.caseId}
                </span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    case_id: 'REC202607180012',
                    similarity_percentage: 92.5,
                    shared_patterns: ['Large Transaction', 'Mule Account Activity'],
                    fraud_type: 'Mule Forwarding Funnel',
                    amount_at_risk: 98000.0,
                    status: 'RECOVERED',
                  },
                  {
                    case_id: 'REC202607240034',
                    similarity_percentage: 88.0,
                    shared_patterns: ['Rapid Transfers', 'Impossible Travel'],
                    fraud_type: 'Account Takeover',
                    amount_at_risk: 115000.0,
                    status: 'ACTION_TAKEN',
                  },
                  {
                    case_id: 'REC202608020089',
                    similarity_percentage: 81.5,
                    shared_patterns: ['New Account Activity', 'Balance Drain'],
                    fraud_type: 'Identity Theft',
                    amount_at_risk: 75000.0,
                    status: 'OPEN',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-surface-variant/40 border border-outline-variant/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{item.case_id}</span>
                      <span className="text-xs font-bold text-tertiary px-2 py-0.5 rounded-full bg-tertiary/20">
                        {item.similarity_percentage}% Match
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center justify-between">
                      <span>Typology: <b>{item.fraud_type}</b></span>
                      <span>Amount: <b>₹{item.amount_at_risk.toLocaleString()}</b></span>
                      <span>Status: <b className="text-primary">{item.status}</b></span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.shared_patterns.map((p, pIdx) => (
                        <span key={pIdx} className="text-[10px] px-2 py-0.5 rounded bg-surface border border-outline-variant/30 text-outline">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Active Case Briefing & Recovery Meter (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Active Case Briefing Card */}
          <div className="bg-white border border-gray-200 shadow-card p-4 rounded-xl border border-outline-variant/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">folder_open</span>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Case Briefing</span>
              </div>
              <span className="text-xs font-mono font-bold text-primary">{activeCaseContext.caseId}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-variant/40 border border-gray-100">
                <span className="text-[10px] text-outline block">Victim Node</span>
                <span className="font-bold text-gray-900">{activeCaseContext.victim}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-variant/40 border border-gray-100">
                <span className="text-[10px] text-outline block">Current Holder</span>
                <span className="font-bold text-red-600">{activeCaseContext.holder}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-variant/40 border border-gray-100">
                <span className="text-[10px] text-outline block">Amount at Risk</span>
                <span className="font-bold text-gray-900">₹{activeCaseContext.amount.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-variant/40 border border-gray-100">
                <span className="text-[10px] text-outline block">Recovery Likelihood</span>
                <span className="font-bold text-tertiary">{activeCaseContext.prob} ({activeCaseContext.score}/100)</span>
              </div>
            </div>

            <button
              onClick={() => handleSendMessage(`Summarize Case ${activeCaseContext.caseId}`)}
              className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all border border-primary/30 flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">summarize</span>
              Generate AI Forensic Brief
            </button>
          </div>

          {/* Quick Forensic Action Tools */}
          <div className="bg-white border border-gray-200 shadow-card p-4 rounded-xl border border-outline-variant/30 space-y-2.5 shadow-lg flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-tertiary text-lg">bolt</span>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Instant Forensic Actions</span>
            </div>

            <button
              onClick={() => handleSendMessage('Show money trail for TXN_TRACE_HOP1')}
              className="w-full p-2.5 text-left rounded-xl bg-surface-variant/40 hover:bg-surface-variant border border-outline-variant/30 text-xs font-medium text-gray-900 transition-all flex items-center justify-between"
            >
              <span>Traced Downstream Money Path</span>
              <span className="material-symbols-outlined text-sm text-outline">arrow_forward</span>
            </button>

            <button
              onClick={() => handleSendMessage('Why is ACC1002 suspicious?')}
              className="w-full p-2.5 text-left rounded-xl bg-surface-variant/40 hover:bg-surface-variant border border-outline-variant/30 text-xs font-medium text-gray-900 transition-all flex items-center justify-between"
            >
              <span>Mule Account Forwarding Breakdown</span>
              <span className="material-symbols-outlined text-sm text-outline">arrow_forward</span>
            </button>

            <button
              onClick={() => handleSendMessage('Can this money be recovered?')}
              className="w-full p-2.5 text-left rounded-xl bg-surface-variant/40 hover:bg-surface-variant border border-outline-variant/30 text-xs font-medium text-gray-900 transition-all flex items-center justify-between"
            >
              <span>Asset Recovery Feasibility Score</span>
              <span className="material-symbols-outlined text-sm text-outline">arrow_forward</span>
            </button>

            <button
              onClick={() => handleSendMessage('What is the RBI guideline for unauthorized fraud?')}
              className="w-full p-2.5 text-left rounded-xl bg-surface-variant/40 hover:bg-surface-variant border border-outline-variant/30 text-xs font-medium text-gray-900 transition-all flex items-center justify-between"
            >
              <span>RBI / PMLA Regulatory Citations</span>
              <span className="material-symbols-outlined text-sm text-outline">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
