import React, { useState, useEffect } from 'react';
import { X, Building2, Save, Image as ImageIcon, CreditCard, Download, Upload, Cloud, HardDrive, CheckCircle2, RefreshCw, AlertCircle, Trash2, PenTool } from 'lucide-react';
import { CompanyProfile } from '../types/quotation';
import { storage } from '../services/storage';
import { DEFAULT_COMPANY } from '../config/defaults';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { cloudSync } from '../services/cloudSync';
import { useToast, useConfirm } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';
import { CompanyStampModal } from './CompanyStampModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  onSave: (updated: CompanyProfile) => Promise<void> | void;
  onRestoreBackup?: () => void;
}

const ensureCompanyProfile = (c?: Partial<CompanyProfile> | null): CompanyProfile => {
  return {
    ...DEFAULT_COMPANY,
    ...(c || {}),
    bankDetails: {
      ...DEFAULT_COMPANY.bankDetails,
      ...(c?.bankDetails || {}),
    },
  };
};

export const CompanySettingsModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  company, 
  onSave, 
  onRestoreBackup 
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { isSuperAdmin, hasPermission, user } = useAuth();
  const canEditBank = isSuperAdmin || hasPermission('canEditBankDetails');
  const canRestore = isSuperAdmin || hasPermission('canRestoreBackups');

  const [profile, setProfile] = useState<CompanyProfile>(() => ensureCompanyProfile(company));
  const [isSaving, setIsSaving] = useState(false);
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tableReady?: boolean } | null>(null);

  // Synchronize internal state whenever the modal opens or the company prop updates
  useEffect(() => {
    if (isOpen) {
      setProfile(ensureCompanyProfile(company));
      setTestResult(null);
    }
  }, [isOpen, company]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingConn(true);
    setTestResult(null);
    try {
      const res = await cloudSync.testConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection test failed',
      });
    } finally {
      setTestingConn(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({ ...prev, signature: reader.result as string }));
      toast.success('Official Stamp & Signature uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(profile);
      toast.success('Company profile & bank settings saved successfully');
      onClose();
    } catch (err: any) {
      toast.error('Failed to save settings: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Building2 className="text-blue-400" size={22} />
            <div>
              <h3 className="text-lg font-bold">Company Profile & Banking Settings</h3>
              <p className="text-xs text-slate-400">These details automatically populate all quotations & PDFs</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
          
          {/* Logo, Stamp & Basic Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Company Details &amp; Branding</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              
              {/* Logo Box */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Company Logo</label>
                <div className="h-24 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center overflow-hidden relative group bg-slate-50">
                  {profile.logo ? (
                    <>
                      <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-1.5" />
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <ImageIcon size={20} className="text-white" />
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer p-2 text-center text-slate-400 hover:text-blue-600">
                      <ImageIcon size={22} className="mb-1" />
                      <span className="text-[10px] font-medium leading-tight">Upload Logo</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
                {profile.logo && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfile((prev) => ({ ...prev, logo: '' }));
                      toast.info('Logo cleared');
                    }}
                    className="mt-1 w-full text-center text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 py-0.5 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Clear Logo</span>
                  </button>
                )}
              </div>

              {/* Stamp & Signature Box */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Official Stamp &amp; Signature</label>
                <div className="h-24 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center overflow-hidden relative group bg-slate-50">
                  {profile.signature ? (
                    <>
                      <img src={profile.signature} alt="Official Stamp & Signature" className="w-full h-full object-contain p-1.5" />
                      <button
                        type="button"
                        onClick={() => setIsStampModalOpen(true)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white text-xs font-bold gap-1.5"
                      >
                        <PenTool size={16} />
                        <span>Change Stamp</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsStampModalOpen(true)}
                      className="flex flex-col items-center justify-center cursor-pointer p-2 text-center text-slate-400 hover:text-blue-600 w-full h-full"
                    >
                      <PenTool size={22} className="mb-1 text-slate-400" />
                      <span className="text-[10px] font-medium leading-tight">Upload / Draw Stamp &amp; Signature</span>
                      <span className="text-[9px] text-slate-400 leading-tight mt-0.5">Draw signature or upload stamp</span>
                    </button>
                  )}
                </div>
                {profile.signature && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfile((prev) => ({ ...prev, signature: '' }));
                      toast.info('Official Stamp & Signature cleared');
                    }}
                    className="mt-1 w-full text-center text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 py-0.5 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Clear Stamp</span>
                  </button>
                )}
              </div>

            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-semibold focus:outline-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Tagline / Subheading</label>
                <input
                  type="text"
                  value={profile.tagline || ''}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500"
                  placeholder="e.g. Professional LED Video Walls & Stage Solutions"
                />
              </div>
            </div>
          </div>

          {/* Contact & Registration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 block mb-1">Office / Warehouse Address</label>
              <textarea
                rows={2}
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Primary Phone</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Alternate Phone</label>
              <input
                type="text"
                value={profile.phoneAlt || ''}
                onChange={(e) => setProfile({ ...profile, phoneAlt: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Official Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">GSTIN Number</label>
              <input
                type="text"
                value={profile.gstin || ''}
                onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                placeholder="06XXXXX0000X1Z5"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono uppercase focus:outline-blue-500"
              />
            </div>
          </div>

          {/* Banking & UPI */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <CreditCard size={16} className="text-blue-600" />
                <span>Bank Account &amp; UPI Details</span>
              </div>
              {!canEditBank && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Lock size={10} />
                  <span>Super Admin Only</span>
                </span>
              )}
            </div>

            {!canEditBank && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                <Lock size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="font-bold">Locked by Super Admin:</strong> You do not have permission to modify company payment bank accounts or UPI IDs. Contact Super Admin to request changes.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Account Holder Name</label>
                <input
                  type="text"
                  disabled={!canEditBank}
                  value={profile.bankDetails?.accountName || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      bankDetails: { ...(prev.bankDetails || DEFAULT_COMPANY.bankDetails), accountName: e.target.value },
                    }))
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500 font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Bank Name</label>
                <input
                  type="text"
                  disabled={!canEditBank}
                  value={profile.bankDetails?.bankName || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      bankDetails: { ...(prev.bankDetails || DEFAULT_COMPANY.bankDetails), bankName: e.target.value },
                    }))
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500 font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Account Number</label>
                <input
                  type="text"
                  disabled={!canEditBank}
                  value={profile.bankDetails?.accountNumber || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      bankDetails: { ...(prev.bankDetails || DEFAULT_COMPANY.bankDetails), accountNumber: e.target.value },
                    }))
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-blue-500 font-semibold disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  disabled={!canEditBank}
                  value={profile.bankDetails?.ifscCode || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      bankDetails: { ...(prev.bankDetails || DEFAULT_COMPANY.bankDetails), ifscCode: e.target.value.toUpperCase() },
                    }))
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono uppercase focus:outline-blue-500 font-semibold disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Bank Branch</label>
                <input
                  type="text"
                  disabled={!canEditBank}
                  value={profile.bankDetails?.branch || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      bankDetails: { ...(prev.bankDetails || DEFAULT_COMPANY.bankDetails), branch: e.target.value },
                    }))
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-blue-700 block mb-1">UPI ID (GooglePay / PhonePe / Paytm)</label>
                <input
                  type="text"
                  disabled={!canEditBank}
                  value={profile.bankDetails?.upiId || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      bankDetails: { ...(prev.bankDetails || DEFAULT_COMPANY.bankDetails), upiId: e.target.value },
                    }))
                  }
                  placeholder="e.g. 7703948857@upi"
                  className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs font-mono text-blue-700 focus:outline-blue-500 font-semibold disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Database & Cloud Sync Section */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <HardDrive size={16} className="text-blue-600" />
                <span>Storage &amp; Cloud Database</span>
              </div>

              {isSupabaseConfigured() ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Cloud size={12} /> Supabase Cloud Synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  <CheckCircle2 size={12} /> IndexedDB (Unlimited Local Storage)
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Your quotations and clients are safely stored in high-performance browser <strong>IndexedDB</strong>. 
              {isSupabaseConfigured() 
                ? ' Real-time cloud sync is enabled across devices.' 
                : ' To enable sync across devices, paste your Supabase URL & Key into the .env file.'}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {isSupabaseConfigured() && (
                <button
                  type="button"
                  disabled={testingConn}
                  onClick={handleTestConnection}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 text-xs font-bold shadow-2xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} className={testingConn ? 'animate-spin' : ''} />
                  <span>{testingConn ? 'Testing Connection...' : 'Test DB Connection'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  try {
                    await storage.exportBackup();
                    toast.success('Full database backup (.json) exported successfully');
                  } catch (err) {
                    toast.error('Export failed: ' + err);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-semibold shadow-2xs transition-colors"
              >
                <Download size={14} className="text-blue-600" />
                <span>Export Full Backup (.json)</span>
              </button>

              {canRestore ? (
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-semibold shadow-2xs cursor-pointer transition-colors">
                  <Upload size={14} className="text-emerald-600" />
                  <span>Restore from Backup (.json)</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const confirmed = await confirm({
                        title: 'Restore Database Backup',
                        message: 'Restoring will merge quotations, clients, and catalog items from the backup file into your database. Continue?',
                        confirmText: 'Restore Backup',
                        cancelText: 'Cancel',
                        variant: 'warning',
                      });
                      if (confirmed) {
                        try {
                          const res = await storage.importBackup(file);
                          toast.success(`Restored successfully! Loaded ${res.quotationsCount} quotations.`);
                          if (onRestoreBackup) onRestoreBackup();
                          onClose();
                        } catch (err) {
                          toast.error('Restore failed: ' + err);
                        }
                      }
                    }}
                  />
                </label>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Restricted: Only Super Admin can restore database backups"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 text-xs font-semibold cursor-not-allowed opacity-75"
                >
                  <Lock size={13} className="text-slate-400" />
                  <span>Restore from Backup (Super Admin Only)</span>
                </button>
              )}
            </div>

            {/* Test Connection Result Alert */}
            {testResult && (
              <div className={`p-3 rounded-lg text-xs border flex items-start gap-2.5 transition-all ${
                testResult.success
                  ? testResult.tableReady !== false
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {testResult.success ? (
                  testResult.tableReady !== false ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  )
                ) : (
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  <div className="font-bold">
                    {testResult.success 
                      ? (testResult.tableReady !== false ? 'Database Connection Successful!' : 'Connected, But Setup Needed')
                      : 'Database Connection Failed'}
                  </div>
                  <div>{testResult.message}</div>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Settings
                </>
              )}
            </button>
          </div>

        </form>

      </div>

      <CompanyStampModal
        isOpen={isStampModalOpen}
        onClose={() => setIsStampModalOpen(false)}
        onSave={(stampUrl) => {
          setProfile((prev) => ({ ...prev, signature: stampUrl }));
          setIsStampModalOpen(false);
          if (stampUrl) {
            toast.success('Official Stamp & Signature updated!');
          } else {
            toast.info('Official Stamp & Signature cleared');
          }
        }}
        existingStamp={profile.signature}
        companyName={profile.name}
      />
    </div>
  );
};
