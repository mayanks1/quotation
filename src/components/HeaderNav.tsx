import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText, Settings, Check, Plus, Users, Edit3,
  LogOut, Shield, ChevronDown, User, Sparkles, Building2,
  Lock, Crown, Briefcase, UserCheck, CreditCard
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
  const { user, organization, organizations, switchOrganization, logout, isSuperAdmin, hasPermission, isPaymentLedgerEnabled } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canManageUsers = isSuperAdmin || hasPermission('canManageUsers');
  const canEditBank = isSuperAdmin || hasPermission('canEditBankDetails');
  const canViewPaymentLedger = isPaymentLedgerEnabled && (isSuperAdmin || hasPermission('canViewPaymentLedger'));

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
    <header className="no-print bg-neutral-950 text-white border-b border-neutral-800/90 sticky top-0 z-50 shadow-md">
      <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-6">

        {/* Main Header Bar */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-3">

          {/* Brand / Logo */}
          <NavLink
            to="/quotes"
            className="flex items-center gap-2.5 sm:gap-3 shrink-0 hover:opacity-95 transition-opacity"
          >
            <img
              src={organization?.logoUrl || "https://res.cloudinary.com/dcfouzaii/image/upload/f_auto,q_auto,w_160/v1763444919/logo_a6xmsh.png"}
              alt={organization?.name || "Tisha LED Walls"}
              className="h-9 sm:h-10 w-auto max-w-[90px] object-contain flex-shrink-0 rounded-lg drop-shadow-sm"
            />
            <div className="shrink-0">
              <div className="font-black text-xs sm:text-sm lg:text-base tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                <span>{organization?.name || 'TISHA LED WALLS'}</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
                  {organization?.plan?.toUpperCase() || 'PRO'}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 hidden xl:block leading-tight mt-0.5">
                Quotation &amp; Ledger Suite
              </div>
            </div>
          </NavLink>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800/90 shadow-inner">
            <NavLink
              to="/quotes"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive && !isEditorActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/90'
                }`
              }
            >
              <FileText size={14} className="shrink-0" />
              <span>Quotes</span>
            </NavLink>

            {(hasActiveQuote || isEditorActive) && (
              <NavLink
                to={activeQuoteId ? `/quotes/${activeQuoteId}` : '/quotes'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isEditorActive || isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-bold'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800/90'
                  }`
                }
              >
                <Edit3 size={14} className="shrink-0" />
                <span>Editor</span>
              </NavLink>
            )}

            <NavLink
              to="/clients"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/90'
                }`
              }
            >
              <Users size={14} className="shrink-0" />
              <span>Clients</span>
            </NavLink>

            {canViewPaymentLedger && (
              <NavLink
                to="/ledger"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30 font-bold'
                      : 'text-emerald-400 hover:text-white hover:bg-emerald-950/50'
                  }`
                }
              >
                <CreditCard size={14} className="text-emerald-400 shrink-0" />
                <span>Payment Ledger</span>
              </NavLink>
            )}

            {canManageUsers && (
              <NavLink
                to="/team"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30 font-bold'
                      : 'text-purple-300 hover:text-white hover:bg-purple-950/60'
                  }`
                }
              >
                <Crown size={14} className="text-purple-400 shrink-0" />
                <span>Team &amp; Roles</span>
              </NavLink>
            )}
          </nav>

          {/* Right side CTAs */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onCreateNew}
              title="Create New Quote"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm whitespace-nowrap cursor-pointer"
            >
              <Plus size={15} className="shrink-0" />
              <span className="hidden sm:inline">New Quote</span>
              <span className="sm:hidden">New</span>
            </button>

            <button
              onClick={onOpenSettings}
              title={canEditBank ? 'Company & Bank Settings' : 'Company Settings (Bank locked by Super Admin)'}
              className="p-1.5 sm:p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-95 rounded-lg transition-colors relative"
            >
              <Settings size={18} />
              {!canEditBank && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full" />
              )}
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
                  <div className="absolute right-0 mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl py-2 z-50 text-neutral-200">
                    <div className="px-3.5 py-2.5 border-b border-neutral-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{user.name}</span>
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${isSuperAdmin
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}>
                          {isSuperAdmin ? 'Super Admin' : user.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate mt-0.5">{user.email}</div>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-neutral-400">
                        <Building2 size={11} className="text-neutral-400" />
                        <span className="truncate">{organization?.name}</span>
                      </div>

                      {/* Permission status summary banner */}
                      <div className="mt-2.5 p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] space-y-1">
                        <div className="text-neutral-400 font-semibold flex items-center justify-between">
                          <span>Access Status:</span>
                          <span className={isSuperAdmin ? 'text-purple-400 font-bold' : 'text-amber-400 font-semibold'}>
                            {isSuperAdmin ? 'Full God-Mode' : 'Strict Restriced'}
                          </span>
                        </div>
                        {!canEditBank && (
                          <div className="text-amber-400/90 flex items-center gap-1">
                            <Lock size={10} />
                            <span>Bank &amp; UPI settings locked</span>
                          </div>
                        )}
                        {!hasPermission('canDeleteQuotes') && (
                          <div className="text-neutral-400 flex items-center gap-1">
                            <Lock size={10} />
                            <span>Quotation deletion disabled</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      {canManageUsers && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            navigate('/team');
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs hover:bg-neutral-800/80 transition-colors text-left text-purple-300 font-semibold"
                        >
                          <Crown size={14} className="text-purple-400" />
                          <span>Team &amp; Role Management</span>
                        </button>
                      )}

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
                    </div>

                    {/* Multi-Workspace Switcher */}
                    <div className="py-1 border-t border-neutral-800">
                      <div className="px-3.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Workspaces</span>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              navigate('/team');
                            }}
                            className="text-purple-400 hover:text-purple-300 transition-colors font-bold"
                          >
                            + Manage
                          </button>
                        )}
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-0.5 px-1 py-0.5">
                        {organizations.map((org) => {
                          const isCurrentOrg = org.id === organization?.id;
                          return (
                            <button
                              key={org.id}
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                if (!isCurrentOrg) {
                                  switchOrganization(org.id);
                                  toast.success(`Switched active workspace to "${org.name}".`);
                                }
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${isCurrentOrg
                                ? 'bg-purple-950/70 text-purple-200 font-bold border border-purple-500/30'
                                : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                                }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Building2 size={12} className={isCurrentOrg ? 'text-purple-400 shrink-0' : 'text-neutral-500 shrink-0'} />
                                <span className="truncate">{org.name}</span>
                              </div>
                              {isCurrentOrg && <Check size={12} className="text-purple-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-1 border-t border-neutral-800">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                      >
                        <LogOut size={14} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2.5 py-1 rounded-full whitespace-nowrap shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Auto-saved</span>
            </div>
          </div>

        </div>

        {/* Mobile Navigation Tabs (Segmented Control Bar) */}
        <div className="md:hidden pb-2.5 pt-0.5">
          <nav className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800 overflow-x-auto">
            <NavLink
              to="/quotes"
              end
              className={({ isActive }) =>
                `flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${isActive && !isEditorActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`
              }
            >
              <FileText size={13} />
              <span>Quotes</span>
            </NavLink>

            {(hasActiveQuote || isEditorActive) && (
              <NavLink
                to={activeQuoteId ? `/quotes/${activeQuoteId}` : '/quotes'}
                className={({ isActive }) =>
                  `flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${isEditorActive || isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`
                }
              >
                <Edit3 size={13} />
                <span>Editor</span>
              </NavLink>
            )}

            <NavLink
              to="/clients"
              className={({ isActive }) =>
                `flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`
              }
            >
              <Users size={13} />
              <span>Clients</span>
            </NavLink>

            {canViewPaymentLedger && (
              <NavLink
                to="/ledger"
                className={({ isActive }) =>
                  `flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                    : 'text-emerald-400 hover:text-white hover:bg-neutral-800'
                  }`
                }
              >
                <CreditCard size={13} />
                <span>Ledger</span>
              </NavLink>
            )}

            {canManageUsers && (
              <NavLink
                to="/team"
                className={({ isActive }) =>
                  `flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${isActive
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                    : 'text-purple-400 hover:text-white hover:bg-neutral-800'
                  }`
                }
              >
                <Crown size={13} />
                <span>Team</span>
              </NavLink>
            )}
          </nav>
        </div>

      </div>
    </header>
  );
};
