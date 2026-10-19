import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  fetchSheetData,
  addRecord,
  updateRecord,
  deleteRecord,
  getYear,
  parseDate,
  saveQuickNote,
  normalizeClient,
  LedgerRecord
} from '../services/sheetService';
import MetricCards from '../components/ledger/MetricCards';
import ChartsSection from '../components/ledger/ChartsSection';
import DataTable from '../components/ledger/DataTable';
import RecordModal from '../components/ledger/RecordModal';
import NoteModal from '../components/ledger/NoteModal';
import ConfirmModal from '../components/ledger/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/ledger/Navbar';
import { Plus, RefreshCw, Calendar, Check, ChevronDown, Layers, FileSpreadsheet } from 'lucide-react';
import '../components/ledger/ledger.css';

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const PaymentLedgerPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Undo Delete state
  const [lastDeletedRecord, setLastDeletedRecord] = useState<any>(null);
  const [undoTimer, setUndoTimer] = useState<any>(null);

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
    if (isManual) {
      setIsRefreshing(true);
      try {
        localStorage.removeItem('tisha_local_deltas');
      } catch (e) { }
    } else {
      setIsLoading(true);
    }

    try {
      const data = await fetchSheetData();
      setRecords(data);

      if (!isManual && selectedYear === 'all') {
        const years = [...new Set(data.map(d => getYear(d.date)).filter(Boolean))] as number[];
        years.sort((a, b) => b - a);
        if (years.length > 0) {
          setSelectedYear(String(years[0]));
        }
      }

      if (isManual) {
        toast.success('Sync complete! Latest Google Sheet data loaded.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to fetch data from Google Sheet');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
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
      setRecords(prev => prev.map(r => r.sheetRow === targetRow ? updatedItem : r));
      toast.info('Updating Google Sheet...');

      updateRecord(formData, targetRow)
        .then(() => {
          toast.success('Record updated in Google Sheet!');
        })
        .catch(err => {
          console.error(err);
          toast.info('Saved locally. Will sync when online.');
        });
    } else {
      const maxSheetRow = records.reduce((max, r) => Math.max(max, r.sheetRow || 0), 1);
      const newEntry: LedgerRecord = {
        id: `local-${Date.now()}`,
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
      toast.info('Saving to Google Sheet...');

      addRecord(formData)
        .then(() => {
          toast.success('New record saved in Google Sheet!');
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

  // Delete Prompt
  const handlePromptDelete = (record: any) => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setRecordToDelete(record);
  };

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (!recordToDelete) return;
    const target = recordToDelete;
    setRecordToDelete(null);
    setLastDeletedRecord({ ...target });

    setRecords(prev => prev.filter(r => r.sheetRow !== target.sheetRow && r.id !== target.id));
    toast.info('Entry deleted.');

    if (undoTimer) clearTimeout(undoTimer);
    const timer = setTimeout(() => {
      setLastDeletedRecord(null);
    }, 9000);
    setUndoTimer(timer);

    deleteRecord(target.sheetRow)
      .catch(err => {
        console.error(err);
        toast.error('Delete sync failed.');
      });
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

  return (
    <div className="ledger-module">
      <div className="app-shell">
        {/* Ledger Top Sub-header Toolbar */}
        <div className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-3 sm:px-6 py-3 relative z-30">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">

            {/* Title & Live Status */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">Payment Ledger &amp; Operations</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Google Sheet Sync
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Real-time event rentals, payments, partial amounts &amp; dues
                </p>
              </div>
            </div>

            {/* Actions: Year Filter, Refresh, Add Record */}
            <div className="flex items-center gap-2.5">
              {/* Year Dropdown */}
              {allYears && allYears.length > 0 && (
                <div className="relative" ref={yearDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-xs font-bold rounded-xl text-white transition-all shadow-sm cursor-pointer select-none"
                  >
                    <Calendar size={13} className="text-blue-400" />
                    <span>{selectedYear === 'all' ? 'All Years' : `Year ${selectedYear}`}</span>
                    <ChevronDown size={13} className={`text-neutral-400 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
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
                          className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                            selectedYear === 'all'
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
                              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected
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

              {/* Sync / Refresh Button */}
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold rounded-lg text-neutral-200 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                title="Sync live from Google Sheet"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-emerald-400' : 'text-neutral-400'} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync Sheet'}</span>
              </button>

              {/* Add Entry Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingRecord(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <Plus size={15} />
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
              onResetFilters={handleResetFilters}
              onOpenNoteModal={(record: any) => setNoteModalRecord(record)}
            />
          </main>
        </div>

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
          onClose={() => setRecordToDelete(null)}
          onConfirm={handleExecuteDelete}
          record={recordToDelete}
          isDeleting={isDeleting}
        />

        {/* Floating Action Button (FAB) for mobile - matches Screenshot 3 */}
        <button
          type="button"
          onClick={() => {
            setEditingRecord(null);
            setIsModalOpen(true);
          }}
          title="New Entry"
          aria-label="New Entry"
          className="ledger-fab"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
