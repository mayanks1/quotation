import React from 'react';
import { Layers, FileText, Settings, Check, Plus, Users } from 'lucide-react';

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
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-md shadow-blue-500/30">
            <Layers size={20} />
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2">
              <span>TISHA LED WALLS</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              Quotation &amp; Rental Management System
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onTabChange('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText size={15} />
            <span className="hidden sm:inline">All Quotes</span>
          </button>

          {hasActiveQuote && (
            <button
              onClick={() => onTabChange('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'editor'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText size={15} />
              <span>Editor</span>
            </button>
          )}

          <button
            onClick={() => onTabChange('clients')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'clients'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users size={15} />
            <span className="hidden sm:inline">Clients</span>
          </button>
        </nav>

        {/* Right side CTAs */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateNew}
            title="Create New Quote"
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Plus size={15} />
            <span className="hidden md:inline">New Quote</span>
          </button>

          <button
            onClick={onOpenSettings}
            title="Company Settings & Bank Info"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Settings size={18} />
          </button>

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-1 rounded-md">
            <Check size={12} />
            <span>Auto-saved</span>
          </div>
        </div>

      </div>
    </header>
  );
};
