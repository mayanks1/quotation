import { Quotation, CompanyProfile, ClientProfile, LineItem } from '../types/quotation';
import { DEFAULT_COMPANY, DEFAULT_TERMS_AND_CONDITIONS, DEFAULT_PAYMENT_TERMS } from '../config/defaults';

const STORAGE_KEYS = {
  QUOTATIONS: 'tisha_quotations_v2',
  ACTIVE_QUOTATION_ID: 'tisha_active_quotation_id_v2',
  COMPANY_PROFILE: 'tisha_company_profile_v2',
  CLIENTS: 'tisha_clients_v2',
};

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
  const valid = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days default validity
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
  getCompanyProfile(): CompanyProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPANY_PROFILE);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed reading company profile:', e);
    }
    return DEFAULT_COMPANY;
  },

  saveCompanyProfile(profile: CompanyProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPANY_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed saving company profile:', e);
    }
  },

  getAllQuotations(): Quotation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((q: Quotation) => ({
            ...q,
            venue: q.venue === 'Client Venue, Delhi NCR' ? '' : (q.venue || ''),
            client: {
              ...q.client,
              name: q.client?.name === 'Event Organizer / Client Name' ? '' : (q.client?.name || ''),
              company: q.client?.company === 'Corporate / Production Agency' ? '' : (q.client?.company || ''),
              address: q.client?.address === 'Sector 29, Gurugram, Haryana 122001' ? '' : (q.client?.address || ''),
              phone: q.client?.phone === '+91 9876543210' ? '' : (q.client?.phone || ''),
              email: q.client?.email === 'client@events.com' ? '' : (q.client?.email || ''),
            },
          }));
        }
      }
    } catch (e) {
      console.error('Failed reading quotations:', e);
    }
    return [];
  },

  saveQuotation(quotation: Quotation): void {
    try {
      const all = storage.getAllQuotations();
      const existingIdx = all.findIndex((q) => q.id === quotation.id);
      const updated = { ...quotation, updatedAt: new Date().toISOString() };
      
      let nextList: Quotation[];
      if (existingIdx >= 0) {
        nextList = [...all];
        nextList[existingIdx] = updated;
      } else {
        nextList = [updated, ...all];
      }
      localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(nextList));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_QUOTATION_ID, quotation.id);

      // Auto-save client if name exists
      if (quotation.client?.name?.trim()) {
        storage.saveClient(quotation.client);
      }
    } catch (e) {
      console.error('Failed saving quotation:', e);
    }
  },

  deleteQuotation(id: string): void {
    try {
      const all = storage.getAllQuotations().filter((q) => q.id !== id);
      localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(all));
      if (storage.getActiveQuotationId() === id) {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_QUOTATION_ID);
      }
    } catch (e) {
      console.error('Failed deleting quotation:', e);
    }
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
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: ClientProfile) => c.name && c.name !== 'Event Organizer / Client Name');
        }
      }
    } catch (e) {
      console.error('Failed reading clients:', e);
    }
    return [];
  },

  saveClient(client: ClientProfile): void {
    if (!client.name || !client.name.trim()) return;
    try {
      const clients = storage.getAllClients();
      const existingIdx = clients.findIndex(
        (c) => c.name.toLowerCase().trim() === client.name.toLowerCase().trim()
      );
      if (existingIdx >= 0) {
        clients[existingIdx] = { ...clients[existingIdx], ...client };
      } else {
        clients.unshift({ ...client, id: `client-${Date.now()}` });
      }
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients.slice(0, 50)));
    } catch (e) {
      console.error('Failed saving client:', e);
    }
  },
};
