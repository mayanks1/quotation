import React, { useState } from 'react';
import { Users, Search, Plus, Phone, Mail, Building, FileText, Trash2, Pencil, X, Save } from 'lucide-react';
import { ClientProfile } from '../types/quotation';
import { useToast, useConfirm } from '../context/ToastContext';
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

  const filtered = clients.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.company || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term) ||
      (c.gstin || '').toLowerCase().includes(term)
    );
  });

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
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClient.name.trim()) return;
    onSaveClient(editingClient);
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
    toast.info(`Preparing new quote for ${client.name}...`);
    onSelectClientForQuote(client);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header & Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-blue-600" size={20} />
            Client Directory &amp; Contacts
          </h2>
          <p className="text-xs text-slate-500">
            Contacts saved here can be auto-filled into any quotation with 1 click
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-blue-500 focus:bg-white"
            />
          </div>

          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingClient(null);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <Plus size={15} />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Add Client Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-white p-5 rounded-2xl border border-blue-200 shadow-md space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">New Client Details</h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-medium block mb-1">Contact Name *</label>
              <input
                required
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold focus:outline-blue-500"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Company / Agency Name</label>
              <input
                value={newClient.company}
                onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-blue-500"
                placeholder="e.g. Apex Event Solutions"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Phone Number (for WhatsApp)</label>
              <input
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-blue-500"
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Email</label>
              <input
                type="email"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-blue-500"
                placeholder="client@apexevents.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-600 font-medium block mb-1">GSTIN (Optional)</label>
              <input
                value={newClient.gstin || ''}
                onChange={(e) => setNewClient({ ...newClient, gstin: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono uppercase focus:outline-blue-500"
                placeholder="07AAAAA0000A1Z5"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-600 font-medium block mb-1">Billing Address</label>
              <textarea
                rows={2}
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-blue-500"
                placeholder="Street address, City, State, PIN"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm"
            >
              Save Client
            </button>
          </div>
        </form>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Edit Client Contact</h3>
                  <p className="text-[11px] text-slate-400">Update details for {editingClient.name || 'this client'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Contact Name *</label>
                  <input
                    required
                    value={editingClient.name}
                    onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold focus:outline-blue-500 focus:bg-white transition-all text-xs"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Company / Agency Name</label>
                  <input
                    value={editingClient.company}
                    onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-blue-500 focus:bg-white transition-all text-xs"
                    placeholder="e.g. Apex Event Solutions"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Phone Number (WhatsApp)</label>
                  <input
                    value={editingClient.phone}
                    onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-blue-500 focus:bg-white transition-all text-xs"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingClient.email}
                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-blue-500 focus:bg-white transition-all text-xs"
                    placeholder="client@apexevents.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-700 font-semibold block mb-1">GSTIN (Optional)</label>
                  <input
                    value={editingClient.gstin || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, gstin: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 uppercase font-mono focus:outline-blue-500 focus:bg-white transition-all text-xs"
                    placeholder="e.g. 07AAAAA0000A1Z5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-700 font-semibold block mb-1">Billing / Venue Address</label>
                  <textarea
                    rows={3}
                    value={editingClient.address}
                    onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-blue-500 focus:bg-white transition-all text-xs"
                    placeholder="Street address, City, State, PIN"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <Save size={14} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clients Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-slate-700">No Clients Found</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Clients you enter in quotations are automatically saved here for quick selection
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div
              key={client.id || client.name}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-slate-900 truncate" title={client.name}>{client.name}</h3>
                    {client.company && (
                      <div className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5 truncate" title={client.company}>
                        <Building size={12} className="shrink-0" />
                        <span className="truncate">{client.company}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingClient({ ...client })}
                      className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit client details"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClientContact(client)}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete contact"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 pt-1">
                  {client.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.gstin && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                      <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] font-bold text-slate-600 border border-slate-200/60">GSTIN</span>
                      <span>{client.gstin}</span>
                    </div>
                  )}
                  {client.address && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 pt-1 border-t border-slate-100">
                      {client.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClient({ ...client })}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2 rounded-lg transition-colors border border-slate-200"
                >
                  <Pencil size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateQuote(client)}
                  className="flex-[2] flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded-lg transition-colors border border-blue-200"
                >
                  <FileText size={13} />
                  <span>Create Quote</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
