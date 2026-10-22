import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, Check, X, ShieldCheck, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { passcodeService } from '../../services/passcodeService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageLedgerPasscodeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useLockBodyScroll(isOpen);
  const toast = useToast();
  const { user, isSuperAdmin } = useAuth();

  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [superAdminOverride, setSuperAdminOverride] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!superAdminOverride) {
      if (!passcodeService.verify(currentPasscode)) {
        toast.error('Current passcode is incorrect.');
        return;
      }
    }

    const cleanNew = newPasscode.trim();
    if (cleanNew.length < 4) {
      toast.error('New passcode must be at least 4 digits or characters.');
      return;
    }

    if (cleanNew !== confirmPasscode.trim()) {
      toast.error('New passcode and confirmation do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await passcodeService.updatePasscode(cleanNew, user?.name || user?.email);
      if (res.success) {
        toast.success('Payment Ledger passcode updated and synced successfully!');
        onClose();
      } else {
        toast.error(res.error || 'Failed to update passcode');
      }
    } catch (err: any) {
      toast.error('Error updating passcode: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLockNow = () => {
    passcodeService.lockSession();
    toast.info('Payment Ledger session locked. Passcode will be required on next access.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-800 relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Payment Ledger Passcode</h3>
              <p className="text-[11px] text-slate-400">Configure access PIN protection</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          
          {/* Super Admin Override toggle */}
          {isSuperAdmin && (
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-indigo-400" />
                  <span>Super Admin Reset Override</span>
                </div>
                <div className="text-[10.5px] text-slate-400">
                  Reset without knowing current passcode
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={superAdminOverride}
                  onChange={(e) => setSuperAdminOverride(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          )}

          {/* Current Passcode (if not overridden) */}
          {!superAdminOverride && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Current Passcode
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={currentPasscode}
                onChange={(e) => setCurrentPasscode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter current passcode (default: 1234)"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
              />
            </div>
          )}

          {/* New Passcode */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                New Passcode (4-8 digits)
              </label>
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showPass ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 5678"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
            />
          </div>

          {/* Confirm New Passcode */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Confirm New Passcode
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter new passcode"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleLockNow}
              className="py-2 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
              title="Lock the current session immediately"
            >
              Lock Ledger Now
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-3.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !newPasscode || !confirmPasscode}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save Passcode</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
