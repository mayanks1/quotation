import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Building2, User, Mail, Lock, Phone, ArrowRight, 
  Sparkles, Check, CheckCircle2 
} from 'lucide-react';
import { SaaSPlan } from '../types/auth';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();

  const [orgName, setOrgName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<SaaSPlan>('pro');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !userName || !email || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    const res = await register({
      orgName,
      userName,
      email,
      password,
      phone,
      plan,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Welcome to Tisha LED Walls PRO! Your "${orgName}" workspace is ready.`);
      navigate('/quotes', { replace: true });
    } else {
      setErrorMsg(res.error || 'Registration failed.');
      toast.error(res.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Create Your SaaS Workspace
        </h1>
        <p className="mt-1.5 text-xs text-neutral-400 max-w-sm mx-auto">
          Start generating branded quotations with dynamic UPI payment QR codes, dual signatures, and WhatsApp follow-ups.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
        <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-start gap-2">
              <span className="text-red-400 font-bold">Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Plan Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Select Workspace Plan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'starter', name: 'Starter', price: 'Free', limit: '50 Quotes' },
                  { id: 'pro', name: 'Pro SaaS', price: '₹999/mo', limit: '1000 Quotes', popular: true },
                  { id: 'enterprise', name: 'Enterprise', price: '₹2499/mo', limit: 'Unlimited' },
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setPlan(p.id as SaaSPlan)}
                    className={`cursor-pointer p-3 rounded-xl border text-center transition-all relative ${
                      plan === p.id
                        ? 'border-blue-500 bg-blue-500/10 shadow-md shadow-blue-500/10'
                        : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-600 text-white rounded-full">
                        Popular
                      </span>
                    )}
                    <div className="text-xs font-bold text-white">{p.name}</div>
                    <div className="text-xs font-extrabold text-blue-400 mt-0.5">{p.price}</div>
                    <div className="text-[10px] text-neutral-400 mt-1">{p.limit}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Company / Organization Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Building2 size={16} />
                  </div>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Apex Visuals & Sound"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Your Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Rohit Mehra"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Work Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rohit@apexvisuals.com"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Create Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span>Creating Workspace...</span>
              ) : (
                <>
                  <span>Create Workspace &amp; Launch</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-neutral-400">
            <span>Already have a workspace? </span>
            <Link
              to="/login"
              className="font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign In Instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
