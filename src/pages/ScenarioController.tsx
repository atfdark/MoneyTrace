import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuthStore } from '../contexts/AuthContext';

interface ScenarioType {
  id: string;
  name: string;
  description: string;
  total_steps: number;
}

interface ScenarioRun {
  scenario_id: string;
  scenario_type: string;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'failed' | 'completed';
  current_step: number;
  total_steps: number;
}

export const ScenarioController: React.FC = () => {
  const [types, setTypes] = useState<ScenarioType[]>([]);
  const [activeRun, setActiveRun] = useState<ScenarioRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { clearAuth, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const res = await api.get('/scenarios/types');
      setTypes(res.data as ScenarioType[]);
    } catch (err) {
      setError('Failed to load scenarios.');
    } finally {
      setLoading(false);
    }
  };

  const startScenario = async (typeId: string) => {
    try {
      setLoading(true);
      const res = await api.post('/scenarios/start', { scenario_type: typeId });
      setActiveRun(res.data as ScenarioRun);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start scenario');
    } finally {
      setLoading(false);
    }
  };

  const sendCommand = async (command: 'pause' | 'resume' | 'step' | 'stop') => {
    if (!activeRun) return;
    try {
      setLoading(true);
      const res = await api.post(`/scenarios/${activeRun.scenario_id}/command`, { command });
      setActiveRun(res.data as ScenarioRun);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to send ${command}`);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = async () => {
    try {
      setLoading(true);
      await api.post('/scenarios/reset');
      setActiveRun(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset scenarios');
    } finally {
      setLoading(false);
    }
  };

  if (loading && types.length === 0) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="flex justify-between items-center pb-6 border-b border-gray-800 mb-6">
        <div>
          <h1 className="text-xl font-bold text-blue-400">SOC Scenario Controller</h1>
          <p className="text-sm text-gray-400">Logged in as {user?.email}</p>
        </div>
        <button 
          onClick={clearAuth}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 text-sm">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold hover:text-red-300">&times;</button>
        </div>
      )}

      {/* Active Run UI */}
      {activeRun ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-gray-800 rounded-xl p-6 mb-6 shadow-xl border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {types.find(t => t.id === activeRun.scenario_type)?.name || activeRun.scenario_type}
                </h2>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${
                    activeRun.status === 'running' ? 'bg-green-500 animate-pulse' :
                    activeRun.status === 'paused' ? 'bg-yellow-500' :
                    activeRun.status === 'failed' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}></span>
                  <span className="text-sm uppercase tracking-wider text-gray-400 font-semibold">
                    {activeRun.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-light text-blue-400">
                  {activeRun.current_step} <span className="text-gray-500 text-xl">/ {activeRun.total_steps}</span>
                </div>
                <div className="text-xs tracking-wider text-gray-500 uppercase mt-1">Steps Completed</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-900 rounded-full h-2 mb-8 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  activeRun.status === 'completed' ? 'bg-blue-500' : 'bg-green-500'
                }`}
                style={{ width: `${(activeRun.current_step / activeRun.total_steps) * 100}%` }}
              ></div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => sendCommand('step')}
                disabled={loading || activeRun.status === 'completed' || activeRun.status === 'stopped'}
                className="col-span-2 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <span className="material-symbols-outlined">fast_forward</span>
                <span>Execute Next Step</span>
              </button>

              {activeRun.status === 'running' ? (
                <button
                  onClick={() => sendCommand('pause')}
                  disabled={loading}
                  className="py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-yellow-400">pause</span>
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  onClick={() => sendCommand('resume')}
                  disabled={loading || activeRun.status === 'completed' || activeRun.status === 'stopped'}
                  className="py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-green-400">play_arrow</span>
                  <span>Resume</span>
                </button>
              )}

              <button
                onClick={() => sendCommand('stop')}
                disabled={loading || activeRun.status === 'completed' || activeRun.status === 'stopped'}
                className="py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors text-red-400"
              >
                <span className="material-symbols-outlined">stop</span>
                <span>Stop</span>
              </button>
            </div>
          </div>
          
          <button
             onClick={resetAll}
             disabled={loading}
             className="mt-auto py-4 text-gray-500 hover:text-white transition-colors uppercase tracking-widest text-sm font-bold flex items-center justify-center space-x-2"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>Reset Controller</span>
          </button>
        </div>
      ) : (
        /* Scenarios List UI */
        <div className="flex-1 overflow-y-auto">
          <h2 className="text-sm font-semibold tracking-wider text-gray-500 uppercase mb-4">Available Scenarios</h2>
          <div className="space-y-4">
            {types.map(type => (
              <button
                key={type.id}
                onClick={() => startScenario(type.id)}
                disabled={loading}
                className="w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 p-5 rounded-xl text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-100 group-hover:text-blue-400 transition-colors">{type.name}</h3>
                  <span className="text-xs bg-gray-900 text-gray-400 px-2 py-1 rounded-md">{type.total_steps} steps</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{type.description}</p>
                
                <div className="mt-4 flex items-center text-blue-500 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-sm mr-1">play_circle</span>
                  Start Scenario
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
