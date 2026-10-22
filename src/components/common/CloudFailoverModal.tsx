import React, { useState, useEffect } from 'react';
import { X, Cloud, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Database, Server, Zap, Check } from 'lucide-react';
import { getFirebaseConfig, testFirestoreConnection } from '../../services/firebaseService';
import { failoverManager, DatabaseEngine } from '../../services/failoverManager';
import { storage } from '../../services/storage';
import { fetchLedgerRecords } from '../../services/ledgerService';
import { useToast } from '../../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudFailoverModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [projectId, setProjectId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [status, setStatus] = useState(failoverManager.getStatus());

  useEffect(() => {
    if (isOpen) {
      const cfg = getFirebaseConfig();
      if (cfg) {
        setProjectId(cfg.projectId);
        setApiKey(cfg.apiKey);
      }
      setStatus(failoverManager.getStatus());
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = failoverManager.subscribe((st) => setStatus(st));
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSetPrimary = (engine: DatabaseEngine) => {
    if (engine === status.primaryEngine) return;
    const res = failoverManager.setPrimaryEngine(engine);
    if (!res.success) {
      toast.warning(res.error || 'Failed to switch primary database.');
    } else {
      toast.success(`Primary Database switched to ${engine.toUpperCase()}! Secondary is ${failoverManager.getSecondaryEngine().toUpperCase()}.`);
      setStatus(failoverManager.getStatus());
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId.trim() || !apiKey.trim()) {
      toast.warning('Please provide both Firebase Project ID and Web API Key.');
      return;
    }

    localStorage.setItem('tisha_firebase_project_id', projectId.trim());
    localStorage.setItem('tisha_firebase_api_key', apiKey.trim());
    setStatus(failoverManager.getStatus());
    toast.success('Firebase failover credentials saved successfully!');
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!projectId.trim() || !apiKey.trim()) {
      toast.warning('Please enter credentials first.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      localStorage.setItem('tisha_firebase_project_id', projectId.trim());
      localStorage.setItem('tisha_firebase_api_key', apiKey.trim());
      const res = await testFirestoreConnection();
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
        setStatus(failoverManager.getStatus());
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleReconcileAll = async () => {
    setIsSyncing(true);
    setSyncProgress(`Preparing data from ${status.primaryEngine.toUpperCase()} (Primary)...`);
    try {
      const quotes = storage.getAllQuotations(true);
      const clients = storage.getAllClients();
      const ledger = await fetchLedgerRecords();

      const result = await failoverManager.reconcileDatabases(quotes, ledger, clients, (msg) => {
        setSyncProgress(msg);
      });

      if (result.success) {
        toast.success(`Successfully replicated ${result.count} records from ${status.primaryEngine.toUpperCase()} to ${status.secondaryEngine.toUpperCase()}!`);
        setSyncProgress(`Replication complete! ${result.count} total records mirrored.`);
      } else {
        toast.error(result.error || 'Sync failed.');
        setSyncProgress(result.error || 'Sync failed.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Mirror failed.');
      setSyncProgress('Failed with error.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Cloud size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm sm:text-base leading-tight">
                  0% Downtime Cloud Failover
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 whitespace-nowrap shrink-0">
                  Dual-Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5 leading-snug truncate sm:whitespace-normal">
                Choose your Primary database. The secondary database automatically mirrors in background.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {/* Primary Database Selector */}
          <div className="bg-neutral-950/80 border border-neutral-800/90 rounded-xl p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Select Primary Database Engine</span>
              </label>
              <span className="text-[11px] text-neutral-400 font-medium">
                Active Traffic: <strong className="text-cyan-400 uppercase font-bold">{status.activeProvider}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Supabase Primary */}
              <div
                onClick={() => handleSetPrimary('supabase')}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  status.primaryEngine === 'supabase'
                    ? 'bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Database size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Supabase (PostgreSQL)</span>
                        {status.primaryEngine === 'supabase' && (
                          <span className="text-[9px] font-black bg-blue-500 text-white px-1.5 py-0.2 rounded-full uppercase whitespace-nowrap">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        Relational SQL &amp; Ledger Tables
                      </div>
                    </div>
                  </div>
                  {status.primaryEngine === 'supabase' && <Check size={16} className="text-blue-400 shrink-0 mt-0.5" />}
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-800/60 text-[10px] text-neutral-400 flex items-center justify-between">
                  <span>Auto-Mirror ➔ <strong>Firebase</strong></span>
                  <span className="text-emerald-400 font-semibold">Ready</span>
                </div>
              </div>

              {/* Option 2: Firebase Primary */}
              <div
                onClick={() => handleSetPrimary('firebase')}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  status.primaryEngine === 'firebase'
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <Server size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Firebase (Firestore)</span>
                        {status.primaryEngine === 'firebase' && (
                          <span className="text-[9px] font-black bg-amber-500 text-black px-1.5 py-0.2 rounded-full uppercase whitespace-nowrap">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        24/7 Zero Inactivity Pause
                      </div>
                    </div>
                  </div>
                  {status.primaryEngine === 'firebase' && <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />}
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-800/60 text-[10px] text-neutral-400 flex items-center justify-between">
                  <span>Auto-Mirror ➔ <strong>Supabase</strong></span>
                  <span className={status.isFirebaseConfigured ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                    {status.isFirebaseConfigured ? 'Configured' : 'Needs Setup'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSaveConfig} className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-400" />
                  <span>Firebase Credentials</span>
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Free Firebase Spark tier credentials for automatic secondary mirroring.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Firebase Project ID
                </label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="e.g. tisha-led-walls"
                  className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Web API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${testResult.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'bg-red-950/40 text-red-300 border border-red-500/30'}`}>
                {testResult.success ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
                <span className="leading-tight">{testResult.message}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="px-3.5 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                <span>Test Connection</span>
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold transition-colors shadow-sm flex items-center justify-center cursor-pointer"
              >
                Save Credentials
              </button>
            </div>
          </form>

          {/* Instant Mirror & Sync Action */}
          <div className="bg-gradient-to-br from-blue-950/50 via-indigo-950/40 to-neutral-950 border border-blue-500/30 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Zap size={14} />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                    Full Database Replication
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/60 uppercase font-semibold whitespace-nowrap">
                    {status.primaryEngine} ➔ {status.secondaryEngine}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-300/80 leading-relaxed max-w-lg">
                  Replicate all current quotes, payment ledger records, and clients from your primary database into your secondary mirror right now.
                </p>
              </div>

              <button
                onClick={handleReconcileAll}
                disabled={isSyncing || (!status.isFirebaseConfigured && status.secondaryEngine === 'firebase')}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer ${
                  status.isFirebaseConfigured || status.secondaryEngine === 'supabase'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 active:scale-95'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span className="whitespace-nowrap">
                  {isSyncing ? 'Replicating...' : `Sync ${status.primaryEngine.toUpperCase()} ➔ ${status.secondaryEngine.toUpperCase()}`}
                </span>
              </button>
            </div>

            {syncProgress && (
              <div className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 p-2.5 rounded-lg border border-cyan-500/30 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span className="truncate">{syncProgress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="truncate mr-2">Failover Strategy: Automatic Circuit Breaker</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
