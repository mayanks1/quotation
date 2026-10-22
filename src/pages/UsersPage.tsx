import React, { useState } from 'react';
import {
  Users, UserPlus, Shield, ShieldAlert, ShieldCheck,
  Trash2, Edit, CheckCircle2, XCircle, Lock, Key,
  Crown, Briefcase, User, Mail, Phone, Sparkles, Check, AlertTriangle,
  Building2, Plus, ExternalLink, ArrowRight, RefreshCw, FolderPlus,
  CheckCheck, Globe, Zap, Layers, Search, Filter, CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast, useConfirm } from '../context/ToastContext';
import {
  SaaSUser, UserRole, UserStatus, UserPermissions,
  DEFAULT_PERMISSIONS_BY_ROLE, SaaSOrganization, SaaSPlan, MASTER_SUPER_ADMIN_EMAIL
} from '../types/auth';
import { LedgerPasscodeModal } from '../components/ledger/LedgerPasscodeModal';

export const UsersPage: React.FC = () => {
  const {
    user: currentUser,
    users,
    organization: currentOrganization,
    organizations,
    isSuperAdmin,
    hasPermission,
    createUser,
    updateUserById,
    deleteUserById,
    switchOrganization,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    isPaymentLedgerEnabled,
    setPaymentLedgerEnabled,
  } = useAuth();

  const toast = useToast();
  const { confirm } = useConfirm();

  // Active Tab: Team Members vs Workspaces
  const [activeTab, setActiveTab] = useState<'members' | 'workspaces'>('members');
  const [filterWorkspace, setFilterWorkspace] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SaaSUser | null>(null);

  // User Form State
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
    organizationId: string;
    permissions: UserPermissions;
  }>({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'manager',
    status: 'active',
    organizationId: currentOrganization?.id || 'org_tisha_main',
    permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE.manager },
  });

  // Workspace Modal State
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<SaaSOrganization | null>(null);
  const [workspaceForm, setWorkspaceForm] = useState<{
    name: string;
    slug: string;
    plan: SaaSPlan;
    email: string;
    phone: string;
    logoUrl: string;
    quotesLimit: number;
    autoSwitch: boolean;
  }>({
    name: '',
    slug: '',
    plan: 'pro',
    email: '',
    phone: '',
    logoUrl: '',
    quotesLimit: 1000,
    autoSwitch: true,
  });

  const canManage = isSuperAdmin || hasPermission('canManageUsers');
  const canAccessLedgerModule = isSuperAdmin || hasPermission('canViewPaymentLedger');

  // Ledger Module Toggle State & Passcode Protection
  const [isLedgerPasscodeModalOpen, setIsLedgerPasscodeModalOpen] = useState(false);
  const [pendingLedgerEnabled, setPendingLedgerEnabled] = useState<boolean | null>(null);

  const handleToggleLedgerModule = () => {
    if (!canAccessLedgerModule) {
      toast.error('Restricted: You do not have permission in the Permissions Matrix to manage the Payment Ledger module.');
      return;
    }
    const nextState = !isPaymentLedgerEnabled;
    setPendingLedgerEnabled(nextState);
    setIsLedgerPasscodeModalOpen(true);
  };

  const handleLedgerPasscodeSuccess = async () => {
    setIsLedgerPasscodeModalOpen(false);
    if (pendingLedgerEnabled !== null) {
      await setPaymentLedgerEnabled(pendingLedgerEnabled);
      if (pendingLedgerEnabled) {
        toast.success('Payment Ledger module enabled! User visibility is now regulated by the Permissions Matrix.');
      } else {
        toast.info('Payment Ledger module disabled and hidden system-wide.');
      }
      setPendingLedgerEnabled(null);
    }
  };

  // Open Create Member Modal
  const handleOpenCreate = () => {
    if (!isSuperAdmin) {
      toast.error('Strict Restriction: Only Super Admin can create new team members.');
      return;
    }
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'manager',
      status: 'active',
      organizationId: currentOrganization?.id || 'org_tisha_main',
      permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE.manager },
    });
    setEditingUser(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Member Modal
  const handleOpenEdit = (target: SaaSUser) => {
    setEditingUser(target);
    setFormData({
      name: target.name,
      email: target.email,
      password: target.password || '',
      phone: target.phone || '',
      role: target.role,
      status: target.status,
      organizationId: target.organizationId || currentOrganization?.id || 'org_tisha_main',
      permissions: {
        ...DEFAULT_PERMISSIONS_BY_ROLE[target.role],
        ...target.permissions,
        canViewPaymentLedger: target.permissions?.canViewPaymentLedger !== undefined
          ? Boolean(target.permissions.canViewPaymentLedger)
          : Boolean(DEFAULT_PERMISSIONS_BY_ROLE[target.role]?.canViewPaymentLedger),
        canManageEmailDigest: target.permissions?.canManageEmailDigest !== undefined
          ? Boolean(target.permissions.canManageEmailDigest)
          : Boolean(DEFAULT_PERMISSIONS_BY_ROLE[target.role]?.canManageEmailDigest),
        canManageDowntimeSync: target.permissions?.canManageDowntimeSync !== undefined
          ? Boolean(target.permissions.canManageDowntimeSync)
          : Boolean(DEFAULT_PERMISSIONS_BY_ROLE[target.role]?.canManageDowntimeSync),
      },
    });
    setIsCreateModalOpen(true);
  };

  const handleRoleChange = (role: UserRole) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admin can reassign user roles.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      role,
      permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE[role] },
    }));
  };

  const handlePermissionToggle = (perm: keyof UserPermissions) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admin can alter permission responsibilities.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [perm]: !prev.permissions[perm],
      },
    }));
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Please enter user name and email.');
      return;
    }

    if (editingUser) {
      const res = await updateUserById(editingUser.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password || editingUser.password,
        role: formData.role,
        status: formData.status,
        organizationId: formData.organizationId,
        permissions: formData.permissions,
      });

      if (res.success) {
        toast.success(`Updated user ${formData.name}`);
        setIsCreateModalOpen(false);
      } else {
        toast.error(res.error || 'Failed to update user');
      }
    } else {
      if (!isSuperAdmin) {
        toast.error('Only Super Admin can create users.');
        return;
      }
      if (!formData.password) {
        toast.error('Please enter an initial password for the user.');
        return;
      }
      const res = await createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
        status: formData.status,
        organizationId: formData.organizationId || currentOrganization?.id || 'org_tisha_main',
        permissions: formData.permissions,
      });

      if (res.success) {
        toast.success(`User ${formData.name} created successfully!`);
        setIsCreateModalOpen(false);
      } else {
        toast.error(res.error || 'Failed to create user');
      }
    }
  };

  const handleDeleteUser = async (target: SaaSUser) => {
    if (!isSuperAdmin) {
      toast.error('Strict Security Restriction: Only Super Admin can delete users.');
      return;
    }
    if (target.email.toLowerCase() === MASTER_SUPER_ADMIN_EMAIL.toLowerCase()) {
      toast.error(`${MASTER_SUPER_ADMIN_EMAIL} is the permanent Master Super Admin and cannot be deleted.`);
      return;
    }
    const ok = await confirm({
      title: `Delete User "${target.name}"?`,
      message: `Are you sure you want to remove ${target.email} from the workspace? They will immediately lose access.`,
      confirmText: 'Delete User',
      variant: 'danger',
    });
    if (!ok) return;

    const res = await deleteUserById(target.id);
    if (res.success) {
      toast.success(`User ${target.name} deleted.`);
    } else {
      toast.error(res.error || 'Could not delete user.');
    }
  };

  const handleToggleStatus = async (target: SaaSUser) => {
    if (!isSuperAdmin) {
      toast.error('Strict Security Restriction: Only Super Admin can activate or suspend team users.');
      return;
    }
    if (target.email.toLowerCase() === MASTER_SUPER_ADMIN_EMAIL.toLowerCase() || target.role === 'owner') {
      toast.warning('Super Admin owner cannot be suspended.');
      return;
    }
    const nextStatus: UserStatus = target.status === 'active' ? 'suspended' : 'active';
    const res = await updateUserById(target.id, { status: nextStatus });
    if (res.success) {
      toast.info(`User ${target.name} is now ${nextStatus}.`);
    } else {
      toast.error(res.error || 'Failed to toggle status.');
    }
  };

  // Workspace Actions
  const handleOpenCreateWorkspace = () => {
    if (!isSuperAdmin) {
      toast.error('Only Master Super Admin can provision new organization workspaces.');
      return;
    }
    setEditingWorkspace(null);
    setWorkspaceForm({
      name: '',
      slug: '',
      plan: 'pro',
      email: '',
      phone: '',
      logoUrl: '',
      quotesLimit: 1000,
      autoSwitch: true,
    });
    setIsWorkspaceModalOpen(true);
  };

  const handleOpenEditWorkspace = (org: SaaSOrganization) => {
    if (!isSuperAdmin) {
      toast.error('Only Master Super Admin can edit organization workspaces.');
      return;
    }
    setEditingWorkspace(org);
    setWorkspaceForm({
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      email: org.email || '',
      phone: org.phone || '',
      logoUrl: org.logoUrl || '',
      quotesLimit: org.quotesLimit || 1000,
      autoSwitch: false,
    });
    setIsWorkspaceModalOpen(true);
  };

  const handleSubmitWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceForm.name.trim()) {
      toast.error('Please enter an organization name.');
      return;
    }

    if (editingWorkspace) {
      const res = await updateWorkspace(editingWorkspace.id, {
        name: workspaceForm.name.trim(),
        slug: workspaceForm.slug.trim(),
        plan: workspaceForm.plan,
        email: workspaceForm.email.trim(),
        phone: workspaceForm.phone.trim(),
        logoUrl: workspaceForm.logoUrl.trim() || undefined,
        quotesLimit: workspaceForm.quotesLimit,
      });

      if (res.success) {
        toast.success(`Workspace "${workspaceForm.name}" updated successfully.`);
        setIsWorkspaceModalOpen(false);
      } else {
        toast.error(res.error || 'Failed to update workspace.');
      }
    } else {
      const res = await createWorkspace({
        name: workspaceForm.name.trim(),
        slug: workspaceForm.slug.trim(),
        plan: workspaceForm.plan,
        email: workspaceForm.email.trim(),
        phone: workspaceForm.phone.trim(),
        logoUrl: workspaceForm.logoUrl.trim() || undefined,
        quotesLimit: workspaceForm.quotesLimit,
      });

      if (res.success && res.org) {
        toast.success(`Workspace "${res.org.name}" created successfully!`);
        if (workspaceForm.autoSwitch) {
          switchOrganization(res.org.id);
          toast.info(`Switched active context to "${res.org.name}".`);
        }
        setIsWorkspaceModalOpen(false);
      } else {
        toast.error(res.error || 'Failed to create workspace.');
      }
    }
  };

  const handleDeleteWorkspace = async (org: SaaSOrganization) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admin can delete workspaces.');
      return;
    }
    if (org.id === 'org_tisha_main') {
      toast.warning('The primary Tisha LED Walls workspace cannot be deleted.');
      return;
    }

    const orgUsersCount = users.filter((u) => u.organizationId === org.id).length;
    const ok = await confirm({
      title: `Delete Workspace "${org.name}"?`,
      message: `Are you sure you want to delete this organization workspace? ${orgUsersCount > 0 ? `It currently has ${orgUsersCount} assigned team member(s).` : ''
        } All workspace context will be removed.`,
      confirmText: 'Delete Workspace',
      variant: 'danger',
    });
    if (!ok) return;

    const res = await deleteWorkspace(org.id);
    if (res.success) {
      toast.success(`Workspace "${org.name}" deleted.`);
    } else {
      toast.error(res.error || 'Failed to delete workspace.');
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (filterWorkspace !== 'all' && (u.organizationId || 'org_tisha_main') !== filterWorkspace) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchRole = u.role.toLowerCase().includes(q);
      return matchName || matchEmail || matchRole;
    }
    return true;
  });

  return (
    <div className="relative max-w-7xl mx-auto pb-12">
      {/* Ambient background glow effects */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40">
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-10 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Top Header Card */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/65 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.45)] ring-1 ring-white/20 shrink-0 mt-0.5 sm:mt-0">
            {activeTab === 'members' ? <Users size={22} /> : <Building2 size={22} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
                {activeTab === 'members' ? 'Team & Role Management' : 'Organization Workspaces'}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-xs whitespace-nowrap shrink-0 inline-flex items-center">
                {activeTab === 'members'
                  ? `${users.length} Member${users.length !== 1 ? 's' : ''}`
                  : `${organizations.length} Workspace${organizations.length !== 1 ? 's' : ''}`
                }
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {activeTab === 'members'
                ? 'Role-Based Access Control (RBAC). Only Super Admin can provision accounts and configure financial access.'
                : 'Multi-Tenant SaaS Engine. Master Super Admin oversight to provision and manage distinct client workspaces.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'members' ? (
            isSuperAdmin ? (
              <button
                onClick={handleOpenCreate}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-[0_0_25px_rgba(168,85,247,0.35)] active:scale-95 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>Add Team Member</span>
              </button>
            ) : (
              <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-950/80 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold shadow-xs">
                <Lock size={14} className="text-amber-400" />
                <span>Creation Locked to Super Admin</span>
              </div>
            )
          ) : (
            isSuperAdmin && (
              <button
                onClick={handleOpenCreateWorkspace}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-[0_0_25px_rgba(168,85,247,0.35)] active:scale-95 cursor-pointer"
              >
                <FolderPlus size={16} />
                <span>New Workspace</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* System Modules & Suite Features Switch: Controlled by Super Admin & Permissions Matrix */}
      {canAccessLedgerModule && (
        <div className="relative z-10 bg-slate-900/60 backdrop-blur-xl text-white p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
              isPaymentLedgerEnabled
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-slate-800/80 text-slate-500 border-white/5'
            }`}>
              <CreditCard size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Payment Ledger Module</span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  isPaymentLedgerEnabled
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-xs'
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                }`}>
                  {isPaymentLedgerEnabled ? 'Module Active' : 'Module Hidden'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isPaymentLedgerEnabled
                  ? 'Payment Ledger is enabled in the suite navigation. Access for individual members is regulated below via the Permissions Matrix.'
                  : 'Payment Ledger is turned off and hidden system-wide from the navigation for all users.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleToggleLedgerModule}
              className="relative inline-flex items-center cursor-pointer select-none group focus:outline-hidden"
              title="Click to toggle Payment Ledger Module (Passcode Required)"
            >
              <div className={`w-11 h-6 rounded-full transition-colors relative p-0.5 border border-white/10 ${
                isPaymentLedgerEnabled ? 'bg-emerald-500' : 'bg-slate-800'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ease-in-out transform ${
                  isPaymentLedgerEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
              <span className="ml-2.5 text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                {isPaymentLedgerEnabled ? 'Show Ledger' : 'Hide Ledger'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs (Luxury Glass Dock) */}
      <div className="relative z-10 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-1.5 flex items-center justify-between shadow-lg overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={15} />
            <span>Team Members</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'members' ? 'bg-white/20 text-white font-black' : 'bg-slate-800/80 text-slate-400 border border-white/5'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('workspaces')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'workspaces'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 size={15} />
            <span>Workspaces &amp; Organizations</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'workspaces' ? 'bg-white/20 text-white font-black' : 'bg-slate-800/80 text-slate-400 border border-white/5'
            }`}>
              {organizations.length}
            </span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30 ml-1">
              Super Admin
            </span>
          </button>
        </div>

        {/* Active Workspace Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-950/60 text-slate-300 rounded-xl text-xs font-bold border border-white/10 shrink-0">
          <span className="text-slate-400 font-normal">Active Context:</span>
          <span className="text-purple-300 flex items-center gap-1.5 font-extrabold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            {currentOrganization?.name || 'Tisha LED Walls'}
          </span>
        </div>
      </div>

      {/* TAB 1: TEAM MEMBERS */}
      {activeTab === 'members' && (
        <div className="relative z-10 space-y-4">

          {/* Master Super Admin Notice Card */}
          <div className="p-4 sm:p-5 bg-purple-950/40 border border-purple-500/30 rounded-2xl flex items-start gap-3.5 text-xs text-purple-200 leading-relaxed shadow-xl backdrop-blur-md">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30 shadow-xs">
              <Crown size={18} />
            </div>
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2 flex-wrap">
                <span className="text-white text-sm font-black">Master Super Admin &amp; Authority Model</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-purple-900/80 text-purple-200 rounded-full border border-purple-400/40 font-mono break-all">
                  {MASTER_SUPER_ADMIN_EMAIL}
                </span>
              </div>
              <p className="text-purple-200/90 text-xs">
                <strong className="text-white break-all">{MASTER_SUPER_ADMIN_EMAIL}</strong> holds permanent Master Super Admin authority across all multi-tenant workspaces. Only the Super Admin can provision accounts, create new organization workspaces, and configure financial permission matrices.
              </p>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/65 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-lg">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                <Filter size={13} className="text-purple-400" />
                Workspace:
              </span>
              <select
                value={filterWorkspace}
                onChange={(e) => setFilterWorkspace(e.target.value)}
                className="w-full sm:w-60 px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all cursor-pointer"
              >
                <option value="all">All Workspaces ({users.length})</option>
                {organizations.map((org) => {
                  const count = users.filter((u) => (u.organizationId || 'org_tisha_main') === org.id).length;
                  return (
                    <option key={org.id} value={org.id}>
                      {org.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Mobile View: Team Member Cards (md:hidden) */}
          <div className="md:hidden space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/65 backdrop-blur-xl rounded-2xl border border-white/10 text-slate-400 text-xs shadow-lg">
                No team members found matching current filters.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isUserMaster = u.email.toLowerCase() === MASTER_SUPER_ADMIN_EMAIL.toLowerCase();
                const isUserOwner = u.role === 'owner' || isUserMaster;
                const isCurrent = u.id === currentUser?.id;
                const userOrg = organizations.find((o) => o.id === (u.organizationId || 'org_tisha_main')) || {
                  name: 'Tisha LED Walls',
                  plan: 'pro'
                };

                return (
                  <div
                    key={u.id}
                    className="bg-slate-900/75 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-xl space-y-3.5 relative overflow-hidden"
                  >
                    {/* Top glow accent stripe */}
                    <div
                      className={`absolute top-0 inset-x-0 h-0.5 ${
                        isUserOwner
                          ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                      }`}
                    />

                    {/* Member Profile Header */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-11 h-11 rounded-xl object-cover border border-white/10 shadow-md shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shrink-0 shadow-md ring-1 ring-white/10 ${
                              isUserOwner
                                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                                : 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white'
                            }`}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-extrabold text-white text-sm flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{u.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 bg-blue-950/80 text-blue-300 border border-blue-500/40 rounded-full">
                                You
                              </span>
                            )}
                            {isUserMaster && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-950/80 text-amber-300 rounded border border-amber-500/40">
                                Master
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px] truncate mt-0.5">{u.email}</div>
                          {u.phone && <div className="text-slate-500 text-[10px] font-mono mt-0.5">{u.phone}</div>}
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {canManage && (
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Edit Role & Permissions"
                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800/80 hover:bg-purple-600/30 border border-white/10 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <Edit size={14} />
                          </button>
                        )}

                        {isSuperAdmin && !isUserOwner && !isUserMaster && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User"
                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-500/20 border border-white/10 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Attributes Bar: Role, Status, Workspace */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                      {/* Role Badge */}
                      {u.role === 'owner' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-xs">
                          <Crown size={12} className="text-purple-400" />
                          <span>Super Admin</span>
                        </span>
                      )}
                      {u.role === 'admin' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-xs">
                          <Shield size={12} className="text-blue-400" />
                          <span>Admin</span>
                        </span>
                      )}
                      {u.role === 'manager' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-xs">
                          <Briefcase size={12} className="text-emerald-400" />
                          <span>Sales Manager</span>
                        </span>
                      )}
                      {u.role === 'member' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-800/80 text-slate-300 border border-slate-700 shadow-xs">
                          <User size={12} className="text-slate-400" />
                          <span>Executive</span>
                        </span>
                      )}

                      {/* Status Toggle */}
                      <button
                        onClick={() => canManage && handleToggleStatus(u)}
                        disabled={!canManage || isUserOwner}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-all ${
                          u.status === 'active'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]'
                        } ${(!canManage || isUserOwner) ? 'cursor-default opacity-90' : 'cursor-pointer active:scale-95'}`}
                      >
                        {u.status === 'active' ? (
                          <>
                            <CheckCircle2 size={11} className="text-emerald-400" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={11} className="text-rose-400" />
                            <span>Suspended</span>
                          </>
                        )}
                      </button>

                      {/* Workspace context */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10.5px] font-semibold bg-slate-950/80 text-slate-300 border border-white/10 shrink-0">
                        <Building2 size={11} className="text-purple-400 shrink-0" />
                        <span className="truncate max-w-[130px] font-medium">{userOrg.name}</span>
                      </span>
                    </div>

                    {/* Permissions Matrix Pills Box */}
                    <div className="bg-slate-950/70 rounded-xl p-2.5 border border-white/5 space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-300 font-bold">
                          <Shield size={11} className="text-purple-400" />
                          Permissions Matrix
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-500">
                          {[
                            u.permissions.canEditBankDetails,
                            u.permissions.canDeleteQuotes,
                            u.permissions.canManageUsers,
                            u.permissions.canRestoreBackups,
                            isPaymentLedgerEnabled && (isUserOwner || u.permissions.canViewPaymentLedger),
                            isUserOwner || u.permissions.canManageEmailDigest,
                            isUserOwner || u.permissions.canManageDowntimeSync,
                          ].filter(Boolean).length} / 7 active
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                          u.permissions.canEditBankDetails
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-900/60 text-slate-600 border border-white/5 line-through opacity-60'
                        }`}>
                          Bank / UPI
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                          u.permissions.canDeleteQuotes
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-900/60 text-slate-600 border border-white/5 line-through opacity-60'
                        }`}>
                          Delete Quotes
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                          u.permissions.canManageUsers
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-900/60 text-slate-600 border border-white/5 line-through opacity-60'
                        }`}>
                          Manage Users
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                          u.permissions.canRestoreBackups
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-900/60 text-slate-600 border border-white/5 line-through opacity-60'
                        }`}>
                          Restore DB
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                          isPaymentLedgerEnabled && (isUserOwner || u.permissions.canViewPaymentLedger)
                            ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-900/60 text-slate-600 border border-white/5 line-through opacity-60'
                        }`}>
                          Ledger Access
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                          isUserOwner || u.permissions.canManageEmailDigest
                            ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-900/60 text-slate-600 border border-white/5 line-through opacity-60'
                        }`}>
                          Email Digest
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                          isUserOwner || u.permissions.canManageDowntimeSync
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-900/60 text-slate-600 border border-white/5 line-through opacity-60'
                        }`}>
                          0% Sync
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View: Full Luxury Table (hidden md:block) */}
          <div className="hidden md:block bg-slate-900/65 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 font-bold border-b border-white/10 text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">User &amp; Contact</th>
                    <th className="py-3.5 px-4">Workspace / Organization</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Permissions Matrix</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No team members found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isUserMaster = u.email.toLowerCase() === MASTER_SUPER_ADMIN_EMAIL.toLowerCase();
                      const isUserOwner = u.role === 'owner' || isUserMaster;
                      const isCurrent = u.id === currentUser?.id;
                      const userOrg = organizations.find((o) => o.id === (u.organizationId || 'org_tisha_main')) || {
                        name: 'Tisha LED Walls',
                        plan: 'pro'
                      };

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* User Profile */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-md shrink-0"
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-md ring-2 ring-white/10 ${
                                  isUserOwner 
                                    ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white' 
                                    : 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white'
                                }`}>
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-blue-950/80 text-blue-300 border border-blue-500/30 rounded-full">
                                      You
                                    </span>
                                  )}
                                  {isUserMaster && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-950/80 text-amber-300 rounded border border-amber-500/40">
                                      Master
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-400 font-mono text-[11px] mt-0.5">{u.email}</div>
                                {u.phone && <div className="text-slate-500 text-[10px] font-mono">{u.phone}</div>}
                              </div>
                            </div>
                          </td>

                          {/* Workspace Column */}
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-950/60 text-slate-200 border border-white/10 shadow-xs">
                              <Building2 size={13} className="text-purple-400 shrink-0" />
                              <span className="truncate max-w-[140px] font-bold">{userOrg.name}</span>
                            </span>
                          </td>

                          {/* Role Badge */}
                          <td className="py-4 px-4">
                            {u.role === 'owner' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                                <Crown size={13} className="text-purple-400" />
                                <span>Super Admin</span>
                              </span>
                            )}
                            {u.role === 'admin' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
                                <Shield size={13} className="text-blue-400" />
                                <span>Admin</span>
                              </span>
                            )}
                            {u.role === 'manager' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                                <Briefcase size={13} className="text-emerald-400" />
                                <span>Sales Manager</span>
                              </span>
                            )}
                            {u.role === 'member' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-300 border border-slate-700">
                                <User size={13} className="text-slate-400" />
                                <span>Executive</span>
                              </span>
                            )}
                          </td>

                          {/* Permissions Matrix */}
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1.5 max-w-sm">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                u.permissions.canEditBankDetails
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-950/60 text-slate-600 border border-white/5 line-through'
                              }`}>
                                Bank / UPI
                              </span>

                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                u.permissions.canDeleteQuotes
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-950/60 text-slate-600 border border-white/5 line-through'
                              }`}>
                                Delete Quotes
                              </span>

                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                u.permissions.canManageUsers
                                  ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
                                  : 'bg-slate-950/60 text-slate-600 border border-white/5 line-through'
                              }`}>
                                Manage Users
                              </span>

                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                u.permissions.canRestoreBackups
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-950/60 text-slate-600 border border-white/5 line-through'
                              }`}>
                                Restore DB
                              </span>

                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                isPaymentLedgerEnabled && (isUserOwner || u.permissions.canViewPaymentLedger)
                                  ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                                  : 'bg-slate-950/60 text-slate-600 border border-white/5 line-through'
                              }`}>
                                Ledger Access
                              </span>

                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                isUserOwner || u.permissions.canManageEmailDigest
                                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-slate-950/60 text-slate-600 border border-white/5 line-through'
                              }`}>
                                Email Digest
                              </span>

                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                isUserOwner || u.permissions.canManageDowntimeSync
                                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-slate-950/60 text-slate-600 border border-white/5 line-through'
                              }`}>
                                0% Sync
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => canManage && handleToggleStatus(u)}
                              disabled={!canManage || isUserOwner}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                u.status === 'active'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)] hover:bg-emerald-900/80'
                                  : 'bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)] hover:bg-rose-900/80'
                              } ${(!canManage || isUserOwner) ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
                            >
                              {u.status === 'active' ? (
                                <>
                                  <CheckCircle2 size={12} className="text-emerald-400" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} className="text-rose-400" />
                                  <span>Suspended</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canManage && (
                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  title="Edit Role & Permissions"
                                  className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit size={15} />
                                </button>
                              )}

                              {isSuperAdmin && !isUserOwner && !isUserMaster && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  title="Delete User"
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORKSPACES & ORGANIZATIONS */}
      {activeTab === 'workspaces' && (
        <div className="relative z-10 space-y-6">

          {/* Active Workspace Focus Banner */}
          <div className="bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-slate-900 text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden border border-purple-500/30 backdrop-blur-xl">
            <div className="absolute right-0 top-0 w-80 h-full bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Currently Active Workspace
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40">
                    {currentOrganization?.plan?.toUpperCase()} TIER
                  </span>
                </div>

                <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>{currentOrganization?.name || 'Tisha LED Walls'}</span>
                </h2>

                <p className="text-xs text-slate-300 max-w-xl">
                  All quotes, clients, proposals, and ledger records created in this session are isolated inside this organization workspace.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center shadow-md">
                  <div className="text-lg font-black text-white font-mono">
                    {users.filter((u) => (u.organizationId || 'org_tisha_main') === currentOrganization?.id).length}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Members</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center shadow-md">
                  <div className="text-lg font-black text-white font-mono">
                    {currentOrganization?.quotesLimit || 1000}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Quote Limit</div>
                </div>
              </div>
            </div>
          </div>

          {/* Workspaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {organizations.map((org) => {
              const isActive = org.id === currentOrganization?.id;
              const orgMembers = users.filter((u) => (u.organizationId || 'org_tisha_main') === org.id);

              return (
                <div
                  key={org.id}
                  className={`bg-slate-900/60 backdrop-blur-xl rounded-2xl border p-5 shadow-lg transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 ${
                    isActive
                      ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.25)]'
                      : 'border-white/10 hover:border-purple-500/50 hover:shadow-xl'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Logo, Name, Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="w-12 h-12 rounded-xl object-contain border border-white/10 p-1 bg-slate-950 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md ring-2 ring-white/10 shrink-0">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-white text-sm truncate">
                            {org.name}
                          </h3>
                          <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                            /{org.slug}
                          </div>
                        </div>
                      </div>

                      <span className={`text-[9.5px] uppercase font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                        org.plan === 'enterprise'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                          : 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                      }`}>
                        {org.plan}
                      </span>
                    </div>

                    {/* Metadata Details */}
                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-300">
                      {org.email && (
                        <div className="flex items-center gap-2 truncate">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{org.email}</span>
                        </div>
                      )}
                      {org.phone && (
                        <div className="flex items-center gap-2 truncate">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{org.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10.5px]">
                        <span className="text-slate-400 font-semibold">Assigned Members:</span>
                        <span className="font-extrabold text-white">{orgMembers.length} user{orgMembers.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditWorkspace(org)}
                        title="Edit Workspace"
                        className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-white/10 rounded-lg transition-colors text-xs cursor-pointer"
                      >
                        <Edit size={14} />
                      </button>

                      {org.id !== 'org_tisha_main' && (
                        <button
                          onClick={() => handleDeleteWorkspace(org)}
                          title="Delete Workspace"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors text-xs cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {isActive ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 px-3 py-1.5 bg-emerald-950/80 rounded-xl border border-emerald-500/40 shadow-xs">
                        <CheckCheck size={14} />
                        <span>Active Context</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          switchOrganization(org.id);
                          toast.success(`Switched active context to ${org.name}`);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-slate-200 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 bg-slate-800/80 hover:bg-purple-600 transition-all cursor-pointer"
                      >
                        <span>Switch</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* MODAL 1: CREATE / EDIT TEAM MEMBER */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-hidden animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-150">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0 bg-slate-950 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-snug">
                    {editingUser ? `Edit ${editingUser.name}` : 'Create Team Member'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Provision credentials and configure granular operational permissions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">

                {/* Organization / Workspace Picker */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Assign to Workspace / Organization *
                  </label>
                  <select
                    value={formData.organizationId}
                    onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                    disabled={!isSuperAdmin}
                    className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-slate-950 font-semibold text-slate-200"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.plan.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Super Admin can provision members across any client workspace instance.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ramesh Joshi"
                      className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-slate-950 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="sales@tishaledwalls.com"
                      className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-mono bg-slate-950 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {editingUser ? 'Reset Password (optional)' : 'Initial Password *'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'Leave blank to keep current' : '••••••••'}
                      className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-slate-950 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-mono bg-slate-950 text-white"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-300">Assign User Role *</label>
                    {!isSuperAdmin && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                        <Lock size={10} /> Role locked to Super Admin
                      </span>
                    )}
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 ${!isSuperAdmin ? 'opacity-60 pointer-events-none' : ''}`}>
                    {[
                      { id: 'manager', label: 'Sales Manager', desc: 'Creates quotes, clients, signatures' },
                      { id: 'admin', label: 'Admin', desc: 'Can delete quotes & manage team' },
                      { id: 'member', label: 'Executive', desc: 'Draft quotes only' },
                    ].map((r) => (
                      <div
                        key={r.id}
                        onClick={() => handleRoleChange(r.id as UserRole)}
                        className={`cursor-pointer p-2.5 rounded-xl border text-center transition-all ${
                          formData.role === r.id
                            ? 'border-purple-500 bg-purple-950/60 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                            : 'border-white/10 hover:border-white/20 bg-slate-950/60 text-slate-400'
                        }`}
                      >
                        <div className="font-bold text-xs">{r.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Granular Permission Toggles */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Responsibilities &amp; Permissions:
                    </div>
                    {!isSuperAdmin && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded flex items-center gap-1 border border-amber-500/30">
                        <Lock size={10} /> Super Admin Only
                      </span>
                    )}
                  </div>

                  {!isSuperAdmin && (
                    <div className="p-2 bg-amber-950/40 border border-amber-500/30 rounded-lg text-[10.5px] text-amber-200 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                      <span>Role responsibilities can only be provisioned by the Super Admin account.</span>
                    </div>
                  )}

                  <div className={`space-y-1.5 ${!isSuperAdmin ? 'opacity-70 pointer-events-none' : ''}`}>
                    {[
                      { key: 'canViewPaymentLedger', label: 'Can Access Payment Ledger', desc: 'Allows viewing payments, financial transactions & client ledger' },
                      { key: 'canManageEmailDigest', label: 'Can Manage Email Digest & Reports', desc: 'Allows configuring weekly schedules, recipient lists, email templates & instant test dispatches' },
                      { key: 'canManageDowntimeSync', label: 'Can Manage 0% Downtime Sync & Failover', desc: 'Allows viewing & configuring 0% Downtime Dual-Cloud database failover, primary switch & manual sync' },
                      { key: 'canEditBankDetails', label: 'Can Edit Bank Details & UPI IDs', desc: 'Allows altering UPI ID & bank account on quotations (High Risk)', danger: true },
                      { key: 'canDeleteQuotes', label: 'Can Permanently Delete Quotations', desc: 'Allows deleting proposals from database' },
                      { key: 'canManageUsers', label: 'Can Manage Team Users', desc: 'Allows creating and editing team accounts' },
                      { key: 'canRestoreBackups', label: 'Can Restore Database Backups', desc: 'Allows restoring past JSON database dumps' },
                      { key: 'canApplyDiscounts', label: 'Can Apply Custom Discounts', desc: 'Allows overriding item rates and line discounts' },
                      { key: 'canManageClients', label: 'Can Edit Client Directory', desc: 'Allows updating client records' },
                    ].map((p) => {
                      const isChecked = formData.permissions[p.key as keyof UserPermissions];
                      return (
                        <label key={p.key} className="flex items-start gap-2.5 cursor-pointer p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            disabled={!isSuperAdmin}
                            checked={isChecked}
                            onChange={() => handlePermissionToggle(p.key as keyof UserPermissions)}
                            className="mt-0.5 rounded border-white/20 bg-slate-900 text-purple-600 focus:ring-purple-500 h-4 w-4 disabled:opacity-50"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold ${p.danger && isChecked ? 'text-amber-300 font-bold' : 'text-slate-200'}`}>
                              {p.label}
                            </div>
                            <div className="text-[10.5px] text-slate-400">{p.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-3.5 sm:p-4 border-t border-white/10 bg-slate-950 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-white/10 text-slate-300 rounded-xl font-bold hover:bg-white/5 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-md shadow-purple-600/25 text-xs transition-colors cursor-pointer"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT ORGANIZATION WORKSPACE */}
      {isWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-hidden animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-150">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0 bg-slate-950 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-snug">
                    {editingWorkspace ? `Edit ${editingWorkspace.name}` : 'Provision New Workspace'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Create an isolated multi-tenant organization workspace with custom branding &amp; quota.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkspaceModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitWorkspace} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Organization / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={workspaceForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      setWorkspaceForm({
                        ...workspaceForm,
                        name,
                        slug: editingWorkspace ? workspaceForm.slug : slug,
                      });
                    }}
                    placeholder="e.g. Acme Events & Media"
                    className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-slate-950 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Workspace Identifier / Slug
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-[11px]">
                        /
                      </span>
                      <input
                        type="text"
                        value={workspaceForm.slug}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        placeholder="acme-events"
                        className="w-full pl-6 pr-3 py-2 border border-white/10 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-slate-950 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Subscription Plan
                    </label>
                    <select
                      value={workspaceForm.plan}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, plan: e.target.value as SaaSPlan })}
                      className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-slate-950 text-slate-200"
                    >
                      <option value="starter">Starter Plan (Basic)</option>
                      <option value="pro">Pro Plan (Dual Signatures + UPI)</option>
                      <option value="enterprise">Enterprise Tier (Unlimited)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Organization Contact Email
                    </label>
                    <input
                      type="email"
                      value={workspaceForm.email}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, email: e.target.value })}
                      placeholder="admin@acmeevents.com"
                      className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-mono bg-slate-950 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      value={workspaceForm.phone}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-mono bg-slate-950 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Monthly Quotations Quota
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={50}
                      value={workspaceForm.quotesLimit}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, quotesLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-slate-950 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Logo Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={workspaceForm.logoUrl}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, logoUrl: e.target.value })}
                      placeholder="https://.../logo.png"
                      className="w-full px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-slate-950 text-white"
                    />
                  </div>
                </div>

                {!editingWorkspace && (
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workspaceForm.autoSwitch}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, autoSwitch: e.target.checked })}
                      className="rounded border-white/20 bg-slate-900 text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-purple-200">
                      Immediately switch active workspace to this organization upon creation
                    </span>
                  </label>
                )}

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-3.5 sm:p-4 border-t border-white/10 bg-slate-950 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(false)}
                  className="px-4 py-2 border border-white/10 text-slate-300 rounded-xl font-bold hover:bg-white/5 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-md shadow-purple-600/25 text-xs transition-colors cursor-pointer"
                >
                  {editingWorkspace ? 'Save Changes' : 'Create Workspace'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Ledger Passcode Verification Modal */}
      {isLedgerPasscodeModalOpen && (
        <LedgerPasscodeModal
          isOpen={isLedgerPasscodeModalOpen}
          onClose={() => {
            setIsLedgerPasscodeModalOpen(false);
            setPendingLedgerEnabled(null);
          }}
          onSuccess={handleLedgerPasscodeSuccess}
          title={pendingLedgerEnabled ? "Enter Security Passcode to Enable Ledger" : "Enter Security Passcode to Hide Ledger"}
          persistSessionUnlock={false}
        />
      )}

      </div>
    </div>
  );
};
