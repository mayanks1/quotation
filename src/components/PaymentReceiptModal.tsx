import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  Share2,
  Check,
  Copy,
  Receipt,
  CreditCard,
  Building2,
  Calendar,
  Sparkles,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  exportReceiptPDF,
  generateReceiptPDFDoc,
  printReceipt,
  generateReceiptPDFFile,
  generateReceiptSecurityData,
  ReceiptSecurityData,
} from '../services/receiptPdfGenerator';
import {
  generateWhatsAppReceiptUrl,
  formatPaymentReceiptWhatsAppText,
  generateWhatsAppReceiptPdfNoticeUrl,
} from '../services/whatsapp';
import { amountToWordsIndian } from '../utils/numberToWords';
import { OFFICIAL_TISHA_STAMP } from '../config/officialStamp';
import { PaymentMode } from '../types/quotation';
import { PaymentReceipt, ReceiptMilestone } from '../types/receipt';
import { useToast } from '../context/ToastContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { PdfGeneratingOverlay } from './PdfGeneratingOverlay';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialReceipt: PaymentReceipt;
  onSaveReceipt?: (receipt: PaymentReceipt) => void;
}

export const PaymentReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialReceipt,
  onSaveReceipt,
}) => {
  useLockBodyScroll(isOpen);
  const toast = useToast();
  const [receipt, setReceipt] = useState<PaymentReceipt>(initialReceipt);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState(initialReceipt.client?.phone || '');
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  const isBusyRef = useRef(false);
  const cancelPdfRef = useRef(false);
  const [securityData, setSecurityData] = useState<ReceiptSecurityData | null>(null);

  useEffect(() => {
    setReceipt(initialReceipt);
    setCustomPhone(initialReceipt.client?.phone || '');
  }, [initialReceipt, isOpen]);

  // Generate lightweight security QR code asynchronously in background (does NOT run html2canvas or block UI)
  useEffect(() => {
    let active = true;
    generateReceiptSecurityData(receipt)
      .then((sec) => {
        if (active) setSecurityData(sec);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [receipt]);

  if (!isOpen) return null;

  const handleCancelPdfGeneration = () => {
    cancelPdfRef.current = true;
    setIsExporting(false);
    setIsSharingPdf(false);
    isBusyRef.current = false;
    toast.info('PDF generation cancelled.');
  };

  const handleDownloadPdf = async () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    cancelPdfRef.current = false;
    setIsExporting(true);

    // Yield 60ms to let React immediately paint the full-screen interactive overlay
    await new Promise((r) => setTimeout(r, 60));

    try {
      const { pdf, filename } = await generateReceiptPDFDoc(receipt, securityData || undefined);
      if (cancelPdfRef.current) return;
      pdf.save(filename);
      toast.success(`Downloaded receipt ${receipt.receiptNumber}`);
      if (onSaveReceipt) onSaveReceipt(receipt);
    } catch (err) {
      if (!cancelPdfRef.current) {
        console.error('Failed to export receipt PDF', err);
        toast.error('Failed to download PDF.');
      }
    } finally {
      setIsExporting(false);
      isBusyRef.current = false;
    }
  };

  const handlePrint = () => {
    printReceipt(receipt);
    if (onSaveReceipt) onSaveReceipt(receipt);
  };

  const handleWhatsApp = async () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    cancelPdfRef.current = false;
    setIsSharingPdf(true);

    // Yield 60ms to let React immediately paint the full-screen interactive overlay
    await new Promise((r) => setTimeout(r, 60));

    try {
      const { file, filename } = await generateReceiptPDFFile(receipt, securityData || undefined);

      if (cancelPdfRef.current) {
        return;
      }

      // 1. Mobile & Web Share API support (Android, iOS Safari/Chrome, macOS)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Payment Receipt ${receipt.receiptNumber}`,
            text: `Official Payment Receipt ${receipt.receiptNumber} - ${receipt.company.name}`,
          });
          toast.success('Shared receipt PDF successfully!');
          if (onSaveReceipt) onSaveReceipt(receipt);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            return;
          }
          console.warn('Native share error, falling back:', shareErr);
        }
      }

      if (cancelPdfRef.current) {
        return;
      }

      // 2. Desktop Fallback:
      // Download the PDF file directly to device
      const blobUrl = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      // Open WhatsApp Web with client chat and informative notice
      const waUrl = generateWhatsAppReceiptPdfNoticeUrl(receipt, filename, customPhone);
      window.open(waUrl, '_blank');

      toast.success(`PDF receipt downloaded as "${filename}". Attach file in WhatsApp!`);
      if (onSaveReceipt) onSaveReceipt(receipt);
    } catch (err) {
      if (!cancelPdfRef.current) {
        console.error('Failed to share receipt PDF:', err);
        toast.error('Failed to generate PDF for WhatsApp.');
      }
    } finally {
      setIsSharingPdf(false);
      isBusyRef.current = false;
    }
  };

  const handleCopyText = async () => {
    const text = formatPaymentReceiptWhatsAppText(receipt);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const fmt = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const stampImg = receipt.company.signature || (receipt.company as any).stampUrl || OFFICIAL_TISHA_STAMP;

  const milestoneNames: Record<ReceiptMilestone, string> = {
    advance: 'Advance Milestone',
    balance: 'Balance Settlement',
    full: 'Full Payment',
    partial: 'Partial Payment',
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">

        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white shrink-0 space-y-2.5 sm:space-y-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Receipt size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="font-bold text-sm sm:text-base tracking-tight text-white truncate">
                    Payment Receipt
                  </h3>
                  <span className="font-mono text-[11px] sm:text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 shrink-0">
                    {receipt.receiptNumber}
                  </span>
                  {receipt.amountPaid > 0 ? (
                    <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider shrink-0">
                      {receipt.remainingBalance <= 0 ? 'Payment Confirmed' : 'Partial Payment'}
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider shrink-0">
                      Payment Due (₹{receipt.totalPayable.toLocaleString('en-IN')})
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                  For Quotation #{receipt.quotationNumber} &bull; {receipt.client?.name}
                </p>
              </div>
            </div>

            {/* Desktop Tabs & Close Button */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activeTab === 'preview' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Preview Document
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activeTab === 'edit' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Edit Particulars
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Close Button (Pinned top-right on mobile, never cut off!) */}
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="sm:hidden flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs font-semibold w-full">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-1.5 text-center rounded-md transition-colors ${
                activeTab === 'preview' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Preview Document
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-1.5 text-center rounded-md transition-colors ${
                activeTab === 'edit' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Edit Particulars
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100/60">

          {activeTab === 'edit' ? (
            /* Quick Edit Form */
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4 max-w-2xl mx-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                Receipt Particulars &amp; Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Receipt Number</label>
                  <input
                    type="text"
                    value={receipt.receiptNumber}
                    onChange={(e) => setReceipt({ ...receipt, receiptNumber: e.target.value })}
                    className="w-full font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Receipt Date</label>
                  <input
                    type="date"
                    value={receipt.receiptDate}
                    onChange={(e) => setReceipt({ ...receipt, receiptDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Amount Received (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={receipt.amountPaid === 0 ? '' : receipt.amountPaid}
                    placeholder="0"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const rem = Math.max(0, receipt.totalPayable - val);
                      setReceipt({
                        ...receipt,
                        amountPaid: val,
                        remainingBalance: rem,
                      });
                    }}
                    className="w-full font-bold text-emerald-700 bg-emerald-50/40 border border-emerald-300 rounded-lg p-2 focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Payment Milestone</label>
                  <select
                    value={receipt.paymentMilestone}
                    onChange={(e) => setReceipt({ ...receipt, paymentMilestone: e.target.value as ReceiptMilestone })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-blue-500"
                  >
                    <option value="advance">Advance Milestone</option>
                    <option value="balance">Final Balance Settlement</option>
                    <option value="full">Full Payment Settlement</option>
                    <option value="partial">Partial Payment</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Payment Mode</label>
                  <select
                    value={receipt.paymentMode}
                    onChange={(e) => setReceipt({ ...receipt, paymentMode: e.target.value as PaymentMode })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-blue-500"
                  >
                    <option value="upi">UPI / QR Code</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Transaction Ref / UTR / Cheque #</label>
                  <input
                    type="text"
                    value={receipt.transactionRef || ''}
                    placeholder="e.g. UTR 428910283 or Cheque 00412"
                    onChange={(e) => setReceipt({ ...receipt, transactionRef: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-600 block mb-1">Notes / Terms on Receipt</label>
                  <input
                    type="text"
                    value={receipt.notes || ''}
                    placeholder="e.g. Advance acknowledged. Balance payable on venue delivery."
                    onChange={(e) => setReceipt({ ...receipt, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Apply &amp; View Preview
                </button>
              </div>
            </div>
          ) : (
            /* Document Preview Sheet */
            <div className="bg-white rounded-xl shadow-lg border border-slate-200/90 max-w-2xl mx-auto p-4 sm:p-8 text-slate-900 relative">

              {/* Decorative Header Bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 rounded-full mb-5 sm:mb-6" />

              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 sm:pb-5 border-b border-slate-200">
                <div className="max-w-full sm:max-w-[58%]">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {receipt.company.name || 'TISHA LED WALLS'}
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">
                    Professional Audio-Visual &amp; LED Display Systems
                  </p>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    {receipt.company.address && <div>{receipt.company.address}</div>}
                    <div>
                      {receipt.company.phone && <span>Ph: <strong className="text-slate-700">{receipt.company.phone}</strong> </span>}
                      {receipt.company.email && <span>&bull; {receipt.company.email}</span>}
                    </div>
                    {receipt.company.gstin && (
                      <div className="font-mono text-[10px] text-slate-700 mt-0.5">
                        GSTIN: <strong>{receipt.company.gstin}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full sm:w-auto text-left sm:text-right flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end flex-wrap gap-2">
                  <div className="inline-block bg-slate-900 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider h-[24px] sm:h-[26px] leading-[24px] sm:leading-[26px] px-3 sm:px-4 rounded-lg shadow-2xs text-center align-middle">
                    Official Money Receipt
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="text-slate-500 flex items-center sm:justify-end gap-2">
                      <span className="text-[11px]">Receipt No:</span>
                      <span className="font-mono font-bold text-slate-900">{receipt.receiptNumber}</span>
                    </div>
                    <div className="text-slate-500 flex items-center sm:justify-end gap-2">
                      <span className="text-[11px]">Receipt Date:</span>
                      <span className="font-semibold text-slate-800">{receipt.receiptDate}</span>
                    </div>
                    <div className="flex items-center sm:justify-end gap-2 pt-0.5">
                      <span className="text-slate-500 font-medium text-[11px]">Status:</span>
                      {receipt.amountPaid > 0 ? (
                        <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] sm:text-[9.5px] font-bold h-[20px] leading-[20px] px-2.5 rounded-full uppercase tracking-wider text-center align-middle">
                          &#10003; Payment Received
                        </span>
                      ) : (
                        <span className="inline-block bg-amber-100 text-amber-800 text-[9px] sm:text-[9.5px] font-bold h-[20px] leading-[20px] px-2.5 rounded-full uppercase tracking-wider text-center align-middle">
                          Payment Due / Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Client & Payment Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                    Received With Thanks From
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {receipt.client.name}
                  </div>
                  {receipt.client.company && (
                    <div className="text-blue-600 font-semibold">{receipt.client.company}</div>
                  )}
                  <div className="text-slate-500 text-[11px] mt-1 space-y-0.5">
                    {receipt.client.phone && <div>Ph: {receipt.client.phone}</div>}
                    {receipt.client.email && <div>{receipt.client.email}</div>}
                    {receipt.client.gstin && <div className="font-mono">GST: {receipt.client.gstin}</div>}
                  </div>
                  {(receipt.venue || receipt.eventDate) && (
                    <div className="mt-2 pt-1.5 border-t border-dashed border-slate-200 text-[10px] text-slate-600">
                      {receipt.eventDate && <span><strong>Event:</strong> {receipt.eventDate} </span>}
                      {receipt.venue && <span>&bull; {receipt.venue}</span>}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                    Payment &amp; Booking Particulars
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Related Quotation:</span>
                      <span className="font-mono font-bold text-slate-800">#{receipt.quotationNumber}</span>
                    </div>
                    {receipt.invoiceNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tax Invoice:</span>
                        <span className="font-mono font-bold text-slate-800">#{receipt.invoiceNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Mode:</span>
                      <span className="font-bold text-slate-800 uppercase">{receipt.paymentMode.replace('_', ' ')}</span>
                    </div>
                    {receipt.transactionRef && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ref / UTR:</span>
                        <span className="font-mono font-semibold text-slate-800">{receipt.transactionRef}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Milestone:</span>
                      <span className="font-bold text-emerald-700">
                        {milestoneNames[receipt.paymentMilestone] || receipt.paymentMilestone}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Highlight Card */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl p-3.5 sm:p-4 my-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Amount Received (INR)
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono tracking-tight mt-0.5">
                    {fmt(receipt.amountPaid)}
                  </div>
                  <div className="text-[11px] font-medium text-emerald-800 italic mt-0.5">
                    {amountToWordsIndian(receipt.amountPaid)}
                  </div>
                </div>

                <div className="w-full sm:w-auto pt-2.5 sm:pt-0 sm:pl-4 border-t sm:border-t-0 sm:border-l-2 border-dashed border-emerald-200 flex justify-between sm:block text-left sm:text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Net Balance Due
                  </div>
                  <div className={`text-base font-black font-mono mt-0.5 ${receipt.remainingBalance <= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {receipt.remainingBalance <= 0 ? '₹0.00 (Fully Paid)' : fmt(receipt.remainingBalance)}
                  </div>
                </div>
              </div>

              {/* Statement Ledger Table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto my-4 text-xs">
                <table className="w-full min-w-[300px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2 px-3">Description / Breakdown</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-3 text-slate-600">Total Agreed Booking Value (Inclusive of Taxes)</td>
                      <td className="py-2 px-3 text-right font-medium">{fmt(receipt.totalPayable)}</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-emerald-50/50 font-bold text-emerald-800">
                      <td className="py-2 px-3">
                        Amount Acknowledged in this Receipt ({milestoneNames[receipt.paymentMilestone] || receipt.paymentMilestone})
                      </td>
                      <td className="py-2 px-3 text-right">{fmt(receipt.amountPaid)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-black">
                      <td className="py-2.5 px-3 uppercase text-slate-700 text-[11px]">Net Outstanding Balance Payable</td>
                      <td className={`py-2.5 px-3 text-right font-mono text-xs ${receipt.remainingBalance <= 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {fmt(receipt.remainingBalance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms, Verification & Signatory Section */}
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 pt-4 mt-4 border-t border-slate-200">
                <div className="w-full sm:max-w-[60%] space-y-3">
                  <div className="text-[10px] text-slate-500 leading-relaxed">
                    <div className="font-bold text-slate-700 mb-0.5 uppercase tracking-wider">Terms &amp; Declaration:</div>
                    &bull; This receipt is issued subject to realization of funds / online electronic clearance.<br />
                    &bull; Equipment dispatch requires balance settlement prior to event setup at venue.<br />
                    &bull; Authentic computer-generated receipt issued by {receipt.company.name || 'Tisha LED Walls'}.
                    {receipt.notes && (
                      <div className="mt-1 text-slate-700"><strong>Note:</strong> {receipt.notes}</div>
                    )}
                  </div>

                  {/* Scan to Verify Official Record */}
                  {securityData?.qrDataUrl && (
                    <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2 w-fit">
                      <div className="bg-white p-1 border border-slate-200 rounded shrink-0 shadow-2xs">
                        <img src={securityData.qrDataUrl} alt="Verify QR" className="w-10 h-10 block" />
                      </div>
                      <div>
                        <div className="text-[9.5px] font-black text-slate-900 uppercase tracking-wider">
                          Scan to Verify Official Record
                        </div>
                        <div className="text-[8.5px] text-slate-500">
                          Direct ledger cross-reference &bull; Ref #{receipt.receiptNumber}
                        </div>
                        <div className="text-[8px] text-emerald-700 font-bold mt-0.5">
                          &#10003; Tamper-Protected Digital Record
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center w-full sm:w-48 pt-2 sm:pt-0">
                  <div className="h-20 flex items-center justify-center">
                    {stampImg && (
                      <img
                        src={stampImg}
                        alt="Stamp"
                        className="max-h-20 max-w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="border-t border-slate-800 pt-1 text-[11px] font-bold text-slate-900">
                    {receipt.company.name || 'Tisha LED Walls'}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Authorized Signatory
                  </div>
                  <div className="mt-1 flex items-center justify-center">
                    <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-800 border border-emerald-300 text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider leading-none">
                      &#10003; Digitally Endorsed
                    </span>
                  </div>
                </div>
              </div>

              {/* Document Sub-footer */}
              <div className="mt-4 pt-2 border-t border-slate-100 text-center text-[9px] text-slate-400 tracking-wider">
                {receipt.company.name || 'Tisha LED Walls'} &bull; Quotation &amp; Operations Suite &bull; Computer-Generated Electronic Voucher &bull; Ref #{receipt.receiptNumber}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Toolbar */}
        <div className="px-3.5 py-3 sm:px-6 sm:py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">

          {/* Quick WhatsApp Phone override */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 shrink-0">Send To:</span>
            <input
              type="tel"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="10-digit WhatsApp number"
              className="text-xs bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg px-2.5 py-1.5 flex-1 sm:w-48 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-300/80 active:scale-95"
              title="Copy receipt summary to clipboard"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-300/80 active:scale-95"
              title="Print Receipt"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={isSharingPdf || isExporting}
              className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-95"
              title="Share Receipt in PDF format on WhatsApp"
            >
              {isSharingPdf ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              <span className="truncate">{isSharingPdf ? 'Preparing...' : 'Share Receipt PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting || isSharingPdf}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-95"
              title="Download official PDF receipt"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span className="truncate">{isExporting ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* Premium Full-Screen PDF Generating Overlay */}
      <PdfGeneratingOverlay
        isOpen={isExporting || isSharingPdf}
        title="Receipt is Generating..."
        subtitle={
          isSharingPdf
            ? 'Preparing high-resolution PDF for WhatsApp sharing...'
            : 'Rendering official money receipt & preparing download...'
        }
        documentRef={receipt.receiptNumber}
        clientName={receipt.client?.name || receipt.client?.company}
        onCancel={handleCancelPdfGeneration}
      />
    </div>
  );
};
