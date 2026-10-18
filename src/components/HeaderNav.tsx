import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, Settings, Check, Plus, Users, Edit3, 
  LogOut, Shield, ChevronDown, User, Sparkles, Building2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Props {
  onOpenSettings: () => void;
  onCreateNew: () => void;
  hasActiveQuote: boolean;
  activeQuoteId?: string;
}

export const HeaderNav: React.FC<Props> = ({
  onOpenSettings,
  onCreateNew,
  hasActiveQuote,
  activeQuoteId,
}) => {
  const { user, organization, logout, demoLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    toast.info('You have signed out of your SaaS workspace.');
    navigate('/login');
  };

  const isEditorActive = location.pathname.startsWith('/quotes/') && location.pathname !== '/quotes';

  return (
    <header className="no-print bg-black text-white border-b border-neutral-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">

        {/* Main Header Bar */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-2">

          {/* Brand / Logo */}
          <NavLink
            to="/quotes"
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 hover:opacity-95 transition-opacity"
          >
            <img
              src={organization?.logoUrl || "https://res.cloudinary.com/dcfouzaii/image/upload/f_auto,q_auto,w_160/v1763444919/logo_a6xmsh.png"}
              alt={organization?.name || "Tisha LED Walls"}
              className="h-12 sm:h-14 w-auto max-w-[120px] object-contain flex-shrink-0 rounded-lg drop-shadow-sm"
            />
            <div className="min-w-0">
              <div className="font-black text-xs sm:text-base tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                <span className="truncate">{organization?.name || 'TISHA LED WALLS'}</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
                  {organization?.plan?.toUpperCase() || 'PRO'} SAAS
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 hidden lg:block leading-tight mt-0.5">
                Quotation &amp; Rental Management System
              </div>
            </div>
          </NavLink>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
            <NavLink
              to="/quotes"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive && !isEditorActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`
              }
            >
              <FileText size={14} />
              <span>All Quotes</span>
            </NavLink>

            {(hasActiveQuote || isEditorActive) && (
              <NavLink
                to={activeQuoteId ? `/quotes/${activeQuoteId}` : '/quotes'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isEditorActive || isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`
                }
              >
                <Edit3 size={14} />
                <span>Editor</span>
              </NavLink>
            )}

            <NavLink
              to="/clients"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`
              }
            >
              <Users size={14} />
              <span>Clients</span>
            </NavLink>
          </nav>

          {/* Right side CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={onCreateNew}
              title="Create New Quote"
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">New Quote</span>
              <span className="sm:hidden">New</span>
            </button>

            <button
              onClick={onOpenSettings}
              title="Company Settings & Bank Info"
              className="p-1.5 sm:p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-95 rounded-lg transition-colors"
            >
              <Settings size={18} />
            </button>

            {/* SaaS User Profile & Workspace Dropdown */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left transition-all"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-6 h-6 rounded-lg object-cover border border-neutral-700"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden xl:block max-w-[85px] truncate text-[11px] font-semibold text-neutral-200">
                    {user.name.split(' ')[0]}
                  </div>
                  <ChevronDown size={13} className="text-neutral-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl py-2 z-50 text-neutral-200">
                    <div className="px-3.5 py-2.5 border-b border-neutral-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{user.name}</span>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {user.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate mt-0.5">{user.email}</div>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-neutral-400">
                        <Building2 size={11} className="text-neutral-400" />
                        <span className="truncate">{organization?.name}</span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenSettings();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs hover:bg-neutral-800/80 transition-colors text-left"
                      >
                        <Settings size={14} className="text-neutral-400" />
                        <span>Company &amp; GST Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          demoLogin(user.role === 'owner' ? 'manager' : 'owner');
                          toast.info(`Switched to ${user.role === 'owner' ? 'Sales Manager' : 'Admin Owner'} role`);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs hover:bg-neutral-800/80 transition-colors text-left text-neutral-300"
                      >
                        <Sparkles size={14} className="text-amber-400" />
                        <span>Switch to {user.role === 'owner' ? 'Sales Manager' : 'Admin Owner'}</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-neutral-800">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                      >
                        <LogOut size={14} />
                        <span>Sign Out of SaaS</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-1 rounded-md">
              <Check size={12} />
              <span>Auto-saved</span>
            </div>
          </div>

        </div>

        {/* Mobile Navigation Tabs (Segmented Control Bar) */}
        <div className="md:hidden pb-2.5 pt-0.5">
          <nav className="flex items-center gap-1.5 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
            <NavLink
              to="/quotes"
              end
              className={({ isActive }) =>
                `flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                  isActive && !isEditorActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`
              }
            >
              <FileText size={14} />
              <span>All Quotes</span>
            </NavLink>

            {(hasActiveQuote || isEditorActive) && (
              <NavLink
                to={activeQuoteId ? `/quotes/${activeQuoteId}` : '/quotes'}
                className={({ isActive }) =>
                  `flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    isEditorActive || isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`
                }
              >
                <Edit3 size={14} />
                <span>Editor</span>
              </NavLink>
            )}

            <NavLink
              to="/clients"
              className={({ isActive }) =>
                `flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`
              }
            >
              <Users size={14} />
              <span>Clients</span>
            </NavLink>
          </nav>
        </div>

      </div>
    </header>
  );
};
