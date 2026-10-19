import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Plus, Search, Copy, Download, Trash2, 
  Share2, CheckCircle2, Clock, CheckCheck, 
  XCircle, Receipt, ArrowRight, ArrowLeft, IndianRupee,
  Calendar, Filter, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, ArrowUpDown, SlidersHorizontal,
  RotateCcw, Sparkles, FileSpreadsheet, Upload, Database, Layers, Bell,
  TrendingUp, MapPin, Building2, Send, FileEdit
} from 'lucide-react';
import { Quotation, QuotationStatus, getItemAmount } from '../types/quotation';
import { generateWhatsAppShareUrl } from '../services/whatsapp';
import { exportQuotationPDF } from '../services/pdfGenerator';
import { storage } from '../services/storage';
import { exportQuotationsToCSV } from '../utils/csvExport';
import { getQuotationExpiryStatus, generateWhatsAppReminderUrl } from '../utils/quotationExpiry';
import { useToast, useConfirm } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { ShareQuotationModal } from './ShareQuotationModal';
import { Lock } from 'lucide-react';

interface Props {
  quotations: Quotation[];
  onSelectQuotation: (id: string) => void;
  onCreateNew: () => void;
  onDuplicate: (quotation: Quotation) => void;
  onDelete: (id: string) => void;
  onRestoreBackup?: () => void;
  onRestoreQuotation?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onEmptyTrash?: () => void;
}

type DatePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'last_30_days' | 'this_year' | 'custom';
type SortOption = 
  | 'date_desc' 
  | 'date_asc' 
  | 'amount_desc' 
  | 'amount_asc' 
  | 'number_asc' 
  | 'client_asc' 
  | 'event_asc';
type AmountFilter = 'all' | 'under_25k' | '25k_to_100k' | 'above_100k';

// Helper to robustly parse DD-MM-YYYY, YYYY-MM-DD or standard strings to epoch ms
const parseDateToMs = (dateStr?: string): number | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  // YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  const parsed = Date.parse(trimmed);
  return isNaN(parsed) ? null : parsed;
};

