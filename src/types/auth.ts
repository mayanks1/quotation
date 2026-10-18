export type SaaSPlan = 'starter' | 'pro' | 'enterprise';

export interface SaaSUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  avatar?: string;
  organizationId: string;
  createdAt: string;
}

export interface SaaSOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  plan: SaaSPlan;
  planValidUntil?: string;
  quotesLimit: number;
  quotesCount: number;
  storageUsedMb: number;
}

export interface AuthContextType {
  user: SaaSUser | null;
  organization: SaaSOrganization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  demoLogin: (role?: 'owner' | 'manager') => Promise<void>;
  register: (data: {
    orgName: string;
    userName: string;
    email: string;
    password: string;
    phone?: string;
    plan?: SaaSPlan;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (data: Partial<SaaSUser>) => void;
  updateOrganization: (data: Partial<SaaSOrganization>) => void;
}
