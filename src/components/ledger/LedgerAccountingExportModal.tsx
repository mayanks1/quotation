import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  FileCode,
  Calendar,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { LedgerRecord, getYear } from '../../services/sheetService';
import {
  generateLedgerCollectionsCsv,
  generateLedgerTallyReceiptsXml,
  downloadLedgerFile,
} from '../../services/ledgerExport';
import { storage } from '../../services/storage';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  records: LedgerRecord[];
  allYears?: number[];
  allClients?: string[];
  initialYear?: string;
}

type StatusFilterOption = 'all' | 'Received' | 'Partial' | 'Pending';

export const LedgerAccountingExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  records,
  allYears = [],
  allClients = [],
  initialYear = 'all',
}) => {
  useLockBodyScroll(isOpen);
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');

  // Filter records based on selected options
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Year filter
      if (selectedYear !== 'all') {
        const y = getYear(r.date);
        if (String(y) !== String(selectedYear)) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }

      // Client filter
      if (selectedClient !== 'all' && r.client.toLowerCase() !== selectedClient.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [records, selectedYear, statusFilter, selectedClient]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let receiptCount = 0;

    for (const r of filteredRecords) {
      const amt = r.amount || 0;
      const paid = r.status === 'Received' ? amt : (r.paidAmount || 0);
      const pending = r.status === 'Received' ? 0 : (r.pendingAmount || Math.max(0, amt - paid));

      totalRevenue += amt;
      totalCollected += paid;
      totalPending += pending;

      if (paid > 0) {
        receiptCount++;
      }
    }

    const recoveryRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;

    return {
      count: filteredRecords.length,
      receiptCount,
      totalRevenue,
      totalCollected,
      totalPending,
      recoveryRate,
    };
  }, [filteredRecords]);

  if (!isOpen) return null;

  const handleExportCsv = () => {
    const csv = generateLedgerCollectionsCsv(filteredRecords);
    const dateStamp = new Date().toISOString().split('T')[0];
    const yrLabel = selectedYear === 'all' ? 'All_Years' : `Year_${selectedYear}`;
    const filename = `Tisha_Collections_Register_${yrLabel}_${dateStamp}.csv`;
    downloadLedgerFile(csv, filename, 'text/csv;charset=utf-8;');
  };

  const handleExportTallyXml = () => {
    const company = storage.getCompanyProfile();
    const companyName = company?.name || 'Tisha LED Walls';
    const xml = generateLedgerTallyReceiptsXml(filteredRecords, companyName);
    const dateStamp = new Date().toISOString().split('T')[0];
    const yrLabel = selectedYear === 'all' ? 'All_Years' : `Year_${selectedYear}`;
    const filename = `Tisha_Tally_Receipt_Vouchers_${yrLabel}_${dateStamp}.xml`;
    downloadLedgerFile(xml, filename, 'application/xml;charset=utf-8;');
  };

  const fmt = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white flex items-start sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shrink-0">
              <FileSpreadsheet size={19} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base tracking-tight text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span>Payment Ledger Exporter</span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase shrink-0 whitespace-nowrap">
                  Receipts &bull; Tally XML
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-snug line-clamp-1 sm:line-clamp-none">
                Export cash/bank collections, recovery registers &amp; Tally Prime vouchers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 bg-slate-50/50 text-xs">
          
          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            
            {/* Year Selector */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-600" />
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-blue-500"
              >
                <option value="all">All Years ({allYears.length} yrs)</option>
                {allYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Filter size={13} className="text-teal-600" />
                Payment Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilterOption)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="Received">Received (Full Paid)</option>
                <option value="Partial">Partial (Advances)</option>
                <option value="Pending">Pending (Unpaid Dues)</option>
              </select>
            </div>

            {/* Client Filter */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Users size={13} className="text-purple-600" />
                Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-blue-500"
              >
                <option value="all">All Clients ({allClients.length})</option>
                {allClients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Export Summary Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
                <span>Collections Register Preview ({summary.count} events)</span>
              </span>
              <span className="font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                <TrendingUp size={12} />
                <span>{summary.recoveryRate.toFixed(1)}% Recovery</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Events</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{summary.count}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Event Value</div>
                <div className="text-sm font-black text-slate-900 mt-1">{fmt(summary.totalRevenue)}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Total Collected</div>
                <div className="text-sm font-black text-emerald-700 mt-1">{fmt(summary.totalCollected)}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-bold text-rose-500 uppercase">Outstanding Due</div>
                <div className="text-sm font-black text-rose-600 mt-1">{fmt(summary.totalPending)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-slate-500">
              <span>Receipt Entries (Collected &gt; 0): <strong className="text-emerald-700 font-bold">{summary.receiptCount}</strong></span>
              <span>Pending Dues: <strong className="text-rose-600 font-bold">{fmt(summary.totalPending)}</strong></span>
            </div>
          </div>

          {/* Export Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Collections Register CSV Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-teal-400 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                    <FileSpreadsheet size={16} />
                  </div>
                  <span className="font-bold text-slate-900 text-xs">Collections &amp; Dues Register</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  Formatted spreadsheet with Date, Client, Screen Size, Amount, Paid, Due, Status &amp; Notes. Includes summary totals.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={summary.count === 0}
                className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Download Register (.csv)</span>
              </button>
            </div>

            {/* Tally Receipt XML Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-blue-400 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                    <FileCode size={16} />
                  </div>
                  <span className="font-bold text-slate-900 text-xs">Tally Receipt Vouchers</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  Importable Tally Prime XML with Receipt Vouchers (Dr. Bank / Cash, Cr. Client Debtors). Clears client balance without duplicate sales.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportTallyXml}
                disabled={summary.receiptCount === 0}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Download Tally Receipts ({summary.receiptCount})</span>
              </button>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400 text-[11px] sm:text-xs truncate">
            Payment Ledger Inflow &bull; Tally Prime XML v1.0
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors border border-slate-300 cursor-pointer shrink-0 ml-2"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
