import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    toast.success('Password reset instructions sent to your email.');
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Reset Your Password
        </h1>
        <p className="mt-1.5 text-xs text-neutral-400 max-w-sm mx-auto">
          Enter your registered work email and we will send you recovery instructions.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {submitted ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Reset Link Sent!</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                We've sent password reset instructions to <span className="text-blue-400 font-semibold">{email}</span>. Please check your inbox and spam folder.
              </p>
              <div className="pt-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Your Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@tishaledwalls.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
              >
                <Send size={16} />
                <span>Send Reset Link</span>
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
