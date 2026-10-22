import React, { useState, useMemo } from 'react';
import { 
  Users, Search, Plus, Phone, Mail, Building, FileText, Trash2, 
  Pencil, X, Save, Sparkles, Building2, ShieldCheck, MapPin, 
  ExternalLink, MessageCircle
} from 'lucide-react';
import { ClientProfile } from '../types/quotation';
import { useToast, useConfirm } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface Props {
  clients: ClientProfile[];
  onSelectClientForQuote: (client: ClientProfile) => void;
  onSaveClient: (client: ClientProfile) => void;
  onDeleteClient: (idOrName: string) => void;
}

export const ClientDirectory: React.FC<Props> = ({
  clients,
  onSelectClientForQuote,
  onSaveClient,
  onDeleteClient,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { isSuperAdmin, hasPermission } = useAuth();
  const canManageClients = isSuperAdmin || hasPermission('canManageClients');
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  useLockBodyScroll(Boolean(editingClient));

  const [newClient, setNewClient] = useState<ClientProfile>({
    name: '',
    company: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
  });

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return clients;
    return clients.filter((c) => {
      return (
        c.name.toLowerCase().includes(term) ||
        (c.company || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term) ||
        (c.gstin || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term)
      );
    });
  }, [clients, search]);

  // Client stats
  const totalClients = clients.length;
  const corporateClients = clients.filter((c) => !!c.company?.trim()).length;
  const gstRegistered = clients.filter((c) => !!c.gstin?.trim()).length;

  // Monogram initials
  const getInitials = (name?: string): string => {
    if (!name || !name.trim()) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarGradient = (str: string): string => {
    const gradients = [
      'from-cyan-500 via-blue-600 to-indigo-600',
      'from-blue-600 via-indigo-600 to-purple-600',
      'from-emerald-500 via-teal-600 to-cyan-600',
      'from-amber-500 via-orange-500 to-rose-500',
      'from-purple-500 via-fuchsia-600 to-pink-600',
      'from-indigo-500 via-sky-600 to-cyan-500',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name.trim()) return;
    onSaveClient(newClient);
    setNewClient({
      name: '',
      company: '',
      address: '',
      phone: '',
      email: '',
      gstin: '',
    });
    setIsAdding(false);
    toast.success(`Client "${newClient.name}" added to directory`);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClient.name.trim()) return;
    onSaveClient(editingClient);
    toast.success(`Updated contact details for "${editingClient.name}"`);
    setEditingClient(null);
  };

  const handleDeleteClientContact = async (client: ClientProfile) => {
    const confirmed = await confirm({
      title: 'Delete Client Contact',
      message: `Are you sure you want to remove "${client.name}"${client.company ? ` (${client.company})` : ''} from your contacts directory?`,
      confirmText: 'Delete Contact',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      onDeleteClient(client.id || client.name);
      toast.success(`Contact "${client.name}" deleted`);
    }
  };

  const handleCreateQuote = (client: ClientProfile) => {
    toast.info(`Preparing new quotation for ${client.name}...`);
    onSelectClientForQuote(client);
  };

  return (
    <div className="relative max-w-7xl mx-auto space-y-6 pb-12">
      {/* Ambient background glow effects */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40">
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-10 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Hero Executive Header Hub */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_25px_rgba(6,182,212,0.45)] ring-1 ring-white/20 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Client Directory &amp; Contacts
              </h1>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-xs">
                {totalClients} Contact{totalClients !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1.5 text-cyan-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                CRM Active
              </span>
              <span className="text-slate-600">•</span>
              <span>Saved clients auto-fill with 1-click into any quotation</span>
            </div>
          </div>
        </div>

        {canManageClients && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                setIsAdding(!isAdding);
                setEditingClient(null);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:scale-95 shadow-[0_0_25px_rgba(99,102,241,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] transition-all cursor-pointer group"
            >
              <Plus size={16} className={`transition-transform duration-300 ${isAdding ? 'rotate-45' : 'group-hover:rotate-90'}`} />
              <span>{isAdding ? 'Close Form' : 'Add New Client'}</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-4">
        {/* Metric 1: Total Contacts */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-white/10 shadow-lg hover:border-cyan-500/50 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          <div className="flex items-start sm:items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider leading-tight">
              <span className="hidden sm:inline">Total Contacts</span>
              <span className="sm:hidden">Contacts</span>
            </span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
              <Users size={13} className="sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-white mt-1 sm:mt-2 font-mono tracking-tight">{totalClients}</div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            <span className="hidden sm:inline truncate">Saved clients in CRM directory</span>
            <span className="sm:hidden truncate">CRM saved</span>
          </div>
        </div>

        {/* Metric 2: Companies & Event Agencies */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-white/10 shadow-lg hover:border-blue-500/50 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <div className="flex items-start sm:items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider leading-tight">
              <span className="hidden sm:inline">Companies &amp; Agencies</span>
              <span className="sm:hidden">Agencies</span>
            </span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
              <Building2 size={13} className="sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-blue-400 mt-1 sm:mt-2 font-mono tracking-tight">{corporateClients}</div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
            <span className="hidden sm:inline truncate">Corporate accounts &amp; venues</span>
            <span className="sm:hidden truncate">Corporate</span>
          </div>
        </div>

        {/* Metric 3: GST Registered */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-white/10 shadow-lg hover:border-emerald-500/50 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <div className="flex items-start sm:items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider leading-tight">
              <span className="hidden sm:inline">GST Registered</span>
              <span className="sm:hidden">GST Reg.</span>
            </span>
            <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
              <ShieldCheck size={13} className="sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-emerald-400 mt-1 sm:mt-2 font-mono tracking-tight">{gstRegistered}</div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="hidden sm:inline truncate">B2B invoice compliant clients</span>
            <span className="sm:hidden truncate">GST B2B</span>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="relative z-10 bg-slate-900/65 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl p-3.5 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search clients by name, agency, phone, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-950/70 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/80 focus:bg-slate-950 transition-all shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-400">
            <span>
              Showing <strong className="text-white">{filtered.length}</strong> of <strong className="text-white">{totalClients}</strong> clients
            </span>
          </div>
        </div>
      </div>

      {/* Add Client Interactive Surface Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="relative z-10 bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-cyan-500/40 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Plus size={16} />
              </div>
              <h3 className="text-sm font-bold text-white">Add New Client Contact</h3>
            </div>
            <button 
              type="button" 
              onClick={() => setIsAdding(false)} 
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Contact Name *</label>
              <input
                required
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-2.5 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Company / Agency Name</label>
              <input
                value={newClient.company}
                onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                placeholder="e.g. Apex Event Solutions"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Phone Number (for WhatsApp)</label>
              <input
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Email Address</label>
              <input
                type="email"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                placeholder="client@apexevents.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-300 font-semibold block mb-1">GSTIN (Optional)</label>
              <input
                value={newClient.gstin || ''}
                onChange={(e) => setNewClient({ ...newClient, gstin: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-2.5 font-mono uppercase text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                placeholder="07AAAAA0000A1Z5"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-300 font-semibold block mb-1">Billing / Venue Address</label>
              <textarea
                rows={2}
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                placeholder="Street address, City, State, PIN"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer"
            >
              Save Client Contact
            </button>
          </div>
        </form>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-white/10 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-white/10 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Client Contact</h3>
                  <p className="text-[11px] text-slate-400">Update details for {editingClient.name || 'this client'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Contact Name *</label>
                  <input
                    required
                    value={editingClient.name}
                    onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-xs"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Company / Agency Name</label>
                  <input
                    value={editingClient.company}
                    onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-xs"
                    placeholder="e.g. Apex Event Solutions"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Phone Number (WhatsApp)</label>
                  <input
                    value={editingClient.phone}
                    onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-xs"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingClient.email}
                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-xs"
                    placeholder="client@apexevents.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-semibold block mb-1">GSTIN (Optional)</label>
                  <input
                    value={editingClient.gstin || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, gstin: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 uppercase font-mono text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-xs"
                    placeholder="e.g. 07AAAAA0000A1Z5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-semibold block mb-1">Billing / Venue Address</label>
                  <textarea
                    rows={3}
                    value={editingClient.address}
                    onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-xs"
                    placeholder="Street address, City, State, PIN"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clients Luxury Grid */}
      {filtered.length === 0 ? (
        <div className="relative z-10 bg-slate-900/60 backdrop-blur-xl p-12 sm:p-16 rounded-3xl border border-white/10 text-center shadow-xl">
          <Users size={46} className="mx-auto text-slate-600 mb-3" />
          <h4 className="text-base font-bold text-white">No Clients Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            {search 
              ? `No contacts match "${search}". Try checking for spelling or clear search.` 
              : 'Clients you enter in quotations are automatically saved here for instant 1-click selection.'}
          </p>
          {search ? (
            <button
              onClick={() => setSearch('')}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer"
            >
              Clear Search
            </button>
          ) : canManageClients ? (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-cyan-500/25 cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Your First Client</span>
            </button>
          ) : null}
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
          {filtered.map((client) => {
            const initials = getInitials(client.name);
            const avatarGrad = getAvatarGradient(client.name || 'Client');
            return (
              <div
                key={client.id || client.name}
                className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg hover:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.7),0_0_25px_-5px_rgba(6,182,212,0.25)] hover:border-cyan-500/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden group"
              >
                {/* Left Neon Laser Accent Bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />

                <div className="space-y-3">
                  {/* Top Row: Avatar, Name, Company, Action Icons */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Monogram Avatar */}
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center font-black text-sm text-white shadow-md ring-2 ring-white/10 group-hover:scale-105 group-hover:ring-cyan-500/40 transition-all shrink-0`}>
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm sm:text-base text-white truncate group-hover:text-cyan-300 transition-colors" title={client.name}>
                          {client.name}
                        </h3>
                        {client.company ? (
                          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5 truncate" title={client.company}>
                            <Building2 size={12} className="text-cyan-400 shrink-0" />
                            <span className="truncate">{client.company}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Individual Client</span>
                        )}
                      </div>
                    </div>

                    {canManageClients && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingClient({ ...client })}
                          className="text-slate-400 hover:text-cyan-300 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                          title="Edit client details"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClientContact(client)}
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Delete contact"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Contact Details List */}
                  <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                    {client.phone && (
                      <div className="flex items-center justify-between gap-1.5 bg-slate-950/40 border border-white/5 px-2.5 py-1.5 rounded-xl">
                        <div className="flex items-center gap-2 truncate">
                          <Phone size={13} className="text-cyan-400 shrink-0" />
                          <span className="font-mono text-slate-200">{client.phone}</span>
                        </div>
                        <a
                          href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 p-1 rounded-md hover:bg-emerald-500/20 transition-colors"
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle size={13} />
                        </a>
                      </div>
                    )}

                    {client.email && (
                      <div className="flex items-center gap-2 bg-slate-950/40 border border-white/5 px-2.5 py-1.5 rounded-xl text-slate-300">
                        <Mail size={13} className="text-blue-400 shrink-0" />
                        <span className="truncate font-mono text-[11px]">{client.email}</span>
                      </div>
                    )}

                    {client.gstin && (
                      <div className="flex items-center gap-2 bg-slate-950/40 border border-white/5 px-2.5 py-1.5 rounded-xl text-xs font-mono">
                        <span className="px-1.5 py-0.2 bg-emerald-950/80 rounded text-[9px] font-extrabold text-emerald-300 border border-emerald-500/40">
                          GSTIN
                        </span>
                        <span className="text-slate-200 font-bold">{client.gstin}</span>
                      </div>
                    )}

                    {client.address && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-400 line-clamp-2 pt-1 border-t border-white/5">
                        <MapPin size={12} className="text-rose-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingClient({ ...client })}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold py-2 rounded-xl transition-all border border-white/10 cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateQuote(client)}
                    className="flex-[2] flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-extrabold py-2 rounded-xl transition-all shadow-md shadow-blue-500/25 active:scale-95 cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>Create Quote</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
