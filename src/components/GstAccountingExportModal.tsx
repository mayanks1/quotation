import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  FileCode,
  Calendar,
  Filter,
  CheckCircle2,
  Building2,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { Quotation } from '../types/quotation';
import {
  generateGstr1Csv,
  generateTallyXml,
  downloadFile,
} from '../services/accountingExport';
import { calculateQuotationTotals } from '../utils/receiptHelper';
import { parseDateStr } from '../utils/quotationExpiry';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotations: Quotation[];
}

type PeriodOption = 'all' | 'cur_month' | 'last_month' | 'cur_fy' | 'custom';
type DocFilterOption = 'all' | 'confirmed' | 'b2b';

export const GstAccountingExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  quotations,
}) => {
  const [period, setPeriod] = useState<PeriodOption>('all');
  const [docFilter, setDocFilter] = useState<DocFilterOption>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Filter logic
  const filteredQuotations = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    return quotations.filter((q) => {
      // Exclude soft-deleted
      if (q.isDeleted) return false;

      // Status filter
      if (docFilter === 'confirmed' && q.status !== 'approved' && q.status !== 'invoiced') return false;
      const clientGst = q.client.gstin || (q.client as any).gstNumber || '';
      if (docFilter === 'b2b' && (!clientGst || clientGst.trim().length < 15)) return false;

      if (period === 'all') return true;

      const dateStr = q.invoiceDate || q.quotationDate;
      if (!dateStr) return false;
      const qDate = parseDateStr(dateStr) || new Date(dateStr);
      if (!qDate || isNaN(qDate.getTime())) return false;

      if (period === 'cur_month') {
        return qDate.getFullYear() === curYear && qDate.getMonth() === curMonth;
      }
      if (period === 'last_month') {
        const lastMonth = curMonth === 0 ? 11 : curMonth - 1;
        const lastMonthYear = curMonth === 0 ? curYear - 1 : curYear;
        return qDate.getFullYear() === lastMonthYear && qDate.getMonth() === lastMonth;
      }
      if (period === 'cur_fy') {
        // Indian FY starts April 1st
        const fyStartYear = curMonth >= 3 ? curYear : curYear - 1;
        const fyStartDate = new Date(fyStartYear, 3, 1);
        const fyEndDate = new Date(fyStartYear + 1, 2, 31, 23, 59, 59);
        return qDate >= fyStartDate && qDate <= fyEndDate;
      }
      if (period === 'custom') {
        if (fromDate && qDate < new Date(fromDate)) return false;
        if (toDate && qDate > new Date(`${toDate}T23:59:59`)) return false;
        return true;
      }

      return true;
    });
  }, [quotations, period, docFilter, fromDate, toDate]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalGross = 0;

    for (const q of filteredQuotations) {
      const { discountedSubtotal, taxAmount, grandTotal } = calculateQuotationTotals(q);
      totalTaxable += discountedSubtotal;
      totalGross += grandTotal;

      if (q.taxScheme !== 'none' && (q.taxRate || 0) > 0) {
        if (q.taxScheme === 'igst') {
          totalIgst += taxAmount;
        } else {
          totalCgst += taxAmount / 2;
          totalSgst += taxAmount / 2;
        }
      }
    }

    return {
      count: filteredQuotations.length,
      totalTaxable,
      totalTax: totalCgst + totalSgst + totalIgst,
      totalCgst,
      totalSgst,
      totalIgst,
      totalGross,
    };
  }, [filteredQuotations]);

  if (!isOpen) return null;

  const handleExportGstr1 = () => {
    const csvContent = generateGstr1Csv(filteredQuotations);
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `GSTR1_Sales_Register_Tisha_${period}_${dateStamp}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  };

  const handleExportTally = () => {
    const xmlContent = generateTallyXml(filteredQuotations);
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `Tally_Prime_Vouchers_Tisha_${period}_${dateStamp}.xml`;
    downloadFile(xmlContent, filename, 'application/xml;charset=utf-8;');
  };

  const fmt = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                Quotation &amp; Invoice Exporter
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  GSTR-1 (Sales) &bull; Tally Sales XML
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Outward supplies export for Indian GST filing (GSTR-1) &amp; Tally Prime Sales vouchers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 bg-slate-50/50 text-xs">
          
          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            
            {/* Period Selector */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-600" />
                Select Period / Filing Cycle
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodOption)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-blue-500"
              >
                <option value="cur_month">Current Month ({new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })})</option>
                <option value="last_month">Last Month</option>
                <option value="cur_fy">Current Financial Year (FY 2026-27)</option>
                <option value="all">All Available Records</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>

            {/* Document Scope Filter */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Filter size={13} className="text-emerald-600" />
                Document Type Filter
              </label>
              <select
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value as DocFilterOption)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-blue-500"
              >
                <option value="all">All Quotations &amp; Invoices</option>
                <option value="confirmed">Accepted / Confirmed Only</option>
                <option value="b2b">B2B Only (With Valid GSTIN)</option>
              </select>
            </div>

            {/* Custom Date Pickers */}
            {period === 'custom' && (
              <div className="sm:col-span-2 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export Summary Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
                Data Register Preview ({summary.count} entries)
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Ready for Tax Filing
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Documents</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{summary.count}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Taxable Value</div>
                <div className="text-sm font-black text-slate-900 mt-1">{fmt(summary.totalTaxable)}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total GST</div>
                <div className="text-sm font-black text-blue-600 mt-1">{fmt(summary.totalTax)}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Gross Revenue</div>
                <div className="text-sm font-black text-emerald-700 mt-1">{fmt(summary.totalGross)}</div>
              </div>
            </div>

            {/* Split GST Tax details */}
            <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-slate-500">
              <span>CGST: <strong className="text-slate-700">{fmt(summary.totalCgst)}</strong></span>
              <span>SGST: <strong className="text-slate-700">{fmt(summary.totalSgst)}</strong></span>
              <span>IGST: <strong className="text-slate-700">{fmt(summary.totalIgst)}</strong></span>
            </div>
          </div>

          {/* Export Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* GSTR-1 Excel Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-emerald-400 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                    <FileSpreadsheet size={16} />
                  </div>
                  <span className="font-bold text-slate-900 text-xs">GSTR-1 Outward Supplies</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  Formatted with standard GST portal columns (GSTIN, Rate, Taxable, CGST, SGST, IGST) for direct upload or CA filing.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportGstr1}
                disabled={summary.count === 0}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Download GSTR-1 Excel (.csv)</span>
              </button>
            </div>

            {/* Tally XML Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-blue-400 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                    <FileCode size={16} />
                  </div>
                  <span className="font-bold text-slate-900 text-xs">Tally Prime Sales Vouchers</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  Complete Tally XML containing Sales Vouchers (`&lt;VOUCHER VCHTYPE="Sales"&gt;`) with automatic party &amp; GST ledger mapping.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportTally}
                disabled={summary.count === 0}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Download Tally Sales XML (.xml)</span>
              </button>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Outward Sales Supplies &bull; For Cash/Bank receipts, use Payment Ledger
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors border border-slate-300 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
