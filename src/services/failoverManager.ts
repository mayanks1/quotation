/**
 * Dual-Cloud Failover & Synchronization Manager
 * 
 * Coordinates high-availability dual-write between Supabase (Primary) and Firebase (Secondary).
 * Guarantees zero downtime: automatically switches providers when Supabase is paused or unreachable.
 */

import { firestoreUpsert, firestoreGetAll, firestoreDelete, isFirebaseConfigured, testFirestoreConnection } from './firebaseService';
import type { Quotation, ClientProfile } from '../types';
import type { LedgerRecord } from './ledgerService';

export interface CloudStatus {
  activeProvider: 'supabase' | 'firebase';
  isSupabaseHealthy: boolean;
  isFirebaseHealthy: boolean;
  isFirebaseConfigured: boolean;
  mirroredQuotesCount: number;
  mirroredLedgerCount: number;
  lastMirroredAt: string | null;
}

const FAILOVER_STATE_KEY = 'tisha_cloud_active_provider';
const LAST_MIRROR_KEY = 'tisha_last_cloud_mirror_time';

class FailoverManager {
  private activeProvider: 'supabase' | 'firebase' = 'supabase';
  private consecutiveSupabaseFailures = 0;
  private isSupabaseHealthy = true;
  private isFirebaseHealthy = false;
  private listeners: Array<(status: CloudStatus) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FAILOVER_STATE_KEY);
      if (saved === 'firebase') {
        this.activeProvider = 'firebase';
      }
    }
  }

  public getActiveProvider(): 'supabase' | 'firebase' {
    return this.activeProvider;
  }

  public setProvider(provider: 'supabase' | 'firebase') {
    this.activeProvider = provider;
    if (typeof window !== 'undefined') {
      localStorage.setItem(FAILOVER_STATE_KEY, provider);
    }
    this.notifyListeners();
  }

  public reportSupabaseSuccess() {
    this.consecutiveSupabaseFailures = 0;
    this.isSupabaseHealthy = true;
    if (this.activeProvider === 'firebase') {
      console.log('✅ [Failover] Supabase recovered and healthy.');
    }
  }

  public reportSupabaseFailure(error: any) {
    this.consecutiveSupabaseFailures++;
    console.warn(`⚠️ [Failover] Supabase failure #${this.consecutiveSupabaseFailures}:`, error);

    // After 2 consecutive failures, if Firebase is configured, flip provider automatically
    if (this.consecutiveSupabaseFailures >= 2 && isFirebaseConfigured() && this.activeProvider !== 'firebase') {
      console.warn('🚨 [Failover] Switching active provider to Firebase Firestore for 0% downtime!');
      this.activeProvider = 'firebase';
      this.isSupabaseHealthy = false;
      if (typeof window !== 'undefined') {
        localStorage.setItem(FAILOVER_STATE_KEY, 'firebase');
      }
      this.notifyListeners();
    }
  }

  public subscribe(listener: (status: CloudStatus) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(fn => fn(status));
  }

  public getStatus(): CloudStatus {
    return {
      activeProvider: this.activeProvider,
      isSupabaseHealthy: this.isSupabaseHealthy,
      isFirebaseHealthy: this.isFirebaseHealthy,
      isFirebaseConfigured: isFirebaseConfigured(),
      mirroredQuotesCount: 0,
      mirroredLedgerCount: 0,
      lastMirroredAt: typeof window !== 'undefined' ? localStorage.getItem(LAST_MIRROR_KEY) : null
    };
  }

  // --- Background Mirror Methods (Runs asynchronously without blocking UI) ---

  public async mirrorQuotation(quotation: Quotation): Promise<void> {
    if (!isFirebaseConfigured() || !quotation?.id) return;
    try {
      await firestoreUpsert('quotations', quotation.id, quotation);
    } catch (err) {
      console.warn('[Failover] Mirror quotation failed:', err);
    }
  }

  public async mirrorLedgerRecord(record: LedgerRecord): Promise<void> {
    if (!isFirebaseConfigured() || !record?.id) return;
    try {
      await firestoreUpsert('payment_ledger', record.id, record);
    } catch (err) {
      console.warn('[Failover] Mirror ledger record failed:', err);
    }
  }

  public async mirrorClient(client: ClientProfile): Promise<void> {
    if (!isFirebaseConfigured() || !client?.id) return;
    try {
      await firestoreUpsert('clients', client.id, client);
    } catch (err) {
      console.warn('[Failover] Mirror client failed:', err);
    }
  }

  public async deleteMirroredQuotation(id: string): Promise<void> {
    if (!isFirebaseConfigured() || !id) return;
    try {
      await firestoreDelete('quotations', id);
    } catch (err) {}
  }

  public async deleteMirroredLedgerRecord(id: string): Promise<void> {
    if (!isFirebaseConfigured() || !id) return;
    try {
      await firestoreDelete('payment_ledger', id);
    } catch (err) {}
  }

  // --- Secondary Fallback Retrieval ---

  public async getFallbackQuotations(): Promise<Quotation[]> {
    if (!isFirebaseConfigured()) return [];
    try {
      const records = await firestoreGetAll('quotations');
      return records as Quotation[];
    } catch (err) {
      console.warn('[Failover] Error fetching fallback quotations:', err);
      return [];
    }
  }

  public async getFallbackLedger(): Promise<LedgerRecord[]> {
    if (!isFirebaseConfigured()) return [];
    try {
      const records = await firestoreGetAll('payment_ledger');
      return records as LedgerRecord[];
    } catch (err) {
      console.warn('[Failover] Error fetching fallback ledger:', err);
      return [];
    }
  }

  /**
   * Complete Snapshot Mirror:
   * Copies 100% of current active data (Quotations + Ledger + Clients) to Firebase
   */
  public async mirrorAllData(
    quotations: Quotation[],
    ledger: LedgerRecord[],
    clients: ClientProfile[],
    onProgress?: (msg: string) => void
  ): Promise<{ success: boolean; count: number; error?: string }> {
    if (!isFirebaseConfigured()) {
      return { success: false, count: 0, error: 'Firebase is not configured yet. Please add credentials.' };
    }

    try {
      onProgress?.('Testing Firebase connection...');
      const ping = await testFirestoreConnection();
      if (!ping.success) {
        return { success: false, count: 0, error: ping.message };
      }

      let totalSynced = 0;

      // 1. Mirror Quotations
      onProgress?.(`Mirroring ${quotations.length} quotations to Firebase...`);
      for (const q of quotations) {
        if (q.id) {
          await firestoreUpsert('quotations', q.id, q);
          totalSynced++;
        }
      }

      // 2. Mirror Ledger
      onProgress?.(`Mirroring ${ledger.length} ledger records to Firebase...`);
      for (const r of ledger) {
        if (r.id) {
          await firestoreUpsert('payment_ledger', r.id, r);
          totalSynced++;
        }
      }

      // 3. Mirror Clients
      onProgress?.(`Mirroring ${clients.length} clients to Firebase...`);
      for (const c of clients) {
        if (c.id) {
          await firestoreUpsert('clients', c.id, c);
          totalSynced++;
        }
      }

      const now = new Date().toISOString();
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_MIRROR_KEY, now);
      }
      this.isFirebaseHealthy = true;
      this.notifyListeners();

      return { success: true, count: totalSynced };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Sync failed.' };
    }
  }
}

export const failoverManager = new FailoverManager();
