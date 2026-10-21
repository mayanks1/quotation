import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SaaSUser, SaaSOrganization, AuthContextType,
  UserPermissions, UserRole, DEFAULT_PERMISSIONS_BY_ROLE, SaaSPlan,
  MASTER_SUPER_ADMIN_EMAIL
} from '../types/auth';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { cloudSync } from '../services/cloudSync';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ORG: SaaSOrganization = {
  id: 'org_tisha_main',
  name: 'Tisha LED Walls',
  slug: 'tisha-led-walls',
  logoUrl: 'https://res.cloudinary.com/dcfouzaii/image/upload/f_auto,q_auto,w_160/v1763444919/logo_a6xmsh.png',
  phone: '+91 98100 12345',
  email: 'tishaledwalls@gmail.com',
  plan: 'pro',
  planValidUntil: '2027-12-31',
  quotesLimit: 1000,
  quotesCount: 42,
  storageUsedMb: 18.5,
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const USERS_CACHE_KEY = 'tisha_saas_users_directory_v3';
const ORGS_CACHE_KEY = 'tisha_saas_orgs_directory_v2';
const ACTIVE_ORG_ID_KEY = 'tisha_active_org_id';
const SESSION_KEY = 'tisha_saas_auth_session';
const MODULE_LEDGER_KEY = 'tisha_module_payment_ledger_enabled';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPaymentLedgerEnabled, setIsPaymentLedgerEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(MODULE_LEDGER_KEY);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (e) { }
    return true; // Default: Enabled
  });

  const [users, setUsers] = useState<SaaSUser[]>(() => {
    try {
      const stored = localStorage.getItem(USERS_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached users directory:', e);
    }
    return [];
  });

  const [organizations, setOrganizations] = useState<SaaSOrganization[]>(() => {
    try {
      const stored = localStorage.getItem(ORGS_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached organizations:', e);
    }
    return [DEFAULT_ORG];
  });

  const [user, setUser] = useState<SaaSUser | null>(null);
  const [organization, setOrganization] = useState<SaaSOrganization | null>(() => {
    try {
      const activeId = localStorage.getItem(ACTIVE_ORG_ID_KEY);
      if (activeId) {
        const found = organizations.find((o) => o.id === activeId);
        if (found) return found;
      }
    } catch (e) { }
    return DEFAULT_ORG;
  });
  const [isLoading, setIsLoading] = useState(true);

  const setPaymentLedgerEnabled = async (enabled: boolean): Promise<void> => {
    setIsPaymentLedgerEnabledState(enabled);
    try {
      localStorage.setItem(MODULE_LEDGER_KEY, JSON.stringify(enabled));
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('company_settings').upsert({
          id: 'module_payment_ledger',
          profile: { enabled, updated_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' }).catch(() => { });
      }
    } catch (e) {
      console.warn('Failed saving module setting:', e);
    }
  };

  // Sync users to local storage whenever updated
  useEffect(() => {
    try {
      if (users.length > 0) {
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
      }
    } catch (e) {
      console.error('Failed to sync users directory to local storage:', e);
    }
  }, [users]);

  // Dynamic Database Sync: Fetch team roster & organizations from Supabase
  useEffect(() => {
    let isMounted = true;
    const loadCloudData = async () => {
      try {
        const [cloudUsers, cloudOrgs] = await Promise.all([
          cloudSync.fetchUsersFromCloud(),
          cloudSync.fetchOrganizationsFromCloud(),
        ]);

        if (isMounted && cloudUsers && cloudUsers.length > 0) {
          setUsers(cloudUsers);
          localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(cloudUsers));
        }

        if (isMounted && cloudOrgs && cloudOrgs.length > 0) {
          const hasDefault = cloudOrgs.some((o) => o.id === DEFAULT_ORG.id);
          const combined = hasDefault ? cloudOrgs : [DEFAULT_ORG, ...cloudOrgs];
          setOrganizations(combined);
          localStorage.setItem(ORGS_CACHE_KEY, JSON.stringify(combined));

          const activeId = localStorage.getItem(ACTIVE_ORG_ID_KEY);
          const active = combined.find((o) => o.id === activeId) || combined[0];
          setOrganization(active);
        }
      } catch (err) {
        console.warn('Failed to load users or orgs from cloud database:', err);
      }
    };

    loadCloudData();

    // Listen to realtime Postgres changes on public.users & company_settings
    const unsubscribe = cloudSync.subscribeToCloudChanges(async ({ table }) => {
      if ((table === 'users' || table === 'saas_users') && isMounted) {
        const refreshed = await cloudSync.fetchUsersFromCloud();
        if (refreshed && isMounted && refreshed.length > 0) {
          setUsers(refreshed);
          localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(refreshed));
        }
      }
      if (table === 'company_settings' && isMounted) {
        const freshOrgs = await cloudSync.fetchOrganizationsFromCloud();
        if (freshOrgs && isMounted && freshOrgs.length > 0) {
          const hasDefault = freshOrgs.some((o) => o.id === DEFAULT_ORG.id);
          const combined = hasDefault ? freshOrgs : [DEFAULT_ORG, ...freshOrgs];
          setOrganizations(combined);
          localStorage.setItem(ORGS_CACHE_KEY, JSON.stringify(combined));
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Initialize active session
  useEffect(() => {
    const initSession = async () => {
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const cloudUsers = await cloudSync.fetchUsersFromCloud();
            const existing = cloudUsers.find((u) => u.email.toLowerCase() === session.user.email?.toLowerCase());
            if (existing) {
              setUser(existing);
            } else {
              const mappedUser: SaaSUser = {
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                email: session.user.email || '',
                role: 'owner',
                status: 'active',
                organizationId: DEFAULT_ORG.id,
                permissions: DEFAULT_PERMISSIONS_BY_ROLE.owner,
                createdAt: session.user.created_at,
              };
              setUser(mappedUser);
            }
            setOrganization(DEFAULT_ORG);
            setIsLoading(false);
            return;
          }
        }

        // Local session fallback
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed.user && parsed.organization) {
            setUser(parsed.user);
            setOrganization(parsed.organization);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Dynamic database authentication via Supabase
      const cloudAuth = await cloudSync.authenticateWithCloud(cleanEmail, password);
      if (cloudAuth.success && cloudAuth.user) {
        setUser(cloudAuth.user);
        setOrganization(DEFAULT_ORG);
        sessionStorage.removeItem('tisha_logged_out');
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: cloudAuth.user, organization: DEFAULT_ORG }));

        // Refresh team roster dynamically
        cloudSync.fetchUsersFromCloud().then((fresh) => {
          if (fresh && fresh.length > 0) {
            setUsers(fresh);
            localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(fresh));
          }
        });

        setIsLoading(false);
        return { success: true };
      }

      // Offline fallback: check cached user roster if offline/network error
      if (cloudAuth.error && cloudAuth.error.includes('Database connection not available')) {
        const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (found && found.password === password) {
          if (found.status === 'suspended') {
            setIsLoading(false);
            return { success: false, error: 'Your account has been suspended by the Super Admin.' };
          }
          setUser(found);
          setOrganization(DEFAULT_ORG);
          sessionStorage.removeItem('tisha_logged_out');
          localStorage.setItem(SESSION_KEY, JSON.stringify({ user: found, organization: DEFAULT_ORG }));
          setIsLoading(false);
          return { success: true };
        }
      }

      setIsLoading(false);
      return { success: false, error: cloudAuth.error || 'Invalid email or password.' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Login failed.' };
    }
  };

  const demoLogin = async (role: 'owner' | 'manager' = 'owner') => {
    let target = users.find((u) => (role === 'owner' ? u.role === 'owner' : u.role === 'manager'));
    if (!target) {
      const fresh = await cloudSync.fetchUsersFromCloud();
      target = fresh.find((u) => (role === 'owner' ? u.role === 'owner' : u.role === 'manager')) || fresh[0];
    }
    if (target) {
      setUser(target);
      setOrganization(DEFAULT_ORG);
      sessionStorage.removeItem('tisha_logged_out');
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: target, organization: DEFAULT_ORG }));
    }
  };

  const register = async (data: {
    orgName: string;
    userName: string;
    email: string;
    password: string;
    phone?: string;
    plan?: SaaSPlan;
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const plan = data.plan || 'pro';

      const newOrg: SaaSOrganization = {
        id: `org_${Date.now()}`,
        name: data.orgName,
        slug: data.orgName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        phone: data.phone || '',
        email: cleanEmail,
        plan,
        planValidUntil: '2027-12-31',
        quotesLimit: plan === 'enterprise' ? 99999 : plan === 'pro' ? 1000 : 50,
        quotesCount: 0,
        storageUsedMb: 0.1,
      };

      const newUser: SaaSUser = {
        id: `usr_owner_${Date.now()}`,
        name: data.userName,
        email: cleanEmail,
        password: data.password,
        role: 'owner',
        status: 'active',
        phone: data.phone || '',
        organizationId: newOrg.id,
        permissions: DEFAULT_PERMISSIONS_BY_ROLE.owner,
        createdAt: new Date().toISOString(),
      };

      // Create in cloud database
      await cloudSync.createCloudUser(newUser);

      const nextUsers = [newUser, ...users];
      setUsers(nextUsers);
      setUser(newUser);
      setOrganization(newOrg);
      sessionStorage.removeItem('tisha_logged_out');
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: newUser, organization: newOrg }));
      localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(nextUsers));

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut().catch(() => { });
    }
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem('tisha_logged_out', 'true');
  };

  const updateUser = (data: Partial<SaaSUser>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    const nextUsers = users.map((u) => (u.id === user.id ? updated : u));
    setUsers(nextUsers);
    if (organization) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: updated, organization }));
    }
    cloudSync.updateCloudUser(user.id, data).catch(() => { });
  };

  const updateOrganization = (data: Partial<SaaSOrganization>) => {
    if (!organization) return;
    const updated = { ...organization, ...data };
    setOrganization(updated);
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user, organization: updated }));
    }
  };

  // Multi-Workspace & Organization Management (Controlled by Super Admin)
  const isMasterSuperAdmin = user?.email?.trim().toLowerCase() === MASTER_SUPER_ADMIN_EMAIL.toLowerCase();
  const isSuperAdmin = user?.role === 'owner' || isMasterSuperAdmin;

  const hasPermission = (perm: keyof UserPermissions): boolean => {
    if (!user) return false;
    if (isMasterSuperAdmin || user.role === 'owner') return true;
    if (user.permissions && user.permissions[perm] !== undefined) {
      return Boolean(user.permissions[perm]);
    }
    return Boolean(DEFAULT_PERMISSIONS_BY_ROLE[user.role]?.[perm]);
  };

  const switchOrganization = (orgId: string) => {
    const target = organizations.find((o) => o.id === orgId);
    if (target) {
      setOrganization(target);
      localStorage.setItem(ACTIVE_ORG_ID_KEY, orgId);
      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user, organization: target }));
      }
    }
  };

  const createWorkspace = async (data: {
    name: string;
    slug?: string;
    plan?: SaaSPlan;
    email?: string;
    phone?: string;
    logoUrl?: string;
    quotesLimit?: number;
  }): Promise<{ success: boolean; org?: SaaSOrganization; error?: string }> => {
    if (!isSuperAdmin) {
      return { success: false, error: 'Strict Security Restriction: Only Super Admin can provision new organization workspaces.' };
    }

    const cleanName = data.name.trim();
    if (!cleanName) {
      return { success: false, error: 'Organization name is required.' };
    }

    const generatedSlug = data.slug?.trim() || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = generatedSlug || `workspace-${Date.now().toString(36)}`;

    // Check duplicate slug or name
    if (organizations.some((o) => o.slug === slug || o.name.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: 'An organization with this name or slug already exists.' };
    }

    const newOrg: SaaSOrganization = {
      id: `org_${slug}_${Date.now().toString(36)}`,
      name: cleanName,
      slug,
      plan: data.plan || 'pro',
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      logoUrl: data.logoUrl || undefined,
      quotesLimit: data.quotesLimit || 1000,
      quotesCount: 0,
      storageUsedMb: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      planValidUntil: '2028-12-31',
    };

    const nextOrgs = [...organizations, newOrg];
    setOrganizations(nextOrgs);
    localStorage.setItem(ORGS_CACHE_KEY, JSON.stringify(nextOrgs));

    // Save to Supabase company_settings table
    await cloudSync.saveOrganizationsToCloud(nextOrgs);

    return { success: true, org: newOrg };
  };

  const updateWorkspace = async (id: string, updates: Partial<SaaSOrganization>): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) {
      return { success: false, error: 'Only Super Admin can edit organization workspaces.' };
    }

    const target = organizations.find((o) => o.id === id);
    if (!target) return { success: false, error: 'Workspace not found.' };

    const updated = { ...target, ...updates };
    const nextOrgs = organizations.map((o) => (o.id === id ? updated : o));
    setOrganizations(nextOrgs);
    localStorage.setItem(ORGS_CACHE_KEY, JSON.stringify(nextOrgs));

    if (organization?.id === id) {
      setOrganization(updated);
      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user, organization: updated }));
      }
    }

    await cloudSync.saveOrganizationsToCloud(nextOrgs);
    return { success: true };
  };

  const deleteWorkspace = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) {
      return { success: false, error: 'Only Super Admin can delete organization workspaces.' };
    }

    if (id === DEFAULT_ORG.id) {
      return { success: false, error: 'Primary organization workspace cannot be deleted.' };
    }

    const nextOrgs = organizations.filter((o) => o.id !== id);
    setOrganizations(nextOrgs);
    localStorage.setItem(ORGS_CACHE_KEY, JSON.stringify(nextOrgs));

    if (organization?.id === id) {
      const fallback = nextOrgs[0] || DEFAULT_ORG;
      setOrganization(fallback);
      localStorage.setItem(ACTIVE_ORG_ID_KEY, fallback.id);
      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user, organization: fallback }));
      }
    }

    await cloudSync.saveOrganizationsToCloud(nextOrgs);
    return { success: true };
  };

  // User Management Methods (Controlled strictly by Super Admin)
  const createUser = async (userData: Omit<SaaSUser, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) {
      return { success: false, error: 'Strict Security Restriction: Only Super Admin can create team users and grant responsibilities.' };
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'A user with this email address already exists.' };
    }

    const targetOrgId = userData.organizationId || organization?.id || DEFAULT_ORG.id;

    const newUser: SaaSUser = {
      ...userData,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      organizationId: targetOrgId,
      createdAt: new Date().toISOString(),
      permissions: userData.permissions || DEFAULT_PERMISSIONS_BY_ROLE[userData.role] || DEFAULT_PERMISSIONS_BY_ROLE.member,
    };

    // Save directly to Supabase public.users table
    const cloudRes = await cloudSync.createCloudUser(newUser);
    if (!cloudRes.success) {
      return { success: false, error: cloudRes.error || 'Failed to save user in cloud database.' };
    }

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(nextUsers));
    return { success: true };
  };

  const updateUserById = async (id: string, updates: Partial<SaaSUser>): Promise<{ success: boolean; error?: string }> => {
    const target = users.find((u) => u.id === id);
    if (!target) return { success: false, error: 'User not found.' };

    const isTargetMaster = target.email.toLowerCase() === MASTER_SUPER_ADMIN_EMAIL.toLowerCase();

    // Prevent non-master from modifying master super admin
    if (isTargetMaster && !isMasterSuperAdmin) {
      return { success: false, error: 'Security Restriction: Only the Master Super Admin can modify their own account.' };
    }

    // Master Super Admin can never be demoted or suspended
    if (isTargetMaster) {
      if (updates.role && updates.role !== 'owner') {
        return { success: false, error: `${MASTER_SUPER_ADMIN_EMAIL} is the permanent Master Super Admin and cannot be demoted.` };
      }
      if (updates.status === 'suspended') {
        return { success: false, error: `${MASTER_SUPER_ADMIN_EMAIL} is the Master Super Admin and cannot be suspended.` };
      }
    }

    // Strict constraint: Only Super Admin can modify roles, organization assignment, or permission responsibilities
    const isModifyingRoleOrPerms = (updates.role !== undefined && updates.role !== target.role) || updates.permissions !== undefined || updates.organizationId !== undefined;
    if (isModifyingRoleOrPerms && !isSuperAdmin) {
      return { success: false, error: 'Strict Security Restriction: Only Super Admin can assign or alter roles, organizations, and responsibilities.' };
    }

    if (!isSuperAdmin && !hasPermission('canManageUsers') && user?.id !== id) {
      return { success: false, error: 'Permission denied: Cannot edit other team members.' };
    }

    // Prevent non-super admin from demoting the owner
    if (target.role === 'owner' && !isSuperAdmin) {
      return { success: false, error: 'Cannot modify Super Admin owner account.' };
    }

    // Auto-align permissions if role changed and no explicit permissions provided
    let newPermissions = updates.permissions || target.permissions;
    if (updates.role && updates.role !== target.role && !updates.permissions) {
      newPermissions = DEFAULT_PERMISSIONS_BY_ROLE[updates.role];
    }

    const updatedUser: SaaSUser = {
      ...target,
      ...updates,
      permissions: newPermissions,
    };

    // Update in Supabase public.users table
    const cloudRes = await cloudSync.updateCloudUser(id, updates);
    if (!cloudRes.success) {
      return { success: false, error: cloudRes.error || 'Failed to update user in cloud database.' };
    }

    const nextUsers = users.map((u) => (u.id === id ? updatedUser : u));
    setUsers(nextUsers);
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(nextUsers));

    // If current logged in user was modified, update their session
    if (user?.id === id) {
      setUser(updatedUser);
      if (organization) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: updatedUser, organization }));
      }
    }

    return { success: true };
  };

  const deleteUserById = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) {
      return { success: false, error: 'Only Super Admin can delete team users.' };
    }

    const target = users.find((u) => u.id === id);
    if (!target) return { success: false, error: 'User not found.' };

    if (target.email.toLowerCase() === MASTER_SUPER_ADMIN_EMAIL.toLowerCase()) {
      return { success: false, error: `${MASTER_SUPER_ADMIN_EMAIL} is the permanent Master Super Admin and can never be deleted.` };
    }
    if (target.role === 'owner' && !isMasterSuperAdmin) {
      return { success: false, error: 'Super Admin owner account cannot be deleted.' };
    }
    if (target.id === user?.id) {
      return { success: false, error: 'You cannot delete your own active account.' };
    }

    // Delete directly from Supabase public.users table
    const cloudRes = await cloudSync.deleteCloudUser(id);
    if (!cloudRes.success) {
      return { success: false, error: cloudRes.error || 'Failed to delete user from cloud database.' };
    }

    const nextUsers = users.filter((u) => u.id !== id);
    setUsers(nextUsers);
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(nextUsers));
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        organizations,
        isAuthenticated: !!user,
        isSuperAdmin,
        isLoading,
        users,
        login,
        demoLogin,
        register,
        logout,
        updateUser,
        updateOrganization,
        switchOrganization,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        createUser,
        updateUserById,
        deleteUserById,
        hasPermission,
        isPaymentLedgerEnabled,
        setPaymentLedgerEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      organization: null,
      organizations: [],
      isAuthenticated: false,
      isSuperAdmin: false,
      isLoading: false,
      users: [],
      login: async () => ({ success: false, error: 'Auth provider not ready' }),
      demoLogin: async () => { },
      register: async () => ({ success: false, error: 'Auth provider not ready' }),
      logout: () => { },
      updateUser: () => { },
      updateOrganization: () => { },
      switchOrganization: () => { },
      createWorkspace: async () => ({ success: false, error: 'Auth provider not ready' }),
      updateWorkspace: async () => ({ success: false, error: 'Auth provider not ready' }),
      deleteWorkspace: async () => ({ success: false, error: 'Auth provider not ready' }),
      createUser: async () => ({ success: false, error: 'Auth provider not ready' }),
      updateUserById: async () => ({ success: false, error: 'Auth provider not ready' }),
      deleteUserById: async () => ({ success: false, error: 'Auth provider not ready' }),
      hasPermission: () => false,
      isPaymentLedgerEnabled: true,
      setPaymentLedgerEnabled: async () => { },
    };
  }
  return ctx;
};
