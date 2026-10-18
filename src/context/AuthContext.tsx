import React, { createContext, useContext, useState, useEffect } from 'react';
import { SaaSUser, SaaSOrganization, AuthContextType, SaaSPlan } from '../types/auth';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ORG: SaaSOrganization = {
  id: 'org_tisha_main',
  name: 'Tisha LED Walls',
  slug: 'tisha-led-walls',
  logoUrl: 'https://res.cloudinary.com/dcfouzaii/image/upload/f_auto,q_auto,w_160/v1763444919/logo_a6xmsh.png',
  phone: '+91 98100 12345',
  email: 'contact@tishaledwalls.com',
  plan: 'pro',
  planValidUntil: '2027-12-31',
  quotesLimit: 1000,
  quotesCount: 42,
  storageUsedMb: 18.5,
};

const DEMO_USERS: Record<string, { user: SaaSUser; pass: string; org: SaaSOrganization }> = {
  'admin@tishaledwalls.com': {
    pass: 'admin123',
    user: {
      id: 'usr_admin_01',
      name: 'Mayank Saini',
      email: 'admin@tishaledwalls.com',
      role: 'owner',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      organizationId: 'org_tisha_main',
      createdAt: '2026-01-01',
    },
    org: DEFAULT_ORG,
  },
  'sales@tishaledwalls.com': {
    pass: 'sales123',
    user: {
      id: 'usr_sales_02',
      name: 'Pooja Verma',
      email: 'sales@tishaledwalls.com',
      role: 'manager',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      organizationId: 'org_tisha_main',
      createdAt: '2026-02-15',
    },
    org: DEFAULT_ORG,
  },
};

const SESSION_KEY = 'tisha_saas_auth_session';
const REGISTERED_USERS_KEY = 'tisha_saas_registered_users';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SaaSUser | null>(null);
  const [organization, setOrganization] = useState<SaaSOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage or Supabase
  useEffect(() => {
    const initSession = async () => {
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const mappedUser: SaaSUser = {
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              role: (session.user.user_metadata?.role as SaaSUser['role']) || 'owner',
              organizationId: session.user.user_metadata?.orgId || DEFAULT_ORG.id,
              createdAt: session.user.created_at,
            };
            setUser(mappedUser);
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

        // Default: If no session, auto-login with default admin so existing workflows continue uninterrupted,
        // or user can test login/logout anytime.
        // To allow testing login screen, we check if user explicitly logged out:
        const explicitlyLoggedOut = sessionStorage.getItem('tisha_logged_out');
        if (!explicitlyLoggedOut) {
          const defaultAdmin = DEMO_USERS['admin@tishaledwalls.com'];
          setUser(defaultAdmin.user);
          setOrganization(defaultAdmin.org);
          localStorage.setItem(SESSION_KEY, JSON.stringify({ user: defaultAdmin.user, organization: defaultAdmin.org }));
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

      // Check Supabase if configured
      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
        if (data.user) {
          const loggedUser: SaaSUser = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
            email: data.user.email || cleanEmail,
            role: (data.user.user_metadata?.role as SaaSUser['role']) || 'owner',
            organizationId: data.user.user_metadata?.orgId || DEFAULT_ORG.id,
            createdAt: data.user.created_at,
          };
          setUser(loggedUser);
          setOrganization(DEFAULT_ORG);
          sessionStorage.removeItem('tisha_logged_out');
          localStorage.setItem(SESSION_KEY, JSON.stringify({ user: loggedUser, organization: DEFAULT_ORG }));
          setIsLoading(false);
          return { success: true };
        }
      }

      // Check Demo Accounts
      if (DEMO_USERS[cleanEmail]) {
        const demo = DEMO_USERS[cleanEmail];
        if (demo.pass === password || password === 'admin' || password === 'demo') {
          setUser(demo.user);
          setOrganization(demo.org);
          sessionStorage.removeItem('tisha_logged_out');
          localStorage.setItem(SESSION_KEY, JSON.stringify({ user: demo.user, organization: demo.org }));
          setIsLoading(false);
          return { success: true };
        }
        setIsLoading(false);
        return { success: false, error: 'Invalid password. (Tip: Demo password is "admin123")' };
      }

      // Check registered custom users
      const rawRegistered = localStorage.getItem(REGISTERED_USERS_KEY);
      if (rawRegistered) {
        const registeredList: Array<{ user: SaaSUser; pass: string; org: SaaSOrganization }> = JSON.parse(rawRegistered);
        const match = registeredList.find((r) => r.user.email.toLowerCase() === cleanEmail);
        if (match) {
          if (match.pass === password) {
            setUser(match.user);
            setOrganization(match.org);
            sessionStorage.removeItem('tisha_logged_out');
            localStorage.setItem(SESSION_KEY, JSON.stringify({ user: match.user, organization: match.org }));
            setIsLoading(false);
            return { success: true };
          }
          setIsLoading(false);
          return { success: false, error: 'Incorrect password for this account.' };
        }
      }

      setIsLoading(false);
      return { success: false, error: 'No account found with this email. Click "Sign Up" to register.' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed.' };
    }
  };

  const demoLogin = async (role: 'owner' | 'manager' = 'owner') => {
    const key = role === 'owner' ? 'admin@tishaledwalls.com' : 'sales@tishaledwalls.com';
    const demo = DEMO_USERS[key];
    setUser(demo.user);
    setOrganization(demo.org);
    sessionStorage.removeItem('tisha_logged_out');
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: demo.user, organization: demo.org }));
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
        id: `usr_${Date.now()}`,
        name: data.userName,
        email: cleanEmail,
        role: 'owner',
        organizationId: newOrg.id,
        createdAt: new Date().toISOString(),
      };

      // Store in registered users
      const rawRegistered = localStorage.getItem(REGISTERED_USERS_KEY);
      const registeredList = rawRegistered ? JSON.parse(rawRegistered) : [];
      registeredList.push({ user: newUser, pass: data.password, org: newOrg });
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredList));

      setUser(newUser);
      setOrganization(newOrg);
      sessionStorage.removeItem('tisha_logged_out');
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: newUser, organization: newOrg }));
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setOrganization(null);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem('tisha_logged_out', 'true');
  };

  const updateUser = (data: Partial<SaaSUser>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    if (organization) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: updated, organization }));
    }
  };

  const updateOrganization = (data: Partial<SaaSOrganization>) => {
    if (!organization) return;
    const updated = { ...organization, ...data };
    setOrganization(updated);
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user, organization: updated }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isAuthenticated: !!user,
        isLoading,
        login,
        demoLogin,
        register,
        logout,
        updateUser,
        updateOrganization,
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
      isAuthenticated: false,
      isLoading: false,
      login: async () => ({ success: false, error: 'Auth provider not ready' }),
      demoLogin: async () => {},
      register: async () => ({ success: false, error: 'Auth provider not ready' }),
      logout: () => {},
      updateUser: () => {},
      updateOrganization: () => {},
    };
  }
  return ctx;
};
