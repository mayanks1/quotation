import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Quotation, ClientProfile, CompanyProfile } from '../types/quotation';
import { idb } from './indexedDb';

export const cloudSync = {
  isEnabled(): boolean {
    return isSupabaseConfigured() && supabase !== null;
  },

  async testConnection(): Promise<{ success: boolean; message: string; tableReady?: boolean }> {
    if (!cloudSync.isEnabled() || !supabase) {
      return {
        success: false,
        message: 'Supabase credentials not detected. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env and restart Vite if needed.',
      };
    }

    try {
      const { error, count } = await supabase
        .from('quotations')
        .select('id', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
          return {
            success: true,
            tableReady: false,
            message: 'Connected to Supabase! But the tables have not been created yet. Please copy supabase_schema.sql and click "Run" in Supabase SQL Editor.',
          };
        }
        return {
          success: false,
          message: `Supabase returned: ${error.message}`,
        };
      }

      return {
        success: true,
        tableReady: true,
        message: `Connected successfully! Found ${count ?? 0} quotations in cloud database.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Network/Connection error: ${err?.message || String(err)}`,
      };
    }
  },

  async syncQuotation(quote: Quotation): Promise<void> {
    if (!cloudSync.isEnabled() || !supabase) return;

    try {
      const row = {
        id: quote.id,
        quotation_number: quote.quotationNumber,
        quotation_date: quote.quotationDate,
        valid_until: quote.validUntil,
        event_date: quote.eventDate || null,
        venue: quote.venue || null,
        status: quote.status,
        company: quote.company,
        client: quote.client,
        line_items: quote.lineItems,
        discount_amount: quote.discountAmount || 0,
        tax_scheme: quote.taxScheme,
        tax_rate: quote.taxRate || 18,
        shipping_charges: quote.shippingCharges || 0,
        notes: quote.notes || null,
        payment_terms: quote.paymentTerms || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('quotations').upsert(row);
      if (error) {
        console.warn('Supabase quotation sync warning:', error.message);
      }
    } catch (err) {
      console.warn('Cloud sync error (will retry next time):', err);
    }
  },

  async deleteQuotation(id: string): Promise<void> {
    if (!cloudSync.isEnabled() || !supabase) return;

    try {
      await supabase.from('quotations').delete().eq('id', id);
    } catch (err) {
      console.warn('Cloud delete error:', err);
    }
  },

  async syncClient(client: ClientProfile): Promise<void> {
    if (!cloudSync.isEnabled() || !supabase || !client.name) return;

    try {
      const row = {
        id: client.id || `client-${Date.now()}`,
        name: client.name,
        company: client.company || null,
        address: client.address || null,
        phone: client.phone || null,
        email: client.email || null,
        gstin: client.gstin || null,
        updated_at: new Date().toISOString(),
      };

      await supabase.from('clients').upsert(row);
    } catch (err) {
      console.warn('Cloud client sync warning:', err);
    }
  },

  async syncCompanyProfile(profile: CompanyProfile): Promise<void> {
    if (!cloudSync.isEnabled() || !supabase) return;

    try {
      await supabase.from('company_settings').upsert({
        id: 'primary',
        profile,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Cloud company sync warning:', err);
    }
  },

  async pullAllFromCloud(): Promise<{ quotations: Quotation[]; clients: ClientProfile[] } | null> {
    if (!cloudSync.isEnabled() || !supabase) return null;

    try {
      const [quotesRes, clientsRes, companyRes] = await Promise.all([
        supabase.from('quotations').select('*').order('updated_at', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('company_settings').select('*').eq('id', 'primary').single(),
      ]);

      if (quotesRes.data) {
        for (const row of quotesRes.data) {
          const q: Quotation = {
            id: row.id,
            quotationNumber: row.quotation_number,
            quotationDate: row.quotation_date,
            validUntil: row.valid_until,
            eventDate: row.event_date || undefined,
            venue: row.venue || undefined,
            status: row.status,
            company: row.company,
            client: row.client,
            lineItems: row.line_items || [],
            discountAmount: Number(row.discount_amount || 0),
            taxScheme: row.tax_scheme,
            taxRate: Number(row.tax_rate || 18),
            shippingCharges: Number(row.shipping_charges || 0),
            notes: row.notes || '',
            paymentTerms: row.payment_terms || '',
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          };
          await idb.saveQuotation(q);
        }
      }

      if (clientsRes.data) {
        for (const c of clientsRes.data) {
          await idb.saveClient({
            id: c.id,
            name: c.name,
            company: c.company || '',
            address: c.address || '',
            phone: c.phone || '',
            email: c.email || '',
            gstin: c.gstin || '',
          });
        }
      }

      if (companyRes.data && companyRes.data.profile) {
        await idb.saveSetting('company_profile', companyRes.data.profile);
      }

      const mergedQuotes = await idb.getAllQuotations();
      const mergedClients = await idb.getAllClients();
      return { quotations: mergedQuotes, clients: mergedClients };
    } catch (err) {
      console.warn('Failed pulling from cloud:', err);
      return null;
    }
  },
};
