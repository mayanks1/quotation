import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useLockBodyScroll(isOpen);
  const { user, changePassword } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match. Please verify.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('New password must be different from current password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        toast.success('Your password has been changed successfully!');
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to update password. Please check your current password.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-800 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Glow accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <KeyRound size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Change Password
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Update account login credentials for <span className="text-slate-300 font-semibold">{user.email}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {/* Current Password */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
              <span>Current Password</span>
              <span className="text-[10px] text-slate-500 font-normal">Required for verification</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Enter your current password"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono tracking-wider transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
                title={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                New Password
              </label>
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                {showNew ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showNew ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Min 4 characters (e.g. secure password)"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono tracking-wider transition-all"
              />
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                Confirm New Password
              </label>
              {isMatch && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Passwords match
                </span>
              )}
              {isMismatch && (
                <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle size={11} /> Does not match
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Re-enter your new password"
                className={`w-full px-3.5 py-2.5 pr-10 bg-slate-950 border rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 font-mono tracking-wider transition-all ${
                  isMismatch
                    ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20'
                    : isMatch
                    ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20'
                    : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
                title={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <ShieldCheck size={14} className={isSubmitting ? 'animate-spin' : ''} />
              <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
