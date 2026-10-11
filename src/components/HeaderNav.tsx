import React from 'react';
import { FileText, Settings, Check, Plus, Users, Edit3 } from 'lucide-react';

interface Props {
  activeTab: 'list' | 'editor' | 'clients';
  onTabChange: (tab: 'list' | 'editor' | 'clients') => void;
  onOpenSettings: () => void;
  onCreateNew: () => void;
  hasActiveQuote: boolean;
}

export const HeaderNav: React.FC<Props> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
  onCreateNew,
  hasActiveQuote,
}) => {
  return (
    <header className="no-print bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">

        {/* Main Header Bar */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-2">

          {/* Brand / Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="https://res.cloudinary.com/dcfouzaii/image/upload/f_auto,q_auto,w_160/v1763444919/logo_a6xmsh.png"
              alt="Tisha LED Walls"
              className="h-14 sm:h-18 w-auto max-w-[120px] object-contain flex-shrink-0 rounded-lg drop-shadow-sm"
            />
            <div className="min-w-0">
              <div className="font-black text-xs sm:text-base tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                <span className="truncate">TISHA LED WALLS</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
                  PRO
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden lg:block leading-tight mt-0.5">
                Quotation &amp; Rental Management System
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on Mobile) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => onTabChange('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
            >
              <FileText size={14} />
              <span>All Quotes</span>
            </button>

            {hasActiveQuote && (
              <button
                onClick={() => onTabChange('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'editor'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
              >
                <Edit3 size={14} />
                <span>Editor</span>
              </button>
            )}

            <button
              onClick={() => onTabChange('clients')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'clients'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
            >
              <Users size={14} />
              <span>Clients</span>
            </button>
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
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 rounded-lg transition-colors"
            >
              <Settings size={18} />
            </button>

            <div className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-1 rounded-md">
              <Check size={12} />
              <span>Auto-saved</span>
            </div>
          </div>

        </div>

        {/* Mobile Navigation Tabs (Segmented Control Bar) */}
        <div className="md:hidden pb-2.5 pt-0.5">
          <nav className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800/90">
            <button
              onClick={() => onTabChange('list')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <FileText size={14} />
              <span>All Quotes</span>
            </button>

            {hasActiveQuote && (
              <button
                onClick={() => onTabChange('editor')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'editor'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
              >
                <Edit3 size={14} />
                <span>Editor</span>
              </button>
            )}

            <button
              onClick={() => onTabChange('clients')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'clients'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <Users size={14} />
              <span>Clients</span>
            </button>
          </nav>
        </div>

      </div>
    </header>
  );
};
