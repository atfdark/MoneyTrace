import React from 'react';

export const Settings: React.FC = () => {
  return (
    <div className="flex flex-col max-w-5xl mx-auto gap-6 p-4 lg:p-6">
      <div className="glass-panel p-6 rounded-3xl border border-outline-variant/30 shadow-xl space-y-4">
        <h1 className="text-headline-sm font-bold text-on-surface">Platform Settings & Configurations</h1>
        <p className="text-body-sm text-on-surface-variant">MoneyTrace SOC and fraud detection parameters.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-surface-variant/40 border border-outline-variant/30">
            <span className="text-xs font-bold text-on-surface block mb-1">FastAPI Backend Endpoint</span>
            <span className="font-mono text-xs text-primary">http://localhost:8000/api/v1</span>
          </div>
          <div className="p-4 rounded-2xl bg-surface-variant/40 border border-outline-variant/30">
            <span className="text-xs font-bold text-on-surface block mb-1">Database Engine</span>
            <span className="font-mono text-xs text-tertiary">SQLite Async (moneytrace.db)</span>
          </div>
          <div className="p-4 rounded-2xl bg-surface-variant/40 border border-outline-variant/30">
            <span className="text-xs font-bold text-on-surface block mb-1">Graph Engine</span>
            <span className="font-mono text-xs text-secondary">NetworkX MultiDiGraph</span>
          </div>
          <div className="p-4 rounded-2xl bg-surface-variant/40 border border-outline-variant/30">
            <span className="text-xs font-bold text-on-surface block mb-1">AI Assistant Engine</span>
            <span className="font-mono text-xs text-warning">Offline Forensic Copilot + RAG</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
