/**
 * Dual-Cloud Failover & Synchronization Manager
 * 
 * Coordinates high-availability dual-write between Supabase and Firebase.
 * Provides configurable Primary Database selection with automatic Secondary background mirroring.
 * Includes automatic circuit breaker for zero downtime during cloud outages or pauses.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  firestoreUpsert, firestoreGetAll, firestoreDelete, isFirebaseConfigured, testFirestoreConnection,
  getFirebaseConfig, setFirebaseLocalConfig, saveFirebaseConfigToCloud, CLOUD_FAILOVER_CONFIG_ID, CloudFailoverConfigRecord
} from './firebaseService';
import type { Quotation, ClientProfile } from '../types/quotation';
import type { LedgerRecord } from './ledgerService';
import { toDbRow, fromDbRow } from './ledgerService';

export type DatabaseEngine = 'supabase' | 'firebase';

export interface CloudStatus {
  primaryEngine: DatabaseEngine;
  secondaryEngine: DatabaseEngine;
  activeProvider: DatabaseEngine;
  isSupabaseHealthy: boolean;
  isFirebaseHealthy: boolean;
  isSupabaseConfigured: boolean;
  isFirebaseConfigured: boolean;
  lastMirroredAt: string | null;
}

const PRIMARY_ENGINE_KEY = 'tisha_primary_database_engine';
const FAILOVER_STATE_KEY = 'tisha_cloud_active_provider';
const LAST_MIRROR_KEY = 'tisha_last_cloud_mirror_time';

class FailoverManager {
  private primaryEngine: DatabaseEngine = 'supabase';
  private activeProvider: DatabaseEngine = 'supabase';
  private consecutivePrimaryFailures = 0;
  private isSupabaseHealthy = true;
  private isFirebaseHealthy = false;
  private listeners: Array<(status: CloudStatus) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const savedPrimary = localStorage.getItem(PRIMARY_ENGINE_KEY) as DatabaseEngine;
      if (savedPrimary === 'firebase' || savedPrimary === 'supabase') {
        this.primaryEngine = savedPrimary;
      }
      const savedActive = localStorage.getItem(FAILOVER_STATE_KEY) as DatabaseEngine;
      if (savedActive === 'firebase' || savedActive === 'supabase') {
        this.activeProvider = savedActive;
      } else {
        this.activeProvider = this.primaryEngine;
      }
      // Initialize background cloud sync so mobile/laptop stay in sync
      this.syncWithCloud().catch(() => {});
    }
  }

  /**
   * Synchronize failover configuration and Firebase credentials with Supabase company_settings.
   * Ensures settings saved on desktop/laptop immediately propagate to mobile phones upon login.
   */
  public async syncWithCloud(): Promise<{ synced: boolean; source: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { synced: false, source: 'offline' };
    }

    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('profile')
        .eq('id', CLOUD_FAILOVER_CONFIG_ID)
        .maybeSingle();

      if (!error && data && data.profile) {
        const profile = data.profile as CloudFailoverConfigRecord;
        let stateChanged = false;

        if (profile.projectId && profile.apiKey) {
          setFirebaseLocalConfig(profile.apiKey, profile.projectId);
          stateChanged = true;
        }

        if (profile.primaryEngine && (profile.primaryEngine === 'supabase' || profile.primaryEngine === 'firebase')) {
          if (this.primaryEngine !== profile.primaryEngine) {
            this.primaryEngine = profile.primaryEngine;
            this.activeProvider = profile.primaryEngine;
            if (typeof window !== 'undefined') {
              localStorage.setItem(PRIMARY_ENGINE_KEY, profile.primaryEngine);
              localStorage.setItem(FAILOVER_STATE_KEY, profile.primaryEngine);
            }
            stateChanged = true;
          }
        }

        if (stateChanged) {
          this.notifyListeners();
        }
        return { synced: true, source: 'cloud' };
      } else {
        // Auto-migrate: If cloud row does not exist yet, but local storage on this machine has credentials,
        // automatically push them to Supabase company_settings so other devices (e.g. mobile) receive them!
        const localCfg = getFirebaseConfig();
        if (localCfg && localCfg.projectId && localCfg.apiKey) {
          await saveFirebaseConfigToCloud(localCfg, this.primaryEngine, 'Auto-Migrate');
          return { synced: true, source: 'pushed-local' };
        }
      }
    } catch (err) {
      console.warn('[FailoverManager] Cloud sync notice:', err);
    }

    return { synced: false, source: 'none' };
  }

  // --- Engine Preferences ---

  public getPrimaryEngine(): DatabaseEngine {
    return this.primaryEngine;
  }

  public getSecondaryEngine(): DatabaseEngine {
    return this.primaryEngine === 'supabase' ? 'firebase' : 'supabase';
  }

  public getActiveProvider(): DatabaseEngine {
    return this.activeProvider;
  }

  /**
   * Set user's chosen Primary Database engine.
   * Enforces that Firebase credentials must exist before switching Firebase to Primary.
   */
  public setPrimaryEngine(engine: DatabaseEngine): { success: boolean; error?: string } {
    if (engine === 'firebase' && !isFirebaseConfigured()) {
      return {
        success: false,
        error: 'Cannot set Firebase as Primary: Please configure your Firebase Project ID and Web API Key first.'
      };
    }

    if (engine === 'supabase' && !isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Cannot set Supabase as Primary: Supabase environment credentials are not detected.'
      };
    }

    this.primaryEngine = engine;
    this.activeProvider = engine;
    this.consecutivePrimaryFailures = 0;

    if (typeof window !== 'undefined') {
      localStorage.setItem(PRIMARY_ENGINE_KEY, engine);
      localStorage.setItem(FAILOVER_STATE_KEY, engine);
    }

    // Persist to Supabase cloud company_settings so mobile receives new engine selection
    const cfg = getFirebaseConfig();
    if (cfg && isSupabaseConfigured() && supabase) {
      saveFirebaseConfigToCloud(cfg, engine, 'Super Admin').catch(e => console.warn('Cloud engine sync:', e));
    }

    this.notifyListeners();
    console.log(`🔄 [FailoverManager] Primary Database set to "${engine.toUpperCase()}". Secondary Mirror is "${this.getSecondaryEngine().toUpperCase()}".`);
    return { success: true };
  }

  /**
   * Save Firebase credentials to local storage and sync to Supabase company_settings.
   */
  public async saveCredentials(projectId: string, apiKey: string, updatedBy?: string): Promise<{ success: boolean; error?: string }> {
    const cleanId = projectId.trim();
    const cleanKey = apiKey.trim();
    if (!cleanId || !cleanKey) {
      return { success: false, error: 'Firebase Project ID and Web API Key are required.' };
    }

    const res = await saveFirebaseConfigToCloud(
      { projectId: cleanId, apiKey: cleanKey },
      this.primaryEngine,
      updatedBy || 'Super Admin'
    );

    if (res.success) {
      this.notifyListeners();
    }
    return res;
  }

  public reportPrimarySuccess() {
    this.consecutivePrimaryFailures = 0;
    if (this.primaryEngine === 'supabase') {
      this.isSupabaseHealthy = true;
    } else {
      this.isFirebaseHealthy = true;
    }
  }

  public reportPrimaryFailure(error: any) {
    this.consecutivePrimaryFailures++;
    console.warn(`⚠️ [Failover] Primary (${this.primaryEngine}) failure #${this.consecutivePrimaryFailures}:`, error);

    const secondary = this.getSecondaryEngine();
    const isSecondaryReady = secondary === 'firebase' ? isFirebaseConfigured() : isSupabaseConfigured();

    // After 2 consecutive failures on primary, flip active provider to secondary
    if (this.consecutivePrimaryFailures >= 2 && isSecondaryReady && this.activeProvider !== secondary) {
      console.warn(`🚨 [Failover] Auto-switching active provider to ${secondary.toUpperCase()} for 0% downtime!`);
      this.activeProvider = secondary;
      if (this.primaryEngine === 'supabase') {
        this.isSupabaseHealthy = false;
      } else {
        this.isFirebaseHealthy = false;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(FAILOVER_STATE_KEY, secondary);
      }
      this.notifyListeners();
    }
  }

  // Backward compatible aliases
  public reportSupabaseSuccess() {
    this.isSupabaseHealthy = true;
    if (this.primaryEngine === 'supabase') this.reportPrimarySuccess();
  }

  public reportSupabaseFailure(err: any) {
    if (this.primaryEngine === 'supabase') {
      this.reportPrimaryFailure(err);
    } else {
      this.isSupabaseHealthy = false;
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
      primaryEngine: this.primaryEngine,
      secondaryEngine: this.getSecondaryEngine(),
      activeProvider: this.activeProvider,
      isSupabaseHealthy: this.isSupabaseHealthy,
      isFirebaseHealthy: this.isFirebaseHealthy,
      isSupabaseConfigured: isSupabaseConfigured(),
      isFirebaseConfigured: isFirebaseConfigured(),
      lastMirroredAt: typeof window !== 'undefined' ? localStorage.getItem(LAST_MIRROR_KEY) : null
    };
  }

  // --- Dynamic Dual-Write & Mirroring ---

  /**
   * Mirror a quotation into whichever engine is currently designated as Secondary.
   */
  public async mirrorQuotation(quotation: Quotation): Promise<void> {
    if (!quotation?.id) return;
    const secondary = this.getSecondaryEngine();

    if (secondary === 'firebase') {
      if (isFirebaseConfigured()) {
        try {
          await firestoreUpsert('quotations', quotation.id, quotation);
        } catch (err) {
          console.warn('[Failover] Firebase mirror quotation failed:', err);
        }
      }
    } else {
      // Secondary is Supabase
      if (isSupabaseConfigured() && supabase) {
        try {
          const activeOrgId = quotation.organizationId || (typeof window !== 'undefined' ? localStorage.getItem('tisha_active_org_id') || 'org_tisha_main' : 'org_tisha_main');
          const companyPayload = quotation.company && quotation.company.name ? quotation.company : { name: 'Tisha LED Walls' };
          const row = {
            id: quotation.id,
            quotation_number: quotation.quotationNumber,
            quotation_date: quotation.quotationDate,
            valid_until: quotation.validUntil,
            event_date: quotation.eventDate || null,
            venue: quotation.venue || null,
            status: quotation.status,
            document_type: quotation.documentType || 'quotation',
            invoice_number: quotation.invoiceNumber || null,
            invoice_date: quotation.invoiceDate || null,
            company: companyPayload,
            client: quotation.client,
            line_items: quotation.lineItems || [],
            discount_amount: quotation.discountAmount || 0,
            tax_scheme: quotation.taxScheme || 'cgst_sgst',
            tax_rate: quotation.taxRate || 18,
            shipping_charges: quotation.shippingCharges || 0,
            notes: quotation.notes || null,
            payment_terms: quotation.paymentTerms || null,
            organization_id: activeOrgId,
            is_deleted: Boolean(quotation.isDeleted),
            deleted_at: quotation.deletedAt || null,
            updated_at: quotation.updatedAt || new Date().toISOString()
          };
          await supabase.from('quotations').upsert(row);
        } catch (err) {
          console.warn('[Failover] Supabase mirror quotation failed:', err);
        }
      }
    }
  }

  /**
   * Mirror a payment ledger record into whichever engine is currently designated as Secondary.
   */
  public async mirrorLedgerRecord(record: LedgerRecord): Promise<void> {
    if (!record?.id) return;
    const secondary = this.getSecondaryEngine();

    if (secondary === 'firebase') {
      if (isFirebaseConfigured()) {
        try {
          await firestoreUpsert('payment_ledger', record.id, record);
        } catch (err) {
          console.warn('[Failover] Firebase mirror ledger failed:', err);
        }
      }
    } else {
      // Secondary is Supabase
      if (isSupabaseConfigured() && supabase) {
        try {
          const row = toDbRow(record as any);
          await supabase.from('payment_ledger').upsert(row);
        } catch (err) {
          console.warn('[Failover] Supabase mirror ledger failed:', err);
        }
      }
    }
  }

  /**
   * Mirror a client into whichever engine is currently designated as Secondary.
   */
  public async mirrorClient(client: ClientProfile): Promise<void> {
    if (!client?.id && !client?.name) return;
    const secondary = this.getSecondaryEngine();

    if (secondary === 'firebase') {
      if (isFirebaseConfigured()) {
        const id = client.id || `client-${Date.now()}`;
        try {
          await firestoreUpsert('clients', id, { ...client, id });
        } catch (err) {
          console.warn('[Failover] Firebase mirror client failed:', err);
        }
      }
    } else {
      // Secondary is Supabase
      if (isSupabaseConfigured() && supabase) {
        try {
          const row = {
            id: client.id || `client-${Date.now()}`,
            name: client.name,
            company: client.company || null,
            address: client.address || null,
            phone: client.phone || null,
            email: client.email || null,
            gstin: client.gstin || null,
            updated_at: new Date().toISOString()
          };
          await supabase.from('clients').upsert(row);
        } catch (err) {
          console.warn('[Failover] Supabase mirror client failed:', err);
        }
      }
    }
  }

  public async deleteMirroredQuotation(id: string): Promise<void> {
    if (!id) return;
    const secondary = this.getSecondaryEngine();
    if (secondary === 'firebase') {
      if (isFirebaseConfigured()) firestoreDelete('quotations', id).catch(() => {});
    } else {
      if (isSupabaseConfigured() && supabase) supabase.from('quotations').delete().eq('id', id).then();
    }
  }

  public async deleteMirroredLedgerRecord(id: string): Promise<void> {
    if (!id) return;
    const secondary = this.getSecondaryEngine();
    if (secondary === 'firebase') {
      if (isFirebaseConfigured()) firestoreDelete('payment_ledger', id).catch(() => {});
    } else {
      if (isSupabaseConfigured() && supabase) supabase.from('payment_ledger').delete().eq('id', id).then();
    }
  }

  // --- Secondary Fallback Retrieval ---

  public async getFallbackQuotations(): Promise<Quotation[]> {
    const secondary = this.getSecondaryEngine();
    if (secondary === 'firebase') {
      if (!isFirebaseConfigured()) return [];
      try {
        const records = await firestoreGetAll('quotations');
        return (records as any[]).map((r: any) => ({
          ...r,
          isDeleted: Boolean(r.isDeleted ?? r.is_deleted ?? r.client?.isDeleted),
          deletedAt: r.deletedAt || r.deleted_at || r.client?.deletedAt || undefined,
        })) as Quotation[];
      } catch (err) {
        console.warn('[Failover] Error fetching fallback quotations from Firebase:', err);
        return [];
      }
    } else {
      // Secondary is Supabase
      if (!isSupabaseConfigured() || !supabase) return [];
      try {
        const { data, error } = await supabase.from('quotations').select('*').order('updated_at', { ascending: false });
        if (error || !data) return [];
        return data.map((row: any) => ({
          id: row.id,
          organizationId: row.organization_id || 'org_tisha_main',
          quotationNumber: row.quotation_number,
          quotationDate: row.quotation_date,
          validUntil: row.valid_until,
          eventDate: row.event_date || undefined,
          venue: row.venue || undefined,
          status: row.status,
          documentType: row.document_type || 'quotation',
          invoiceNumber: row.invoice_number || undefined,
          invoiceDate: row.invoice_date || undefined,
          company: row.company,
          client: row.client,
          lineItems: row.line_items || [],
          discountAmount: Number(row.discount_amount || 0),
          taxScheme: row.tax_scheme,
          taxRate: Number(row.tax_rate || 18),
          shippingCharges: Number(row.shipping_charges || 0),
          notes: row.notes || '',
          paymentTerms: row.payment_terms || '',
          isDeleted: Boolean(row.is_deleted ?? row.client?.isDeleted),
          deletedAt: row.deleted_at || row.client?.deletedAt || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })) as Quotation[];
      } catch (err) {
        console.warn('[Failover] Error fetching fallback quotations from Supabase:', err);
        return [];
      }
    }
  }

  public async getFallbackLedger(): Promise<LedgerRecord[]> {
    const secondary = this.getSecondaryEngine();
    if (secondary === 'firebase') {
      if (!isFirebaseConfigured()) return [];
      try {
        const records = await firestoreGetAll('payment_ledger');
        return records.map((r: any, i: number) => fromDbRow(r, i));
      } catch (err) {
        console.warn('[Failover] Error fetching fallback ledger from Firebase:', err);
        return [];
      }
    } else {
      // Secondary is Supabase
      if (!isSupabaseConfigured() || !supabase) return [];
      try {
        const { data, error } = await supabase.from('payment_ledger').select('*').order('date', { ascending: false });
        if (error || !data) return [];
        return data.map((r, i) => fromDbRow(r, i));
      } catch (err) {
        console.warn('[Failover] Error fetching fallback ledger from Supabase:', err);
        return [];
      }
    }
  }

  /**
   * Complete Bi-Directional Snapshot Reconcile:
   * Mirrors 100% of current active data (Quotations + Ledger + Clients) from Primary ➔ Secondary
   */
  public async reconcileDatabases(
    quotations: Quotation[],
    ledger: LedgerRecord[],
    clients: ClientProfile[],
    onProgress?: (msg: string) => void
  ): Promise<{ success: boolean; count: number; error?: string }> {
    const targetSecondary = this.getSecondaryEngine();

    if (targetSecondary === 'firebase' && !isFirebaseConfigured()) {
      return { success: false, count: 0, error: 'Firebase is not configured yet. Please enter your Firebase credentials.' };
    }
    if (targetSecondary === 'supabase' && (!isSupabaseConfigured() || !supabase)) {
      return { success: false, count: 0, error: 'Supabase is not configured yet.' };
    }

    try {
      onProgress?.(`Verifying connection to secondary cloud (${targetSecondary.toUpperCase()})...`);
      if (targetSecondary === 'firebase') {
        const ping = await testFirestoreConnection();
        if (!ping.success) return { success: false, count: 0, error: ping.message };
      }

      let totalSynced = 0;

      // 1. Mirror Quotations
      onProgress?.(`Replicating ${quotations.length} quotations to ${targetSecondary.toUpperCase()}...`);
      for (const q of quotations) {
        if (q.id) {
          await this.mirrorQuotation(q);
          totalSynced++;
        }
      }

      // 2. Mirror Ledger
      onProgress?.(`Replicating ${ledger.length} ledger records to ${targetSecondary.toUpperCase()}...`);
      for (const r of ledger) {
        if (r.id) {
          await this.mirrorLedgerRecord(r);
          totalSynced++;
        }
      }

      // 3. Mirror Clients
      onProgress?.(`Replicating ${clients.length} clients to ${targetSecondary.toUpperCase()}...`);
      for (const c of clients) {
        if (c.id) {
          await this.mirrorClient(c);
          totalSynced++;
        }
      }

      const now = new Date().toISOString();
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_MIRROR_KEY, now);
      }

      if (targetSecondary === 'firebase') this.isFirebaseHealthy = true;
      if (targetSecondary === 'supabase') this.isSupabaseHealthy = true;
      this.notifyListeners();

      return { success: true, count: totalSynced };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Sync failed.' };
    }
  }

  // Alias for backward compatibility
  public async mirrorAllData(
    quotations: Quotation[],
    ledger: LedgerRecord[],
    clients: ClientProfile[],
    onProgress?: (msg: string) => void
  ) {
    return this.reconcileDatabases(quotations, ledger, clients, onProgress);
  }
}

export const failoverManager = new FailoverManager();
