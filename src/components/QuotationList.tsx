import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText, Plus, Search, Copy, Download, Trash2,
  Share2, CheckCircle2, Clock, CheckCheck,
  XCircle, Receipt, ArrowRight, ArrowLeft, IndianRupee,
  Calendar, Filter, X, ChevronLeft, ChevronRight, ChevronDown,
  ChevronsLeft, ChevronsRight, ArrowUpDown, SlidersHorizontal,
  RotateCcw, Sparkles, FileSpreadsheet, Upload, Database, Layers, Bell,
  TrendingUp, MapPin, Building2, Send, FileEdit, BookOpen
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
import { GstAccountingExportModal } from './GstAccountingExportModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { createReceiptFromQuotation } from '../utils/receiptHelper';
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
  let trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Handle range like "24-10-2026 to 26-10-2026"
  if (trimmed.toLowerCase().includes(' to ')) {
    trimmed = trimmed.toLowerCase().split(' to ')[0].trim();
  }

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
  const canCreate = isSuperAdmin || hasPermission('canCreateQuotes');
  const canDelete = isSuperAdmin || hasPermission('canDeleteQuotes');
  const canExport = isSuperAdmin || hasPermission('canExportData');
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
  const [syncingLedgerId, setSyncingLedgerId] = useState<string | null>(null);
  const [shareModalQuote, setShareModalQuote] = useState<Quotation | null>(null);
  const [isGstExportOpen, setIsGstExportOpen] = useState(false);
  const [receiptModalQuote, setReceiptModalQuote] = useState<Quotation | null>(null);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const mobileToolsRef = useRef<HTMLDivElement>(null);

  // Close mobile tools dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileToolsRef.current && !mobileToolsRef.current.contains(e.target as Node)) {
        setIsMobileToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'invoiced':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <Receipt size={12} /> Invoiced
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <CheckCheck size={12} /> Sent
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700/80">
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

  const handleSyncToLedger = async (e: React.MouseEvent, quote: Quotation) => {
    e.stopPropagation();
    setSyncingLedgerId(quote.id);
    try {
      const res = await storage.manualSyncToLedger(quote);
      if (res.success) {
        toast.success(res.message);
      } else if (res.isTrash) {
        toast.info(res.message, { duration: 6000 });
        const shouldGo = await confirm({
          title: 'Already in Ledger Trash',
          message: 'Already copied! This quotation entry was moved to Ledger Trash. Please restore it from Ledger Trash, or first delete it from Ledger Trash and then sync from here.',
          confirmText: 'Open Ledger Trash',
          cancelText: 'Dismiss',
          variant: 'warning',
        });
        if (shouldGo) {
          window.location.href = '/ledger?tab=trash';
        }
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Sync failed: ' + (err?.message || String(err)));
    } finally {
      setSyncingLedgerId(null);
    }
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
    <div className="relative max-w-7xl mx-auto pb-12">
      {/* Ambient background glow effects */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40">
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-10 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Hero Executive Hub Header */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pt-0 pb-1">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-[0_0_25px_rgba(99,102,241,0.45)] ring-1 ring-white/20 shrink-0 mt-0.5 sm:mt-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">
                Quotations &amp; Deals Hub
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-slate-400 mt-1 leading-snug">
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold whitespace-nowrap shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  Commercial Engine Live
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-400">Track proposals, close deals &amp; generate receipts</span>
              </div>
            </div>
          </div>

        {canCreate && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onCreateNew}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 shadow-[0_0_25px_rgba(99,102,241,0.35)] hover:shadow-[0_0_35px_rgba(99,102,241,0.55)] transition-all cursor-pointer group"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>Create New Quote</span>
            </button>
          </div>
        )}
      </div>

      {/* Top Banner / Executive Business KPI Cards */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Quotes */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quotes</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <FileText size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2.5 font-mono tracking-tight">{totalCount}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
            <span className="truncate">All-time generated</span>
          </div>
        </div>

        {/* Card 2: Approved / Won */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] hover:border-emerald-500/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider">Approved / Won</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2.5 font-mono tracking-tight">{approvedOrInvoicedCount}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 font-semibold flex-wrap">
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-500/30 text-[10px] shrink-0">
              {totalCount > 0 ? Math.round((approvedOrInvoicedCount / totalCount) * 100) : 0}% win rate
            </span>
            <span className="text-slate-400 text-[10px] truncate">accepted orders</span>
          </div>
        </div>

        {/* Card 3: Quoted Pipeline */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)] hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Quoted Pipeline</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-2.5 font-mono tracking-tight flex items-center truncate">
            <IndianRupee size={18} className="shrink-0 -mr-0.5 text-slate-400" />
            <span className="truncate">{totalValue.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
            <span className="truncate">Gross pipeline</span>
          </div>
        </div>

        {/* Card 4: Won Revenue */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)] hover:border-cyan-500/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wider">Won Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Receipt size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-cyan-400 mt-2.5 font-mono tracking-tight flex items-center truncate">
            <IndianRupee size={18} className="shrink-0 -mr-0.5 text-cyan-400" />
            <span className="truncate">{approvedValue.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            <span className="truncate">Confirmed booking</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Controls Surface */}
      <div className="relative z-20 bg-slate-900/65 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl">

        {/* Status Pipeline Segmented Pills Bar */}
        <div className="px-3 sm:px-6 py-2.5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto overflow-y-hidden no-scrollbar border-b border-white/10 bg-slate-950/40 rounded-t-2xl">
          {[
            { id: 'all', label: 'All Quotes', count: totalCount, icon: Layers },
            { id: 'sent', label: 'Sent', count: sentCount, icon: Send },
            { id: 'approved', label: 'Approved', count: approvedCount, icon: CheckCircle2 },
            { id: 'invoiced', label: 'Invoiced', count: invoicedCount, icon: Receipt },
            { id: 'draft', label: 'Drafts', count: draftCount, icon: FileEdit },
            { id: 'rejected', label: 'Rejected', count: rejectedCount, icon: XCircle },
            { id: 'trash', label: 'Trash', count: trashCount, icon: Trash2 },
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
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${isActive
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white font-black shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
              >
                <Icon size={13} className={isActive ? 'text-white' : 'text-slate-500'} />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${isActive ? 'bg-white/20 text-white font-black' : 'bg-slate-800/80 text-slate-400 border border-white/5'
                  }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Primary Controls Bar */}
        <div className={`p-3.5 sm:p-5 space-y-3 ${isFilterOpen ? 'border-b border-white/10' : 'rounded-b-2xl'}`}>
          {/* Desktop & Tablet Layout: Search on left, Full actions on right */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-2.5 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search quote #, client, venue, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-950/70 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/80 focus:bg-slate-950 transition-all shadow-inner"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Desktop Actions Row (Visible sm and up) */}
            <div className="hidden sm:flex items-center gap-2 justify-end">

              {/* Filter & Sort Drawer Toggle */}
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${isFilterOpen || activeFiltersCount > 0
                  ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-white/10 text-slate-200 hover:text-white'
                  }`}
                title="Toggle detailed filters & sorting"
              >
                <SlidersHorizontal size={14} />
                <span>Filters &amp; Sort</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-black animate-pulse">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Export to CSV (Spreadsheet) */}
              {canExport && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border bg-slate-800/80 hover:bg-slate-800 border-white/10 text-slate-200 hover:text-white cursor-pointer"
                  title={`Export ${filteredAndSorted.length} quotation(s) to basic CSV`}
                >
                  <Download size={14} className="text-slate-400" />
                  <span>CSV</span>
                </button>
              )}

              {/* GST & Tally Export Button */}
              {canExport && (
                <button
                  type="button"
                  onClick={() => setIsGstExportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border bg-slate-800/80 hover:bg-emerald-950/40 border-white/10 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 cursor-pointer"
                  title="Export GSTR-1 Excel (.csv) and Tally Prime XML"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  <span>GST &amp; Tally</span>
                </button>
              )}

              {/* Backup & Restore Menu */}
              {(canExport || canRestore) && (
                <div className="relative group">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border bg-slate-800/80 hover:bg-blue-950/40 border-white/10 hover:border-blue-500/50 text-blue-300 hover:text-blue-200 cursor-pointer"
                    title="Database backup & restore"
                  >
                    <Database size={14} className="text-blue-400" />
                    <span>Backup</span>
                  </button>
                  <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 space-y-1 ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150">
                    {canExport && (
                      <button
                        type="button"
                        onClick={handleExportBackup}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <Download size={13} className="text-blue-400" />
                        <span>Download JSON Backup</span>
                      </button>
                    )}
                    {canRestore && (
                      <label className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-xl text-left cursor-pointer transition-colors">
                        <Upload size={13} className="text-emerald-400" />
                        <span>Restore from JSON File</span>
                        <input
                          type="file"
                          accept=".json,application/json"
                          className="hidden"
                          onChange={handleRestoreBackupFile}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Create New CTA */}
              {canCreate && (
                <button
                  onClick={onCreateNew}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-500/25 whitespace-nowrap cursor-pointer"
                >
                  <Plus size={16} />
                  <span>New Quote</span>
                </button>
              )}
            </div>

            {/* Mobile Actions Row: Balanced 3-column non-wrapping toolbar */}
            <div className="flex sm:hidden items-center gap-2 pt-0.5">

              {/* Filter & Sort Toggle */}
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${isFilterOpen || activeFiltersCount > 0
                  ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-white/10 text-slate-200 hover:text-white'
                  }`}
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Mobile Export & Tools Dropdown */}
              {(canExport || canRestore) && (
                <div className="relative" ref={mobileToolsRef}>
                  <button
                    type="button"
                    onClick={() => setIsMobileToolsOpen(!isMobileToolsOpen)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border bg-slate-800/80 hover:bg-slate-800 border-white/10 text-slate-200 hover:text-white cursor-pointer"
                    title="Export and backup options"
                  >
                    <Download size={14} className="text-slate-300" />
                    <span>Export</span>
                    <ChevronDown size={13} className={`text-slate-400 transition-transform ${isMobileToolsOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isMobileToolsOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 space-y-1 ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150">
                      {canExport && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileToolsOpen(false);
                            handleExportCSV();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-xl text-left transition-colors cursor-pointer"
                        >
                          <Download size={14} className="text-slate-400" />
                          <span>Export to CSV</span>
                        </button>
                      )}
                      {canExport && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileToolsOpen(false);
                            setIsGstExportOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-slate-800 rounded-xl text-left transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet size={14} className="text-emerald-400" />
                          <span>GST &amp; Tally Export</span>
                        </button>
                      )}
                      {canExport && (
                        <>
                          <div className="my-1 border-t border-white/10" />
                          <button
                            type="button"
                            onClick={() => {
                              setIsMobileToolsOpen(false);
                              handleExportBackup();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-slate-800 rounded-xl text-left transition-colors cursor-pointer"
                          >
                            <Database size={14} className="text-blue-400" />
                            <span>Download JSON Backup</span>
                          </button>
                        </>
                      )}
                      {canRestore && (
                        <label className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-xl text-left cursor-pointer transition-colors">
                          <Upload size={14} className="text-emerald-400" />
                          <span>Restore from Backup</span>
                          <input
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => {
                              setIsMobileToolsOpen(false);
                              handleRestoreBackupFile(e);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Create New CTA */}
              {canCreate && (
                <button
                  onClick={onCreateNew}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-500/25 whitespace-nowrap cursor-pointer"
                >
                  <Plus size={15} />
                  <span>New Quote</span>
                </button>
              )}
            </div>
          </div>

          {/* Expandable Filter & Sort Panel */}
          {isFilterOpen && (
            <div className="pt-3 pb-2 border-t border-white/10 space-y-3.5 bg-slate-950/60 -mx-3.5 sm:-mx-5 px-3.5 sm:px-5 rounded-b-xl animate-in fade-in duration-200">

              {/* Row 1: Date Range Presets & Target */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Calendar size={13} className="text-blue-400" />
                    <span>Filter by Date Range</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-semibold">Target:</span>
                    <button
                      type="button"
                      onClick={() => setDateFieldTarget('quotation')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${dateFieldTarget === 'quotation'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                      Quotation Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateFieldTarget('event')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${dateFieldTarget === 'event'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25'
                          : 'bg-slate-850 border border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Pickers */}
                {(datePreset === 'custom' || customStartDate || customEndDate) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-w-md">
                    <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-white/10">
                      <span className="text-[11px] font-semibold text-slate-400 w-10">From:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          setDatePreset('custom');
                        }}
                        className="text-xs text-slate-200 bg-transparent flex-1 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-white/10">
                      <span className="text-[11px] font-semibold text-slate-400 w-10">To:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          setCustomEndDate(e.target.value);
                          setDatePreset('custom');
                        }}
                        className="text-xs text-slate-200 bg-transparent flex-1 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Client, Amount, and Sorting Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">

                {/* Client Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Client Filter
                  </label>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Quotation Amount
                  </label>
                  <select
                    value={amountFilter}
                    onChange={(e) => setAmountFilter(e.target.value as AmountFilter)}
                    className="w-full text-xs bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Amounts</option>
                    <option value="under_25k">Under ₹25,000</option>
                    <option value="25k_to_100k">₹25,000 – ₹1,00,000</option>
                    <option value="above_100k">Above ₹1,00,000</option>
                  </select>
                </div>

                {/* Sort Option */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <ArrowUpDown size={11} />
                    <span>Sort Quotations</span>
                  </label>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="w-full text-xs bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline"
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
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/30 text-[11px]">
                  <span>Search: &ldquo;{search}&rdquo;</span>
                  <button onClick={() => setSearch('')} className="hover:text-blue-100"><X size={12} /></button>
                </span>
              )}

              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 text-[11px]">
                  <span>Status: {statusFilter.toUpperCase()}</span>
                  <button onClick={() => setStatusFilter('all')} className="hover:text-white"><X size={12} /></button>
                </span>
              )}

              {(customStartDate || customEndDate || datePreset !== 'all') && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-[11px]">
                  <span>
                    {dateFieldTarget === 'event' ? 'Event Date: ' : 'Date: '}
                    {datePreset !== 'custom' && datePreset !== 'all'
                      ? datePreset.replace(/_/g, ' ')
                      : `${customStartDate || 'Any'} to ${customEndDate || 'Any'}`}
                  </span>
                  <button onClick={() => handleSelectPreset('all')} className="hover:text-indigo-100"><X size={12} /></button>
                </span>
              )}

              {clientFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  <span>Client: {clientFilter}</span>
                  <button onClick={() => setClientFilter('all')} className="hover:text-emerald-100"><X size={12} /></button>
                </span>
              )}

              {amountFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[11px]">
                  <span>
                    {amountFilter === 'under_25k' && '< ₹25k'}
                    {amountFilter === '25k_to_100k' && '₹25k - ₹1L'}
                    {amountFilter === 'above_100k' && '> ₹1L'}
                  </span>
                  <button onClick={() => setAmountFilter('all')} className="hover:text-amber-100"><X size={12} /></button>
                </span>
              )}

              {sortOption !== 'date_desc' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/30 text-[11px]">
                  <span>Sort: {sortOption.replace('_', ' ')}</span>
                  <button onClick={() => setSortOption('date_desc')} className="hover:text-purple-100"><X size={12} /></button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Results summary header */}
      <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          Showing <span className="font-bold text-white">{totalItems === 0 ? 0 : startIndex + 1}</span>–<span className="font-bold text-white">{endIndex}</span> of <span className="font-bold text-white">{totalItems}</span> quote{totalItems !== 1 ? 's' : ''}
          {activeFiltersCount > 0 && <span className="text-slate-500 ml-1">({totalCount} total)</span>}
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <span>Page</span>
          <span className="font-bold text-white">{safeCurrentPage}</span>
          <span>of</span>
          <span className="font-bold text-white">{totalPages}</span>
        </div>
      </div>

      {/* 30-Day Trash Announcement & Bulk Purge Bar */}
      {statusFilter === 'trash' && (
        <div className="relative z-10 p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-xs">
              <Trash2 size={17} />
            </div>
            <div>
              <span className="font-extrabold text-amber-300">30-Day Recycle Bin:</span> Deleted quotations &amp; invoices are safely stored here for 30 days before permanent auto-purge. You can restore them anytime or delete them forever.
            </div>
          </div>
          {trashedList.length > 0 && canDelete && (
            <button
              type="button"
              onClick={handleEmptyAllTrash}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors shrink-0 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Empty Trash ({trashedList.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Quotations Feed (Luxury Standalone Glass Cards) */}
      {totalItems === 0 ? (
        <div className="relative z-10 bg-slate-900/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 p-12 sm:p-16 text-center shadow-xl">
          {statusFilter === 'trash' ? (
            <>
              <Trash2 size={50} className="mx-auto text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-white">Trash is Empty</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                No deleted quotations or invoices in the last 30 days. When you delete a quote, it is preserved here safely.
              </p>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to Active Quotes</span>
              </button>
            </>
          ) : (
            <>
              <FileText size={50} className="mx-auto text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-white">No Quotations Match Your Criteria</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                {activeFiltersCount > 0
                  ? 'Try broadening your search or clearing applied date and status filters.'
                  : 'Create your first professional LED wall quotation to get started!'}
              </p>
              {activeFiltersCount > 0 ? (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  Reset Filters
                </button>
              ) : canCreate ? (
                <button
                  onClick={onCreateNew}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Create Quotation Now</span>
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="relative z-10 space-y-3.5">
          {paginatedQuotations.map((quote) => {
            const amount = calculateTotal(quote);
            const isDealWon = quote.status === 'approved' || quote.status === 'invoiced';
            const isTrash = statusFilter === 'trash';
            return (
              <div
                key={quote.id}
                onClick={() => {
                  if (isTrash) {
                    handleRestoreQuote({ stopPropagation: () => { } } as any, quote);
                  } else {
                    onSelectQuotation(quote.id);
                  }
                }}
                className={`bg-slate-900/60 backdrop-blur-xl border transition-all duration-300 p-4 sm:p-5 rounded-2xl shadow-lg hover:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.7),0_0_25px_-5px_rgba(99,102,241,0.2)] hover:-translate-y-1 cursor-pointer relative overflow-hidden group flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${isTrash
                  ? 'border-rose-500/30 bg-rose-950/15 hover:border-rose-500/60'
                  : quote.status === 'invoiced'
                    ? 'border-purple-500/30 hover:border-purple-500/70 hover:shadow-[0_0_25px_rgba(168,85,247,0.25)]'
                    : quote.status === 'approved'
                      ? 'border-emerald-500/30 hover:border-emerald-500/70 hover:shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                      : quote.status === 'sent'
                        ? 'border-blue-500/30 hover:border-blue-500/70 hover:shadow-[0_0_25px_rgba(59,130,246,0.25)]'
                        : 'border-white/10 hover:border-indigo-500/60'
                  }`}
              >
                {/* Left Glowing Status Accent Laser Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${isTrash
                  ? 'bg-gradient-to-b from-rose-400 to-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.9)]'
                  : quote.status === 'invoiced'
                    ? 'bg-gradient-to-b from-purple-400 to-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.9)]'
                    : quote.status === 'approved'
                      ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.9)]'
                      : quote.status === 'sent'
                        ? 'bg-gradient-to-b from-blue-400 to-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.9)]'
                        : quote.status === 'rejected'
                          ? 'bg-gradient-to-b from-rose-400 to-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.9)]'
                          : 'bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                  }`} />

                <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0 pl-1">
                  {/* Dynamic Monogram Avatar with luxury ring */}
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getAvatarGradient(quote.client?.name || quote.quotationNumber)} flex items-center justify-center font-black text-sm shadow-md ring-2 ring-white/10 group-hover:scale-105 group-hover:ring-indigo-500/40 transition-all`}>
                      {getClientInitials(quote.client?.name)}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-xs ${isTrash
                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : isDealWon
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : quote.status === 'sent'
                          ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
                          : quote.status === 'rejected'
                            ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                            : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      }`} />
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Row 1: Quote #, Badges & Expiry */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-black text-white text-sm sm:text-base font-mono tracking-tight group-hover:text-indigo-400 transition-colors ${isTrash ? 'line-through text-slate-500' : ''
                        }`}>
                        {quote.quotationNumber}
                      </span>

                      {isTrash ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-xs">
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
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 shadow-xs" title={quote.parentQuoteNumber ? `Revised from ${quote.parentQuoteNumber}` : undefined}>
                              <Layers size={10} />
                              Rev R{quote.revisionNumber}
                            </span>
                          ) : null}

                          {getStatusBadge(quote.status)}

                          {quote.clientSignature && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-500/40 shadow-[0_0_10px_rgba(20,184,166,0.25)]" title={`Signed by ${quote.clientSignature.signerName || 'Client'}`}>
                              <CheckCircle2 size={11} className="text-teal-400" />
                              Signed
                            </span>
                          )}

                          {/* Quotation validity countdown - ONLY for pending proposals (Draft / Sent), NEVER for Invoiced or Approved */}
                          {!isDealWon && quote.status !== 'rejected' && (() => {
                            const exp = getQuotationExpiryStatus(quote.validUntil);
                            const badgeColor = exp.isExpired
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                              : exp.isExpiringSoon
                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                                : 'bg-slate-800/80 text-slate-300 border-white/10';
                            return (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                <Clock size={10} />
                                {exp.label}
                              </span>
                            );
                          })()}

                          <span className="text-xs text-slate-400 font-medium">• Date: {quote.quotationDate}</span>

                          {quote.eventDate && (
                            <span className="text-xs text-blue-300 font-bold bg-blue-950/80 border border-blue-500/40 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                              <Calendar size={11} className="text-blue-400" />
                              Event: {quote.eventDate}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Row 2: Client Name & Company */}
                    <div className="text-base font-bold text-white truncate flex items-center gap-1.5">
                      <span className="group-hover:text-indigo-300 transition-colors">{quote.client?.name || 'Unnamed Client'}</span>
                      {quote.client?.company ? (
                        <span className="text-xs font-semibold text-slate-400 truncate">
                          • {quote.client.company}
                        </span>
                      ) : null}
                    </div>

                    {/* Row 3: Items Count & Venue */}
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-2.5 flex-wrap pt-0.5">
                      <span className="inline-flex items-center gap-1 bg-slate-800/80 border border-white/5 px-2.5 py-0.5 rounded-md text-slate-300">
                        <Layers size={12} className="text-slate-400" />
                        <span>{quote.lineItems.length} setup item{quote.lineItems.length !== 1 ? 's' : ''}</span>
                      </span>
                      {quote.venue && (
                        <span className="inline-flex items-center gap-1 bg-slate-800/80 border border-white/5 px-2.5 py-0.5 rounded-md text-slate-300 truncate max-w-sm">
                          <MapPin size={12} className="text-rose-400 shrink-0" />
                          <span className="truncate">{quote.venue}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Financial & Interactive Actions */}
                <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 pt-3 md:pt-0 border-t md:border-0 border-white/10">
                  <div className="text-left md:text-right shrink-0">
                    <div className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-200 font-mono tracking-tight whitespace-nowrap">
                      ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center md:justify-end gap-1.5 mt-0.5">
                      <span>Total payable</span>
                      {((quote.paidAmount || 0) > 0 || quote.paymentStatus === 'paid') && (
                        <span className="text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded font-extrabold text-[9px] shadow-xs">
                          {quote.paymentStatus === 'paid' ? 'Full Paid' : `Paid ₹${(quote.paidAmount || 0).toLocaleString('en-IN')}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {isTrash ? (
                    <div className="flex items-center gap-2">
                      {canDelete && (
                        <button
                          type="button"
                          title="Restore Quotation to Active Quotes"
                          onClick={(e) => handleRestoreQuote(e, quote)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>Restore</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          title="Permanently Delete (Cannot be undone)"
                          onClick={(e) => handlePermanentDeleteQuote(e, quote)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition-all shadow-xs cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span className="hidden sm:inline">Delete Forever</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/10 group-hover:border-white/20 transition-all shrink-0 backdrop-blur-md">
                      <button
                        title="Send 1-Click WhatsApp Follow-up Reminder"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = generateWhatsAppReminderUrl(quote);
                          window.open(url, '_blank');
                          toast.info(`Opening WhatsApp follow-up reminder for ${quote.quotationNumber}`);
                        }}
                        className="p-1.5 sm:p-2 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
                      >
                        <Bell size={15} />
                      </button>

                      {/* Money Receipt Button (when payment is logged) */}
                      {((quote.paidAmount || 0) > 0 || quote.paymentStatus === 'paid' || quote.paymentStatus === 'partial') && (
                        <button
                          title="View / Print Official Payment Receipt"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptModalQuote(quote);
                          }}
                          className="p-1.5 sm:p-2 text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 hover:bg-emerald-900/90 rounded-lg transition-colors cursor-pointer shadow-xs"
                        >
                          <Receipt size={15} />
                        </button>
                      )}

                      {/* Manual Move/Copy to Payment Ledger Button */}
                      <button
                        title="Copy / Sync Quotation to Payment Ledger"
                        disabled={syncingLedgerId === quote.id}
                        onClick={(e) => handleSyncToLedger(e, quote)}
                        className="p-1.5 sm:p-2 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <BookOpen size={15} className={syncingLedgerId === quote.id ? 'animate-spin' : ''} />
                      </button>

                      <button
                        title="Share Quotation (PDF or WhatsApp Text)"
                        onClick={(e) => handleOpenShare(e, quote)}
                        className="p-1.5 sm:p-2 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                      >
                        <Share2 size={15} />
                      </button>

                      <button
                        title="Download PDF"
                        disabled={exportingId === quote.id}
                        onClick={(e) => handleQuickDownload(e, quote)}
                        className="p-1.5 sm:p-2 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Download size={15} />
                      </button>

                      {canCreate && (
                        <button
                          title="Duplicate Quotation"
                          onClick={(e) => handleDuplicateQuote(e, quote)}
                          className="p-1.5 sm:p-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Copy size={15} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          title="Move to Trash"
                          onClick={(e) => handleDeleteQuote(e, quote)}
                          className="p-1.5 sm:p-2 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}

                      <div className="pl-1 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all hidden lg:block">
                        <ChevronRight size={17} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Responsive Pagination Footer Card */}
      {totalItems > 0 && (
        <div className="relative z-10 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-300">

          {/* Page Size Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-start">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <span>of <strong className="text-white">{totalItems}</strong> quotes</span>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">

            {/* First Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              title="First Page"
              className="p-1.5 rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft size={16} />
            </button>

            {/* Previous Page */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              title="Previous Page"
              className="p-1.5 rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page Numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {getPageNumbers().map((num, idx) => {
                if (num === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-500">
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
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${isCurrent
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-md shadow-indigo-500/30'
                      : 'bg-slate-800/80 border border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Mobile Current Page Indicator */}
            <div className="sm:hidden px-3 py-1 text-xs font-bold text-white bg-slate-800 rounded-lg border border-white/10">
              {safeCurrentPage} / {totalPages}
            </div>

            {/* Next Page */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              title="Next Page"
              className="p-1.5 rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              title="Last Page"
              className="p-1.5 rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

      {/* GST & Tally Accounting Export Modal */}
      {isGstExportOpen && (
        <GstAccountingExportModal
          isOpen={isGstExportOpen}
          onClose={() => setIsGstExportOpen(false)}
          quotations={quotations}
        />
      )}

      {/* Official Payment Receipt Modal */}
      {receiptModalQuote && (
        <PaymentReceiptModal
          isOpen={!!receiptModalQuote}
          onClose={() => setReceiptModalQuote(null)}
          initialReceipt={createReceiptFromQuotation(receiptModalQuote)}
        />
      )}

    </div>
  );
};
