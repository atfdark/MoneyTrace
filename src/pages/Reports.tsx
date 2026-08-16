import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface ReportHistoryItem {
  file_name: string;
  report_type: string;
  format: string;
  size_bytes: number;
  generated_at: string;
  download_url: string;
}

export const Reports: React.FC = () => {
  const [selectedCaseId, setSelectedCaseId] = useState('REC202608168920');
  const [selectedAlertId, setSelectedAlertId] = useState('ALT20260816051149913');
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generators' | 'history'>('generators');

  const fetchHistory = async () => {
    try {
      const res = await api.get('/reports/history');
      setHistory(res.data.reports || []);
    } catch (err) {
      console.error('Error fetching report history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDownload = async (endpoint: string, fallbackFilename: string, btnKey: string) => {
    setIsGenerating(btnKey);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fallbackFilename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      await fetchHistory();
    } catch (err: any) {
      console.error('Download error:', err);
      alert(`Error generating report: ${err?.message || 'Server error'}`);
    } finally {
      setIsGenerating(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col max-w-7xl mx-auto gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-outline-variant/30 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-[32px]">description</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-headline-sm font-bold text-on-surface">Reports & Export Center</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/20 text-secondary border border-secondary/30">
                Offline Document Engine
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Generate court-admissible PDF dossiers, Microsoft Word DOCX briefs, multi-tab Excel workbooks, and CSV streams.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-surface-variant/40 p-1.5 rounded-2xl border border-outline-variant/20">
          <button
            onClick={() => setActiveTab('generators')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'generators' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Report Generators
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Generated Archive</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface text-[10px] font-mono text-on-surface">
              {history.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'generators' && (
        <>
          {/* Main 4 Report Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Investigation Dossier Card */}
            <div className="glass-panel p-6 rounded-3xl border border-outline-variant/30 space-y-4 shadow-lg hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">gavel</span>
                  </div>
                  <div>
                    <h2 className="text-title-md font-bold text-on-surface">Investigation Dossier</h2>
                    <p className="text-xs text-on-surface-variant">Full case trail, victim/holder, CFR & CrPC legal notices</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">PDF + DOCX</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant">Target Case Identifier</label>
                <input
                  type="text"
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  placeholder="e.g. REC202608168920"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-variant/50 border border-outline-variant/40 text-on-surface text-sm font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleDownload(`/reports/investigation/${selectedCaseId}/pdf`, `Investigation_${selectedCaseId}.pdf`, 'inv-pdf')}
                  disabled={isGenerating === 'inv-pdf'}
                  className="py-2.5 px-4 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                  <span>{isGenerating === 'inv-pdf' ? 'Building...' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={() => handleDownload(`/reports/investigation/${selectedCaseId}/docx`, `Investigation_${selectedCaseId}.docx`, 'inv-docx')}
                  disabled={isGenerating === 'inv-docx'}
                  className="py-2.5 px-4 bg-surface-variant hover:bg-surface-variant/80 text-on-surface rounded-xl text-xs font-bold transition-all border border-outline-variant/40 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base text-secondary">description</span>
                  <span>{isGenerating === 'inv-docx' ? 'Building...' : 'Download DOCX'}</span>
                </button>
              </div>
            </div>

            {/* 2. Fraud Incident Report Card */}
            <div className="glass-panel p-6 rounded-3xl border border-outline-variant/30 space-y-4 shadow-lg hover:border-error/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center">
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                  <div>
                    <h2 className="text-title-md font-bold text-on-surface">Fraud Incident Report</h2>
                    <p className="text-xs text-on-surface-variant">Triggered rules breakdown, severity pie chart, and freeze mandate</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error/20 text-error">PDF + DOCX</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant">Target Fraud Alert Identifier</label>
                <input
                  type="text"
                  value={selectedAlertId}
                  onChange={(e) => setSelectedAlertId(e.target.value)}
                  placeholder="e.g. ALT20260816051149913"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-variant/50 border border-outline-variant/40 text-on-surface text-sm font-mono focus:outline-none focus:border-error"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleDownload(`/reports/fraud/${selectedAlertId}/pdf`, `FraudAlert_${selectedAlertId}.pdf`, 'fraud-pdf')}
                  disabled={isGenerating === 'fraud-pdf'}
                  className="py-2.5 px-4 bg-error text-on-error rounded-xl text-xs font-bold hover:bg-error/90 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                  <span>{isGenerating === 'fraud-pdf' ? 'Building...' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={() => handleDownload(`/reports/fraud/${selectedAlertId}/docx`, `FraudAlert_${selectedAlertId}.docx`, 'fraud-docx')}
                  disabled={isGenerating === 'fraud-docx'}
                  className="py-2.5 px-4 bg-surface-variant hover:bg-surface-variant/80 text-on-surface rounded-xl text-xs font-bold transition-all border border-outline-variant/40 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base text-secondary">description</span>
                  <span>{isGenerating === 'fraud-docx' ? 'Building...' : 'Download DOCX'}</span>
                </button>
              </div>
            </div>

            {/* 3. Recovery Intelligence Report Card */}
            <div className="glass-panel p-6 rounded-3xl border border-outline-variant/30 space-y-4 shadow-lg hover:border-tertiary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                    <span className="material-symbols-outlined">monetization_on</span>
                  </div>
                  <div>
                    <h2 className="text-title-md font-bold text-on-surface">Asset Recovery Summary</h2>
                    <p className="text-xs text-on-surface-variant">Asset preservation chances, holding node analysis, and bar chart</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-tertiary/20 text-tertiary">PDF + DOCX</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant">Target Recovery Case Identifier</label>
                <input
                  type="text"
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  placeholder="e.g. REC202608168920"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-variant/50 border border-outline-variant/40 text-on-surface text-sm font-mono focus:outline-none focus:border-tertiary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleDownload(`/reports/recovery/${selectedCaseId}/pdf`, `RecoveryReport_${selectedCaseId}.pdf`, 'rec-pdf')}
                  disabled={isGenerating === 'rec-pdf'}
                  className="py-2.5 px-4 bg-tertiary text-on-tertiary rounded-xl text-xs font-bold hover:bg-tertiary/90 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                  <span>{isGenerating === 'rec-pdf' ? 'Building...' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={() => handleDownload(`/reports/recovery/${selectedCaseId}/docx`, `RecoveryReport_${selectedCaseId}.docx`, 'rec-docx')}
                  disabled={isGenerating === 'rec-docx'}
                  className="py-2.5 px-4 bg-surface-variant hover:bg-surface-variant/80 text-on-surface rounded-xl text-xs font-bold transition-all border border-outline-variant/40 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base text-secondary">description</span>
                  <span>{isGenerating === 'rec-docx' ? 'Building...' : 'Download DOCX'}</span>
                </button>
              </div>
            </div>

            {/* 4. Executive Dashboard Brief & Excel Workbook */}
            <div className="glass-panel p-6 rounded-3xl border border-outline-variant/30 space-y-4 shadow-lg hover:border-secondary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined">analytics</span>
                  </div>
                  <div>
                    <h2 className="text-title-md font-bold text-on-surface">Executive Dashboard & Excel</h2>
                    <p className="text-xs text-on-surface-variant">Multi-sheet master workbook + dual embedded chart summary</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/20 text-secondary">PDF + XLSX</span>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Generates a master audit report with all KPI totals, 500+ transactions, active alerts, recovery cases, and investigator performance.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={() => handleDownload('/reports/dashboard/pdf', 'MoneyTrace_Executive_Dashboard.pdf', 'dash-pdf')}
                  disabled={isGenerating === 'dash-pdf'}
                  className="py-2.5 px-4 bg-secondary text-on-secondary rounded-xl text-xs font-bold hover:bg-secondary/90 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                  <span>{isGenerating === 'dash-pdf' ? 'Building...' : 'Executive PDF'}</span>
                </button>
                <button
                  onClick={() => handleDownload('/reports/export/dashboard', 'MoneyTrace_Analytics_Master.xlsx', 'dash-xlsx')}
                  disabled={isGenerating === 'dash-xlsx'}
                  className="py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  <span className="material-symbols-outlined text-base">table_view</span>
                  <span>{isGenerating === 'dash-xlsx' ? 'Building...' : 'Master Excel (.xlsx)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Raw CSV Exports Strip */}
          <div className="glass-panel p-6 rounded-3xl border border-outline-variant/30 space-y-4 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">dataset</span>
              <h2 className="text-title-sm font-bold text-on-surface">Raw Tabular CSV Data Streams</h2>
            </div>
            <p className="text-xs text-on-surface-variant">Instant download of full database ledger tables in UTF-8 CSV format for external BI tools.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <button
                onClick={() => handleDownload('/reports/export/transactions', 'Transactions_Export.csv', 'csv-txns')}
                disabled={isGenerating === 'csv-txns'}
                className="p-3 rounded-2xl bg-surface-variant/50 hover:bg-surface-variant border border-outline-variant/30 text-xs font-bold text-on-surface transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base text-primary">receipt_long</span>
                <span>Transactions CSV</span>
              </button>

              <button
                onClick={() => handleDownload('/reports/export/alerts', 'FraudAlerts_Export.csv', 'csv-alerts')}
                disabled={isGenerating === 'csv-alerts'}
                className="p-3 rounded-2xl bg-surface-variant/50 hover:bg-surface-variant border border-outline-variant/30 text-xs font-bold text-on-surface transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base text-error">notification_important</span>
                <span>Fraud Alerts CSV</span>
              </button>

              <button
                onClick={() => handleDownload('/reports/export/recovery', 'RecoveryCases_Export.csv', 'csv-rec')}
                disabled={isGenerating === 'csv-rec'}
                className="p-3 rounded-2xl bg-surface-variant/50 hover:bg-surface-variant border border-outline-variant/30 text-xs font-bold text-on-surface transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base text-tertiary">lock_reset</span>
                <span>Recovery Cases CSV</span>
              </button>

              <button
                onClick={() => handleDownload('/reports/export/accounts', 'Accounts_Export.csv', 'csv-acc')}
                disabled={isGenerating === 'csv-acc'}
                className="p-3 rounded-2xl bg-surface-variant/50 hover:bg-surface-variant border border-outline-variant/30 text-xs font-bold text-on-surface transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base text-secondary">account_balance</span>
                <span>Accounts CSV</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Report Archive Tab */}
      {activeTab === 'history' && (
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">folder_zip</span>
              <h2 className="text-title-md font-bold text-on-surface">Generated Report Archive</h2>
            </div>
            <button
              onClick={fetchHistory}
              className="px-3 py-1.5 bg-surface-variant hover:bg-surface-variant/80 text-xs font-bold text-on-surface rounded-xl transition-all border border-outline-variant/40 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Refresh</span>
            </button>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-sm">
              No reports generated yet. Generate your first PDF or Excel report above!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-on-surface-variant font-bold">
                    <th className="pb-3">File Name</th>
                    <th className="pb-3">Format</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">File Size</th>
                    <th className="pb-3">Generated At</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-medium">
                  {history.map((rep, idx) => (
                    <tr key={idx} className="hover:bg-surface-variant/30 transition-all">
                      <td className="py-3 font-mono font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-primary">
                          {rep.format === 'PDF' ? 'picture_as_pdf' : rep.format === 'XLSX' ? 'table_view' : 'description'}
                        </span>
                        <span>{rep.file_name}</span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rep.format === 'PDF' ? 'bg-primary/20 text-primary' :
                          rep.format === 'XLSX' ? 'bg-emerald-500/20 text-emerald-600' :
                          rep.format === 'DOCX' ? 'bg-secondary/20 text-secondary' : 'bg-surface-variant text-on-surface'
                        }`}>
                          {rep.format}
                        </span>
                      </td>
                      <td className="py-3 text-on-surface-variant">{rep.report_type}</td>
                      <td className="py-3 text-outline font-mono">{formatFileSize(rep.size_bytes)}</td>
                      <td className="py-3 text-on-surface-variant">
                        {new Date(rep.generated_at).toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDownload(rep.download_url, rep.file_name, `hist-${idx}`)}
                          disabled={isGenerating === `hist-${idx}`}
                          className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-bold transition-all text-xs"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
