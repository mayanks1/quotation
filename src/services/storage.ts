import { Quotation, CompanyProfile, ClientProfile, LineItem, CatalogItem } from '../types/quotation';
import { DEFAULT_COMPANY, DEFAULT_TERMS_AND_CONDITIONS, DEFAULT_PAYMENT_TERMS, CATALOG_PRESETS } from '../config/defaults';
import { idb } from './indexedDb';
import { cloudSync } from './cloudSync';
import { syncInvoicedQuotation, handleQuotationDeleted } from './ledgerService';

const STORAGE_KEYS = {
  ACTIVE_QUOTATION_ID: 'tisha_active_quotation_id_v2',
  MIGRATED_TO_IDB: 'tisha_migrated_to_idb_v1',
  LEGACY_QUOTATIONS: 'tisha_quotations_v2',
  LEGACY_COMPANY: 'tisha_company_profile_v2',
  LEGACY_CLIENTS: 'tisha_clients_v2',
  AUTO_LEDGER_SYNC: 'tisha_auto_ledger_sync_v1',
};

export const normalizeCompany = (raw: any): CompanyProfile => {
  if (!raw || typeof raw !== 'object') return DEFAULT_COMPANY;
  const isBrokenSig = typeof raw.signature === 'string' && raw.signature.startsWith('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NjAgMjUwIiB3aWR0aD0iNDYwIiBoZWlnaHQ9IjI1MCI+CiAgPGRlZnM+');
  return {
    ...DEFAULT_COMPANY,
    ...raw,
    signature: isBrokenSig ? DEFAULT_COMPANY.signature : (raw.signature !== undefined ? raw.signature : DEFAULT_COMPANY.signature),
    bankDetails: {
      ...DEFAULT_COMPANY.bankDetails,
      ...(raw.bankDetails || {}),
    },
  };
};

const loadInitialCompany = (): CompanyProfile => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEGACY_COMPANY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.name || parsed.address)) return normalizeCompany(parsed);
    }
  } catch (e) {}
  return DEFAULT_COMPANY;
};

// In-memory cache for immediate zero-latency UI rendering
let memoryQuotations: Quotation[] = [];
let memoryClients: ClientProfile[] = [];
let memoryCompany: CompanyProfile = loadInitialCompany();
let memoryCustomCatalog: CatalogItem[] = [];
let isInitialized = false;

export const formatDateDMY = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const generateQuotationNumber = (sequence?: number): string => {
  const date = new Date();
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const rand = sequence !== undefined ? String(sequence).padStart(3, '0') : Math.floor(100 + Math.random() * 900).toString();
  return `TLW-${year}${month}-${rand}`;
};

