import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, 
  Sparkles, Layers, CheckCircle2, UserCheck, Briefcase
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, demoLogin } = useAuth();
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

  const handleDemo = async (role: 'owner' | 'manager') => {
    setIsSubmitting(true);
    await demoLogin(role);
    setIsSubmitting(false);
    toast.success(`Logged in as ${role === 'owner' ? 'Owner / Admin' : 'Sales Manager'}`);
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header / Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        <div className="inline-flex items-center gap-2.5 p-2 px-3.5 bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-xl mb-4 backdrop-blur-md">
          <img
            src="https://res.cloudinary.com/dcfouzaii/image/upload/f_auto,q_auto,w_160/v1763444919/logo_a6xmsh.png"
            alt="Tisha LED Walls"
            className="h-9 w-auto object-contain rounded-md"
          />
          <div className="text-left">
            <div className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
              <span>TISHA LED WALLS</span>
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PRO SAAS
              </span>
            </div>
            <div className="text-[10px] text-neutral-400">Enterprise Quotation &amp; AV Cloud</div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Sign In to Your Workspace
        </h1>
        <p className="mt-1.5 text-xs text-neutral-400 max-w-sm mx-auto">
          Manage live LED video walls, sound equipment quotes, GST billing, and digital client sign-offs.
        </p>
      </div>

      {/* Form Card */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-start gap-2">
              <span className="text-red-400 font-bold">Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Work Email Address
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-neutral-700 bg-neutral-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-xs text-neutral-400">Remember on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Demo Login Bar */}
          <div className="mt-6 pt-5 border-t border-neutral-800">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>Instant 1-Click Demo Logins</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemo('owner')}
                className="flex items-center justify-center gap-1.5 p-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-200 transition-all"
              >
                <ShieldCheck size={14} className="text-blue-400" />
                <span>Admin / Owner</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemo('manager')}
                className="flex items-center justify-center gap-1.5 p-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-200 transition-all"
              >
                <Briefcase size={14} className="text-emerald-400" />
                <span>Sales Manager</span>
              </button>
            </div>
          </div>

          {/* Sign up prompt */}
          <div className="mt-5 text-center text-xs text-neutral-400">
            <span>Don't have a SaaS workspace? </span>
            <Link
              to="/register"
              className="font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Create New Organization
            </Link>
          </div>
        </div>

        {/* Feature badges footer */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] text-neutral-500">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 size={12} className="text-blue-400" />
            <span>Dual Signatures</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 size={12} className="text-blue-400" />
            <span>Dynamic UPI QR</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 size={12} className="text-blue-400" />
            <span>GST &amp; WhatsApp</span>
          </div>
        </div>
      </div>
    </div>
  );
};