// Convert Date object to YYYY-MM-DD for native <input type="date" />
const toISODate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const QuotationList: React.FC<Props> = ({
  quotations,
  onSelectQuotation,
  onCreateNew,
  onDuplicate,
  onDelete,
  onRestoreBackup,
  onRestoreQuotation,
  onPermanentDelete,
  onEmptyTrash,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { isSuperAdmin, hasPermission } = useAuth();
  const canDelete = isSuperAdmin || hasPermission('canDeleteQuotes');
  const canRestore = isSuperAdmin || hasPermission('canRestoreBackups');

  // Trashed items state (synced with storage)
  const [trashedList, setTrashedList] = useState<Quotation[]>(() => storage.getTrashedQuotations());

  useEffect(() => {
    setTrashedList(storage.getTrashedQuotations());
  }, [quotations]);

  const trashCount = trashedList.length;

  const getDaysRemainingInTrash = (deletedAt?: string) => {
    if (!deletedAt) return 30;
    const deletedMs = new Date(deletedAt).getTime();
    const elapsedDays = Math.floor((Date.now() - deletedMs) / (24 * 60 * 60 * 1000));
    return Math.max(0, 30 - elapsedDays);
  };

  // Primary Controls State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [shareModalQuote, setShareModalQuote] = useState<Quotation | null>(null);

  // Advanced Filters State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFieldTarget, setDateFieldTarget] = useState<'quotation' | 'event'>('quotation');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<AmountFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Helper to calculate total value for a quote
  const calculateTotal = (q: Quotation): number => {
    const subtotal = q.lineItems.reduce((acc, i) => acc + getItemAmount(i), 0);
    const discounted = Math.max(0, subtotal - (q.discountAmount || 0));
    const isZeroTax = q.taxScheme === 'none';
    const effectiveTaxRate = isZeroTax ? 0 : (q.taxRate || 0);
    const tax = isZeroTax ? 0 : (discounted * effectiveTaxRate) / 100;
    return Math.max(0, discounted + tax + (q.shippingCharges || 0) + (q.adjustmentAmount || 0));
  };

  // Overall Business Stats (Overall pipeline across all quotations)
  const totalCount = quotations.length;
  const draftCount = quotations.filter((q) => !q.status || q.status === 'draft').length;
  const sentCount = quotations.filter((q) => q.status === 'sent').length;
  const approvedCount = quotations.filter((q) => q.status === 'approved').length;
  const invoicedCount = quotations.filter((q) => q.status === 'invoiced').length;
  const rejectedCount = quotations.filter((q) => q.status === 'rejected').length;
  const approvedOrInvoicedCount = quotations.filter((q) => q.status === 'approved' || q.status === 'invoiced').length;

  const totalValue = quotations.reduce((acc, q) => acc + calculateTotal(q), 0);
  const approvedValue = quotations
    .filter((q) => q.status === 'approved' || q.status === 'invoiced')
    .reduce((acc, q) => acc + calculateTotal(q), 0);

  // Client initials helper for luxury monogram avatars
  const getClientInitials = (name?: string): string => {
    if (!name || !name.trim()) return 'QT';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarGradient = (str: string): string => {
    const gradients = [
      'from-blue-600 to-indigo-600 text-white',
      'from-indigo-600 to-purple-600 text-white',
      'from-emerald-600 to-teal-600 text-white',
      'from-amber-500 to-orange-600 text-white',
      'from-rose-500 to-pink-600 text-white',
      'from-cyan-600 to-blue-600 text-white',
      'from-violet-600 to-fuchsia-600 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  // Unique client list for client filter dropdown
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => {
      const name = q.client?.name?.trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [quotations]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'today') {
      const todayStr = toISODate(now);
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
      setCustomStartDate(toISODate(startOfWeek));
      setCustomEndDate(toISODate(now));
    } else if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setCustomStartDate(toISODate(startOfMonth));
      setCustomEndDate(toISODate(endOfMonth));
    } else if (preset === 'last_30_days') {
      const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setCustomStartDate(toISODate(past30));
      setCustomEndDate(toISODate(now));
    } else if (preset === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      setCustomStartDate(toISODate(startOfYear));
      setCustomEndDate(toISODate(endOfYear));
    } else if (preset === 'all') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  // Reset all active filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setDateFieldTarget('quotation');
    setClientFilter('all');
    setAmountFilter('all');
    setSortOption('date_desc');
    setCurrentPage(1);
    toast.info('All filters have been reset');
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter !== 'all') count++;
    if (datePreset !== 'all' || customStartDate || customEndDate) count++;
    if (clientFilter !== 'all') count++;
    if (amountFilter !== 'all') count++;
    if (sortOption !== 'date_desc') count++;
    return count;
  }, [search, statusFilter, datePreset, customStartDate, customEndDate, clientFilter, amountFilter, sortOption]);

  // Reset page to 1 on any filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, datePreset, customStartDate, customEndDate, clientFilter, amountFilter, sortOption, dateFieldTarget, pageSize]);

  // Filter & Sort Logic
  const filteredAndSorted = useMemo(() => {
    const sourceList = statusFilter === 'trash' ? trashedList : quotations;
    return sourceList
      .filter((q) => {
        // Status filter
        if (statusFilter !== 'all' && statusFilter !== 'trash' && q.status !== statusFilter) {
          return false;
        }

        // Search text
        if (search.trim()) {
          const term = search.toLowerCase();
          const matches =
            q.quotationNumber.toLowerCase().includes(term) ||
            (q.client?.name || '').toLowerCase().includes(term) ||
            (q.client?.company || '').toLowerCase().includes(term) ||
            (q.venue || '').toLowerCase().includes(term) ||
            (q.client?.email || '').toLowerCase().includes(term) ||
            (q.client?.phone || '').toLowerCase().includes(term);
          if (!matches) return false;
        }

        // Client filter
        if (clientFilter !== 'all') {
          if (q.client?.name?.trim() !== clientFilter) {
            return false;
          }
        }

        // Amount filter
        const total = calculateTotal(q);
        if (amountFilter === 'under_25k' && total >= 25000) return false;
        if (amountFilter === '25k_to_100k' && (total < 25000 || total > 100000)) return false;
        if (amountFilter === 'above_100k' && total <= 100000) return false;

        // Date Range filter
        if (customStartDate || customEndDate) {
          const targetDateStr = dateFieldTarget === 'quotation' ? q.quotationDate : q.eventDate;
          const targetMs = parseDateToMs(targetDateStr);
          if (!targetMs) return false; // Date cannot be determined

          if (customStartDate) {
            const startMs = new Date(customStartDate + 'T00:00:00').getTime();
            if (targetMs < startMs) return false;
          }
          if (customEndDate) {
            const endMs = new Date(customEndDate + 'T23:59:59').getTime();
            if (targetMs > endMs) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'date_desc') {
          const aMs = parseDateToMs(a.quotationDate) || 0;
          const bMs = parseDateToMs(b.quotationDate) || 0;
          return bMs - aMs;
        }
        if (sortOption === 'date_asc') {
          const aMs = parseDateToMs(a.quotationDate) || 0;
          const bMs = parseDateToMs(b.quotationDate) || 0;
          return aMs - bMs;
        }
        if (sortOption === 'amount_desc') {
          return calculateTotal(b) - calculateTotal(a);
        }
        if (sortOption === 'amount_asc') {
          return calculateTotal(a) - calculateTotal(b);
        }
        if (sortOption === 'number_asc') {
          return a.quotationNumber.localeCompare(b.quotationNumber);
        }
        if (sortOption === 'client_asc') {
          return (a.client?.name || '').localeCompare(b.client?.name || '');
        }
        if (sortOption === 'event_asc') {
          const aMs = parseDateToMs(a.eventDate) || 9999999999999;
          const bMs = parseDateToMs(b.eventDate) || 9999999999999;
          return aMs - bMs;
        }
        return 0;
      });
  }, [
    quotations, trashedList, search, statusFilter, dateFieldTarget, 
    customStartDate, customEndDate, clientFilter, amountFilter, sortOption
  ]);

  // Pagination Calculations
  const totalItems = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedQuotations = filteredAndSorted.slice(startIndex, endIndex);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'invoiced':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <Receipt size={12} /> Invoiced
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <CheckCheck size={12} /> Sent
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <Clock size={12} /> Draft
          </span>
        );
    }
  };

  const handleQuickDownload = async (e: React.MouseEvent, q: Quotation) => {
    e.stopPropagation();
    setExportingId(q.id);
    try {
      await exportQuotationPDF(q);
      toast.success(`PDF downloaded for ${q.quotationNumber}`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setExportingId(null);
    }
  };

  const handleOpenShare = (e: React.MouseEvent, q: Quotation) => {
    e.stopPropagation();
    setShareModalQuote(q);
  };

  const handleDuplicateQuote = (e: React.MouseEvent, quote: Quotation) => {
    e.stopPropagation();
    onDuplicate(quote);
    toast.success(`Quotation ${quote.quotationNumber} duplicated as new draft`);
  };

  const handleDeleteQuote = async (e: React.MouseEvent, quote: Quotation) => {
    e.stopPropagation();
    if (!canDelete) {
      toast.warning('Locked: Only Super Admin can delete quotation records.');
      return;
    }
    const confirmed = await confirm({
      title: 'Move to Trash (30 Days Retention)',
      message: `Move quotation "${quote.quotationNumber}" to Trash? It will be safely retained in Trash for 30 days before permanent deletion. You can restore it anytime.`,
      confirmText: 'Move to Trash',
      cancelText: 'Keep Quote',
      variant: 'danger',
    });
    if (confirmed) {
      onDelete(quote.id);
      setTrashedList(storage.getTrashedQuotations());
    }
  };

  const handleRestoreQuote = async (e: React.MouseEvent, quote: Quotation) => {
    e.stopPropagation();
    if (onRestoreQuotation) {
      onRestoreQuotation(quote.id);
    } else {
      storage.restoreFromTrash(quote.id);
    }
    setTrashedList(storage.getTrashedQuotations());
  };

  const handlePermanentDeleteQuote = async (e: React.MouseEvent, quote: Quotation) => {
    e.stopPropagation();
    if (!canDelete) {
      toast.warning('Locked: Only Super Admin can permanently delete quotation records.');
      return;
    }
    const confirmed = await confirm({
      title: 'Permanently Delete Quotation',
      message: `Are you sure you want to permanently delete "${quote.quotationNumber}"? This action cannot be undone or recovered.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      if (onPermanentDelete) {
        onPermanentDelete(quote.id);
      } else {
        storage.permanentlyDelete(quote.id);
      }
      setTrashedList(storage.getTrashedQuotations());
    }
  };

  const handleEmptyAllTrash = async () => {
    if (!canDelete) {
      toast.warning('Locked: Only Super Admin can empty the trash.');
      return;
    }
    const confirmed = await confirm({
      title: 'Empty Trash',
      message: `Permanently delete all ${trashedList.length} quotations/invoices in the Trash? This cannot be recovered.`,
      confirmText: 'Empty All Trash',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      if (onEmptyTrash) {
        onEmptyTrash();
      } else {
        storage.emptyTrash();
      }
      setTrashedList([]);
    }
  };

  const handleExportCSV = () => {
    try {
      const listToExport = filteredAndSorted.length > 0 ? filteredAndSorted : quotations;
      if (listToExport.length === 0) {
        toast.info('No quotations to export');
        return;
      }
      exportQuotationsToCSV(listToExport);
      toast.success(`Exported ${listToExport.length} quotation${listToExport.length > 1 ? 's' : ''} to Excel/CSV`);
    } catch (err) {
      console.error('CSV export failed:', err);
      toast.error('Failed to export CSV. Please try again.');
    }
  };

  const handleExportBackup = async () => {
    try {
      await storage.exportBackup();
      toast.success('Database backup (.json) downloaded');
    } catch (err) {
      console.error('Backup export failed:', err);
      toast.error('Backup failed: ' + err);
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const confirmed = await confirm({
      title: 'Restore Database Backup',
      message: 'Restoring will merge quotations, clients, and catalog items from the backup file into your database. Continue?',
      confirmText: 'Restore Backup',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (confirmed) {
      try {
        const res = await storage.importBackup(file);
        toast.success(`Restored successfully! Loaded ${res.quotationsCount} quotations.`);
        if (onRestoreBackup) onRestoreBackup();
      } catch (err) {
        toast.error('Restore failed: ' + err);
      }
    }
    e.target.value = '';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      
      {/* Top Banner / Business KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Quotes */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300/80 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total Quotes</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono tracking-tight">{totalCount}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>All-time quotations generated</span>
          </div>
        </div>

        {/* Card 2: Approved / Won */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300/80 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">Approved / Won</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2 font-mono tracking-tight">{approvedOrInvoicedCount}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-semibold">
            <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
              {totalCount > 0 ? Math.round((approvedOrInvoicedCount / totalCount) * 100) : 0}% win rate
            </span>
            <span className="text-slate-400 text-[10px]">accepted orders</span>
          </div>
        </div>

        {/* Card 3: Quoted Pipeline */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300/80 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Quoted Pipeline</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono tracking-tight flex items-center">
            <IndianRupee size={20} className="-mr-0.5 text-slate-700" />
            {totalValue.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Gross commercial pipeline</span>
          </div>
        </div>

        {/* Card 4: Won Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-400/80 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-80" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider">Won Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-2 font-mono tracking-tight flex items-center">
            <IndianRupee size={20} className="-mr-0.5 text-blue-600" />
            {approvedValue.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Confirmed booking revenue</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Status Pipeline Segmented Pills Bar */}
        <div className="px-3 sm:px-6 py-2.5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto overflow-y-hidden no-scrollbar border-b border-slate-100 bg-slate-50/80">
          {[
            { id: 'all', label: 'All Quotes', count: totalCount, icon: Layers, activeBadge: 'bg-slate-100 text-slate-800' },
            { id: 'sent', label: 'Sent', count: sentCount, icon: Send, activeBadge: 'bg-blue-100 text-blue-700' },
            { id: 'approved', label: 'Approved', count: approvedCount, icon: CheckCircle2, activeBadge: 'bg-emerald-100 text-emerald-700' },
            { id: 'invoiced', label: 'Invoiced', count: invoicedCount, icon: Receipt, activeBadge: 'bg-indigo-100 text-indigo-700' },
            { id: 'draft', label: 'Drafts', count: draftCount, icon: FileEdit, activeBadge: 'bg-amber-100 text-amber-700' },
            { id: 'rejected', label: 'Rejected', count: rejectedCount, icon: XCircle, activeBadge: 'bg-rose-100 text-rose-700' },
            { id: 'trash', label: 'Trash', count: trashCount, icon: Trash2, activeBadge: 'bg-rose-100 text-rose-700' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/90'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                  isActive ? tab.activeBadge : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Primary Controls Bar */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-2.5 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search quote #, client, venue, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50/80 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-2xs placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Quick Actions & Toggles */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
              
              {/* Filter & Sort Drawer Toggle */}
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isFilterOpen || activeFiltersCount > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                }`}
                title="Toggle detailed filters & sorting"
              >
                <SlidersHorizontal size={14} />
                <span>Filters &amp; Sort</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Export to CSV (Spreadsheet) */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border bg-white hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 shadow-2xs cursor-pointer"
                title={`Export ${filteredAndSorted.length} quotation(s) to Excel/CSV`}
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span className="hidden sm:inline">CSV Export</span>
              </button>

              {/* Backup & Restore Menu */}
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-700 shadow-2xs cursor-pointer"
                  title="Database backup & restore"
                >
                  <Database size={14} className="text-blue-600" />
                  <span className="hidden sm:inline">Backup</span>
                </button>
                <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-30 space-y-1 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl text-left transition-colors cursor-pointer"
                  >
                    <Download size={13} className="text-blue-600" />
                    <span>Download JSON Backup</span>
                  </button>
                  <label className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl text-left cursor-pointer transition-colors">
                    <Upload size={13} className="text-emerald-600" />
                    <span>Restore from JSON File</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleRestoreBackupFile}
                    />
                  </label>
                </div>
              </div>

              {/* Create New CTA */}
              <button
                onClick={onCreateNew}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-500/25 whitespace-nowrap ml-auto sm:ml-0 cursor-pointer"
              >
                <Plus size={16} />
                <span>New Quote</span>
              </button>
            </div>

          </div>

          {/* Expandable Filter & Sort Panel */}
          {isFilterOpen && (
            <div className="pt-3 pb-2 border-t border-slate-100 space-y-3.5 bg-slate-50/70 -mx-3.5 sm:-mx-5 px-3.5 sm:px-5 rounded-b-xl animate-in fade-in duration-200">
              
              {/* Row 1: Date Range Presets & Target */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Calendar size={13} className="text-blue-600" />
                    <span>Filter by Date Range</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold">Target:</span>
                    <button
                      type="button"
                      onClick={() => setDateFieldTarget('quotation')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        dateFieldTarget === 'quotation'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Quotation Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateFieldTarget('event')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        dateFieldTarget === 'event'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Event Date
                    </button>
                  </div>
                </div>

                {/* Preset Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'this_week', label: 'This Week' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'last_30_days', label: 'Last 30 Days' },
                    { id: 'this_year', label: 'This Year' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map((p) => {
                    const isSelected = datePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p.id as DatePreset)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm font-bold'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Pickers (Shown always if custom, or visible helper) */}
                {(datePreset === 'custom' || customStartDate || customEndDate) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-w-md">
                    <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 w-10">From:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          setDatePreset('custom');
                        }}
                        className="text-xs text-slate-800 bg-transparent flex-1 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 w-10">To:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          setCustomEndDate(e.target.value);
                          setDatePreset('custom');
                        }}
                        className="text-xs text-slate-800 bg-transparent flex-1 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Client, Amount, and Sorting Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                
                {/* Client Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Client Filter
                  </label>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Clients ({uniqueClients.length})</option>
                    {uniqueClients.map((client) => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount Bracket Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Quotation Amount
                  </label>
                  <select
                    value={amountFilter}
                    onChange={(e) => setAmountFilter(e.target.value as AmountFilter)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Amounts</option>
                    <option value="under_25k">Under ₹25,000</option>
                    <option value="25k_to_100k">₹25,000 – ₹1,00,000</option>
                    <option value="above_100k">Above ₹1,00,000</option>
                  </select>
                </div>

                {/* Sort Option */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <ArrowUpDown size={11} />
                    <span>Sort Quotations</span>
                  </label>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="date_desc">Date (Newest first)</option>
                    <option value="date_asc">Date (Oldest first)</option>
                    <option value="amount_desc">Amount (Highest first)</option>
                    <option value="amount_asc">Amount (Lowest first)</option>
                    <option value="number_asc">Quote Number (A-Z)</option>
                    <option value="client_asc">Client Name (A-Z)</option>
                    <option value="event_asc">Event Date (Upcoming)</option>
                  </select>
                </div>

              </div>

              {/* Reset button inside filter drawer */}
              {activeFiltersCount > 0 && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
                  >
                    <RotateCcw size={12} />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Active Filters Pill Strip */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">
                Active ({activeFiltersCount}):
              </span>

              {search.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                  <span>Search: &ldquo;{search}&rdquo;</span>
                  <button onClick={() => setSearch('')} className="hover:text-blue-900"><X size={12} /></button>
                </span>
              )}

              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                  <span>Status: {statusFilter.toUpperCase()}</span>
                  <button onClick={() => setStatusFilter('all')} className="hover:text-slate-900"><X size={12} /></button>
                </span>
              )}

              {(customStartDate || customEndDate || datePreset !== 'all') && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px]">
                  <span>
                    {dateFieldTarget === 'event' ? 'Event Date: ' : 'Date: '}
                    {datePreset !== 'custom' && datePreset !== 'all'
                      ? datePreset.replace(/_/g, ' ')
                      : `${customStartDate || 'Any'} to ${customEndDate || 'Any'}`}
                  </span>
                  <button onClick={() => handleSelectPreset('all')} className="hover:text-indigo-900"><X size={12} /></button>
                </span>
              )}

              {clientFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                  <span>Client: {clientFilter}</span>
                  <button onClick={() => setClientFilter('all')} className="hover:text-emerald-900"><X size={12} /></button>
                </span>
              )}

              {amountFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                  <span>
                    {amountFilter === 'under_25k' && '< ₹25k'}
                    {amountFilter === '25k_to_100k' && '₹25k - ₹1L'}
                    {amountFilter === 'above_100k' && '> ₹1L'}
                  </span>
                  <button onClick={() => setAmountFilter('all')} className="hover:text-amber-900"><X size={12} /></button>
                </span>
              )}

              {sortOption !== 'date_desc' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px]">
                  <span>Sort: {sortOption.replace('_', ' ')}</span>
                  <button onClick={() => setSortOption('date_desc')} className="hover:text-purple-900"><X size={12} /></button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}

        </div>

        {/* Results summary header */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{totalItems === 0 ? 0 : startIndex + 1}</span>–<span className="font-bold text-slate-800">{endIndex}</span> of <span className="font-bold text-slate-800">{totalItems}</span> quote{totalItems !== 1 ? 's' : ''}
            {activeFiltersCount > 0 && <span className="text-slate-400 ml-1">({totalCount} total)</span>}
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Page</span>
            <span className="font-bold text-slate-800">{safeCurrentPage}</span>
            <span>of</span>
            <span className="font-bold text-slate-800">{totalPages}</span>
          </div>
        </div>

        {/* 30-Day Trash Announcement & Bulk Purge Bar */}
        {statusFilter === 'trash' && (
          <div className="px-4 sm:px-6 py-3.5 bg-amber-50/90 border-b border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 size={16} />
              </div>
              <div>
                <span className="font-extrabold text-amber-950">30-Day Recycle Bin:</span> Deleted quotations &amp; invoices are safely stored here for 30 days before permanent auto-purge. You can restore them anytime or delete them forever.
              </div>
            </div>
            {trashedList.length > 0 && canDelete && (
              <button
                type="button"
                onClick={handleEmptyAllTrash}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Empty Trash ({trashedList.length})</span>
              </button>
            )}
          </div>
        )}

        {/* Quotations List */}
        {totalItems === 0 ? (
          <div className="py-16 px-4 text-center">
            {statusFilter === 'trash' ? (
              <>
                <Trash2 size={48} className="mx-auto text-slate-300 mb-3" />
                <h4 className="text-base font-bold text-slate-700">Trash is Empty</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                  No deleted quotations or invoices in the last 30 days. When you delete a quote, it is preserved here safely.
                </p>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Active Quotes</span>
                </button>
              </>
            ) : (
              <>
                <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                <h4 className="text-base font-bold text-slate-700">No Quotations Match Your Criteria</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                  {activeFiltersCount > 0
                    ? 'Try broadening your search or clearing applied date and status filters.'
                    : 'Create your first professional LED wall quotation to get started!'}
                </p>
                {activeFiltersCount > 0 ? (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <RotateCcw size={14} />
                    Reset Filters
                  </button>
                ) : (
                  <button
                    onClick={onCreateNew}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    <Plus size={16} />
                    Create Quotation Now
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginatedQuotations.map((quote) => {
              const amount = calculateTotal(quote);
              return (
                <div
                  key={quote.id}
                  onClick={() => {
                    if (statusFilter === 'trash') {
                      handleRestoreQuote({ stopPropagation: () => {} } as any, quote);
                    } else {
                      onSelectQuotation(quote.id);
                    }
                  }}
                  className={`p-4 sm:p-5 hover:bg-slate-50/90 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 group border-l-4 ${
                    statusFilter === 'trash'
                      ? 'border-l-rose-400 bg-rose-50/20'
                      : quote.status === 'approved' || quote.status === 'invoiced'
                      ? 'border-l-emerald-500'
                      : quote.status === 'sent'
                      ? 'border-l-blue-500'
                      : quote.status === 'rejected'
                      ? 'border-l-rose-400'
                      : 'border-l-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Dynamic Monogram Avatar */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${getAvatarGradient(quote.client?.name || quote.quotationNumber)} flex items-center justify-center font-black text-xs shadow-xs group-hover:scale-105 group-hover:shadow-sm transition-all`}>
                        {getClientInitials(quote.client?.name)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        statusFilter === 'trash'
                          ? 'bg-rose-500'
                          : quote.status === 'approved' || quote.status === 'invoiced'
                          ? 'bg-emerald-500'
                          : quote.status === 'sent'
                          ? 'bg-blue-500'
                          : quote.status === 'rejected'
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                      }`} />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Row 1: Quote #, Badges & Expiry */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-extrabold text-slate-900 text-sm font-mono tracking-tight group-hover:text-blue-600 transition-colors ${
                          statusFilter === 'trash' ? 'line-through text-slate-500' : ''
                        }`}>
                          {quote.quotationNumber}
                        </span>

                        {statusFilter === 'trash' ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                              <Trash2 size={11} />
                              In Trash · {getDaysRemainingInTrash(quote.deletedAt)} days left
                            </span>
                            {quote.deletedAt && (
                              <span className="text-xs text-slate-400">
                                • Deleted on: {new Date(quote.deletedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {quote.revisionNumber && quote.revisionNumber > 1 ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200" title={quote.parentQuoteNumber ? `Revised from ${quote.parentQuoteNumber}` : undefined}>
                                <Layers size={10} />
                                Rev R{quote.revisionNumber}
                              </span>
                            ) : null}

                            {getStatusBadge(quote.status)}

                            {quote.clientSignature && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Signed by ${quote.clientSignature.signerName || 'Client'}`}>
                                <CheckCircle2 size={10} />
                                Signed
                              </span>
                            )}

                            {(() => {
                              const exp = getQuotationExpiryStatus(quote.validUntil);
                              return (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${exp.badgeClass}`}>
                                  <Clock size={10} />
                                  {exp.label}
                                </span>
                              );
                            })()}

                            <span className="text-xs text-slate-400">• Date: {quote.quotationDate}</span>

                            {quote.eventDate && (
                              <span className="text-xs text-blue-700 font-semibold bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Calendar size={11} className="text-blue-600" />
                                Event: {quote.eventDate}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Row 2: Client Name & Company */}
                      <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{quote.client?.name || 'Unnamed Client'}</span>
                        {quote.client?.company ? (
                          <span className="text-xs font-medium text-slate-500">
                            • {quote.client.company}
                          </span>
                        ) : null}
                      </div>

                      {/* Row 3: Items Count & Venue */}
                      <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Layers size={12} className="text-slate-400" />
                          <span>{quote.lineItems.length} setup item{quote.lineItems.length !== 1 ? 's' : ''}</span>
                        </span>
                        {quote.venue && (
                          <span className="flex items-center gap-1 truncate max-w-sm">
                            <MapPin size={12} className="text-rose-500 shrink-0" />
                            <span className="truncate">{quote.venue}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Financial & Interactive Actions */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2.5 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-lg font-black text-slate-900 font-mono tracking-tight">
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">Total payable</div>
                    </div>

                    {statusFilter === 'trash' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Restore Quotation to Active Quotes"
                          onClick={(e) => handleRestoreQuote(e, quote)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>Restore</span>
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            title="Permanently Delete (Cannot be undone)"
                            onClick={(e) => handlePermanentDeleteQuote(e, quote)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all shadow-2xs cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span className="hidden sm:inline">Delete Forever</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200/60 group-hover:bg-white group-hover:shadow-xs transition-all">
                        <button
                          title="Send 1-Click WhatsApp Follow-up Reminder"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = generateWhatsAppReminderUrl(quote);
                            window.open(url, '_blank');
                            toast.info(`Opening WhatsApp follow-up reminder for ${quote.quotationNumber}`);
                          }}
                          className="p-2 text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Bell size={16} />
                        </button>

                        <button
                          title="Share Quotation (PDF or WhatsApp Text)"
                          onClick={(e) => handleOpenShare(e, quote)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Share2 size={16} />
                        </button>

                        <button
                          title="Download PDF"
                          disabled={exportingId === quote.id}
                          onClick={(e) => handleQuickDownload(e, quote)}
                          className="p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Download size={16} />
                        </button>

                        <button
                          title="Duplicate Quotation"
                          onClick={(e) => handleDuplicateQuote(e, quote)}
                          className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                        >
                          <Copy size={16} />
                        </button>

                        {canDelete ? (
                          <button
                            title="Move to Trash"
                            onClick={(e) => handleDeleteQuote(e, quote)}
                            className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            title="Locked: Only Super Admin can delete records"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.warning('Locked: Only Super Admin can delete quotation records.');
                            }}
                            className="p-2 text-slate-300 hover:text-slate-400 hover:bg-slate-50 rounded-lg transition-colors cursor-not-allowed"
                          >
                            <Lock size={15} />
                          </button>
                        )}

                        <div className="pl-1 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all hidden sm:block">
                          <ArrowRight size={18} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Responsive Pagination Footer */}
        {totalItems > 0 && (
          <div className="p-3.5 sm:p-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs text-slate-600 w-full sm:w-auto justify-between sm:justify-start">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <span>of <strong className="text-slate-800">{totalItems}</strong> quotes</span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
              
              {/* First Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                title="First Page"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Previous Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                title="Previous Page"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {getPageNumbers().map((num, idx) => {
                  if (num === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-400">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = num === safeCurrentPage;
                  return (
                    <button
                      key={`page-${num}`}
                      type="button"
                      onClick={() => setCurrentPage(Number(num))}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-sm font-black'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Current Page Indicator */}
              <div className="sm:hidden px-3 py-1 text-xs font-bold text-slate-700 bg-white rounded-lg border border-slate-200">
                {safeCurrentPage} / {totalPages}
              </div>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                title="Next Page"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                title="Last Page"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight size={16} />
              </button>

            </div>

          </div>
        )}

      </div>

      {/* Share Modal (PDF or WhatsApp Text Breakdown) */}
      <ShareQuotationModal
        quotation={shareModalQuote}
        isOpen={!!shareModalQuote}
        onClose={() => setShareModalQuote(null)}
      />

    </div>
  );
};
