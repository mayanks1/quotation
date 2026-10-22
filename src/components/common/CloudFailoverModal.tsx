import React, { useState, useEffect } from 'react';
import { X, Cloud, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Database, Server, Zap } from 'lucide-react';
import { getFirebaseConfig, testFirestoreConnection } from '../../services/firebaseService';
import { failoverManager } from '../../services/failoverManager';
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
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncProgress('Preparing data from Supabase & Local Cache...');
    try {
      const quotes = storage.getAllQuotations(true);
      const clients = storage.getAllClients();
      const ledger = await fetchLedgerRecords();

      const result = await failoverManager.mirrorAllData(quotes, ledger, clients, (msg) => {
        setSyncProgress(msg);
      });

      if (result.success) {
        toast.success(`Successfully mirrored ${result.count} records to Firebase Firestore!`);
        setSyncProgress(`Completed! Mirrored ${result.count} total records.`);
      } else {
        toast.error(result.error || 'Mirror failed.');
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Cloud size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                0% Downtime Cloud Failover
                <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Active
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Dual-cloud architecture: Supabase (Primary) + Google Firebase (Zero-Downtime Secondary)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Dual Engine Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Supabase Status */}
            <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Database size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Supabase Cloud</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    PRIMARY
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 truncate">
                  Status: <span className="text-emerald-400 font-semibold">Online &amp; Active</span>
                </p>
              </div>
            </div>

            {/* Firebase Status */}
            <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg ${status.isFirebaseConfigured ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-500'} border flex items-center justify-center shrink-0 mt-0.5`}>
                <Server size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Firebase Firestore</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.isFirebaseConfigured ? 'bg-blue-500/10 text-blue-400' : 'bg-neutral-800 text-neutral-400'}`}>
                    {status.isFirebaseConfigured ? 'MIRROR READY' : 'UNCONFIGURED'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 truncate">
                  Role: <span className="text-blue-300 font-semibold">24/7 Failover &amp; Backup</span>
                </p>
              </div>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSaveConfig} className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Firebase Credentials
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Free Firebase Spark tier credentials for automatic secondary mirroring.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Project ID
                </label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="e.g. tisha-led-backup"
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
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-700 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 font-medium transition-colors flex items-center gap-1.5"
              >
                {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                Test Connection
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold transition-colors shadow-sm"
              >
                Save Credentials
              </button>
            </div>
          </form>

          {/* Instant Mirror & Sync Action */}
          <div className="bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-neutral-950 border border-blue-500/30 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" />
                  Full Database Replication
                </h4>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  Mirror all active quotes, payments, and clients into Firebase Firestore right now so your secondary database is 100% synchronized.
                </p>
              </div>
              <button
                onClick={handleSyncAll}
                disabled={isSyncing || !status.isFirebaseConfigured}
                className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${
                  status.isFirebaseConfigured
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                }`}
              >
                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {isSyncing ? 'Replicating...' : 'Mirror All Data Now'}
              </button>
            </div>

            {syncProgress && (
              <div className="text-[11px] font-mono text-blue-300 bg-blue-950/60 p-2.5 rounded-lg border border-blue-500/20 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                {syncProgress}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Failover Strategy: Automatic Circuit Breaker</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
