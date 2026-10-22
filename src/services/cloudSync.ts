import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Quotation, ClientProfile, CompanyProfile, CatalogItem } from '../types/quotation';
import { SaaSOrganization } from '../types/auth';
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
      const activeOrgId = quote.organizationId || (typeof window !== 'undefined' ? localStorage.getItem('tisha_active_org_id') || 'org_tisha_main' : 'org_tisha_main');
      const companyPayload = quote.company && quote.company.name ? quote.company : { name: 'Tisha LED Walls' };
      const row = {
        id: quote.id,
        quotation_number: quote.quotationNumber,
        quotation_date: quote.quotationDate,
        valid_until: quote.validUntil,
        event_date: quote.eventDate || null,
        venue: quote.venue || null,
        status: quote.status,
        document_type: quote.documentType || 'quotation',
        invoice_number: quote.invoiceNumber || null,
        invoice_date: quote.invoiceDate || null,
        is_deleted: Boolean(quote.isDeleted),
        deleted_at: quote.deletedAt || null,
        company: companyPayload,
        client: {
          ...(quote.client || {}),
          organizationId: activeOrgId,
          clientSignature: quote.clientSignature,
          adjustmentAmount: quote.adjustmentAmount,
          advancePercentage: quote.advancePercentage,
          advanceAmount: quote.advanceAmount,
          enableUpiQr: quote.enableUpiQr,
          enablePaymentLedger: quote.enablePaymentLedger,
          qrAmountType: quote.qrAmountType,
          customQrAmount: quote.customQrAmount,
          allowCustomerEditQrAmount: quote.allowCustomerEditQrAmount,
          paidAmount: quote.paidAmount,
          paymentStatus: quote.paymentStatus,
          paymentMode: quote.paymentMode,
          transactionRef: quote.transactionRef,
          paymentDate: quote.paymentDate,
          revisionNumber: quote.revisionNumber,
          parentQuoteNumber: quote.parentQuoteNumber,
          isRevised: quote.isRevised,
          originalQuotationNumber: quote.originalQuotationNumber,
          isDeleted: Boolean(quote.isDeleted),
          deletedAt: quote.deletedAt || null,
        },
        line_items: quote.lineItems || [],
        discount_amount: quote.discountAmount || 0,
        tax_scheme: quote.taxScheme || 'cgst_sgst',
        tax_rate: quote.taxRate || 18,
        shipping_charges: quote.shippingCharges || 0,
        notes: quote.notes || null,
        payment_terms: quote.paymentTerms || null,
        updated_at: quote.updatedAt || new Date().toISOString(),
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

  async deleteClient(idOrName: string): Promise<void> {
    if (!cloudSync.isEnabled() || !supabase) return;

    try {
      if (idOrName.startsWith('client-')) {
        await supabase.from('clients').delete().eq('id', idOrName);
      } else {
        await supabase.from('clients').delete().or(`id.eq.${idOrName},name.eq.${idOrName}`);
      }
    } catch (err) {
      console.warn('Cloud delete client error:', err);
    }
  },

  async syncCompanyProfile(profile: CompanyProfile): Promise<{ success: boolean; error?: any }> {
    if (!cloudSync.isEnabled() || !supabase) return { success: false, error: 'Cloud sync not enabled' };

    try {
      const { error } = await supabase.from('company_settings').upsert({
        id: 'primary',
        profile,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) {
        console.error('Cloud company sync error:', error);
        return { success: false, error };
      }
      return { success: true };
    } catch (err) {
      console.warn('Cloud company sync warning:', err);
      return { success: false, error: err };
    }
  },

  async pullAllFromCloud(): Promise<{ quotations: Quotation[]; clients: ClientProfile[]; company?: CompanyProfile } | null> {
    if (!cloudSync.isEnabled() || !supabase) return null;

    try {
      const [quotesRes, clientsRes, companyRes] = await Promise.all([
        supabase.from('quotations').select('*').order('updated_at', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('company_settings').select('*').eq('id', 'primary').maybeSingle(),
      ]);

      if (quotesRes.data) {
        const localQuotesList = await idb.getAllQuotations();
        const localMap = new Map<string, Quotation>();
        for (const lq of localQuotesList) {
          localMap.set(lq.id, lq);
        }

        for (const row of quotesRes.data) {
          const localExisting = localMap.get(row.id);

          let isDeleted = row.client?.isDeleted !== undefined
            ? Boolean(row.client.isDeleted)
            : (row.is_deleted !== undefined ? Boolean(row.is_deleted) : false);
          let deletedAt = row.client?.deletedAt || row.deleted_at || undefined;

          // Check timestamp comparison to avoid stale cloud state overriding fresh local state
          const localUpdatedTime = localExisting?.updatedAt ? new Date(localExisting.updatedAt).getTime() : 0;
          const cloudUpdatedTime = row.updated_at ? new Date(row.updated_at).getTime() : 0;

          if (localExisting && localUpdatedTime > cloudUpdatedTime) {
            // Local is newer: preserve local version and sync to cloud
            await idb.saveQuotation(localExisting);
            setTimeout(() => {
              cloudSync.syncQuotation({ ...localExisting }).catch(console.warn);
            }, 100);
            continue;
          } else if (localExisting?.isDeleted && !isDeleted) {
            // Extra safety guard: if local was marked in trash and cloud hasn't recorded it yet
            const localDelTime = localExisting.deletedAt ? new Date(localExisting.deletedAt).getTime() : 0;
            if (localDelTime >= cloudUpdatedTime - 10000) {
              isDeleted = true;
              deletedAt = localExisting.deletedAt;
              setTimeout(() => {
                cloudSync.syncQuotation({ ...localExisting, isDeleted: true, deletedAt }).catch(console.warn);
              }, 100);
            }
          }

          const q: Quotation = {
            id: row.id,
            organizationId: row.organization_id || row.client?.organizationId || localExisting?.organizationId || 'org_tisha_main',
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
            client: {
              name: row.client?.name || '',
              company: row.client?.company || '',
              address: row.client?.address || '',
              phone: row.client?.phone || '',
              email: row.client?.email || '',
              gstin: row.client?.gstin || '',
            },
            clientSignature: row.client?.clientSignature || localExisting?.clientSignature || undefined,
            adjustmentAmount: row.client?.adjustmentAmount !== undefined ? Number(row.client.adjustmentAmount) : localExisting?.adjustmentAmount,
            advancePercentage: row.client?.advancePercentage !== undefined ? Number(row.client.advancePercentage) : localExisting?.advancePercentage,
            advanceAmount: row.client?.advanceAmount !== undefined ? Number(row.client.advanceAmount) : localExisting?.advanceAmount,
            customQrAmount: row.client?.customQrAmount !== undefined ? Number(row.client.customQrAmount) : localExisting?.customQrAmount,
            allowCustomerEditQrAmount: row.client?.allowCustomerEditQrAmount !== undefined ? Boolean(row.client.allowCustomerEditQrAmount) : (localExisting?.allowCustomerEditQrAmount ?? false),
            enableUpiQr: row.client?.enableUpiQr !== undefined ? Boolean(row.client.enableUpiQr) : (localExisting?.enableUpiQr ?? false),
            enablePaymentLedger: row.client?.enablePaymentLedger !== undefined ? Boolean(row.client.enablePaymentLedger) : (localExisting?.enablePaymentLedger ?? false),
            qrAmountType: row.client?.qrAmountType || localExisting?.qrAmountType,
            paidAmount: row.client?.paidAmount !== undefined ? Number(row.client.paidAmount) : localExisting?.paidAmount,
            paymentStatus: row.client?.paymentStatus || localExisting?.paymentStatus,
            paymentMode: row.client?.paymentMode || localExisting?.paymentMode,
            transactionRef: row.client?.transactionRef || localExisting?.transactionRef,
            paymentDate: row.client?.paymentDate || localExisting?.paymentDate,
            revisionNumber: row.client?.revisionNumber !== undefined ? Number(row.client.revisionNumber) : localExisting?.revisionNumber,
            parentQuoteNumber: row.client?.parentQuoteNumber || localExisting?.parentQuoteNumber,
            isRevised: row.client?.isRevised ?? localExisting?.isRevised ?? false,
            originalQuotationNumber: row.client?.originalQuotationNumber || localExisting?.originalQuotationNumber,
            isDeleted,
            deletedAt,
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

        // BI-DIRECTIONAL RECONCILIATION:
        // Any quote present in local IndexedDB but missing in cloud is uploaded to Supabase
        const cloudIds = new Set(quotesRes.data.map((r: any) => r.id));
        for (const localQ of localQuotesList) {
          if (!cloudIds.has(localQ.id)) {
            try {
              await cloudSync.syncQuotation(localQ);
              console.log(`[CloudSync] Auto-uploaded missing local quote ${localQ.quotationNumber} (${localQ.id}) to cloud.`);
            } catch (err) {
              console.warn(`[CloudSync] Failed to push local quote ${localQ.id} to cloud:`, err);
            }
          }
        }
      }

      if (clientsRes.data) {
        const localClients = await idb.getAllClients();
        const cloudClientIds = new Set(clientsRes.data.map((c: any) => c.id));
        const cloudClientNames = new Set(clientsRes.data.map((c: any) => (c.name || '').toLowerCase().trim()));
        const seenNames = new Set<string>();

        for (const c of clientsRes.data) {
          const norm = (c.name || '').toLowerCase().trim();
          if (!norm || norm === 'event organizer / client name') {
            // Prune invalid / placeholder row from cloud
            if (supabase && c.id) supabase.from('clients').delete().eq('id', c.id).then();
            continue;
          }
          if (seenNames.has(norm)) {
            // Duplicate client found in cloud, prune this duplicate ID from Supabase
            if (supabase && c.id) supabase.from('clients').delete().eq('id', c.id).then();
            continue;
          }
          seenNames.add(norm);
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

        // Reconcile local clients missing from cloud
        for (const lc of localClients) {
          const norm = (lc.name || '').toLowerCase().trim();
          if (norm && norm !== 'event organizer / client name' && !cloudClientIds.has(lc.id) && !cloudClientNames.has(norm)) {
            try {
              await cloudSync.syncClient(lc);
              console.log(`[CloudSync] Auto-uploaded missing local client ${lc.name} to cloud.`);
            } catch (e) {}
          }
        }
      }

      if (companyRes.data && companyRes.data.profile) {
        const localUpdatedAtStr = localStorage.getItem('tisha_company_profile_updated_at');
        const localUpdatedTime = localUpdatedAtStr ? new Date(localUpdatedAtStr).getTime() : 0;
        const cloudUpdatedTime = companyRes.data.updated_at ? new Date(companyRes.data.updated_at).getTime() : 0;

        if (localUpdatedTime > cloudUpdatedTime) {
          // Local profile is newer than cloud. Resync local up to cloud!
          const localProfileRaw = localStorage.getItem('tisha_company_profile_v2');
          if (localProfileRaw) {
            try {
              const localProfile = JSON.parse(localProfileRaw);
              await supabase.from('company_settings').upsert({
                id: 'primary',
                profile: localProfile,
                updated_at: localUpdatedAtStr || new Date().toISOString(),
              }, { onConflict: 'id' });
              await idb.saveSetting('company_profile', localProfile);
            } catch (e) {
              await idb.saveSetting('company_profile', companyRes.data.profile);
            }
          }
        } else {
          // Cloud profile is newer or equal. Save to IDB & LocalStorage.
          await idb.saveSetting('company_profile', companyRes.data.profile);
          try {
            localStorage.setItem('tisha_company_profile_v2', JSON.stringify(companyRes.data.profile));
            if (companyRes.data.updated_at) {
              localStorage.setItem('tisha_company_profile_updated_at', companyRes.data.updated_at);
            }
          } catch (e) {}
        }
      }

      const mergedQuotes = await idb.getAllQuotations();
      const mergedClients = await idb.getAllClients();
      const mergedCompany = await idb.getSetting<CompanyProfile>('company_profile');
      return { 
        quotations: mergedQuotes, 
        clients: mergedClients,
        company: mergedCompany || undefined,
      };
    } catch (err) {
      console.warn('Failed pulling from cloud:', err);
      return null;
    }
  },

  async syncUsersDirectory(users: any[]): Promise<void> {
    if (!cloudSync.isEnabled() || !supabase) return;
    try {
      // 1. Upsert each user into public.users or public.saas_users table
      for (const u of users) {
        const row = {
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password || '',
          role: u.role,
          status: u.status,
          phone: u.phone || null,
          avatar: u.avatar || null,
          organization_id: u.organizationId || 'org_tisha_main',
          permissions: u.permissions || {},
          created_at: u.createdAt || new Date().toISOString(),
          last_login: u.lastLogin || null,
        };

        const { error: userErr } = await supabase.from('users').upsert(row);
        if (userErr) {
          try {
            await supabase.from('saas_users').upsert(row);
          } catch (_) {}
        }
      }

      // 2. Also keep company_settings updated as resilient backup
      await supabase.from('company_settings').upsert({
        id: 'saas_team_directory',
        profile: {
          users,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed syncing users to Supabase:', err);
    }
  },

  async fetchUsersFromCloud(): Promise<any[]> {
    if (!cloudSync.isEnabled() || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          password: r.password,
          role: r.role,
          status: r.status,
          phone: r.phone || '',
          avatar: r.avatar,
          organizationId: r.organization_id || 'org_tisha_main',
          permissions: r.permissions || {},
          createdAt: r.created_at,
          lastLogin: r.last_login,
        }));
      }

      // Fallback check on saas_users or company_settings if users table is empty
      const fallback = await cloudSync.pullUsersDirectory();
      return fallback || [];
    } catch (err) {
      console.warn('Error fetching users from Supabase:', err);
      return [];
    }
  },

  async authenticateWithCloud(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
    if (!cloudSync.isEnabled() || !supabase) {
      return { success: false, error: 'Database connection not available.' };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (error) {
        return { success: false, error: `Authentication failed: ${error.message}` };
      }

      if (!data) {
        return { success: false, error: 'No user account found with this email address.' };
      }

      if (data.status === 'suspended') {
        return { success: false, error: 'Your account has been suspended by the Super Admin.' };
      }

      // Verify password against stored password in DB
      if (data.password !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      // Update last_login in background
      supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id)
        .then();

      const mappedUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        phone: data.phone || '',
        avatar: data.avatar,
        organizationId: data.organization_id || 'org_tisha_main',
        permissions: data.permissions || {},
        createdAt: data.created_at,
        lastLogin: new Date().toISOString(),
      };

      return { success: true, user: mappedUser };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Authentication error.' };
    }
  },

  async createCloudUser(user: any): Promise<{ success: boolean; error?: string }> {
    if (!cloudSync.isEnabled() || !supabase) {
      return { success: false, error: 'Database not connected.' };
    }

    try {
      const row = {
        id: user.id,
        name: user.name,
        email: user.email.toLowerCase().trim(),
        password: user.password || '',
        role: user.role,
        status: user.status || 'active',
        phone: user.phone || null,
        avatar: user.avatar || null,
        organization_id: user.organizationId || 'org_tisha_main',
        permissions: user.permissions || {},
        created_at: user.createdAt || new Date().toISOString(),
      };

      const { error } = await supabase.from('users').insert(row);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create user.' };
    }
  },

  async updateCloudUser(id: string, updates: any): Promise<{ success: boolean; error?: string }> {
    if (!cloudSync.isEnabled() || !supabase) {
      return { success: false, error: 'Database not connected.' };
    }

    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email.toLowerCase().trim();
      if (updates.password !== undefined && updates.password) dbUpdates.password = updates.password;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
      if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions;

      const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update user.' };
    }
  },

  async changeUserPassword(userId: string, currentPass: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    if (!cloudSync.isEnabled() || !supabase) {
      return { success: false, error: 'Database connection not available.' };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, password')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }
      if (!data) {
        return { success: false, error: 'User record not found.' };
      }
      if (data.password && data.password !== currentPass) {
        return { success: false, error: 'Current password does not match.' };
      }

      const { error: updateErr } = await supabase
        .from('users')
        .update({ password: newPass })
        .eq('id', userId);

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update password.' };
    }
  },

  async deleteCloudUser(id: string): Promise<{ success: boolean; error?: string }> {
    if (!cloudSync.isEnabled() || !supabase) {
      return { success: false, error: 'Database not connected.' };
    }

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete user.' };
    }
  },

  async pullUsersDirectory(): Promise<any[] | null> {
    if (!cloudSync.isEnabled() || !supabase) return null;
    try {
      // 1. Try direct public.users table
      const { data: usersData, error: usersErr } = await supabase.from('users').select('*').order('created_at', { ascending: true });
      if (!usersErr && usersData && usersData.length > 0) {
        return usersData.map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          password: r.password,
          role: r.role,
          status: r.status,
          phone: r.phone,
          avatar: r.avatar,
          organizationId: r.organization_id || 'org_tisha_main',
          permissions: r.permissions,
          createdAt: r.created_at,
          lastLogin: r.last_login,
        }));
      }

      // 2. Try direct public.saas_users table
      const { data: saasData, error: saasErr } = await supabase.from('saas_users').select('*');
      if (!saasErr && saasData && saasData.length > 0) {
        return saasData.map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          password: r.password,
          role: r.role,
          status: r.status,
          phone: r.phone,
          avatar: r.avatar,
          organizationId: r.organization_id || 'org_tisha_main',
          permissions: r.permissions,
          createdAt: r.created_at,
          lastLogin: r.last_login,
        }));
      }

      // 3. Fallback to company_settings
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 'saas_team_directory')
        .single();

      if (!error && data && data.profile && Array.isArray(data.profile.users)) {
        return data.profile.users;
      }
      return null;
    } catch (err) {
      console.warn('Failed pulling users from Supabase:', err);
      return null;
    }
  },

  async fetchOrganizationsFromCloud(): Promise<SaaSOrganization[] | null> {
    if (!cloudSync.isEnabled() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 'saas_organizations')
        .maybeSingle();

      if (!error && data && data.profile && Array.isArray(data.profile.organizations)) {
        return data.profile.organizations;
      }
      return null;
    } catch (err) {
      console.warn('Failed to fetch organizations from Supabase:', err);
      return null;
    }
  },

  async saveOrganizationsToCloud(orgs: SaaSOrganization[]): Promise<{ success: boolean; error?: string }> {
    if (!cloudSync.isEnabled() || !supabase) {
      return { success: false, error: 'Cloud database not connected.' };
    }
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          id: 'saas_organizations',
          profile: { organizations: orgs },
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed saving organizations.' };
    }
  },

  async syncCatalogItems(items: CatalogItem[]): Promise<void> {
    if (!cloudSync.isEnabled() || !supabase) return;
    try {
      await supabase.from('company_settings').upsert({
        id: 'catalog_items',
        profile: {
          items,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed syncing catalog to cloud:', err);
    }
  },

  async pullCatalogFromCloud(): Promise<CatalogItem[] | null> {
    if (!cloudSync.isEnabled() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('profile, updated_at')
        .eq('id', 'catalog_items')
        .single();
      if (!error && data?.profile?.items && Array.isArray(data.profile.items)) {
        return data.profile.items as CatalogItem[];
      }
    } catch (err) {
      console.warn('Failed pulling catalog from cloud:', err);
    }
    return null;
  },

  subscribeToCloudChanges(callback: (payload: { table: string; eventType: string }) => void): () => void {
    if (!cloudSync.isEnabled() || !supabase) return () => {};

    try {
      const channel = supabase
        .channel('tisha_db_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            callback({ table: payload.table, eventType: payload.eventType });
          }
        )
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Failed to set up Supabase realtime listener:', err);
      return () => {};
    }
  },
};
