import { Quotation, CompanyProfile, ClientProfile, LineItem } from '../types/quotation';
import { DEFAULT_COMPANY, DEFAULT_TERMS_AND_CONDITIONS, DEFAULT_PAYMENT_TERMS } from '../config/defaults';
import { idb } from './indexedDb';
import { cloudSync } from './cloudSync';

const STORAGE_KEYS = {
  ACTIVE_QUOTATION_ID: 'tisha_active_quotation_id_v2',
  MIGRATED_TO_IDB: 'tisha_migrated_to_idb_v1',
  LEGACY_QUOTATIONS: 'tisha_quotations_v2',
  LEGACY_COMPANY: 'tisha_company_profile_v2',
  LEGACY_CLIENTS: 'tisha_clients_v2',
};

// In-memory cache for immediate zero-latency UI rendering
let memoryQuotations: Quotation[] = [];
let memoryClients: ClientProfile[] = [];
let memoryCompany: CompanyProfile = DEFAULT_COMPANY;
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

export const createBlankQuotation = (companyProfile: CompanyProfile): Quotation => {
  const now = new Date();
  const valid = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const initialItems: LineItem[] = [
    {
      id: `item-${Date.now()}-1`,
      description: 'P3.91 Indoor/Outdoor LED Video Wall (Size: 12ft x 8ft = 96 Sq.Ft)',
      quantity: 1,
      rate: 12000,
      unit: 'Day',
      hsnSac: '9973',
      dimensions: {
        widthFt: 12,
        heightFt: 8,
        sqFt: 96,
        days: 1,
      },
    },
    {
      id: `item-${Date.now()}-2`,
      description: 'Novastar Video Processor & Switcher with HDMI/VGA/SDI Input',
      quantity: 1,
      rate: 3500,
      unit: 'Day',
      hsnSac: '9973',
    },
    {
      id: `item-${Date.now()}-3`,
      description: 'Aluminum Truss Setup with Base Plates & Rigging',
      quantity: 1,
      rate: 4000,
      unit: 'Set',
      hsnSac: '9973',
    },
    {
      id: `item-${Date.now()}-4`,
      description: 'On-site Certified LED Technician & Video Operator',
      quantity: 1,
      rate: 2000,
      unit: 'Day',
      hsnSac: '9987',
    },
  ];

  return {
    id: `quote-${Date.now()}`,
    quotationNumber: generateQuotationNumber(),
    quotationDate: formatDateDMY(now),
    validUntil: formatDateDMY(valid),
    venue: '',
    status: 'draft',
    company: companyProfile,
    client: {
      name: '',
      company: '',
      address: '',
      email: '',
      phone: '',
      gstin: '',
    },
    lineItems: initialItems,
    discountAmount: 0,
    taxScheme: 'cgst_sgst',
    taxRate: 18,
    shippingCharges: 2500,
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
        quotations: memoryQuotations,
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
      const [idbQuotes, idbClients, idbCompany] = await Promise.all([
        idb.getAllQuotations(),
        idb.getAllClients(),
        idb.getSetting<CompanyProfile>('company_profile'),
      ]);

      memoryQuotations = idbQuotes;
      memoryClients = idbClients;
      memoryCompany = idbCompany || DEFAULT_COMPANY;

      // If IndexedDB is completely empty, seed initial quote
      if (memoryQuotations.length === 0) {
        const initial = createBlankQuotation(memoryCompany);
        await idb.saveQuotation(initial);
        memoryQuotations = [initial];
      }

      // 3. Background cloud sync (non-blocking)
      if (cloudSync.isEnabled()) {
        for (const q of memoryQuotations) {
          cloudSync.syncQuotation(q);
        }
        for (const c of memoryClients) {
          cloudSync.syncClient(c);
        }
        cloudSync.syncCompanyProfile(memoryCompany);

        cloudSync.pullAllFromCloud().then((cloudData) => {
          if (cloudData && cloudData.quotations.length > 0) {
            memoryQuotations = cloudData.quotations;
            memoryClients = cloudData.clients;
          }
        });
      }

      isInitialized = true;
    } catch (err) {
      console.error('IndexedDB initialization failed, falling back:', err);
      // Fallback
      if (memoryQuotations.length === 0) {
        memoryQuotations = [createBlankQuotation(DEFAULT_COMPANY)];
      }
    }

    return {
      quotations: memoryQuotations,
      clients: memoryClients,
      company: memoryCompany,
    };
  },

  getCompanyProfile(): CompanyProfile {
    return memoryCompany || DEFAULT_COMPANY;
  },

  saveCompanyProfile(profile: CompanyProfile): void {
    memoryCompany = profile;
    idb.saveSetting('company_profile', profile).catch(console.error);
    cloudSync.syncCompanyProfile(profile).catch(console.error);
  },

  getAllQuotations(): Quotation[] {
    return memoryQuotations;
  },

  saveQuotation(quotation: Quotation): void {
    const updated = { ...quotation, updatedAt: new Date().toISOString() };
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

    // Auto-save client
    if (quotation.client?.name?.trim()) {
      storage.saveClient(quotation.client);
    }
  },

  deleteQuotation(id: string): void {
    memoryQuotations = memoryQuotations.filter((q) => q.id !== id);
    if (storage.getActiveQuotationId() === id) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_QUOTATION_ID);
    }

    idb.deleteQuotation(id).catch(console.error);
    cloudSync.deleteQuotation(id).catch(console.error);
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

  getAllClients(): ClientProfile[] {
    return memoryClients;
  },

  saveClient(client: ClientProfile): void {
    if (!client.name || !client.name.trim()) return;
    const existingIdx = memoryClients.findIndex(
      (c) => c.name.toLowerCase().trim() === client.name.toLowerCase().trim()
    );

    const clientWithId: ClientProfile = {
      ...client,
      id: client.id || `client-${Date.now()}`,
    };

    if (existingIdx >= 0) {
      memoryClients[existingIdx] = { ...memoryClients[existingIdx], ...clientWithId };
    } else {
      memoryClients = [clientWithId, ...memoryClients];
    }

    idb.saveClient(clientWithId).catch(console.error);
    cloudSync.syncClient(clientWithId).catch(console.error);
  },

  deleteClient(idOrName: string): void {
    const found = memoryClients.find((c) => c.id === idOrName || c.name === idOrName);
    memoryClients = memoryClients.filter((c) => c.id !== idOrName && c.name !== idOrName);

    if (found && found.id) {
      idb.deleteClient(found.id).catch(console.error);
    }
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
    // Reload memory cache
    const quotes = await idb.getAllQuotations();
    const clients = await idb.getAllClients();
    const comp = await idb.getSetting<CompanyProfile>('company_profile');
    memoryQuotations = quotes;
    memoryClients = clients;
    if (comp) memoryCompany = comp;
    return result;
  },
};
