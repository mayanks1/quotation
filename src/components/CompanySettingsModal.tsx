import React, { useState, useEffect, useRef } from 'react';
import { X, Building2, Save, Image as ImageIcon, CreditCard, Download, Upload, Cloud, HardDrive, CheckCircle2, RefreshCw, AlertCircle, Trash2, PenTool, Package, Lock, MessageSquare, Sliders, Mail, KeyRound, Shield, Clock, Archive } from 'lucide-react';
import { CompanyProfile } from '../types/quotation';
import { storage } from '../services/storage';
import { DEFAULT_COMPANY } from '../config/defaults';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { cloudSync } from '../services/cloudSync';
import { securityService, SecuritySettings } from '../services/securityService';
import { passcodeService } from '../services/passcodeService';
import { backupService } from '../services/backupService';
import { useToast, useConfirm } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { MASTER_SUPER_ADMIN_EMAIL } from '../types/auth';
import { CompanyStampModal } from './CompanyStampModal';
import { MessageTemplatesModal } from './MessageTemplatesModal';
import { WeeklyEmailSettingsModal } from './ledger/WeeklyEmailSettingsModal';
import { ManageLedgerPasscodeModal } from './ledger/ManageLedgerPasscodeModal';
import { BackupManagementModal } from './BackupManagementModal';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  onSave: (updated: CompanyProfile) => Promise<void> | void;
  onRestoreBackup?: () => void;
  onOpenCatalog?: () => void;
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
  onRestoreBackup,
  onOpenCatalog
}) => {
  useLockBodyScroll(isOpen);
  const toast = useToast();
  const { confirm } = useConfirm();
  const { isSuperAdmin, hasPermission, user } = useAuth();
  const isMasterSuperAdmin = (user?.email || '').toLowerCase().trim() === MASTER_SUPER_ADMIN_EMAIL.toLowerCase().trim();
  const canManageEmailDigest = isSuperAdmin || hasPermission('canManageEmailDigest') || user?.role === 'owner' || user?.role === 'admin' || isMasterSuperAdmin;
  const canEditBank = isSuperAdmin || hasPermission('canEditBankDetails');
  const canRestore = isSuperAdmin || hasPermission('canRestoreBackups');

  const [profile, setProfile] = useState<CompanyProfile>(() => ensureCompanyProfile(company));
  const [isSaving, setIsSaving] = useState(false);
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isWeeklyEmailModalOpen, setIsWeeklyEmailModalOpen] = useState(false);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupConfig, setBackupConfig] = useState(() => backupService.getConfig());
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => securityService.getSettings());
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tableReady?: boolean } | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const [activeTabId, setActiveTabId] = useState<string>('section-company');

  const tabs = [
    { id: 'section-company', label: 'Company & Branding', icon: Building2 },
    { id: 'section-banking', label: 'Bank Details', icon: CreditCard },
    { id: 'section-templates', label: 'WhatsApp Templates', icon: MessageSquare },
    ...(onOpenCatalog ? [{ id: 'section-catalog', label: 'Equipment Catalog', icon: Package }] : []),
    ...(canManageEmailDigest ? [{ id: 'section-email-digest', label: 'Weekly Email Digest', icon: Mail }] : []),
    { id: 'section-security', label: 'Security & Passcode', icon: Shield },
    { id: 'section-storage', label: 'Storage & Cloud', icon: HardDrive },
  ];

  const scrollToSection = (id: string) => {
    setActiveTabId(id);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Synchronize internal state whenever the modal opens or the company prop updates
  useEffect(() => {
    if (isOpen) {
      setProfile(ensureCompanyProfile(company));
      setTestResult(null);
      setBackupConfig(backupService.getConfig());
      securityService.loadFromCloud().then(setSecuritySettings);
      backupService.loadFromCloud().then(() => setBackupConfig(backupService.getConfig()));
    }
  }, [isOpen, company]);

  const handleTimeoutChange = async (minutes: number) => {
    setSecuritySettings((prev) => ({ ...prev, idleTimeoutMinutes: minutes }));
    const res = await securityService.saveSettings({ idleTimeoutMinutes: minutes }, user?.name || user?.email);
    if (res.success) {
      if (minutes === -1) {
        toast.success('Idle auto-logout set to Immediate.');
      } else if (minutes === 0) {
        toast.success('Idle auto-logout disabled.');
      } else {
        toast.success(`Idle auto-logout set to ${minutes} minute${minutes > 1 ? 's' : ''}.`);
      }
    } else {
      toast.error('Failed to update idle timeout: ' + res.error);
    }
  };

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
          <div className="flex items-center gap-2.5">
            <Building2 className="text-blue-400" size={22} />
            <div>
              <h3 className="text-lg font-bold">Company Profile &amp; System Settings</h3>
              <p className="text-xs text-slate-400">Configure company branding, banking, templates, equipment catalog &amp; security preferences</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToSection(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-white' : 'text-slate-500'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* Scrollable Content Body */}
          <div ref={formRef} className="overflow-y-auto flex-1 p-6 space-y-6 scroll-smooth">

            {/* Logo, Stamp & Basic Info */}
            <div id="section-company" className="scroll-mt-4">
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
          <div id="section-banking" className="scroll-mt-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
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

          {/* WhatsApp & Portal Message Templates */}
          <div id="section-templates" className="scroll-mt-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <MessageSquare size={16} className="text-emerald-600" />
                <span>WhatsApp Message Templates</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplatesModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Sliders size={13} />
                <span>Manage Templates</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Customize text breakdown, follow-up booking reminders, and 24h balance payment reminder templates with dynamic variables.
            </p>
          </div>

          {/* Equipment & Services Catalog */}
          {onOpenCatalog && (
            <div id="section-catalog" className="scroll-mt-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Package size={16} className="text-blue-600" />
                  <span>Equipment &amp; Services Catalog</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCatalog();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Package size={13} />
                  <span>Manage Catalog</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Configure presets (55" LED TV / Standee, LED walls, processors, sound, staging) and default item rates for quick insertion in quotation builder.
              </p>
            </div>
          )}

          {/* Automated Weekly Email Reports (Super Admin & Admin) */}
          {canManageEmailDigest && (
            <div id="section-email-digest" className="scroll-mt-4 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 p-4 rounded-xl border border-indigo-200/80 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Mail size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">Weekly Email Financial Digest</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                        Super Admin &amp; Admin
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Automated weekly collections &amp; dues summary to configured recipients
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWeeklyEmailModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <span>Configure</span>
                </button>
              </div>
            </div>
          )}

          {/* Security, Passcode & Idle Timeout */}
          <div id="section-security" className="scroll-mt-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Shield size={16} className="text-indigo-600" />
                <span>Security, Passcode &amp; Idle Timeout</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <KeyRound size={11} /> Passcode Protected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Idle Timeout Auto-Logout Selector */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Clock size={14} className="text-blue-600" />
                  <span>Idle Inactivity Auto-Logout</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Automatically log out session if user is idle with no mouse or keyboard activity.
                </p>
                <select
                  value={securitySettings.idleTimeoutMinutes}
                  onChange={(e) => handleTimeoutChange(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-blue-500 cursor-pointer"
                >
                  <option value={-1}>Immediate</option>
                  <option value={1}>1 Minute</option>
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes (Recommended)</option>
                  <option value={60}>1 Hour</option>
                  <option value={120}>2 Hours</option>
                  <option value={240}>4 Hours</option>
                  <option value={0}>Disabled (Never Logout)</option>
                </select>
              </div>

              {/* Payment Ledger Passcode Controls */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <KeyRound size={14} className="text-amber-500" />
                    <span>Payment Ledger Passcode</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Requires a security PIN before opening payment collections and client balance data.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsPasscodeModalOpen(true)}
                    className="flex-1 py-1.5 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    Manage / Reset Passcode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      passcodeService.lockSession();
                      toast.info('Payment Ledger session locked. Passcode required on next visit.');
                    }}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title="Lock Payment Ledger session immediately"
                  >
                    Lock Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Database & Cloud Sync Section */}
          <div id="section-storage" className="scroll-mt-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
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

            {/* Daily Automated Backup & Retention Card */}
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Archive size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">Daily Automated Backup &amp; Retention</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                        backupConfig.enabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {backupConfig.enabled ? `Active • Keep Last ${backupConfig.retentionLimit}` : 'Paused'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Automated snapshots saved daily with old backup cleanup (keeps last {backupConfig.retentionLimit} backups).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const snap = await backupService.runDailyBackup({ isManual: true });
                        setBackupConfig(backupService.getConfig());
                        toast.success(`Backup "${snap.name}" captured & old backups cleaned!`);
                      } catch (e: any) {
                        toast.error('Backup error: ' + e?.message);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Backup Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBackupModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span>Manage Backups &amp; Drive</span>
                  </button>
                </div>
              </div>
            </div>

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

          </div>

          {/* Fixed Action Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 shrink-0 z-10 shadow-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
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

      {isTemplatesModalOpen && (
        <MessageTemplatesModal
          isOpen={isTemplatesModalOpen}
          onClose={() => setIsTemplatesModalOpen(false)}
        />
      )}

      {canManageEmailDigest && isWeeklyEmailModalOpen && (
        <WeeklyEmailSettingsModal
          isOpen={isWeeklyEmailModalOpen}
          onClose={() => setIsWeeklyEmailModalOpen(false)}
        />
      )}

      {isPasscodeModalOpen && (
        <ManageLedgerPasscodeModal
          isOpen={isPasscodeModalOpen}
          onClose={() => setIsPasscodeModalOpen(false)}
        />
      )}

      {isBackupModalOpen && (
        <BackupManagementModal
          isOpen={isBackupModalOpen}
          onClose={() => {
            setIsBackupModalOpen(false);
            setBackupConfig(backupService.getConfig());
          }}
          onRestoreComplete={() => {
            if (onRestoreBackup) onRestoreBackup();
          }}
        />
      )}
    </div>
  );
};
