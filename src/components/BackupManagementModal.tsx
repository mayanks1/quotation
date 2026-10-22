import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Cloud,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  Archive,
  Sparkles,
  Calendar,
  Layers,
  FileCode,
  Copy,
  Check,
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';
import { backupService, BackupSnapshot, DailyBackupConfig, DEFAULT_DRIVE_FOLDER_ID } from '../services/backupService';
import { useToast, useConfirm } from '../context/ToastContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRestoreComplete?: () => void;
}

export const BackupManagementModal: React.FC<Props> = ({ isOpen, onClose, onRestoreComplete }) => {
  useLockBodyScroll(isOpen);
  const toast = useToast();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<'history' | 'script'>('history');
  const [config, setConfig] = useState<DailyBackupConfig>(() => backupService.getConfig());
  const [backups, setBackups] = useState<BackupSnapshot[]>(() => backupService.getBackups());
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(backupService.getConfig());
      setBackups(backupService.getBackups());
      backupService.loadFromCloud().then(() => {
        setConfig(backupService.getConfig());
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAutomated = (enabled: boolean) => {
    const updated = backupService.saveConfig({ enabled });
    setConfig(updated);
    toast.success(enabled ? 'Automated daily backup enabled.' : 'Automated daily backup paused.');
  };

  const handleRetentionChange = (limit: number) => {
    const updated = backupService.saveConfig({ retentionLimit: limit });
    setConfig(updated);
    const pruned = backupService.cleanupOldBackups(limit);
    setBackups(backupService.getBackups());
    if (pruned > 0) {
      toast.info(`Retention set to ${limit}. Cleaned up ${pruned} older backup${pruned > 1 ? 's' : ''}.`);
    } else {
      toast.success(`Backup retention policy updated to keep last ${limit} backups.`);
    }
  };

  const handleRunBackupNow = async () => {
    setIsBackingUp(true);
    try {
      const snapshot = await backupService.runDailyBackup({ isManual: true });
      setBackups(backupService.getBackups());
      setConfig(backupService.getConfig());
      toast.success(`Backup "${snapshot.name}" captured successfully! (${snapshot.quotationsCount} quotes, ${snapshot.clientsCount} clients)`);
    } catch (err: any) {
      toast.error('Backup failed: ' + (err?.message || String(err)));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleManualCleanup = async () => {
    const beforeCount = backups.length;
    const pruned = backupService.cleanupOldBackups(config.retentionLimit);
    setBackups(backupService.getBackups());
    if (pruned > 0) {
      toast.success(`Cleaned up ${pruned} old backup${pruned > 1 ? 's' : ''}. Keeping latest ${config.retentionLimit}.`);
    } else {
      toast.info(`No backups to cleanup. Currently ${beforeCount} backups (limit is ${config.retentionLimit}).`);
    }
  };

  const handleRestore = async (snapshot: BackupSnapshot) => {
    const isConfirmed = await confirm({
      title: `Restore Backup: ${snapshot.name}?`,
      message: `This will restore ${snapshot.quotationsCount} quotations, ${snapshot.clientsCount} clients, and company profiles from ${snapshot.dateFormatted}. Existing records will be merged/updated.`,
      confirmText: 'Yes, Restore Backup',
      cancelText: 'Cancel',
      variant: 'warning'
    });

    if (!isConfirmed) return;

    setIsRestoringId(snapshot.id);
    try {
      const res = await backupService.restoreBackup(snapshot.id);
      toast.success(`Backup restored successfully! (${res.quotationsCount} quotes, ${res.clientsCount} clients)`);
      if (onRestoreComplete) onRestoreComplete();
    } catch (err: any) {
      toast.error('Restore failed: ' + (err?.message || String(err)));
    } finally {
      setIsRestoringId(null);
    }
  };

  const handleDelete = async (backupId: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Backup Snapshot?',
      message: `Are you sure you want to delete "${name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      variant: 'danger'
    });

    if (!isConfirmed) return;

    backupService.deleteBackup(backupId);
    setBackups(backupService.getBackups());
    toast.info('Backup removed.');
  };

  const appsScriptCode = `// TISHA LED WALLS - UNIFIED GOOGLE APPS SCRIPT
// Handles: Sheet CRUD, Portal Webhooks, Weekly Email Digest, and Daily Backups with Cleanup

const BACKUP_FOLDER_ID = "${config.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID}";

function showSheetUrl() {
  Logger.log(SpreadsheetApp.getActiveSpreadsheet().getUrl());
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  // If a note is provided, use it; otherwise preserve existing note or blank
  const noteValue = data.note !== undefined ? data.note : "";

  if (data.action === "add") {
    sheet.appendRow([
      data.date, 
      data.client, 
      data.size, 
      data.amount, 
      data.status, 
      noteValue
    ]);
  }

  if (data.action === "update") {
    // Updates all 6 columns: Date, Client, Size, Amount, Status, Note
    sheet.getRange(data.row, 1, 1, 6).setValues([
      [data.date, data.client, data.size, data.amount, data.status, noteValue]
    ]);
  }

  if (data.action === "delete") {
    sheet.deleteRow(data.row);
  }

  // Webhook action to trigger daily backup & retention cleanup from portal
  if (data.action === "backup") {
    dailyBackup();
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Backup created and old backups trimmed" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// REAL TIME SHEET DATA FETCH API
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0]; // Always targets the first sheet tab
    const data = sheet.getDataRange().getDisplayValues(); // Clean text strings

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// DAILY BACKUP TO GOOGLE DRIVE
function dailyBackup() {
  const SOURCE_SHEET_NAME = "RAW_DATA"; // Change if your sheet tab has another name
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SOURCE_SHEET_NAME) || ss.getSheets()[0];

  if (!sheet) {
    Logger.log("Source sheet not found");
    return;
  }

  const data = sheet.getDataRange().getValues();

  // Create backup file name with current date
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy");
  const backupName = ss.getName() + " Backup - " + today;

  // Create new spreadsheet backup
  const newSS = SpreadsheetApp.create(backupName);
  const newSheet = newSS.getSheets()[0];

  // Copy all row & column data
  newSheet.getRange(1, 1, data.length, data[0].length).setValues(data);

  // Move created file into the dedicated Backup Google Drive Folder
  const file = DriveApp.getFileById(newSS.getId());
  const folder = DriveApp.getFolderById(BACKUP_FOLDER_ID);

  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  Logger.log("Backup created successfully: " + backupName);

  // Automatically clean old backups keeping only last ${config.retentionLimit || 30}
  cleanupOldBackups();
}

// CLEANUP OLD BACKUPS (Keeps only last ${config.retentionLimit || 30} backups)
function cleanupOldBackups() {
  const folder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
  const files = folder.getFiles();

  let list = [];
  while (files.hasNext()) {
    list.push(files.next());
  }

  // Sort oldest first
  list.sort((a, b) => a.getDateCreated() - b.getDateCreated());

  // Keep only the last ${config.retentionLimit || 30} backups
  const maxToKeep = ${config.retentionLimit || 30};
  let deletedCount = 0;
  while (list.length > maxToKeep) {
    list.shift().setTrashed(true);
    deletedCount++;
  }
  Logger.log("Cleaned up " + deletedCount + " old backups. Remaining in Drive: " + list.length);
}
`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    toast.success('Apps Script code copied to clipboard!');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-blue-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner">
              <Archive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Automated Daily Backups &amp; Archive</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {config.enabled ? 'AUTOMATED' : 'PAUSED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Snapshots captured daily with automated retention cleanup (Last {config.retentionLimit} backups)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database size={14} />
            <span>Portal Backups ({backups.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'script'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCode size={14} />
            <span>Google Apps Script &amp; Drive</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'history' ? (
            <>
              {/* Controls Bar */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => handleToggleAutomated(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Daily Auto-Backup</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${config.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                          {config.enabled ? 'ACTIVE' : 'OFF'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {config.lastRunTimestamp ? `Last run: ${new Date(config.lastRunTimestamp).toLocaleString()}` : 'Runs once every day automatically'}
                      </div>
                    </div>
                  </div>

                  {/* Retention Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 whitespace-nowrap">Retention Limit:</span>
                    <select
                      value={config.retentionLimit}
                      onChange={(e) => handleRetentionChange(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-blue-500 cursor-pointer"
                    >
                      <option value={7}>Keep Last 7 Backups</option>
                      <option value={15}>Keep Last 15 Backups</option>
                      <option value={30}>Keep Last 30 Backups (Recommended)</option>
                      <option value={60}>Keep Last 60 Backups</option>
                      <option value={90}>Keep Last 90 Backups</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60">
                  <div className="text-[11px] text-slate-400">
                    Older backups beyond <strong className="text-white">{config.retentionLimit}</strong> are automatically purged on every backup run.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleManualCleanup}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Cleanup Old Backups</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBackingUp}
                      onClick={handleRunBackupNow}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-blue-600/30 cursor-pointer"
                    >
                      <Play size={12} className={isBackingUp ? 'animate-spin' : ''} />
                      <span>{isBackingUp ? 'Capturing Snapshot...' : 'Run Backup Now'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Backups List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>Saved Backup Snapshots ({backups.length})</span>
                  <span>Quota: {backups.length} / {config.retentionLimit} retained</span>
                </div>

                {backups.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                    <Archive size={32} className="mx-auto text-slate-600" />
                    <div className="text-sm font-semibold text-slate-300">No backup snapshots saved yet</div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Click "Run Backup Now" above to capture your first full system snapshot including quotations, clients, and ledger records.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                    {backups.map((b) => {
                      const isRestoring = isRestoringId === b.id;
                      return (
                        <div
                          key={b.id}
                          className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{b.name}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                b.isAutomated
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}>
                                {b.isAutomated ? 'Auto Daily' : 'Manual'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock size={11} className="text-slate-500" />
                                {b.dateFormatted}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-400 font-semibold">{b.quotationsCount} Quotes</span>
                              <span>•</span>
                              <span className="text-indigo-400 font-semibold">{b.clientsCount} Clients</span>
                              <span>•</span>
                              <span className="text-amber-400 font-semibold">{b.ledgerCount} Ledger</span>
                              <span>•</span>
                              <span className="text-slate-400">{backupService.formatBytes(b.sizeBytes)}</span>
                            </div>
                          </div>

                          {/* Snapshot Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => backupService.downloadBackup(b.id)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              title="Download JSON file"
                            >
                              <Download size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={isRestoring}
                              onClick={() => handleRestore(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                              title="Restore this backup"
                            >
                              <Upload size={12} className={isRestoring ? 'animate-spin' : ''} />
                              <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(b.id, b.name)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs transition-colors cursor-pointer"
                              title="Delete snapshot"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Google Apps Script & Drive Tab */
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs text-blue-200 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Cloud size={14} className="text-blue-400" />
                  <span>Google Apps Script - Daily Backup &amp; Trimming</span>
                </div>
                <p className="text-[11px] text-blue-300/90 leading-relaxed">
                  This Google Apps Script copies your raw Google Sheet data into your dedicated Google Drive backup folder
                  (<code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">{config.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID}</code>) 
                  daily and automatically calls <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">cleanupOldBackups()</code> to keep only the latest <strong>{config.retentionLimit}</strong> files.
                </p>
              </div>

              {/* Webhook Sync URL */}
              <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                <label className="text-xs font-bold text-slate-300 block">
                  Optional: Deployed Apps Script Web App URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={config.appsScriptUrl || ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const updated = backupService.saveConfig({ appsScriptUrl: val });
                      setConfig(updated);
                    }}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  If set, running a portal backup also pings your Google Drive script to execute backups across both cloud systems.
                </p>
              </div>

              {/* Code Snippet Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Apps Script Code (Code.gs)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedScript ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedScript ? 'Copied!' : 'Copy Apps Script'}</span>
                  </button>
                </div>

                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[36vh] leading-relaxed select-all">
                  {appsScriptCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="text-[11px] text-slate-400">
            All snapshots securely stored in browser IndexedDB &amp; synchronized with Supabase
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
