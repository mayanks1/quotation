import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, X, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { passcodeService } from '../../services/passcodeService';
import { useToast } from '../../context/ToastContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}

export const LedgerPasscodeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Payment Ledger Security Access',
}) => {
  useLockBodyScroll(isOpen);
  const toast = useToast();

  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setErrorMsg(null);
      // Auto fetch latest passcode from cloud to ensure up-to-date
      passcodeService.loadFromCloud();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('Please enter your access passcode.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    const isValid = passcodeService.verify(passcode);
    if (isValid) {
      passcodeService.unlockSession();
      toast.success('Payment Ledger unlocked!');
      onSuccess();
    } else {
      setErrorMsg('Incorrect passcode. Please try again.');
      setPasscode('');
      inputRef.current?.focus();
    }
    setIsVerifying(false);
  };

  const handleKeyPress = (num: string) => {
    if (passcode.length < 8) {
      setPasscode((prev) => prev + num);
      setErrorMsg(null);
    }
  };

  const handleBackspace = () => {
    setPasscode((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-800 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Glow accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <KeyRound size={26} />
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold text-white tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Enter your security passcode to unlock financial collections &amp; payment data.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPasscode ? 'text' : 'password'}
              maxLength={8}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Enter passcode"
              className="w-full text-center tracking-[0.3em] font-mono text-xl py-3 px-4 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
            >
              {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 animate-in fade-in">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1 select-none">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'C') setPasscode('');
                  else if (k === '⌫') handleBackspace();
                  else handleKeyPress(k);
                }}
                className="py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-sm font-bold text-slate-200 border border-slate-700/60 transition-all cursor-pointer"
              >
                {k}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !passcode}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              Unlock Ledger
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
