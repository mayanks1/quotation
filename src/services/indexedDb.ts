import { Quotation, ClientProfile, CompanyProfile } from '../types/quotation';

const DB_NAME = 'TishaQuotationDB_v1';
const DB_VERSION = 1;

export const STORES = {
  QUOTATIONS: 'quotations',
  CLIENTS: 'clients',
  SETTINGS: 'settings',
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.QUOTATIONS)) {
        const store = db.createObjectStore(STORES.QUOTATIONS, { keyPath: 'id' });
        store.createIndex('quotationNumber', 'quotationNumber', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CLIENTS)) {
        const store = db.createObjectStore(STORES.CLIENTS, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const idb = {
  async getAllQuotations(): Promise<Quotation[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUOTATIONS, 'readonly');
      const store = tx.objectStore(STORES.QUOTATIONS);
      const request = store.getAll();
      request.onsuccess = () => {
        const list = request.result || [];
        // Sort newest first
        list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async saveQuotation(quote: Quotation): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUOTATIONS, 'readwrite');
      const store = tx.objectStore(STORES.QUOTATIONS);
      const request = store.put(quote);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteQuotation(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUOTATIONS, 'readwrite');
      const store = tx.objectStore(STORES.QUOTATIONS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getAllClients(): Promise<ClientProfile[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CLIENTS, 'readonly');
      const store = tx.objectStore(STORES.CLIENTS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async saveClient(client: ClientProfile): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CLIENTS, 'readwrite');
      const store = tx.objectStore(STORES.CLIENTS);
      const id = client.id || `client-${Date.now()}`;
      const request = store.put({ ...client, id });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteClient(idOrName: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CLIENTS, 'readwrite');
      const store = tx.objectStore(STORES.CLIENTS);
      store.delete(idOrName);

      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          if (cursor.value.id === idOrName || cursor.value.name === idOrName) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getSetting<T>(key: string): Promise<T | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readonly');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async saveSetting<T>(key: string, value: T): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async exportFullBackup(): Promise<string> {
    const [quotations, clients, company] = await Promise.all([
      idb.getAllQuotations(),
      idb.getAllClients(),
      idb.getSetting<CompanyProfile>('company_profile'),
    ]);

    const backupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      appName: 'Tisha LED Walls Quotation Pro',
      quotations,
      clients,
      company,
    };

    return JSON.stringify(backupData, null, 2);
  },

  async importFullBackup(jsonStr: string): Promise<{ quotationsCount: number; clientsCount: number }> {
    const data = JSON.parse(jsonStr);
    if (!data || !Array.isArray(data.quotations)) {
      throw new Error('Invalid backup file format');
    }

    const db = await openDB();
    const tx = db.transaction([STORES.QUOTATIONS, STORES.CLIENTS, STORES.SETTINGS], 'readwrite');

    const quoteStore = tx.objectStore(STORES.QUOTATIONS);
    for (const q of data.quotations) {
      if (q && q.id) quoteStore.put(q);
    }

    const clientStore = tx.objectStore(STORES.CLIENTS);
    if (Array.isArray(data.clients)) {
      for (const c of data.clients) {
        if (c && c.name) {
          const id = c.id || `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          clientStore.put({ ...c, id });
        }
      }
    }

    if (data.company) {
      const settingsStore = tx.objectStore(STORES.SETTINGS);
      settingsStore.put({ key: 'company_profile', value: data.company });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        resolve({
          quotationsCount: data.quotations.length,
          clientsCount: (data.clients || []).length,
        });
      };
      tx.onerror = () => reject(tx.error);
    });
  },
};
