import { idb } from './indexedDb';
import { storage } from './storage';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Quotation, ClientProfile, CompanyProfile, CatalogItem } from '../types/quotation';
import { LedgerRecord } from './ledgerService';

export interface BackupSnapshot {
  id: string;
  name: string;
  createdAt: string; // ISO String
  dateFormatted: string; // "DD-MM-YYYY HH:mm"
  isAutomated: boolean;
  quotationsCount: number;
  clientsCount: number;
  ledgerCount: number;
  catalogCount: number;
  sizeBytes: number;
  data: {
    version: number;
    exportedAt: string;
    appName: string;
    company: CompanyProfile;
    quotations: Quotation[];
    clients: ClientProfile[];
    catalog: CatalogItem[];
    ledger: LedgerRecord[];
  };
}

export interface DailyBackupConfig {
  enabled: boolean;
  retentionLimit: number; // default: 30
  lastRunDate?: string; // YYYY-MM-DD
  lastRunTimestamp?: string; // ISO
  googleDriveFolderId?: string;
  appsScriptUrl?: string;
  updatedAt?: string;
}

const CONFIG_STORAGE_KEY = 'tisha_daily_backup_config_v1';
const BACKUPS_STORAGE_KEY = 'tisha_system_backups_list_v1';
export const DEFAULT_DRIVE_FOLDER_ID = '17H67GQxrSzmoP_OoquJBXEX6K1M0UODc';
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbFiup_qy6QPd2ys9Ab90x_1sPa9lfYUidLSZPbBeyT8iAcUoHoQe5XeoEl9sOkSkEOA/exec';

export const DEFAULT_BACKUP_CONFIG: DailyBackupConfig = {
  enabled: true,
  retentionLimit: 30, // Keep last 30 backups like in Google Apps Script
  googleDriveFolderId: DEFAULT_DRIVE_FOLDER_ID,
  appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
};

