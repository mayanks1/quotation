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
  const confirm = useConfirm();

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
      danger: true,
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
      message: `Are you sure you want to delete this organization workspace? ${
        orgUsersCount > 0 ? `It currently has ${orgUsersCount} assigned team member(s).` : ''
      } All workspace context will be removed.`,
      confirmText: 'Delete Workspace',
      danger: true,
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
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-100 shrink-0">
            {activeTab === 'members' ? <Users size={24} /> : <Building2 size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {activeTab === 'members' ? 'Team & Role Management' : 'Organization Workspaces'}
              </h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {activeTab === 'members' 
                  ? `${users.length} Member${users.length !== 1 ? 's' : ''}` 
                  : `${organizations.length} Workspace${organizations.length !== 1 ? 's' : ''}`
                }
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'members'
                ? 'Role-Based Access Control (RBAC). Only Super Admin can provision accounts and configure financial access.'
                : 'Multi-Tenant SaaS Engine. Master Super Admin oversight to provision and manage distinct client workspaces.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {activeTab === 'members' ? (
            isSuperAdmin ? (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/25 active:scale-95"
              >
                <UserPlus size={16} />
                <span>Add Team Member</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold">
                <Lock size={14} className="text-amber-600" />
                <span>Creation Locked to Super Admin</span>
              </div>
            )
          ) : (
            isSuperAdmin && (
              <button
                onClick={handleOpenCreateWorkspace}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/25 active:scale-95"
              >
                <FolderPlus size={16} />
                <span>New Workspace</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* System Modules & Suite Features Switch */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
            isPaymentLedgerEnabled 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : 'bg-slate-800/80 text-slate-500 border-slate-700'
          }`}>
            <CreditCard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Payment Ledger Module</span>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                isPaymentLedgerEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
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
          {isSuperAdmin ? (
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPaymentLedgerEnabled}
                onChange={async (e) => {
                  const val = e.target.checked;
                  await setPaymentLedgerEnabled(val);
                  if (val) {
                    toast.success('Payment Ledger module enabled! User visibility is now regulated by the Permissions Matrix.');
                  } else {
                    toast.info('Payment Ledger module disabled and hidden system-wide.');
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-2.5 text-xs font-bold text-slate-300">
                {isPaymentLedgerEnabled ? 'Show Ledger' : 'Hide Ledger'}
              </span>
            </label>
          ) : (
            <span className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <Lock size={12} /> Super Admin Only
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-px">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'members'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users size={15} />
            <span>Team Members</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'members' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('workspaces')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'workspaces'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 size={15} />
            <span>Workspaces &amp; Organizations</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'workspaces' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {organizations.length}
            </span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 ml-1">
              Super Admin
            </span>
          </button>
        </div>

        {/* Active Workspace Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200/80">
          <span className="text-slate-400 font-normal">Active Context:</span>
          <span className="text-purple-700 flex items-center gap-1 font-extrabold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {currentOrganization?.name || 'Tisha LED Walls'}
          </span>
        </div>
      </div>

      {/* TAB 1: TEAM MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          
          {/* Master Super Admin Notice Card */}
          <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex items-start gap-3 text-xs text-purple-900 leading-relaxed">
            <Crown size={20} className="text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>Master Super Admin &amp; Authority Model</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-purple-200 text-purple-800 rounded">
                  {MASTER_SUPER_ADMIN_EMAIL}
                </span>
              </div>
              <p className="text-purple-800">
                <span className="font-semibold">{MASTER_SUPER_ADMIN_EMAIL}</span> holds permanent Master Super Admin authority across all multi-tenant workspaces. Only the Super Admin can provision accounts, create new organization workspaces, and alter banking or financial permission matrices.
              </p>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 shrink-0">
                <Filter size={13} className="text-slate-400" />
                Workspace:
              </span>
              <select
                value={filterWorkspace}
                onChange={(e) => setFilterWorkspace(e.target.value)}
                className="w-full sm:w-56 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
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

          {/* Users Directory Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">User &amp; Contact</th>
                    <th className="py-3 px-4">Workspace / Organization</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Permissions Matrix</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
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
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* User Profile */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                  isUserOwner ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full">
                                      You
                                    </span>
                                  )}
                                  {isUserMaster && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded border border-amber-300">
                                      Master
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500 font-mono text-[11px] mt-0.5">{u.email}</div>
                                {u.phone && <div className="text-slate-400 text-[10px]">{u.phone}</div>}
                              </div>
                            </div>
                          </td>

                          {/* Workspace / Organization Column */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              <Building2 size={12} className="text-purple-600 shrink-0" />
                              <span className="truncate max-w-[130px] font-bold">{userOrg.name}</span>
                            </span>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            {u.role === 'owner' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                <Crown size={13} className="text-purple-600" />
                                <span>Super Admin</span>
                              </span>
                            )}
                            {u.role === 'admin' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <Shield size={13} className="text-blue-600" />
                                <span>Admin</span>
                              </span>
                            )}
                            {u.role === 'manager' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Briefcase size={13} className="text-emerald-600" />
                                <span>Sales Manager</span>
                              </span>
                            )}
                            {u.role === 'member' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <User size={13} className="text-slate-500" />
                                <span>Executive</span>
                              </span>
                            )}
                          </td>

                          {/* Permissions Matrix */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1.5 max-w-sm">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                                u.permissions.canEditBankDetails
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-50 text-slate-400 border border-slate-200 line-through'
                              }`}>
                                Bank / UPI
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                                u.permissions.canDeleteQuotes
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-50 text-slate-400 border border-slate-200 line-through'
                              }`}>
                                Delete Quotes
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                                u.permissions.canManageUsers
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-50 text-slate-400 border border-slate-200 line-through'
                              }`}>
                                Manage Users
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                                u.permissions.canRestoreBackups
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-50 text-slate-400 border border-slate-200 line-through'
                              }`}>
                                Restore DB
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                                isPaymentLedgerEnabled && (isUserOwner || u.permissions.canViewPaymentLedger)
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-slate-50 text-slate-400 border border-slate-200 line-through'
                              }`}>
                                Ledger Access
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => canManage && handleToggleStatus(u)}
                              disabled={!canManage || isUserOwner}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                u.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              } ${(!canManage || isUserOwner) ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
                            >
                              {u.status === 'active' ? (
                                <>
                                  <CheckCircle2 size={12} className="text-emerald-600" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} className="text-rose-600" />
                                  <span>Suspended</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canManage && (
                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  title="Edit Role & Permissions"
                                  className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                >
                                  <Edit size={15} />
                                </button>
                              )}

                              {isSuperAdmin && !isUserOwner && !isUserMaster && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  title="Delete User"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
        <div className="space-y-6">
          
          {/* Active Workspace Focus Banner */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-full bg-white/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Currently Active Workspace
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-400/20 text-purple-200 border border-purple-400/30">
                    {currentOrganization?.plan?.toUpperCase()} TIER
                  </span>
                </div>
                
                <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>{currentOrganization?.name || 'Tisha LED Walls'}</span>
                </h2>
                
                <p className="text-xs text-purple-200/80 max-w-xl">
                  All quotes, clients, proposals, and ledger records created in this session are isolated inside this organization workspace.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center">
                  <div className="text-lg font-black text-white">
                    {users.filter((u) => (u.organizationId || 'org_tisha_main') === currentOrganization?.id).length}
                  </div>
                  <div className="text-[10px] text-purple-200 font-semibold uppercase tracking-wider">Members</div>
                </div>

                <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center">
                  <div className="text-lg font-black text-white">
                    {currentOrganization?.quotesLimit || 1000}
                  </div>
                  <div className="text-[10px] text-purple-200 font-semibold uppercase tracking-wider">Quote Limit</div>
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
                  className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                    isActive 
                      ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-purple-500/10' 
                      : 'border-slate-200 hover:border-slate-300'
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
                            className="w-12 h-12 rounded-xl object-contain border border-slate-200 p-1 bg-white shrink-0" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-lg border border-purple-200 shrink-0">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-sm truncate">
                            {org.name}
                          </h3>
                          <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                            /{org.slug}
                          </div>
                        </div>
                      </div>

                      <span className={`text-[9.5px] uppercase font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                        org.plan === 'enterprise' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {org.plan}
                      </span>
                    </div>

                    {/* Metadata Details */}
                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
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
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10.5px]">
                        <span className="text-slate-500 font-semibold">Assigned Members:</span>
                        <span className="font-extrabold text-slate-900">{orgMembers.length} user{orgMembers.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditWorkspace(org)}
                        title="Edit Workspace"
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-xs"
                      >
                        <Edit size={14} />
                      </button>

                      {org.id !== 'org_tisha_main' && (
                        <button
                          onClick={() => handleDeleteWorkspace(org)}
                          title="Delete Workspace"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {isActive ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                        <CheckCheck size={14} />
                        <span>Active</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          switchOrganization(org.id);
                          toast.success(`Switched active workspace to "${org.name}".`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-purple-600 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                      >
                        <span>Switch Workspace</span>
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

      {/* MODAL 1: ADD / EDIT TEAM MEMBER */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                    {editingUser ? `Edit ${editingUser.name}` : 'Add New Team Member'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assign role, organization workspace, and configure granular permissions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                
                {/* Organization / Workspace Picker */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assign to Workspace / Organization *
                  </label>
                  <select
                    value={formData.organizationId}
                    onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                    disabled={!isSuperAdmin}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-semibold text-slate-800"
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
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ramesh Joshi"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ramesh@tishaledwalls.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {editingUser ? 'Reset Password (optional)' : 'Initial Password *'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'Leave blank to keep current' : '••••••••'}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-700">Assign User Role *</label>
                    {!isSuperAdmin && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <Lock size={10} /> Role locked to Super Admin
                      </span>
                    )}
                  </div>
                  <div className={`grid grid-cols-3 gap-2 ${!isSuperAdmin ? 'opacity-60 pointer-events-none' : ''}`}>
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
                            ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <div className="font-bold text-xs">{r.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Granular Permission Toggles */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                      Responsibilities &amp; Permissions:
                    </div>
                    {!isSuperAdmin && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded flex items-center gap-1">
                        <Lock size={10} /> Super Admin Only
                      </span>
                    )}
                  </div>

                  {!isSuperAdmin && (
                    <div className="p-2 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[10.5px] text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                      <span>Role responsibilities can only be provisioned by the Super Admin account.</span>
                    </div>
                  )}

                  <div className={`space-y-1.5 ${!isSuperAdmin ? 'opacity-70 pointer-events-none' : ''}`}>
                    {[
                      { key: 'canViewPaymentLedger', label: 'Can Access Payment Ledger', desc: 'Allows viewing payments, financial transactions & client ledger' },
                      { key: 'canEditBankDetails', label: 'Can Edit Bank Details & UPI IDs', desc: 'Allows altering UPI ID & bank account on quotations (High Risk)', danger: true },
                      { key: 'canDeleteQuotes', label: 'Can Permanently Delete Quotations', desc: 'Allows deleting proposals from database' },
                      { key: 'canManageUsers', label: 'Can Manage Team Users', desc: 'Allows creating and editing team accounts' },
                      { key: 'canRestoreBackups', label: 'Can Restore Database Backups', desc: 'Allows restoring past JSON database dumps' },
                      { key: 'canApplyDiscounts', label: 'Can Apply Custom Discounts', desc: 'Allows overriding item rates and line discounts' },
                      { key: 'canManageClients', label: 'Can Edit Client Directory', desc: 'Allows updating client records' },
                    ].map((p) => {
                      const isChecked = formData.permissions[p.key as keyof UserPermissions];
                      return (
                        <label key={p.key} className="flex items-start gap-2.5 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            disabled={!isSuperAdmin}
                            checked={isChecked}
                            onChange={() => handlePermissionToggle(p.key as keyof UserPermissions)}
                            className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4 disabled:opacity-50"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold ${p.danger && isChecked ? 'text-amber-700 font-bold' : 'text-slate-800'}`}>
                              {p.label}
                            </div>
                            <div className="text-[10.5px] text-slate-500">{p.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-white text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md shadow-purple-600/20 text-xs transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                    {editingWorkspace ? `Edit ${editingWorkspace.name}` : 'Provision New Workspace'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Create an isolated multi-tenant organization workspace with custom branding &amp; quota.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkspaceModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitWorkspace} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Workspace Identifier / Slug
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">
                        /
                      </span>
                      <input
                        type="text"
                        value={workspaceForm.slug}
                        onChange={(e) => setWorkspaceForm({ ...workspaceForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        placeholder="acme-events"
                        className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Subscription Plan
                    </label>
                    <select
                      value={workspaceForm.plan}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, plan: e.target.value as SaaSPlan })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                    >
                      <option value="starter">Starter Plan (Basic)</option>
                      <option value="pro">Pro Plan (Dual Signatures + UPI)</option>
                      <option value="enterprise">Enterprise Tier (Unlimited)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Organization Contact Email
                    </label>
                    <input
                      type="email"
                      value={workspaceForm.email}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, email: e.target.value })}
                      placeholder="admin@acmeevents.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      value={workspaceForm.phone}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Monthly Quotations Quota
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={50}
                      value={workspaceForm.quotesLimit}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, quotesLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Logo Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={workspaceForm.logoUrl}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, logoUrl: e.target.value })}
                      placeholder="https://.../logo.png"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>

                {!editingWorkspace && (
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-purple-50/70 border border-purple-200/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workspaceForm.autoSwitch}
                      onChange={(e) => setWorkspaceForm({ ...workspaceForm, autoSwitch: e.target.checked })}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-purple-900">
                      Immediately switch active workspace to this organization upon creation
                    </span>
                  </label>
                )}

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-white text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md shadow-purple-600/20 text-xs transition-colors"
                >
                  {editingWorkspace ? 'Save Changes' : 'Create Workspace'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
