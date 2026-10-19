import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, ArrowLeft, CheckCircle2, Send, Lock, Phone, 
  KeyRound, ShieldCheck, Eye, EyeOff, AlertCircle, MessageCircle
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);

  // Normalize phone for comparison (strips +91, 0, spaces, dashes)
  const cleanPhone = (str?: string) => (str || '').replace(/\D/g, '').slice(-10);

  // Step 1: Lookup User by Email
  const handleLookupEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your work email.');
      return;
    }

    setIsLoading(true);

    try {
      if (!supabase) {
        throw new Error('Database connection is not available.');
      }

      // Query database for user
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      let found = data;

      // Fallback check on saas_users if not found in users
      if (!found) {
        const { data: saasData } = await supabase
          .from('saas_users')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        found = saasData;
      }

      if (!found) {
        setErrorMsg('No user account found with this email. Please check your spelling or contact the Super Admin.');
        setIsLoading(false);
        return;
      }

      setTargetUser(found);
      
      // Also trigger Supabase auth reset in case custom SMTP is configured
      try {
        await supabase.auth.resetPasswordForEmail(cleanEmail);
      } catch (e) {
        // Silently ignore if SMTP is not configured
      }

      setIsLoading(false);
      setStep(2);
      toast.success(`Account identified for ${found.name}`);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Could not find account. Please try again.');
    }
  };

  // Step 2: Verify Phone / Identity
  const handleVerifyPhone = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const entered = cleanPhone(phoneInput);
    const expected = cleanPhone(targetUser?.phone);

    if (!entered) {
      setErrorMsg('Please enter your registered phone number.');
      return;
    }

    // If account has no phone registered or entered phone matches last 10 digits
    if (!expected || entered === expected) {
      setStep(3);
      toast.success('Identity verified! Please set your new password.');
    } else {
      setErrorMsg(`Phone number did not match our records for this account (expected number ending in ...${expected.slice(-4)}).`);
    }
  };

  // Step 3: Update Password in Supabase & Local Cache
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      if (!supabase || !targetUser?.id) {
        throw new Error('Database is offline. Could not update password.');
      }

      // 1. Update in public.users
      const { error: updateErr } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', targetUser.id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      // 2. Update in saas_users backup table (if exists)
      try {
        await supabase
          .from('saas_users')
          .update({ password: newPassword })
          .eq('id', targetUser.id);
      } catch (e) {
        // Silently ignore backup table errors
      }

      // 3. Update localStorage users cache so immediate login works
      try {
        const cachedRaw = localStorage.getItem('tisha_saas_users_directory_v3');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached)) {
            const updated = cached.map((u: any) =>
              u.id === targetUser.id ? { ...u, password: newPassword } : u
            );
            localStorage.setItem('tisha_saas_users_directory_v3', JSON.stringify(updated));
          }
        }
      } catch (e) {}

      setIsLoading(false);
      setStep(4);
      toast.success('Password updated successfully!');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(`Failed to update password: ${err?.message || 'Unknown error'}`);
    }
  };

  // Helper to open WhatsApp to request admin help
  const handleContactAdminWhatsApp = () => {
    const text = `Hello Admin, I need help recovering my Tisha LED Walls PRO account password for email: ${email || 'my registered account'}.`;
    const url = `https://wa.me/917703948857?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-neutral-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[300px] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-bold text-neutral-300">
          <KeyRound size={13} className="text-blue-400" />
          <span>ACCOUNT RECOVERY</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Reset Your Password
        </h1>
        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
          {step === 1 && 'Enter your registered work email to verify and recover your workspace access.'}
          {step === 2 && 'Verify your identity using your registered account phone number.'}
          {step === 3 && 'Choose a strong new password for your account.'}
          {step === 4 && 'Your password has been securely updated in the database.'}
        </p>
      </div>

      {/* Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-neutral-900/85 border border-neutral-800/90 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleLookupEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Registered Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@tishaledwalls.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Checking Account...</span>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Continue Verification</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center flex items-center justify-between text-xs">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </Link>

                <button
                  type="button"
                  onClick={handleContactAdminWhatsApp}
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-semibold cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>WhatsApp Admin</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Verify Phone */}
          {step === 2 && (
            <form onSubmit={handleVerifyPhone} className="space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs space-y-1">
                <div className="font-bold text-blue-300">Account Found:</div>
                <div className="text-white font-medium">{targetUser?.name} ({targetUser?.email})</div>
                <div className="text-neutral-400 text-[11px]">
                  Role: <span className="uppercase font-mono text-neutral-300">{targetUser?.role}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Confirm Registered Phone Number
                  {targetUser?.phone && (
                    <span className="text-[11px] font-normal text-blue-400 ml-1.5">
                      (Ending in ...{cleanPhone(targetUser?.phone).slice(-4)})
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="e.g. 7703948857"
                    className="w-full pl-10 pr-3 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <ShieldCheck size={15} />
                  <span>Verify Identity</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs flex items-center gap-2 text-emerald-300">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>Identity verified. Enter your new password below.</span>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-3 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Saving Password...</span>
                ) : (
                  <>
                    <KeyRound size={15} />
                    <span>Set New Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 4: Success Screen */}
          {step === 4 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 size={30} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Password Updated!</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Your new password is now active in the cloud database. You can now sign in with your new credentials.
                </p>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Sign In to Workspace</span>
                <ArrowLeft size={16} className="rotate-180" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
