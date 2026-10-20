import React, { useState } from 'react';
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
import { PaymentReceipt, ReceiptMilestone } from '../types/receipt';
import { exportReceiptPDF, printReceipt, generateReceiptPDFFile } from '../services/receiptPdfGenerator';
import {
  generateWhatsAppReceiptUrl,
  formatPaymentReceiptWhatsAppText,
  generateWhatsAppReceiptPdfNoticeUrl,
} from '../services/whatsapp';
import { amountToWordsIndian } from '../utils/numberToWords';
import { OFFICIAL_TISHA_STAMP } from '../config/officialStamp';
import { PaymentMode } from '../types/quotation';
import { useToast } from '../context/ToastContext';

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
  const toast = useToast();
  const [receipt, setReceipt] = useState<PaymentReceipt>(initialReceipt);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState(initialReceipt.client?.phone || '');
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await exportReceiptPDF(receipt);
      if (onSaveReceipt) onSaveReceipt(receipt);
    } catch (err) {
      console.error('Failed to export receipt PDF', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    printReceipt(receipt);
    if (onSaveReceipt) onSaveReceipt(receipt);
  };

  const handleWhatsApp = async () => {
    setIsSharingPdf(true);
    try {
      const { file, filename } = await generateReceiptPDFFile(receipt);

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

      // 2. Desktop Fallback:
      // Download the PDF file directly to device
      const blobUrl = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      // Open WhatsApp Web with client chat and informative notice
      const waUrl = generateWhatsAppReceiptPdfNoticeUrl(receipt, filename, customPhone);
      window.open(waUrl, '_blank');

      toast.success(`PDF receipt downloaded as "${filename}". Attach file in WhatsApp!`);
      if (onSaveReceipt) onSaveReceipt(receipt);
    } catch (err) {
      console.error('Failed to share receipt PDF:', err);
      toast.error('Failed to generate PDF for WhatsApp.');
    } finally {
      setIsSharingPdf(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Receipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">
                  Payment Receipt
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {receipt.receiptNumber}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  Payment Confirmed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                For Quotation #{receipt.quotationNumber} &bull; {receipt.client?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          
          {activeTab === 'edit' ? (
            /* Quick Edit Form */
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4 max-w-2xl mx-auto">
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
            <div className="bg-white rounded-xl shadow-lg border border-slate-200/90 max-w-2xl mx-auto p-8 text-slate-900 relative">
              
              {/* Decorative Header Bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 rounded-full mb-6" />

              {/* Header */}
              <div className="flex justify-between items-start pb-5 border-b border-slate-200">
                <div className="max-w-[60%]">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
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

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-md mb-2 shadow-2xs">
                    Official Money Receipt
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="text-slate-500">
                      Receipt No: <span className="font-mono font-bold text-slate-900">{receipt.receiptNumber}</span>
                    </div>
                    <div className="text-slate-500">
                      Date: <span className="font-semibold text-slate-800">{receipt.receiptDate}</span>
                    </div>
                    <div className="pt-1">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        &#10003; Payment Received
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client & Payment Info Grid */}
              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                    Received With Thanks From
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {receipt.client.name || 'Valued Client'}
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
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl p-4 my-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Amount Received (INR)
                  </div>
                  <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight mt-0.5">
                    {fmt(receipt.amountPaid)}
                  </div>
                  <div className="text-[11px] font-medium text-emerald-800 italic mt-0.5">
                    {amountToWordsIndian(receipt.amountPaid)}
                  </div>
                </div>

                <div className="text-right border-l-2 border-dashed border-emerald-200 pl-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Net Balance Due
                  </div>
                  <div className={`text-base font-black font-mono mt-0.5 ${receipt.remainingBalance <= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {receipt.remainingBalance <= 0 ? '₹0.00 (Fully Paid)' : fmt(receipt.remainingBalance)}
                  </div>
                </div>
              </div>

              {/* Statement Ledger Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden my-4 text-xs">
                <table className="w-full text-left border-collapse">
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

              {/* Signatory & Rubber Stamp Section */}
              <div className="flex justify-between items-end pt-3 mt-4 border-t border-slate-200">
                <div className="text-[10px] text-slate-400 max-w-[55%] leading-relaxed">
                  <div className="font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Declaration:</div>
                  &bull; This receipt is issued subject to realization of funds.<br />
                  &bull; Equipment dispatch requires balance settlement prior to event setup.<br />
                  &bull; Computer-generated official receipt issued by Tisha LED Walls.
                </div>

                <div className="text-center w-48">
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
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Toolbar */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Quick WhatsApp Phone override */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Send To:</span>
            <input
              type="tel"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="10-digit WhatsApp number"
              className="text-xs bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg px-2.5 py-1.5 w-48 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300/80"
              title="Copy receipt summary to clipboard"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300/80"
              title="Print Receipt"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={isSharingPdf}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Share Receipt in PDF format on WhatsApp"
            >
              {isSharingPdf ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              <span>{isSharingPdf ? 'Preparing PDF...' : 'Share Receipt PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              title="Download official PDF receipt"
            >
              <Download size={14} />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
