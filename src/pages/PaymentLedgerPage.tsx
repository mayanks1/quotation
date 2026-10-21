import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  fetchLedgerRecords,
  fetchSheetData,
  addRecord,
  updateRecord,
  deleteRecord,
  getDaysRemainingInTrash,
  getTrashedRecords,
  restoreFromTrash,
  permanentlyDeleteRecord,
  emptyTrash,
  getYear,
  parseDate,
  saveQuickNote,
  normalizeClient,
  subscribeToLedgerChanges,
  LedgerRecord
} from '../services/ledgerService';
import MetricCards from '../components/ledger/MetricCards';
import ChartsSection from '../components/ledger/ChartsSection';
import DataTable from '../components/ledger/DataTable';
import RecordModal from '../components/ledger/RecordModal';
import NoteModal from '../components/ledger/NoteModal';
import ConfirmModal from '../components/ledger/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LedgerAccountingExportModal } from '../components/ledger/LedgerAccountingExportModal';
import { PaymentReceiptModal } from '../components/PaymentReceiptModal';
import { storage } from '../services/storage';
import { PaymentReceipt } from '../types/receipt';
import { OFFICIAL_TISHA_STAMP } from '../config/officialStamp';
import { Calendar, Check, ChevronDown, FileSpreadsheet, Plus, RotateCcw } from 'lucide-react';
import { DraggableFab } from '../components/DraggableFab';
import '../components/ledger/ledger.css';

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const PaymentLedgerPage: React.FC = () => {
  const toast = useToast();

  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [trashedRecords, setTrashedRecords] = useState<LedgerRecord[]>(() => getTrashedRecords());
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quick Note Modal State
  const [noteModalRecord, setNoteModalRecord] = useState<any>(null);

  // Custom Delete Confirmation Modal State
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);

  // Undo Delete state
  const [lastDeletedRecord, setLastDeletedRecord] = useState<any>(null);
  const [undoTimer, setUndoTimer] = useState<any>(null);

  // Accounting Export & Payment Receipt States
  const [isLedgerExportOpen, setIsLedgerExportOpen] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<PaymentReceipt | null>(null);

  // Year Dropdown
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Close year dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };
    if (isYearDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isYearDropdownOpen]);

  // Load Data
  const loadData = async (isManual = false) => {
    if (!isManual) {
      setIsLoading(true);
    }

    try {
      const data = await fetchSheetData();
      setRecords(data);
      setTrashedRecords(getTrashedRecords());

      if (!isManual && selectedYear === 'all') {
        const years = [...new Set(data.map(d => getYear(d.date)).filter(Boolean))] as number[];
        years.sort((a, b) => b - a);
        if (years.length > 0) {
          setSelectedYear(String(years[0]));
        }
      }

      if (isManual) {
        toast.success('Sync complete! Latest cloud ledger records loaded.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to fetch data from cloud ledger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToLedgerChanges(() => {
      loadData(false);
    });
    return () => unsubscribe();
  }, []);

  // 1. Unique Years and Clients
  const allYears = useMemo(() => {
    return [...new Set(records.map(d => getYear(d.date)).filter(Boolean))].sort((a, b) => (b as number) - (a as number)) as number[];
  }, [records]);

  const allClients = useMemo(() => {
    return [...new Set(records.map(d => d.client))].sort((a, b) => a.localeCompare(b));
  }, [records]);

  // 2. Data Filtered by Year & Client
  const yearAndClientFilteredData = useMemo(() => {
    return records.filter(d => {
      const y = getYear(d.date);
      const matchesYear = selectedYear === 'all' || String(y) === String(selectedYear);
      const matchesClient = selectedClient === 'all' || d.client.toLowerCase() === selectedClient.toLowerCase();
      return matchesYear && matchesClient;
    });
  }, [records, selectedYear, selectedClient]);

  // 3. Filtered by Active Month
  const finalFilteredData = useMemo(() => {
    if (!activeMonth) return yearAndClientFilteredData;
    const monthIndex = MONTH_NAMES.indexOf(activeMonth);
    return yearAndClientFilteredData.filter(d => {
      const dt = parseDate(d.date);
      return !isNaN(dt.getTime()) && dt.getMonth() === monthIndex;
    });
  }, [yearAndClientFilteredData, activeMonth]);

  // 4. Metrics Calculations
  const metrics = useMemo(() => {
    const totalRevenue = yearAndClientFilteredData.reduce((acc, r) => acc + (r.amount || 0), 0);
    const totalJobs = yearAndClientFilteredData.length;
    const avgValue = totalJobs > 0 ? Math.round(totalRevenue / totalJobs) : 0;

    const receivedAmount = yearAndClientFilteredData.reduce((acc, r) => {
      if (r.status === 'Received') return acc + (r.amount || 0);
      if (r.status === 'Partial') return acc + (r.paidAmount || 0);
      return acc;
    }, 0);

    const pendingAmount = yearAndClientFilteredData.reduce((acc, r) => {
      if (r.status === 'Pending') return acc + (r.amount || 0);
      if (r.status === 'Partial') return acc + (r.pendingAmount || 0);
      return acc;
    }, 0);

    const latestYear = allYears[0];
    const targetYear = selectedYear === 'all' ? latestYear : parseInt(selectedYear);
    const monthlySum: Record<string, number> = {};

    yearAndClientFilteredData.forEach(d => {
      const dt = parseDate(d.date);
      if (isNaN(dt.getTime())) return;
      const y = dt.getFullYear();
      if (selectedYear === 'all' && y !== latestYear) return;
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      monthlySum[m] = (monthlySum[m] || 0) + (d.amount || 0);
    });

    const mKeys = Object.keys(monthlySum).sort();
    const mValues = mKeys.map(k => monthlySum[k]);
    const maxVal = mValues.length ? Math.max(...mValues) : 0;
    const bestMonthKey = mKeys.find(k => monthlySum[k] === maxVal);
    const bestMonth = bestMonthKey
      ? `${MONTH_NAMES[parseInt(bestMonthKey) - 1]} ${targetYear || ''}`
      : '—';

    let growth: number | null = null;
    let growthPeriod = '';
    if (selectedYear !== 'all') {
      const numYear = parseInt(selectedYear);
      let maxMonth = 0;
      records.forEach(d => {
        const dt = parseDate(d.date);
        if (dt.getFullYear() === numYear && dt.getMonth() > maxMonth) {
          maxMonth = dt.getMonth();
        }
      });

      const currentTotal = records.filter(d => {
        const dt = parseDate(d.date);
        return dt.getFullYear() === numYear && dt.getMonth() <= maxMonth;
      }).reduce((sum, d) => sum + (d.amount || 0), 0);

      const prevTotal = records.filter(d => {
        const dt = parseDate(d.date);
        return dt.getFullYear() === (numYear - 1) && dt.getMonth() <= maxMonth;
      }).reduce((sum, d) => sum + (d.amount || 0), 0);

      growthPeriod = `Jan–${MONTH_NAMES[maxMonth]} ${numYear} vs ${numYear - 1}`;
      if (prevTotal > 0) {
        growth = ((currentTotal - prevTotal) / prevTotal) * 100;
      }
    }

    return {
      totalRevenue,
      totalJobs,
      avgValue,
      receivedAmount,
      pendingAmount,
      bestMonth,
      growth,
      growthPeriod
    };
  }, [yearAndClientFilteredData, selectedYear, records, allYears]);

  // 5. Monthly Chart Aggregation
  const monthlyChartData = useMemo(() => {
    const latestYear = allYears[0];
    const months: Record<string, number> = {};

    yearAndClientFilteredData.forEach(d => {
      const dt = parseDate(d.date);
      if (isNaN(dt.getTime())) return;
      const y = dt.getFullYear();
      if (selectedYear === 'all' && y !== latestYear) return;
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      months[m] = (months[m] || 0) + (d.amount || 0);
    });

    const keys = Object.keys(months).sort();
    const labels = keys.map(k => MONTH_NAMES[parseInt(k) - 1]);
    const values = keys.map(k => months[k]);
    const bestIndex = values.length ? values.indexOf(Math.max(...values)) : -1;

    return { labels, values, bestIndex };
  }, [yearAndClientFilteredData, selectedYear, allYears]);

  // 6. Yearly Chart Aggregation
  const yearlyChartData = useMemo(() => {
    const yearly: Record<string, number> = {};
    records.forEach(d => {
      const y = getYear(d.date);
      if (!y) return;
      yearly[y] = (yearly[y] || 0) + (d.amount || 0);
    });
    const labels = Object.keys(yearly).sort();
    const values = labels.map(y => yearly[y]);
    return { labels, values };
  }, [records]);

  // Save Record
  const handleSaveRecord = async (formData: any) => {
    const amountVal = parseFloat(formData.amount) || 0;
    const paidVal = formData.status === 'Received' ? amountVal : (formData.status === 'Partial' ? (parseFloat(formData.paidAmount) || 0) : 0);
    const pendingVal = Math.max(0, amountVal - paidVal);
    const isEdit = Boolean(editingRecord);
    const targetRow = editingRecord?.sheetRow;

    setIsModalOpen(false);
    setEditingRecord(null);

    if (isEdit) {
      const updatedItem: LedgerRecord = {
        ...editingRecord,
        date: formData.date,
        client: normalizeClient(formData.client),
        size: formData.size || '',
        amount: amountVal,
        status: formData.status,
        paidAmount: paidVal,
        pendingAmount: pendingVal,
        note: formData.note || ''
      };
      setRecords(prev => prev.map(r => (editingRecord.id && r.id === editingRecord.id) || r.sheetRow === targetRow ? updatedItem : r));
      toast.info('Saving to Ledger...');

      updateRecord({ ...formData, id: editingRecord.id }, editingRecord.id || targetRow)
        .then(() => {
          toast.success('Record updated in Ledger!');
        })
        .catch(err => {
          console.error(err);
          toast.info('Saved locally. Will sync when online.');
        });
    } else {
      const maxSheetRow = records.reduce((max, r) => Math.max(max, r.sheetRow || 0), 1);
      const newEntry: LedgerRecord = {
        id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        date: formData.date,
        client: normalizeClient(formData.client),
        size: formData.size || '',
        amount: amountVal,
        status: formData.status,
        paidAmount: paidVal,
        pendingAmount: pendingVal,
        note: formData.note || '',
        sheetRow: maxSheetRow + 1
      };
      setRecords(prev => [newEntry, ...prev]);
      toast.info('Saving to Ledger...');

      addRecord(formData)
        .then((saved) => {
          if (saved && saved.id) {
            setRecords(prev => prev.map(r => r.id === newEntry.id ? { ...saved, sheetRow: r.sheetRow } : r));
          }
          toast.success('New record saved in Ledger!');
        })
        .catch(err => {
          console.error(err);
          toast.info('Saved locally. Will sync when online.');
        });
    }
  };

  // Quick Note
  const handleSaveQuickNote = async (record: any, noteText: string) => {
    try {
      await saveQuickNote(record, noteText);
      setRecords(prev => prev.map(r => {
        if (r.id === record.id || r.sheetRow === record.sheetRow) {
          return { ...r, note: noteText };
        }
        return r;
      }));
      setNoteModalRecord(null);
      toast.success(noteText ? 'Event note saved!' : 'Event note cleared!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save note.');
    }
  };

  // Delete Prompt (Move to Trash)
  const handlePromptDelete = (record: any) => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setIsPermanentDelete(false);
    setRecordToDelete(record);
  };

  // Permanent Delete Prompt (from Trash view)
  const handlePromptPermanentDelete = (record: any) => {
    setIsPermanentDelete(true);
    setRecordToDelete(record);
  };

  // Restore Record from Trash
  const handleRestoreRecord = async (record: LedgerRecord) => {
    try {
      await restoreFromTrash(record.id);
      setTrashedRecords(getTrashedRecords());
      setRecords(prev => [record, ...prev.filter(r => r.id !== record.id)]);
      toast.success(`Restored "${record.client}" to Active Ledger!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to restore record');
    }
  };

  // Empty Trash Permanently
  const handleEmptyTrash = async () => {
    if (window.confirm('Are you sure you want to permanently delete all items in Trash? This action cannot be undone.')) {
      try {
        await emptyTrash();
        setTrashedRecords([]);
        toast.success('Trash emptied successfully.');
      } catch (err) {
        console.error(err);
        toast.error('Failed to empty trash');
      }
    }
  };

  // Execute Delete (handles both Move to Trash and Permanent Delete)
  const handleExecuteDelete = async () => {
    if (!recordToDelete) return;
    const target = recordToDelete;
    const isPermanent = isPermanentDelete;
    setRecordToDelete(null);
    setIsPermanentDelete(false);

    if (isPermanent) {
      setIsDeleting(true);
      try {
        await permanentlyDeleteRecord(target.id);
        setTrashedRecords(getTrashedRecords());
        toast.info('Record permanently deleted.');
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete record.');
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    // Move to Trash (30-day retention)
    setLastDeletedRecord({ ...target });
    setRecords(prev => prev.filter(r => r.sheetRow !== target.sheetRow && r.id !== target.id));
    toast.info('Moved to Trash (retained for 30 days)');

    if (undoTimer) clearTimeout(undoTimer);
    const timer = setTimeout(() => {
      setLastDeletedRecord(null);
    }, 9000);
    setUndoTimer(timer);

    deleteRecord(target.id || target.sheetRow)
      .then(() => {
        setTrashedRecords(getTrashedRecords());
      })
      .catch(err => {
        console.error(err);
        toast.error('Delete sync failed.');
      });
  };

  // Undo delete
  const handleUndoDelete = async () => {
    if (!lastDeletedRecord) return;
    const target = lastDeletedRecord;
    setLastDeletedRecord(null);
    if (undoTimer) clearTimeout(undoTimer);

    await restoreFromTrash(target.id);
    setTrashedRecords(getTrashedRecords());
    setRecords(prev => [target, ...prev.filter(r => r.id !== target.id)]);
    toast.success(`Restored "${target.client}" to active ledger!`);
  };

  const handleResetFilters = () => {
    setSelectedClient('all');
    setActiveMonth(null);
    if (allYears.length > 0) {
      setSelectedYear(String(allYears[0]));
    } else {
      setSelectedYear('all');
    }
  };

  const handleGenerateReceiptFromRecord = (record: LedgerRecord) => {
    const company = storage.getCompanyProfile();
    const cleanId = (record.id || 'REC').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    const receiptNum = `REC-${getYear(record.date) || new Date().getFullYear()}-${cleanId || '001'}`;
    const amountPaid = record.status === 'Received' ? (record.amount || 0) : (record.paidAmount || 0);
    const totalPayable = record.amount || 0;
    const balanceDue = record.status === 'Received' ? 0 : (record.pendingAmount || Math.max(0, totalPayable - amountPaid));

    let clientPhone = '';
    let clientEmail = '';
    let clientAddress = '';
    let matchedQuoteNumber = '';
    let matchedQuoteId = '';

    try {
      const allClients = storage.getClients?.() || [];
      const foundClient = allClients.find(
        (c: any) => c.name?.toLowerCase() === record.client.toLowerCase() || c.company?.toLowerCase() === record.client.toLowerCase()
      );
      if (foundClient) {
        clientPhone = foundClient.phone || '';
        clientEmail = foundClient.email || '';
        clientAddress = foundClient.address || '';
      }

      const quotes = storage.getAllQuotations?.() || [];
      const foundQuote = quotes.find(
        (q: any) => q.client?.name?.toLowerCase() === record.client.toLowerCase() || q.client?.company?.toLowerCase() === record.client.toLowerCase()
      );
      if (foundQuote) {
        if (!clientPhone && foundQuote.client?.phone) clientPhone = foundQuote.client.phone;
        if (!clientEmail && foundQuote.client?.email) clientEmail = foundQuote.client.email || '';
        if (!clientAddress && foundQuote.client?.address) clientAddress = foundQuote.client.address || '';
        matchedQuoteNumber = foundQuote.quotationNumber || '';
        matchedQuoteId = foundQuote.id || '';
      }
    } catch (e) { }

    const effectiveCompany = company ? {
      ...company,
      signature: company.signature || OFFICIAL_TISHA_STAMP,
      stampUrl: company.signature || (company as any).stampUrl || OFFICIAL_TISHA_STAMP,
    } : {
      name: 'Tisha LED Walls',
      address: 'Plot No 183, near Parshuram Bhavan, Jharsa, Sector 39, Gurugram, Haryana 122001',
      phone: '+91 7703948857',
      email: 'tishaledwalls@gmail.com',
      signature: OFFICIAL_TISHA_STAMP,
      stampUrl: OFFICIAL_TISHA_STAMP,
    };

    const rec: PaymentReceipt = {
      id: `rec-${Date.now()}`,
      receiptNumber: receiptNum,
      receiptDate: record.date ? (parseDate(record.date).toISOString().split('T')[0] || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      quotationId: matchedQuoteId || record.id,
      quotationNumber: matchedQuoteNumber,
      client: {
        name: record.client,
        company: record.client,
        phone: clientPhone,
        email: clientEmail,
        address: clientAddress,
      },
      company: effectiveCompany as any,
      amountPaid,
      paymentMode: 'bank_transfer',
      paymentMilestone: record.status === 'Received' ? 'full' : (amountPaid > 0 ? 'partial' : 'advance'),
      totalPayable,
      previousPaid: 0,
      remainingBalance: balanceDue,
      notes: record.note ? `Event: ${record.size || 'LED Screen'}. Note: ${record.note}` : (record.size ? `Event Screen: ${record.size}` : ''),
      createdAt: new Date().toISOString(),
    };

    setReceiptModalData(rec);
  };

  return (
    <div className="ledger-module">
      <div className="app-shell">
        {/* Ledger Top Sub-header Toolbar */}
        <div className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-3.5 sm:px-6 py-3 relative z-30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">

            {/* Title & Live Status */}
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 sm:p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0 mt-0.5 sm:mt-0 shadow-xs">
                <FileSpreadsheet size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Payment Ledger &amp; Operations
                  </h2>
                  <span className="text-[9.5px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Cloud Ledger
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5 leading-snug">
                  Real-time event rentals, payments, partial amounts &amp; dues
                </p>
              </div>
            </div>

            {/* Actions: Year Filter, Ledger Export, Sync Sheet */}
            <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t border-neutral-800/80 sm:border-t-0">
              {/* Year Dropdown */}
              {allYears && allYears.length > 0 && (
                <div className="relative shrink-0" ref={yearDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-xs font-bold rounded-xl text-white transition-all shadow-xs cursor-pointer select-none active:scale-95 whitespace-nowrap"
                  >
                    <Calendar size={13} className="text-blue-400 shrink-0" />
                    <span>{selectedYear === 'all' ? 'All Years' : `Year ${selectedYear}`}</span>
                    <ChevronDown size={13} className={`text-neutral-400 transition-transform duration-200 shrink-0 ${isYearDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
                  </button>

                  {isYearDropdownOpen && (
                    <div
                      style={{
                        backgroundColor: '#0f172a',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                      }}
                      className="absolute left-0 mt-2 min-w-[170px] w-auto rounded-xl p-1.5 z-[100] border animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1 flex items-center justify-between">
                        <span>Select Year</span>
                        <span className="text-[9px] font-normal text-slate-500">{allYears.length} yrs</span>
                      </div>

                      <div className="space-y-0.5 max-h-56 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedYear('all');
                            setIsYearDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${selectedYear === 'all'
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                            }`}
                        >
                          <span>All Years</span>
                          {selectedYear === 'all' && <Check size={13} className="text-white" />}
                        </button>
                        {allYears.map((yr) => {
                          const isSelected = selectedYear === String(yr);
                          return (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => {
                                setSelectedYear(String(yr));
                                setIsYearDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${isSelected
                                ? 'bg-blue-600 text-white font-bold shadow-sm'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                                }`}
                            >
                              <span>Year {yr}</span>
                              {isSelected && <Check size={13} className="text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ledger & Tally Accounting Export */}
              <button
                type="button"
                onClick={() => setIsLedgerExportOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/80 text-xs font-semibold rounded-xl text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                title="Export Collections Register (.csv) and Tally Prime Receipt Vouchers (.xml)"
              >
                <FileSpreadsheet size={13} className="text-emerald-400 shrink-0" />
                <span>Export</span>
              </button>

              {/* Add New Entry Button (Desktop / Tablet) */}
              <button
                type="button"
                onClick={() => {
                  setEditingRecord(null);
                  setIsModalOpen(true);
                }}
                className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/40 text-xs font-bold rounded-xl text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                title="Create New Ledger Record"
              >
                <Plus size={14} className="stroke-[2.5] shrink-0" />
                <span>New Entry</span>
              </button>
            </div>

          </div>
        </div>

        {/* Scrollable Dashboard Body */}
        <div className="app-container">
          <main>
            {/* Metric Cards */}
            <MetricCards
              metrics={metrics}
              selectedYear={selectedYear}
            />

            {/* Charts & Analytics */}
            <ChartsSection
              monthlyData={monthlyChartData}
              yearlyData={yearlyChartData}
              records={yearAndClientFilteredData}
              metrics={metrics}
              activeMonth={activeMonth}
              onSelectMonth={(month: any) => setActiveMonth(prev => prev === month ? null : month)}
            />

            {/* Records Table */}
            <DataTable
              records={finalFilteredData}
              trashedRecords={trashedRecords}
              allClients={allClients}
              allYears={allYears}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              selectedClient={selectedClient}
              setSelectedClient={setSelectedClient}
              onEditRecord={(record: any) => {
                setEditingRecord(record);
                setIsModalOpen(true);
              }}
              onDeleteRecord={handlePromptDelete}
              onRestoreRecord={handleRestoreRecord}
              onPermanentlyDeleteRecord={handlePromptPermanentDelete}
              onEmptyTrash={handleEmptyTrash}
              onResetFilters={handleResetFilters}
              onOpenNoteModal={(record: any) => setNoteModalRecord(record)}
              onGenerateReceipt={handleGenerateReceiptFromRecord}
            />
          </main>
        </div>

        {/* Floating 9-Second Undo Deletion Toast */}
        {lastDeletedRecord && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 18px',
            background: '#0f172a',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 15px rgba(245, 158, 11, 0.2)',
            color: '#f8fafc',
            fontSize: '13px'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#fbbf24' }}>⏳</span>
              <span>Record moved to <strong>Trash (30-day retention)</strong></span>
            </span>
            <button
              type="button"
              onClick={handleUndoDelete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 12px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.5)',
                color: '#93c5fd',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              <RotateCcw size={12} />
              Undo
            </button>
          </div>
        )}

        {/* Modals */}
        <RecordModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          onSave={handleSaveRecord}
          onDelete={handlePromptDelete}
          initialData={editingRecord}
          isSaving={isSaving}
        />

        <NoteModal
          isOpen={Boolean(noteModalRecord)}
          onClose={() => setNoteModalRecord(null)}
          onSave={(noteText: string) => handleSaveQuickNote(noteModalRecord, noteText)}
          record={noteModalRecord}
          isSaving={false}
        />

        <ConfirmModal
          isOpen={Boolean(recordToDelete)}
          onClose={() => {
            setRecordToDelete(null);
            setIsPermanentDelete(false);
          }}
          onConfirm={handleExecuteDelete}
          record={recordToDelete}
          isDeleting={isDeleting}
          isPermanent={isPermanentDelete}
        />

        {/* Ledger & Tally Accounting Export Modal */}
        {isLedgerExportOpen && (
          <LedgerAccountingExportModal
            isOpen={isLedgerExportOpen}
            onClose={() => setIsLedgerExportOpen(false)}
            records={records}
            allYears={allYears}
            allClients={allClients}
            initialYear={selectedYear}
          />
        )}

        {/* Payment Receipt Modal */}
        {receiptModalData && (
          <PaymentReceiptModal
            isOpen={Boolean(receiptModalData)}
            onClose={() => setReceiptModalData(null)}
            initialReceipt={receiptModalData}
          />
        )}

        {/* Draggable Floating Action Button (FAB) for adding new ledger entry */}
        <DraggableFab
          onClick={() => {
            setEditingRecord(null);
            setIsModalOpen(true);
          }}
          title="Add New Ledger Entry (Drag to move anywhere)"
        />
      </div>
    </div>
  );
};
