import React, { useState } from 'react';
import { 
  FileText, Plus, Search, Copy, Download, Trash2, 
  Share2, CheckCircle2, Clock, CheckCheck, 
  XCircle, Receipt, ArrowRight, IndianRupee
} from 'lucide-react';
import { Quotation, QuotationStatus } from '../types/quotation';
import { generateWhatsAppShareUrl } from '../services/whatsapp';
import { exportQuotationPDF } from '../services/pdfGenerator';
import { useToast, useConfirm } from '../context/ToastContext';

interface Props {
  quotations: Quotation[];
  onSelectQuotation: (id: string) => void;
  onCreateNew: () => void;
  onDuplicate: (quotation: Quotation) => void;
  onDelete: (id: string) => void;
}

export const QuotationList: React.FC<Props> = ({
  quotations,
  onSelectQuotation,
  onCreateNew,
  onDuplicate,
  onDelete,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [exportingId, setExportingId] = useState<string | null>(null);

  const calculateTotal = (q: Quotation): number => {
    const subtotal = q.lineItems.reduce((acc, i) => acc + i.quantity * i.rate, 0);
    const discounted = Math.max(0, subtotal - (q.discountAmount || 0));
    const tax = (discounted * (q.taxRate || 0)) / 100;
    return discounted + tax + (q.shippingCharges || 0);
  };

  // Dashboard Stats
  const totalCount = quotations.length;
  const approvedCount = quotations.filter((q) => q.status === 'approved' || q.status === 'invoiced').length;
  const totalValue = quotations.reduce((acc, q) => acc + calculateTotal(q), 0);
  const approvedValue = quotations
    .filter((q) => q.status === 'approved' || q.status === 'invoiced')
    .reduce((acc, q) => acc + calculateTotal(q), 0);

  // Filter list
  const filtered = quotations.filter((q) => {
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    const term = search.toLowerCase();
    const matchesSearch =
      q.quotationNumber.toLowerCase().includes(term) ||
      (q.client?.name || '').toLowerCase().includes(term) ||
      (q.client?.company || '').toLowerCase().includes(term) ||
      (q.venue || '').toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12} /> Approved</span>;
      case 'invoiced':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200"><Receipt size={12} /> Invoiced</span>;
      case 'sent':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"><CheckCheck size={12} /> Sent</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"><Clock size={12} /> Draft</span>;
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

  const handleWhatsApp = (e: React.MouseEvent, q: Quotation) => {
    e.stopPropagation();
    const url = generateWhatsAppShareUrl(q);
    window.open(url, '_blank');
    toast.info('Opening WhatsApp with quotation summary...');
  };

  const handleDuplicateQuote = (e: React.MouseEvent, quote: Quotation) => {
    e.stopPropagation();
    onDuplicate(quote);
    toast.success(`Quotation ${quote.quotationNumber} duplicated as new draft`);
  };

  const handleDeleteQuote = async (e: React.MouseEvent, quote: Quotation) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Delete Quotation',
      message: `Are you sure you want to delete quotation "${quote.quotationNumber}"? This will permanently remove it from your records.`,
      confirmText: 'Delete Quotation',
      cancelText: 'Keep Quote',
      variant: 'danger',
    });
    if (confirmed) {
      onDelete(quote.id);
      toast.success(`Quotation ${quote.quotationNumber} deleted successfully`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Top Banner / Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quotations</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Created across time</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Approved / Won</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{approvedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}% win rate</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quoted Pipeline</div>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center">
            <IndianRupee size={20} className="-mr-0.5" />
            {totalValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Gross quotation value</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Confirmed Revenue</div>
          <div className="text-2xl font-black text-blue-700 mt-1 flex items-center">
            <IndianRupee size={20} className="-mr-0.5" />
            {approvedValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">From accepted bookings</div>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Actions bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by quote #, client, venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 focus:outline-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Drafts Only</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="invoiced">Invoiced</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20 whitespace-nowrap"
            >
              <Plus size={16} />
              New Quotation
            </button>
          </div>
        </div>

        {/* Quotations List */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={48} className="mx-auto text-slate-300 mb-3" />
            <h4 className="text-base font-bold text-slate-700">No Quotations Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search query or filter options'
                : 'Create your first professional LED wall quotation to get started!'}
            </p>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold"
            >
              <Plus size={16} />
              Create Quotation Now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((quote) => {
              const amount = calculateTotal(quote);
              return (
                <div
                  key={quote.id}
                  onClick={() => onSelectQuotation(quote.id)}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-mono text-xs font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      QT
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm font-mono">{quote.quotationNumber}</span>
                        {getStatusBadge(quote.status)}
                        <span className="text-xs text-slate-400">• Date: {quote.quotationDate}</span>
                        {quote.eventDate && (
                          <span className="text-xs text-blue-600 font-medium bg-blue-50/80 px-2 py-0.5 rounded">
                            Event: {quote.eventDate}
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-semibold text-slate-800">
                        {quote.client?.name || 'Unnamed Client'}
                        {quote.client?.company ? (
                          <span className="text-xs font-normal text-slate-500 ml-1.5">
                            ({quote.client.company})
                          </span>
                        ) : null}
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>{quote.lineItems.length} setup item{quote.lineItems.length !== 1 ? 's' : ''}</span>
                        {quote.venue && <span>• Venue: {quote.venue}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-extrabold text-slate-900">
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-400">Total payable</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        title="Share to WhatsApp"
                        onClick={(e) => handleWhatsApp(e, quote)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Share2 size={16} />
                      </button>

                      <button
                        title="Download PDF"
                        disabled={exportingId === quote.id}
                        onClick={(e) => handleQuickDownload(e, quote)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Download size={16} />
                      </button>

                      <button
                        title="Duplicate Quotation"
                        onClick={(e) => handleDuplicateQuote(e, quote)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Copy size={16} />
                      </button>

                      <button
                        title="Delete Quotation"
                        onClick={(e) => handleDeleteQuote(e, quote)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="pl-1 text-slate-300 group-hover:text-blue-600 transition-colors hidden sm:block">
                        <ArrowRight size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