export const backupService = {
  getConfig(): DailyBackupConfig {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_BACKUP_CONFIG,
          ...parsed,
          appsScriptUrl: parsed.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL,
        };
      }
    } catch (e) {
      console.warn('Error reading backup config:', e);
    }
    return DEFAULT_BACKUP_CONFIG;
  },

  saveConfig(cfg: Partial<DailyBackupConfig>): DailyBackupConfig {
    const current = this.getConfig();
    const updated: DailyBackupConfig = {
      ...current,
      ...cfg,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving backup config:', e);
    }
    this.syncConfigToCloud(updated).catch(console.warn);
    return updated;
  },

  getBackups(): BackupSnapshot[] {
    try {
      const stored = localStorage.getItem(BACKUPS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Sort newest first
          return parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      }
    } catch (e) {
      console.warn('Error reading backup list:', e);
    }
    return [];
  },

  saveBackups(list: BackupSnapshot[]): void {
    try {
      localStorage.setItem(BACKUPS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Storage quota warning when saving backups locally:', e);
    }
  },

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  /**
   * Run Daily Backup Snapshot (Manual or Automated)
   */
  async runDailyBackup(options?: { isManual?: boolean; name?: string }): Promise<BackupSnapshot> {
    const [quotations, clients] = await Promise.all([
      idb.getAllQuotations(),
      idb.getAllClients(),
    ]);
    const company = storage.getCompanyProfile();
    const catalog = storage.getAllCatalogItems();

    let ledger: LedgerRecord[] = [];
    try {
      const rawLedger = localStorage.getItem('tisha_supabase_ledger_cache_v1');
      if (rawLedger) ledger = JSON.parse(rawLedger);
    } catch (e) {
      console.warn('Could not read ledger cache for backup:', e);
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const payloadData = {
      version: 3,
      exportedAt: now.toISOString(),
      appName: 'Tisha LED Walls Quotation Pro',
      company,
      quotations,
      clients,
      catalog,
      ledger,
    };

    const jsonStr = JSON.stringify(payloadData);
    const sizeBytes = new Blob([jsonStr]).size;

    const snapshot: BackupSnapshot = {
      id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: options?.name || `TLW Backup - ${dateStr}${options?.isManual ? ' (Manual)' : ''}`,
      createdAt: now.toISOString(),
      dateFormatted: `${dateStr} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      isAutomated: !options?.isManual,
      quotationsCount: quotations.length,
      clientsCount: clients.length,
      ledgerCount: ledger.length,
      catalogCount: catalog.length,
      sizeBytes,
      data: payloadData,
    };

    const currentBackups = this.getBackups();
    currentBackups.unshift(snapshot);
    this.saveBackups(currentBackups);

    // Update last run timestamp in config
    const config = this.getConfig();
    this.saveConfig({
      ...config,
      lastRunDate: now.toISOString().slice(0, 10),
      lastRunTimestamp: now.toISOString(),
    });

    // Automatically prune older backups based on retention policy
    this.cleanupOldBackups(config.retentionLimit);

    // Dispatch webhook to existing Google Apps Script
    const targetUrl = config.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL;
    if (targetUrl) {
      try {
        fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'backup',
            date: dateStr,
            quotationsCount: snapshot.quotationsCount,
            clientsCount: snapshot.clientsCount,
            ledgerCount: snapshot.ledgerCount,
            timestamp: now.toISOString(),
          }),
        }).catch(console.warn);
      } catch (err) {
        console.warn('Apps Script webhook trigger notice:', err);
      }
    }

    // Cloud registry sync
    await this.syncToCloud();

    return snapshot;
  },

  /**
   * Cleanup Old Backups (Keeps only last N backups, exactly like Apps Script cleanupOldBackups)
   */
  cleanupOldBackups(retentionLimit?: number): number {
    const config = this.getConfig();
    const limit = retentionLimit || config.retentionLimit || 30;
    const list = this.getBackups();

    if (list.length <= limit) return 0;

    // Sort ascending by creation date (oldest first)
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let prunedCount = 0;
    while (list.length > limit) {
      list.shift(); // remove oldest backup
      prunedCount++;
    }

    // Save pruned list (sorted newest first)
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.saveBackups(list);
    return prunedCount;
  },

  /**
   * Download a backup snapshot as a .json file
   */
  downloadBackup(backupId: string): void {
    const list = this.getBackups();
    const found = list.find((b) => b.id === backupId);
    if (!found) throw new Error('Backup not found');

    const jsonStr = JSON.stringify(found.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${found.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * 1-Click Restore of a backup snapshot into active workspace
   */
  async restoreBackup(backupId: string): Promise<{ quotationsCount: number; clientsCount: number }> {
    const list = this.getBackups();
    const found = list.find((b) => b.id === backupId);
    if (!found || !found.data) throw new Error('Backup record not found or corrupted');

    const jsonStr = JSON.stringify(found.data);
    const result = await idb.importFullBackup(jsonStr);
    await storage.reloadFromIndexedDb();

    // If backup contains ledger, restore cache
    if (Array.isArray(found.data.ledger) && found.data.ledger.length > 0) {
      try {
        localStorage.setItem('tisha_supabase_ledger_cache_v1', JSON.stringify(found.data.ledger));
      } catch (e) {
        console.warn(e);
      }
    }

    return result;
  },

  /**
   * Delete single backup
   */
  deleteBackup(backupId: string): void {
    const list = this.getBackups().filter((b) => b.id !== backupId);
    this.saveBackups(list);
  },

  /**
   * Check & automatically trigger Daily Backup once per day
   */
  async checkAndRunAutomatedDailyBackup(): Promise<boolean> {
    const config = this.getConfig();
    if (!config.enabled) return false;

    const todayStr = new Date().toISOString().slice(0, 10);
    if (config.lastRunDate === todayStr) {
      // Today's backup was already completed
      return false;
    }

    try {
      console.log('Automated Daily Backup: Running snapshot for', todayStr);
      await this.runDailyBackup({ isManual: false });
      return true;
    } catch (err) {
      console.error('Automated daily backup run failed:', err);
      return false;
    }
  },

  /**
   * Cloud sync helper
   */
  async syncToCloud(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const config = this.getConfig();
      const backupsMeta = this.getBackups().map((b) => ({
        id: b.id,
        name: b.name,
        createdAt: b.createdAt,
        dateFormatted: b.dateFormatted,
        isAutomated: b.isAutomated,
        quotationsCount: b.quotationsCount,
        clientsCount: b.clientsCount,
        ledgerCount: b.ledgerCount,
        sizeBytes: b.sizeBytes,
      }));

      await supabase.from('company_settings').upsert({
        id: 'automated_backups_registry',
        profile: { config, backupsMeta },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Cloud backup registry sync notice:', e);
    }
  },

  async syncConfigToCloud(config: DailyBackupConfig): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.from('company_settings').upsert({
        id: 'daily_backup_settings',
        profile: config,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Cloud backup settings sync notice:', e);
    }
  },

  async loadFromCloud(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { data } = await supabase
        .from('company_settings')
        .select('profile')
        .eq('id', 'daily_backup_settings')
        .maybeSingle();

      if (data && data.profile) {
        const merged = { ...DEFAULT_BACKUP_CONFIG, ...data.profile };
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(merged));
      }
    } catch (e) {
      console.warn('Error loading backup settings from cloud:', e);
    }
  },
};
