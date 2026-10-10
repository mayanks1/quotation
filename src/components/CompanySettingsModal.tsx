import React, { useState } from 'react';
import { X, Building2, Save, Image as ImageIcon, CreditCard } from 'lucide-react';
import { CompanyProfile } from '../types/quotation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  onSave: (updated: CompanyProfile) => void;
}

export const CompanySettingsModal: React.FC<Props> = ({ isOpen, onClose, company, onSave }) => {
  const [profile, setProfile] = useState<CompanyProfile>({ ...company });

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
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
          
          {/* Logo & Basic Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Company Details</h4>
            <div className="flex items-start gap-5">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Company Logo</label>
                <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center overflow-hidden relative group bg-slate-50">
                  {profile.logo ? (
                    <>
                      <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <ImageIcon size={20} className="text-white" />
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer p-2 text-center text-slate-400 hover:text-blue-600">
                      <ImageIcon size={24} className="mb-1" />
                      <span className="text-[10px] font-medium leading-tight">Upload Logo</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3">
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
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <CreditCard size={16} className="text-blue-600" />
              <span>Bank Account & UPI Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={profile.bankDetails.accountName}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankDetails: { ...profile.bankDetails, accountName: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={profile.bankDetails.bankName}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankDetails: { ...profile.bankDetails, bankName: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={profile.bankDetails.accountNumber}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankDetails: { ...profile.bankDetails, accountNumber: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-blue-500 font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={profile.bankDetails.ifscCode}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankDetails: { ...profile.bankDetails, ifscCode: e.target.value.toUpperCase() },
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono uppercase focus:outline-blue-500 font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Bank Branch</label>
                <input
                  type="text"
                  value={profile.bankDetails.branch}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankDetails: { ...profile.bankDetails, branch: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-blue-700 block mb-1">UPI ID (GooglePay / PhonePe / Paytm)</label>
                <input
                  type="text"
                  value={profile.bankDetails.upiId}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankDetails: { ...profile.bankDetails, upiId: e.target.value },
                    })
                  }
                  placeholder="e.g. 7703948857@upi"
                  className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs font-mono text-blue-700 focus:outline-blue-500 font-semibold"
                />
              </div>
            </div>
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
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-500/20"
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