export const createBlankQuotation = (companyProfile: CompanyProfile, organizationId?: string): Quotation => {
  const now = new Date();
  const valid = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const activeOrgId = organizationId || (typeof window !== 'undefined' ? localStorage.getItem('tisha_active_org_id') || 'org_tisha_main' : 'org_tisha_main');
  const initialItems: LineItem[] = [
    {
      id: `item-${Date.now()}-1`,
      description: '',
      quantity: 1,
      amount: 0,
      rate: 0,
      unit: '',
      hsnSac: '9973',
    },
  ];

  return {
    id: `quote-${Date.now()}`,
    quotationNumber: generateQuotationNumber(),
    quotationDate: formatDateDMY(now),
    validUntil: formatDateDMY(valid),
    venue: '',
    status: 'draft',
    organizationId: activeOrgId,
    company: companyProfile,
    client: {
      name: '',
      company: '',
      address: '',
      email: '',
      phone: '',
      gstin: '',
      organizationId: activeOrgId,
    },
    lineItems: initialItems,
    discountAmount: 0,
    taxScheme: 'cgst_sgst',
    taxRate: 18,
    shippingCharges: 0,
    notes: DEFAULT_TERMS_AND_CONDITIONS,
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const storage = {
  // Initialize storage: Migrates legacy localStorage into IndexedDB, then pulls cloud if available
  async initialize(): Promise<{
    quotations: Quotation[];
    clients: ClientProfile[];
    company: CompanyProfile;
  }> {
    if (isInitialized) {
      return {
        quotations: storage.getAllQuotations(),
        clients: memoryClients,
        company: memoryCompany,
      };
    }

    try {
      // 1. One-time migration from legacy localStorage to IndexedDB
      const migrated = localStorage.getItem(STORAGE_KEYS.MIGRATED_TO_IDB);
      if (!migrated) {
        try {
          const legacyQuotes = localStorage.getItem(STORAGE_KEYS.LEGACY_QUOTATIONS);
          if (legacyQuotes) {
            const parsed = JSON.parse(legacyQuotes);
            if (Array.isArray(parsed)) {
              for (const q of parsed) await idb.saveQuotation(q);
            }
          }

          const legacyClients = localStorage.getItem(STORAGE_KEYS.LEGACY_CLIENTS);
          if (legacyClients) {
            const parsed = JSON.parse(legacyClients);
            if (Array.isArray(parsed)) {
              for (const c of parsed) await idb.saveClient(c);
            }
          }

          const legacyComp = localStorage.getItem(STORAGE_KEYS.LEGACY_COMPANY);
          if (legacyComp) {
            await idb.saveSetting('company_profile', JSON.parse(legacyComp));
          }

          localStorage.setItem(STORAGE_KEYS.MIGRATED_TO_IDB, 'true');
        } catch (e) {
          console.warn('Legacy migration notice:', e);
        }
      }

      // 2. Load from IndexedDB
      const [idbQuotes, idbClients, idbCompany, idbCatalog] = await Promise.all([
        idb.getAllQuotations(),
        idb.getAllClients(),
        idb.getSetting<CompanyProfile>('company_profile'),
        idb.getSetting<CatalogItem[]>('custom_catalog_items'),
      ]);

      memoryQuotations = idbQuotes;
      memoryClients = idbClients;
      memoryCompany = normalizeCompany(idbCompany);
      if (Array.isArray(idbCatalog) && idbCatalog.length > 0) {
        // Merge any new default presets that don't exist yet in the stored catalog
        const existingIds = new Set(idbCatalog.map((c) => c.id));
        const missingPresets = CATALOG_PRESETS.filter((p) => !existingIds.has(p.id));
        memoryCustomCatalog = [...idbCatalog, ...missingPresets];
      } else {
        memoryCustomCatalog = [...CATALOG_PRESETS];
      }

      // 3. Cloud sync: pull from cloud if available
      if (cloudSync.isEnabled()) {
        try {
          const cloudData = await cloudSync.pullAllFromCloud();
          if (cloudData) {
            if (cloudData.quotations && Array.isArray(cloudData.quotations)) {
              memoryQuotations = cloudData.quotations;
            }
            if (cloudData.clients && Array.isArray(cloudData.clients)) {
              memoryClients = cloudData.clients;
            }
            if (cloudData.company) {
              memoryCompany = normalizeCompany(cloudData.company);
            }
          }
          const cloudCatalog = await cloudSync.pullCatalogFromCloud();
          if (cloudCatalog && Array.isArray(cloudCatalog) && cloudCatalog.length > 0) {
            // Merge with local presets if any are missing
            const existingIds = new Set(cloudCatalog.map((c) => c.id));
            const missingPresets = CATALOG_PRESETS.filter((p) => !existingIds.has(p.id));
            memoryCustomCatalog = [...cloudCatalog, ...missingPresets];
            await idb.saveSetting('custom_catalog_items', memoryCustomCatalog);
          }
        } catch (e) {
          console.warn('Cloud sync pull notice:', e);
        }
      }

      // Auto-harvest clients from existing quotations so they are always available
      const existingNames = new Set(memoryClients.map((c) => (c.name || '').toLowerCase().trim()));
      for (const q of memoryQuotations) {
        if (q.isDeleted) continue;
        const clientName = (q.client?.name || '').trim();
        const norm = clientName.toLowerCase();
        if (clientName && norm !== 'event organizer / client name' && !existingNames.has(norm)) {
          existingNames.add(norm);
          const newClient: ClientProfile = {
            id: `client-q-${q.id}`,
            name: q.client.name,
            company: q.client.company || '',
            address: q.client.address || '',
            phone: q.client.phone || '',
            email: q.client.email || '',
            gstin: q.client.gstin || '',
          };
          memoryClients.push(newClient);
          idb.saveClient(newClient).catch(console.error);
        }
      }

      isInitialized = true;
      storage.purgeExpiredTrash();
    } catch (err) {
      console.error('IndexedDB initialization failed, falling back:', err);
    }

    return {
      quotations: storage.getAllQuotations(),
      clients: storage.getAllClients(),
      company: memoryCompany,
    };
  },

  getCompanyProfile(): CompanyProfile {
    if (memoryCompany && (memoryCompany.name || memoryCompany.address)) {
      return normalizeCompany(memoryCompany);
    }
    const fallback = loadInitialCompany();
    if (fallback) {
      memoryCompany = fallback;
      return fallback;
    }
    return DEFAULT_COMPANY;
  },

  async saveCompanyProfile(profile: CompanyProfile): Promise<void> {
    memoryCompany = profile;
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEYS.LEGACY_COMPANY, JSON.stringify(profile));
      localStorage.setItem('tisha_company_profile_updated_at', nowIso);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    try {
      await idb.saveSetting('company_profile', profile);
    } catch (e) {
      console.error('IndexedDB saveSetting error:', e);
    }

    if (cloudSync.isEnabled()) {
      try {
        await cloudSync.syncCompanyProfile(profile);
      } catch (e) {
        console.error('Cloud company profile sync error:', e);
      }
    }
  },

  purgeExpiredTrash(): void {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const expiredIds: string[] = [];

    memoryQuotations = memoryQuotations.filter((q) => {
      if (q.isDeleted && q.deletedAt) {
        const deletedTime = new Date(q.deletedAt).getTime();
        if (now - deletedTime > THIRTY_DAYS_MS) {
          expiredIds.push(q.id);
          return false;
        }
      }
      return true;
    });

    for (const id of expiredIds) {
      idb.deleteQuotation(id).catch(console.error);
      cloudSync.deleteQuotation(id).catch(console.error);
    }
  },

  isInitialized(): boolean {
    return isInitialized;
  },

  getQuotationById(id: string, includeDeleted = true): Quotation | undefined {
    return memoryQuotations.find((q) => q.id === id && (includeDeleted || !q.isDeleted));
  },

  getAllQuotations(includeDeleted = false, organizationId?: string): Quotation[] {
    let list = includeDeleted ? memoryQuotations : memoryQuotations.filter((q) => !q.isDeleted);
    if (organizationId && organizationId !== 'all') {
      list = list.filter((q) => q.organizationId === organizationId || (!q.organizationId && organizationId === 'org_tisha_main'));
    }
    return list;
  },

  saveQuotation(quotation: Quotation): void {
    const activeOrgId = quotation.organizationId || (typeof window !== 'undefined' ? localStorage.getItem('tisha_active_org_id') || 'org_tisha_main' : 'org_tisha_main');
    const updated = { 
      ...quotation, 
      organizationId: activeOrgId,
      updatedAt: new Date().toISOString() 
    };
    const existingIdx = memoryQuotations.findIndex((q) => q.id === quotation.id);

    if (existingIdx >= 0) {
      memoryQuotations[existingIdx] = updated;
    } else {
      memoryQuotations = [updated, ...memoryQuotations];
    }

    localStorage.setItem(STORAGE_KEYS.ACTIVE_QUOTATION_ID, quotation.id);

    // Async persist to IndexedDB
    idb.saveQuotation(updated).catch(console.error);

    // Background cloud sync
    cloudSync.syncQuotation(updated).catch(console.error);

    // Auto-create / update entry in Payment Ledger ONLY if quotation is Invoiced AND auto-sync is enabled
    if (storage.isAutoLedgerSyncEnabled() && (updated.status === 'invoiced' || updated.documentType === 'invoice' || Boolean(updated.invoiceNumber))) {
      syncInvoicedQuotation(updated).catch(console.error);
    }

    // Auto-save client profile when quotation has client name
    if (quotation.client?.name) {
      const clientName = quotation.client.name.trim();
      if (clientName && clientName.toLowerCase() !== 'event organizer / client name') {
        storage.saveClient({
          name: quotation.client.name,
          company: quotation.client.company || '',
          address: quotation.client.address || '',
          phone: quotation.client.phone || '',
          email: quotation.client.email || '',
          gstin: quotation.client.gstin || '',
        });
      }
    }
  },

  getTrashedQuotations(): Quotation[] {
    return memoryQuotations.filter((q) => Boolean(q.isDeleted));
  },

  moveToTrash(id: string): Quotation | null {
    const existing = memoryQuotations.find((q) => q.id === id);
    if (!existing) return null;

    const trashed: Quotation = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryQuotations = memoryQuotations.map((q) => (q.id === id ? trashed : q));

    if (storage.getActiveQuotationId() === id) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_QUOTATION_ID);
    }

    idb.saveQuotation(trashed).catch(console.error);
    cloudSync.syncQuotation(trashed).catch(console.error);
    handleQuotationDeleted(id).catch(console.error);
    return trashed;
  },

  restoreFromTrash(id: string): Quotation | null {
    const existing = memoryQuotations.find((q) => q.id === id);
    if (!existing) return null;

    const restored: Quotation = {
      ...existing,
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: new Date().toISOString(),
    };

    memoryQuotations = memoryQuotations.map((q) => (q.id === id ? restored : q));
    idb.saveQuotation(restored).catch(console.error);
    cloudSync.syncQuotation(restored).catch(console.error);
    if (storage.isAutoLedgerSyncEnabled() && (restored.status === 'invoiced' || restored.documentType === 'invoice' || Boolean(restored.invoiceNumber))) {
      syncInvoicedQuotation(restored).catch(console.error);
    }
    return restored;
  },

  permanentlyDelete(id: string): void {
    memoryQuotations = memoryQuotations.filter((q) => q.id !== id);
    if (storage.getActiveQuotationId() === id) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_QUOTATION_ID);
    }

    idb.deleteQuotation(id).catch(console.error);
    cloudSync.deleteQuotation(id).catch(console.error);
    handleQuotationDeleted(id).catch(console.error);
  },

  emptyTrash(): void {
    const trashed = memoryQuotations.filter((q) => q.isDeleted);
    memoryQuotations = memoryQuotations.filter((q) => !q.isDeleted);
    for (const q of trashed) {
      idb.deleteQuotation(q.id).catch(console.error);
      cloudSync.deleteQuotation(q.id).catch(console.error);
    }
  },

  deleteQuotation(id: string): void {
    // Default deletion moves to 30-day trash for safety
    storage.moveToTrash(id);
  },

  duplicateQuotation(source: Quotation): Quotation {
    const clone: Quotation = {
      ...source,
      id: `quote-${Date.now()}`,
      quotationNumber: generateQuotationNumber(),
      quotationDate: formatDateDMY(new Date()),
      validUntil: formatDateDMY(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lineItems: source.lineItems.map((item) => ({
        ...item,
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      })),
    };

    storage.saveQuotation(clone);
    return clone;
  },

  getActiveQuotationId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_QUOTATION_ID);
  },

  setActiveQuotationId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_QUOTATION_ID, id);
  },

  deduplicateClients(): ClientProfile[] {
    const seen = new Map<string, ClientProfile>();
    const duplicateIds: string[] = [];

    for (const c of memoryClients) {
      const norm = (c.name || '').toLowerCase().trim();
      // Filter out empty or default placeholder
      if (!norm || norm === 'event organizer / client name') {
        if (c.id) duplicateIds.push(c.id);
        continue;
      }

      if (!seen.has(norm)) {
        seen.set(norm, c);
      } else {
        const existing = seen.get(norm)!;
        if (c.id && c.id !== existing.id) {
          duplicateIds.push(c.id);
        }
      }
    }

    const deduplicated = Array.from(seen.values());
    memoryClients = deduplicated;

    // Prune redundant duplicate IDs from IndexedDB and Supabase in background
    if (duplicateIds.length > 0) {
      for (const id of duplicateIds) {
        idb.deleteClient(id).catch(console.error);
        cloudSync.deleteClient(id).catch(console.error);
      }
    }

    return deduplicated;
  },

  getAllClients(organizationId?: string): ClientProfile[] {
    let clients = storage.deduplicateClients();
    if (clients.length === 0 && memoryQuotations.length > 0) {
      const seen = new Set<string>();
      for (const q of memoryQuotations) {
        const name = (q.client?.name || '').trim();
        const norm = name.toLowerCase();
        if (name && norm !== 'event organizer / client name' && !seen.has(norm)) {
          seen.add(norm);
          const c: ClientProfile = {
            id: `client-${q.id}`,
            name: q.client.name,
            company: q.client.company || '',
            address: q.client.address || '',
            phone: q.client.phone || '',
            email: q.client.email || '',
            gstin: q.client.gstin || '',
            organizationId: q.organizationId || 'org_tisha_main',
          };
          memoryClients.push(c);
          clients.push(c);
          idb.saveClient(c).catch(console.error);
        }
      }
    }
    if (organizationId && organizationId !== 'all') {
      clients = clients.filter((c) => c.organizationId === organizationId || (!c.organizationId && organizationId === 'org_tisha_main'));
    }
    return clients;
  },

  saveClient(client: ClientProfile): void {
    if (!client.name || !client.name.trim()) return;
    const norm = client.name.toLowerCase().trim();
    if (norm === 'event organizer / client name') return;

    const activeOrgId = client.organizationId || (typeof window !== 'undefined' ? localStorage.getItem('tisha_active_org_id') || 'org_tisha_main' : 'org_tisha_main');

    const existingIdx = memoryClients.findIndex(
      (c) => (client.id && c.id === client.id) || c.name.toLowerCase().trim() === norm
    );

    const clientWithId: ClientProfile = {
      ...client,
      organizationId: activeOrgId,
      id: client.id || (existingIdx >= 0 && memoryClients[existingIdx].id ? memoryClients[existingIdx].id : `client-${Date.now()}`),
    };

    if (existingIdx >= 0) {
      memoryClients[existingIdx] = { ...memoryClients[existingIdx], ...clientWithId };
    } else {
      memoryClients = [clientWithId, ...memoryClients];
    }

    storage.deduplicateClients();
    idb.saveClient(clientWithId).catch(console.error);
    cloudSync.syncClient(clientWithId).catch(console.error);
  },

  deleteClient(idOrName: string): void {
    const found = memoryClients.find(
      (c) => c.id === idOrName || c.name.toLowerCase() === idOrName.toLowerCase()
    );
    memoryClients = memoryClients.filter(
      (c) => c.id !== idOrName && c.name.toLowerCase() !== idOrName.toLowerCase()
    );

    // 1. Delete from IndexedDB
    idb.deleteClient(idOrName).catch(console.error);
    if (found?.id && found.id !== idOrName) {
      idb.deleteClient(found.id).catch(console.error);
    }
    if (found?.name && found.name !== idOrName) {
      idb.deleteClient(found.name).catch(console.error);
    }

    // 2. Delete from Cloud Supabase
    cloudSync.deleteClient(idOrName).catch(console.error);
    if (found?.id && found.id !== idOrName) {
      cloudSync.deleteClient(found.id).catch(console.error);
    }
    if (found?.name && found.name !== idOrName) {
      cloudSync.deleteClient(found.name).catch(console.error);
    }
  },

  getAllCatalogItems(): CatalogItem[] {
    if (memoryCustomCatalog.length === 0) {
      return [...CATALOG_PRESETS];
    }
    return memoryCustomCatalog;
  },

  saveCatalogItem(item: CatalogItem): void {
    const itemWithId: CatalogItem = {
      ...item,
      id: item.id || `custom-cat-${Date.now()}`,
    };

    const existingIdx = memoryCustomCatalog.findIndex((c) => c.id === itemWithId.id);
    if (existingIdx >= 0) {
      memoryCustomCatalog[existingIdx] = itemWithId;
    } else {
      memoryCustomCatalog = [itemWithId, ...memoryCustomCatalog];
    }

    idb.saveSetting('custom_catalog_items', memoryCustomCatalog).catch(console.error);
    cloudSync.syncCatalogItems(memoryCustomCatalog).catch(console.error);
  },

  deleteCatalogItem(id: string): void {
    memoryCustomCatalog = memoryCustomCatalog.filter((c) => c.id !== id);
    idb.saveSetting('custom_catalog_items', memoryCustomCatalog).catch(console.error);
    cloudSync.syncCatalogItems(memoryCustomCatalog).catch(console.error);
  },

  resetCatalogToDefaults(): CatalogItem[] {
    memoryCustomCatalog = [...CATALOG_PRESETS];
    idb.saveSetting('custom_catalog_items', memoryCustomCatalog).catch(console.error);
    cloudSync.syncCatalogItems(memoryCustomCatalog).catch(console.error);
    return memoryCustomCatalog;
  },

  // 1-Click Backup Export
  async exportBackup(): Promise<void> {
    const jsonStr = await idb.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tisha_led_quotations_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // 1-Click Backup Import / Restore
  async importBackup(file: File): Promise<{ quotationsCount: number; clientsCount: number }> {
    const text = await file.text();
    const result = await idb.importFullBackup(text);
    await storage.reloadFromIndexedDb();
    if (cloudSync.isEnabled()) {
      cloudSync.pullAllFromCloud().catch(console.warn);
    }
    return result;
  },

  async reloadFromIndexedDb(): Promise<void> {
    const [quotes, clients, comp] = await Promise.all([
      idb.getAllQuotations(),
      idb.getAllClients(),
      idb.getSetting<CompanyProfile>('company_profile'),
    ]);
    memoryQuotations = quotes;
    memoryClients = clients;
    if (comp) memoryCompany = normalizeCompany(comp);
  },

  // Force two-way push and reconciliation with cloud
  async forceSyncAllToCloud(): Promise<{ success: boolean; pushedCount: number; message: string }> {
    if (!cloudSync.isEnabled()) {
      return { success: false, pushedCount: 0, message: 'Cloud database connection is not configured.' };
    }
    const allQuotes = await idb.getAllQuotations();
    let pushed = 0;
    for (const q of allQuotes) {
      try {
        await cloudSync.syncQuotation(q);
        pushed++;
      } catch (e) {
        console.warn('Failed to push quote to cloud:', q.id, e);
      }
    }
    const allClients = await idb.getAllClients();
    for (const c of allClients) {
      try {
        await cloudSync.syncClient(c);
      } catch (e) {}
    }
    const synced = await cloudSync.pullAllFromCloud();
    if (synced?.quotations) {
      memoryQuotations = synced.quotations;
    }
    if (synced?.clients) {
      memoryClients = synced.clients;
    }
    return { 
      success: true, 
      pushedCount: pushed, 
      message: `Successfully synchronized ${pushed} quotations and ${allClients.length} clients with cloud database.` 
    };
  },

  // Auto-Ledger Sync Toggle
  isAutoLedgerSyncEnabled(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTO_LEDGER_SYNC);
      // Default is ON (true) if not explicitly set to 'false'
      return stored !== 'false';
    } catch {
      return true;
    }
  },

  setAutoLedgerSync(enabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_LEDGER_SYNC, String(enabled));
    } catch (e) {
      console.error('Failed to save auto-ledger-sync setting:', e);
    }
  },

  // Manual sync a quotation to the ledger (regardless of auto-sync setting)
  async manualSyncToLedger(quotation: Quotation): Promise<{ success: boolean; isTrash?: boolean; message: string }> {
    try {
      return await syncInvoicedQuotation(quotation, true);
    } catch (err: any) {
      return { success: false, message: `Failed to sync: ${err?.message || String(err)}` };
    }
  },

  // Direct accessor aliases
  getQuotations(includeDeleted = false, organizationId?: string): Quotation[] {
    return storage.getAllQuotations(includeDeleted, organizationId);
  },
  getClients(organizationId?: string): ClientProfile[] {
    return storage.getAllClients(organizationId);
  },
};
