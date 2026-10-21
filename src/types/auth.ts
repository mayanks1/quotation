export type SaaSPlan = 'starter' | 'pro' | 'enterprise';
export type UserRole = 'owner' | 'admin' | 'manager' | 'member';
export type UserStatus = 'active' | 'suspended';

export interface UserPermissions {
  canEditBankDetails: boolean; // Alter UPI ID, Bank Accounts, Company Legal GSTIN
  canDeleteQuotes: boolean;    // Permanently delete quotations
  canManageUsers: boolean;     // Add, edit, remove team users & assign roles
  canRestoreBackups: boolean;  // Overwrite database from backup files
  canApplyDiscounts: boolean;  // Apply manual line item or overall discounts
  canManageClients: boolean;   // Edit or delete clients in directory
  canExportData: boolean;      // Download CSV & bulk audit logs
  canViewPaymentLedger?: boolean; // Access & view Payment Ledger dashboard
  canManageEmailDigest?: boolean; // Configure & trigger weekly email digest and templates
}

export interface SaaSUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  organizationId: string;
  permissions: UserPermissions;
  createdAt: string;
  lastLogin?: string;
}

export const MASTER_SUPER_ADMIN_EMAIL = 'admin@tishaledwalls.com';

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
  status?: 'active' | 'suspended';
  createdAt?: string;
}

export interface AuthContextType {
  user: SaaSUser | null;
  organization: SaaSOrganization | null;
  organizations: SaaSOrganization[];
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  users: SaaSUser[];
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
  // Multi-Workspace / Organization Management
  switchOrganization: (orgId: string) => void;
  createWorkspace: (data: {
    name: string;
    slug?: string;
    plan?: SaaSPlan;
    email?: string;
    phone?: string;
    logoUrl?: string;
    quotesLimit?: number;
  }) => Promise<{ success: boolean; org?: SaaSOrganization; error?: string }>;
  updateWorkspace: (id: string, updates: Partial<SaaSOrganization>) => Promise<{ success: boolean; error?: string }>;
  deleteWorkspace: (id: string) => Promise<{ success: boolean; error?: string }>;
  // User Management
  createUser: (userData: Omit<SaaSUser, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  updateUserById: (id: string, updates: Partial<SaaSUser>) => Promise<{ success: boolean; error?: string }>;
  deleteUserById: (id: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (perm: keyof UserPermissions) => boolean;
  // Module System Switches
  isPaymentLedgerEnabled: boolean;
  setPaymentLedgerEnabled: (enabled: boolean) => Promise<void>;
}

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, UserPermissions> = {
  owner: {
    canEditBankDetails: true,
    canDeleteQuotes: true,
    canManageUsers: true,
    canRestoreBackups: true,
    canApplyDiscounts: true,
    canManageClients: true,
    canExportData: true,
    canViewPaymentLedger: true,
    canManageEmailDigest: true,
  },
  admin: {
    canEditBankDetails: false,
    canDeleteQuotes: true,
    canManageUsers: true,
    canRestoreBackups: false,
    canApplyDiscounts: true,
    canManageClients: true,
    canExportData: true,
    canViewPaymentLedger: true,
    canManageEmailDigest: true,
  },
  manager: {
    canEditBankDetails: false,
    canDeleteQuotes: false,
    canManageUsers: false,
    canRestoreBackups: false,
    canApplyDiscounts: true,
    canManageClients: true,
    canExportData: true,
    canViewPaymentLedger: true,
    canManageEmailDigest: false,
  },
  member: {
    canEditBankDetails: false,
    canDeleteQuotes: false,
    canManageUsers: false,
    canRestoreBackups: false,
    canApplyDiscounts: false,
    canManageClients: false,
    canExportData: false,
    canViewPaymentLedger: false,
    canManageEmailDigest: false,
  },
};
