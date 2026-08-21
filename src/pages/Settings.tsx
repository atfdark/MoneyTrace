import React from 'react';

export const Settings: React.FC = () => {
  return (
    <div className="flex flex-col max-w-5xl mx-auto gap-6 p-4 lg:p-6">
      <div className="bg-white border border-gray-200 shadow-card p-6 rounded-xl border border-outline-variant/30 shadow-card space-y-4">
        <h1 className="text-headline-sm font-bold text-gray-900">Platform Settings & Configurations</h1>
        <p className="text-body-sm text-gray-500">MoneyTrace SOC and fraud detection parameters.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-surface-variant/40 border border-outline-variant/30">
            <span className="text-xs font-bold text-gray-900 block mb-1">FastAPI Backend Endpoint</span>
            <span className="font-mono text-xs text-primary">http://localhost:8000/api/v1</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-variant/40 border border-outline-variant/30">
            <span className="text-xs font-bold text-gray-900 block mb-1">Database Engine</span>
            <span className="font-mono text-xs text-tertiary">SQLite Async (moneytrace.db)</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-variant/40 border border-outline-variant/30">
            <span className="text-xs font-bold text-gray-900 block mb-1">Graph Engine</span>
            <span className="font-mono text-xs text-blue-600">NetworkX MultiDiGraph</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-variant/40 border border-outline-variant/30">
            <span className="text-xs font-bold text-gray-900 block mb-1">AI Assistant Engine</span>
            <span className="font-mono text-xs text-amber-600">Offline Forensic Copilot + RAG</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
