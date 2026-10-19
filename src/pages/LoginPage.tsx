import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle2,
  Sparkles, QrCode, PenTool, ShieldCheck, Database,
  MonitorPlay, Zap, Building2, ChevronRight
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const from = (location.state as any)?.from?.pathname || '/quotes';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    const res = await login(email, password);
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Welcome back to Tisha LED Walls PRO!');
      navigate(from, { replace: true });
    } else {
      setErrorMsg(res.error || 'Login failed. Please check your credentials.');
      toast.error(res.error || 'Login failed');
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen w-full bg-[#06080e] text-neutral-100 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Dynamic Background Mesh & Lighting Effects */}
      <div className="absolute inset-0 bg-led-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-[700px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-0 right-1/4 translate-y-1/3 w-[600px] h-[450px] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 -translate-y-1/2 w-[400px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column: Brand Hero & Value Proposition (Visible on Desktop / Collapsed on Mobile) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-8 pr-4">

            {/* Brand Logo & SaaS Tag */}
            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800/90 shadow-xl backdrop-blur-md w-fit">
              <img
                src="https://res.cloudinary.com/dcfouzaii/image/upload/f_auto,q_auto,w_160/v1763444919/logo_a6xmsh.png"
                alt="Tisha LED Walls"
                className="h-7 w-auto object-contain rounded drop-shadow-md"
              />
              <span className="text-xs font-black tracking-wider text-white">TISHA LED WALLS</span>
              <span className="text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                ENTERPRISE PRO
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white leading-[1.12]">
                Next-Gen <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  Quotation &amp; Rental Intelligence
                </span>
              </h1>
              <p className="text-sm xl:text-base text-neutral-400 max-w-xl leading-relaxed">
                Streamline commercial pricing, dynamic UPI milestone QR payments, dual touchscreen digital signatures, and automated rental booking contracts — engineered for modern event production leaders.
              </p>
            </div>

            {/* 3 Value Proposition Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-md space-y-2 hover:border-blue-500/40 transition-all duration-300 group">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <QrCode size={18} />
                </div>
                <div className="font-bold text-xs text-white">Dynamic UPI QR</div>
                <div className="text-[11px] text-neutral-400 leading-snug">
                  Auto-syncs live QR codes with GST rates, discounts, and advance milestones.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-md space-y-2 hover:border-indigo-500/40 transition-all duration-300 group">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PenTool size={18} />
                </div>
                <div className="font-bold text-xs text-white">Touchscreen Signatures</div>
                <div className="text-[11px] text-neutral-400 leading-snug">
                  Dual client &amp; vendor sign-off embedded directly into vector PDF agreements.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-md space-y-2 hover:border-emerald-500/40 transition-all duration-300 group">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck size={18} />
                </div>
                <div className="font-bold text-xs text-white">Cloud RBAC Security</div>
                <div className="text-[11px] text-neutral-400 leading-snug">
                  Granular role permissions, Supabase synchronization, and automated backups.
                </div>
              </div>
            </div>

            {/* Proof Metric Strip */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-6 text-xs text-neutral-400 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white font-bold">1,000+</span> LED Wall Setups Quoted
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-white font-bold">₹1.5Cr+</span> Managed Pipeline
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-white font-bold">99.9%</span> Cloud SLA
              </div>
            </div>

          </div>

          {/* Right Column: High-End Sign-in Form Card */}
          <div className="lg:col-span-5 w-full max-w-[440px] mx-auto">

            {/* Mobile Header Branding (Visible only on mobile/tablet) */}
            <div className="lg:hidden text-center mb-6 space-y-2">
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 shadow-md backdrop-blur-md">
                <img
                  src="https://res.cloudinary.com/dcfouzaii/image/upload/f_auto,q_auto,w_160/v1763444919/logo_a6xmsh.png"
                  alt="Tisha LED Walls"
                  className="h-6 w-auto object-contain rounded"
                />
                <span className="text-xs font-black tracking-wide text-white">TISHA LED WALLS</span>
                <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  PRO
                </span>
              </div>
              <h2 className="text-2xl font-black text-white">Sign In to Workspace</h2>
              <p className="text-xs text-neutral-400">Manage quotations, payments &amp; bookings</p>
            </div>

            {/* Glassmorphic Auth Card */}
            <div className="relative rounded-3xl bg-neutral-900/80 border border-neutral-800/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] p-6 sm:p-8 backdrop-blur-2xl overflow-hidden">

              {/* Iridescent Accent Line */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/70 to-transparent" />

              {/* Card Header (Desktop) */}
              <div className="hidden lg:block mb-6">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Welcome back
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Enter your credentials to access your organization workspace
                </p>
              </div>

              {/* Error Callout */}
              {errorMsg && (
                <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <span className="font-bold text-rose-400 shrink-0">Error:</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Email Field */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Work Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-blue-400 transition-colors">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-300">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-blue-400 transition-colors">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Preferences & Live Status */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-neutral-700 bg-neutral-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-xs text-neutral-400 font-medium">Remember this device</span>
                  </label>

                  <span className="text-[10px] text-emerald-400 flex items-center gap-1.5 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Cloud Synced
                  </span>
                </div>

                {/* Submit Action CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl text-sm shadow-xl shadow-blue-600/30 transition-all duration-200 disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

            </div>

            {/* Enterprise Security Footer */}
            <div className="flex items-center justify-center gap-5 text-center text-[10.5px] text-neutral-500 pt-5 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-blue-400" />
                <span>256-Bit SSL Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Database size={13} className="text-indigo-400" />
                <span>Supabase Cloud Guard</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>RBAC Verified</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
