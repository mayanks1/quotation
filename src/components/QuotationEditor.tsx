import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Download, Printer, Share2, Copy, Plus, 
  Trash2, Image as ImageIcon, Calculator, BookOpen, 
  Settings, UserCheck, Calendar, Zap, FileText, Receipt,
  QrCode, CreditCard, CheckCircle2, GitBranch, ChevronDown, ChevronUp,
  Smartphone, PenLine, PenTool, Clock
} from 'lucide-react';
import { 
  Quotation, LineItem, QuotationStatus, TaxScheme, ClientProfile, 
  getItemAmount, DocumentType, PaymentStatus, PaymentMode 
} from '../types/quotation';
import { generateWhatsAppShareUrl } from '../services/whatsapp';
import { exportQuotationPDF } from '../services/pdfGenerator';
import { generateUpiQrDataUrl } from '../services/upiQr';
import { amountToWordsIndian } from '../utils/numberToWords';
import { computeGstTaxBreakdown } from '../utils/gstTaxBreakdown';
import { TERMS_PRESETS } from '../config/termsPresets';
import { getQuotationExpiryStatus } from '../utils/quotationExpiry';
import { LedCalculatorModal } from './LedCalculatorModal';
import { CatalogPickerModal } from './CatalogPickerModal';
import { ShareQuotationModal } from './ShareQuotationModal';
import { SignatureModal } from './SignatureModal';
import { useToast } from '../context/ToastContext';

interface Props {
  quotation: Quotation;
  savedClients: ClientProfile[];
  onChange: (updated: Quotation) => void;
  onBack: () => void;
  onDuplicate: (q: Quotation) => void;
  onOpenSettings: () => void;
}

// Auto-formats date strings into DD-MM-YYYY as user types
const formatDMYInput = (val: string, prevVal: string = ''): string => {
  if (!val) return '';

  // 1. If user is backspacing/deleting
  if (prevVal && val.length < prevVal.length) {
    // If user hit backspace on a trailing dash (e.g. from "15-" to "15" or "15-10-" to "15-10")
    if (prevVal.endsWith('-') && val === prevVal.slice(0, -1)) {
      // Also drop the character before it so backspacing is seamless and doesn't get stuck
      return val.slice(0, -1);
    }
    return val;
  }

  // 2. ISO paste YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = val.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }

  // 3. User pressed separator (/ - . space) after a 1-digit day or 1-digit month
  // e.g. "5/" or "5-" -> "05-"
  // e.g. "15-8/" or "15-8-" -> "15-08-"
  if (/^(\d{1,2})[-/. ]$/.test(val)) {
    const d = parseInt(val.replace(/\D/g, ''), 10);
    return `${String(Math.min(31, Math.max(1, d))).padStart(2, '0')}-`;
  }
  if (/^(\d{2})-(\d{1,2})[-/. ]$/.test(val)) {
    const parts = val.split('-');
    const d = parts[0];
    const m = parseInt(parts[1].replace(/\D/g, ''), 10);
    return `${d}-${String(Math.min(12, Math.max(1, m))).padStart(2, '0')}-`;
  }

  // 4. Pure digit stream processing
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';

  // Single digit day: if > 3 (4-9), day can only be 04-09
  if (digits.length === 1) {
    const d1 = parseInt(digits, 10);
    if (d1 > 3) {
      return `0${d1}-`;
    }
    return digits;
  }

  // 2 digits: DD -> auto-append dash DD-
  if (digits.length === 2) {
    let d = parseInt(digits, 10);
    if (d > 31) d = 31;
    if (d === 0) d = 1;
    return `${String(d).padStart(2, '0')}-`;
  }

  // 3 digits: DD-M
  if (digits.length === 3) {
    let d = parseInt(digits.slice(0, 2), 10);
    if (d > 31) d = 31;
    if (d === 0) d = 1;
    const m1 = parseInt(digits[2], 10);
    // If month first digit is > 1 (2-9), month can only be 02-09
    if (m1 > 1) {
      return `${String(d).padStart(2, '0')}-0${m1}-`;
    }
    return `${String(d).padStart(2, '0')}-${m1}`;
  }

  // 4 digits: DD-MM -> auto-append dash DD-MM-
  if (digits.length === 4) {
    let d = parseInt(digits.slice(0, 2), 10);
    if (d > 31) d = 31;
    if (d === 0) d = 1;
    let m = parseInt(digits.slice(2, 4), 10);
    if (m > 12) m = 12;
    if (m === 0) m = 1;
    return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-`;
  }

  // 5 to 8 digits: DD-MM-YYYY
  let d = parseInt(digits.slice(0, 2), 10);
  if (d > 31) d = 31;
  if (d === 0) d = 1;
  let m = parseInt(digits.slice(2, 4), 10);
  if (m > 12) m = 12;
  if (m === 0) m = 1;
  const y = digits.slice(4, 8);
  return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
};

const validateDMY = (val: string): string => {
  if (!val) return val;
  const clean = val.trim();
  
  const parts = clean.split(/[-/. ]+/);
  if (parts.length >= 3) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let y = parts[2];
    if (isNaN(d) || isNaN(m)) return val;
    if (d > 31) d = 31;
    if (d < 1) d = 1;
    if (m > 12) m = 12;
    if (m < 1) m = 1;
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    if (y.length === 2) {
      y = `20${y}`;
    }
    return `${dd}-${mm}-${y}`;
  } else if (parts.length === 2) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (!isNaN(d) && !isNaN(m)) {
      if (d > 31) d = 31;
      if (d < 1) d = 1;
      if (m > 12) m = 12;
      if (m < 1) m = 1;
      const currentYear = new Date().getFullYear();
      return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${currentYear}`;
    }
  }
  return val;
};

export const QuotationEditor: React.FC<Props> = ({
  quotation,
  savedClients,
  onChange,
  onBack,
  onDuplicate,
  onOpenSettings,
}) => {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [isLedCalcOpen, setIsLedCalcOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [autoCalc, setAutoCalc] = useState<boolean>(false);
  const [liveQrUrl, setLiveQrUrl] = useState<string>('');

  // Date picker refs
  const eventDatePickerRef = useRef<HTMLInputElement>(null);
  const quoteDatePickerRef = useRef<HTMLInputElement>(null);
  const validDatePickerRef = useRef<HTMLInputElement>(null);
  const invoiceDatePickerRef = useRef<HTMLInputElement>(null);

  // Document Type & Invoicing
  const isInvoice = quotation.documentType === 'invoice';

  // Math
  const subtotal = quotation.lineItems.reduce((acc, i) => acc + getItemAmount(i), 0);
  const discountedSubtotal = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const isZeroTax = quotation.taxScheme === 'none';
  const effectiveTaxRate = isZeroTax ? 0 : (quotation.taxRate || 0);
  const taxAmount = isZeroTax ? 0 : (discountedSubtotal * effectiveTaxRate) / 100;
  const grandTotal = Math.max(0, discountedSubtotal + taxAmount + (quotation.shippingCharges || 0) + (quotation.adjustmentAmount || 0));

  // Feature Toggles (Optional Features)
  const isQrEnabled = quotation.enableUpiQr ?? false;
  const isLedgerEnabled = quotation.enablePaymentLedger ?? false;
  const allowCustomerEditQrAmount = quotation.allowCustomerEditQrAmount ?? false;
  const qrAmountType = quotation.qrAmountType || (quotation.customQrAmount !== undefined && quotation.customQrAmount > 0 ? 'custom' : (isLedgerEnabled ? 'advance' : 'total'));

  // Payment Milestone & Tracking Math
  const advancePercentage = quotation.advancePercentage ?? 70;
  const computedAdvanceAmount = Math.round((grandTotal * advancePercentage) / 100);
  // Auto-sync: If stored advanceAmount exceeds grandTotal or is invalid, re-sync to computed
  const effectiveAdvanceAmount = (quotation.advanceAmount !== undefined && quotation.advanceAmount <= grandTotal && quotation.advanceAmount > 0)
    ? quotation.advanceAmount
    : computedAdvanceAmount;

  const paidAmount = quotation.paidAmount || 0;
  const balanceDue = Math.max(0, grandTotal - paidAmount);

  // Dynamic QR Code Target Amount:
  // If allowCustomerEditQrAmount is true -> Open Amount QR (customer types amount in UPI app on scan)
  // Else if customQrAmount is set -> customQrAmount typed by user
  // Else if qrAmountType === 'advance' -> effectiveAdvanceAmount
  // Else -> balanceDue > 0 ? balanceDue : grandTotal
  const targetQrAmount = allowCustomerEditQrAmount
    ? 0
    : (quotation.customQrAmount !== undefined && quotation.customQrAmount > 0
        ? quotation.customQrAmount
        : (qrAmountType === 'advance' && isLedgerEnabled && effectiveAdvanceAmount > 0
            ? effectiveAdvanceAmount
            : (balanceDue > 0 ? balanceDue : grandTotal)));

  // Live UPI QR code generator effect
  useEffect(() => {
    let isMounted = true;
    const upiId = quotation.company.bankDetails?.upiId;
    if (!isQrEnabled || !upiId) {
      setLiveQrUrl('');
      return;
    }

    generateUpiQrDataUrl({
      upiId,
      payeeName: quotation.company.bankDetails?.accountName || quotation.company.name || 'Merchant',
      amount: allowCustomerEditQrAmount ? undefined : (targetQrAmount > 0 ? targetQrAmount : undefined),
      transactionNote: `${isInvoice ? 'Invoice' : 'Quote'} ${isInvoice ? (quotation.invoiceNumber || quotation.quotationNumber) : quotation.quotationNumber}`,
    }).then((url) => {
      if (isMounted) setLiveQrUrl(url);
    }).catch((err) => {
      console.warn('QR generation error:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [
    isQrEnabled,
    quotation.company.bankDetails?.upiId,
    quotation.company.bankDetails?.accountName,
    quotation.company.name,
    targetQrAmount,
    allowCustomerEditQrAmount,
    quotation.customQrAmount,
    isInvoice,
    quotation.invoiceNumber,
    quotation.quotationNumber,
  ]);

  // Line item handlers
  const handleUpdateItem = (id: string, field: keyof LineItem, val: string | number) => {
    const updated = quotation.lineItems.map((item) => {
      if (item.id !== id) return item;

      // If Auto-Calc switch is ON, recalculate Amount = Qty * Rate
      if (autoCalc) {
        if (field === 'quantity') {
          const qty = typeof val === 'number' ? val : (parseFloat(String(val)) || 0);
          const currentRate = item.rate || 0;
          return {
            ...item,
            quantity: qty,
            amount: Math.round(qty * currentRate * 100) / 100,
          };
        }
        if (field === 'rate') {
          const rate = typeof val === 'number' ? val : (parseFloat(String(val)) || 0);
          const qty = item.quantity || 1;
          return {
            ...item,
            rate,
            amount: Math.round(qty * rate * 100) / 100,
          };
        }
      }

      return { ...item, [field]: val };
    });
    onChange({ ...quotation, lineItems: updated });
  };

  const handleUpdateItemAmount = (id: string, val: string | number) => {
    const amount = typeof val === 'number' ? val : (parseFloat(String(val)) || 0);
    const updated = quotation.lineItems.map((item) =>
      item.id === id ? { ...item, amount } : item
    );
    onChange({ ...quotation, lineItems: updated });
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      amount: 0,
      rate: 0,
      unit: '',
      hsnSac: '',
    };
    onChange({ ...quotation, lineItems: [...quotation.lineItems, newItem] });
    toast.info('New custom line item added');
  };

  const handleRemoveItem = (id: string) => {
    if (quotation.lineItems.length <= 1) return;
    onChange({
      ...quotation,
      lineItems: quotation.lineItems.filter((i) => i.id !== id),
    });
    toast.info('Line item removed');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({
        ...quotation,
        company: { ...quotation.company, logo: reader.result as string },
      });
      toast.success('Company logo updated');
    };
    reader.readAsDataURL(file);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    toast.info(`Preparing PDF for ${quotation.quotationNumber}...`);
    try {
      await exportQuotationPDF(quotation);
      toast.success(`PDF downloaded for ${quotation.quotationNumber}`);
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('PDF generation encountered an error. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  const handleOpenShare = () => {
    setIsShareModalOpen(true);
  };

  const handleCreateNewRevision = () => {
    const currentNum = quotation.quotationNumber;
    const baseNum = currentNum.replace(/-R\d+$/i, '');
    const currentRev = quotation.revisionNumber || 1;
    const nextRev = currentRev + 1;
    const nextQuoteNumber = `${baseNum}-R${nextRev}`;

    const revisedQuote: Quotation = {
      ...quotation,
      id: `quote-${Date.now()}`,
      quotationNumber: nextQuoteNumber,
      parentQuoteNumber: quotation.parentQuoteNumber || currentNum,
      revisionNumber: nextRev,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onDuplicate(revisedQuote);
    toast.success(`Created Revision R${nextRev}: ${nextQuoteNumber}`);
  };

  const handleSelectSavedClient = (clientIdOrName: string) => {
    const found = savedClients.find((c) => c.id === clientIdOrName || c.name === clientIdOrName);
    if (found) {
      onChange({
        ...quotation,
        client: {
          ...quotation.client,
          name: found.name,
          company: found.company || '',
          address: found.address || '',
          phone: found.phone || '',
          email: found.email || '',
          gstin: found.gstin || '',
        },
      });
      toast.success(`Client details autofilled for ${found.name}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      
      {/* Top Controller Bar */}
      <div className="no-print bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 relative md:sticky md:top-4 z-40">
        
        {/* Back and Status */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>All Quotes</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-slate-400">Status:</span>
            <select
              value={quotation.status}
              onChange={(e) => onChange({ ...quotation, status: e.target.value as QuotationStatus })}
              className={`text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg border focus:outline-none transition-colors ${
                quotation.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : quotation.status === 'sent'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : quotation.status === 'invoiced'
                  ? 'bg-purple-50 text-purple-700 border-purple-300'
                  : quotation.status === 'rejected'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent to Client</option>
              <option value="approved">Approved</option>
              <option value="invoiced">Invoiced</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Document Type Switcher: Quotation vs Tax Invoice */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 self-stretch sm:self-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (isInvoice) {
                onChange({ ...quotation, documentType: 'quotation' });
                toast.info('Switched view to Quotation mode');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isInvoice
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText size={13} className={!isInvoice ? 'text-blue-600' : ''} />
            <span>Quotation</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const invoiceNum = quotation.invoiceNumber || `INV-${quotation.quotationNumber.replace(/^Q-?/, '') || Date.now()}`;
              onChange({
                ...quotation,
                documentType: 'invoice',
                invoiceNumber: invoiceNum,
                invoiceDate: quotation.invoiceDate || quotation.quotationDate,
                status: quotation.status === 'draft' ? 'invoiced' : quotation.status,
              });
              toast.success(`Converted to Tax Invoice #${invoiceNum}`);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isInvoice
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt size={13} />
            <span>Tax Invoice</span>
          </button>
        </div>

        {/* Action CTAs: Responsive Grid on Mobile, Flex on Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleCreateNewRevision}
            title="Create a new version (e.g. R1, R2) preserving this quote"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 rounded-lg transition-colors border border-blue-200"
          >
            <GitBranch size={14} />
            <span>Revise (R{(quotation.revisionNumber || 1) + 1})</span>
          </button>

          <button
            onClick={() => {
              onDuplicate(quotation);
              toast.success(`Quotation ${quotation.quotationNumber} duplicated as new draft`);
            }}
            title="Duplicate as new quote"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg transition-colors"
          >
            <Copy size={14} />
            <span>Duplicate</span>
          </button>

          <button
            onClick={handleNativePrint}
            title="Print or Save as Vector PDF"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg transition-colors"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>

          <button
            onClick={handleOpenShare}
            title="Share quotation as official PDF document or WhatsApp text"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-colors shadow-sm"
          >
            <Share2 size={14} />
            <span>Share</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            <Download size={14} />
            <span className="truncate">{exporting ? 'Generating…' : 'PDF'}</span>
          </button>
        </div>

      </div>

      {/* Main Quotation Sheet */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
        <div className="p-6 md:p-12 space-y-8">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-slate-200">
            
            {/* Company Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 mb-2">
                {quotation.company.logo ? (
                  <div className="relative group inline-block">
                    <img
                      src={quotation.company.logo}
                      alt="Logo"
                      className="h-14 md:h-16 w-auto object-contain rounded"
                    />
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded">
                      <ImageIcon size={18} className="text-white" />
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors text-xs font-semibold text-slate-700">
                    <ImageIcon size={16} />
                    <span>Upload Logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                )}

                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                >
                  <Settings size={13} />
                  <span>Edit Company / Bank Info</span>
                </button>
              </div>

              <input
                value={quotation.company.name}
                onChange={(e) =>
                  onChange({ ...quotation, company: { ...quotation.company, name: e.target.value } })
                }
                className="text-2xl font-black text-slate-900 w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
              />

              <input
                value={quotation.company.tagline || ''}
                placeholder="Tagline / Description"
                onChange={(e) =>
                  onChange({ ...quotation, company: { ...quotation.company, tagline: e.target.value } })
                }
                className="text-xs text-blue-600 font-bold uppercase tracking-wider w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
              />

              <textarea
                rows={2}
                value={quotation.company.address}
                onChange={(e) =>
                  onChange({ ...quotation, company: { ...quotation.company, address: e.target.value } })
                }
                className="text-xs text-slate-500 w-full resize-none border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
              />

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <input
                  value={quotation.company.phone}
                  onChange={(e) =>
                    onChange({ ...quotation, company: { ...quotation.company, phone: e.target.value } })
                  }
                  className="w-36 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                />
                <input
                  value={quotation.company.email}
                  onChange={(e) =>
                    onChange({ ...quotation, company: { ...quotation.company, email: e.target.value } })
                  }
                  className="w-48 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {quotation.company.gstin && (
                <div className="text-xs font-semibold text-slate-700">
                  GSTIN: {quotation.company.gstin}
                </div>
              )}
            </div>

            {/* Document Metadata Card */}
            <div className="text-left md:text-right min-w-[280px] space-y-2">
              <div className="flex items-center justify-start md:justify-end gap-2 mb-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                  {isInvoice ? 'TAX INVOICE' : 'QUOTATION'}
                </h1>
                {isInvoice && (
                  <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                    ORIGINAL
                  </span>
                )}
                {quotation.revisionNumber && quotation.revisionNumber > 1 && (
                  <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-2xs">
                    REV R{quotation.revisionNumber}
                  </span>
                )}
              </div>
              
              <div className="space-y-1.5 text-xs">
                {isInvoice ? (
                  <>
                    <div className="flex items-center justify-between md:justify-end gap-2">
                      <span className="text-blue-700 font-bold">Invoice No:</span>
                      <input
                        value={quotation.invoiceNumber || ''}
                        placeholder="INV-001"
                        onChange={(e) => onChange({ ...quotation, invoiceNumber: e.target.value })}
                        className="font-mono font-black text-blue-700 w-36 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-2">
                      <span className="text-slate-500 font-semibold">Invoice Date:</span>
                      <div className="relative flex items-center">
                        <input
                          value={quotation.invoiceDate || quotation.quotationDate}
                          placeholder="DD-MM-YYYY"
                          maxLength={10}
                          onChange={(e) => {
                            const formatted = formatDMYInput(e.target.value, quotation.invoiceDate || quotation.quotationDate);
                            onChange({ ...quotation, invoiceDate: formatted });
                          }}
                          onBlur={(e) => {
                            const validated = validateDMY(e.target.value);
                            if (validated !== e.target.value) {
                              onChange({ ...quotation, invoiceDate: validated });
                            }
                          }}
                          className="font-medium text-slate-800 w-36 text-right pr-5 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          title="Select invoice date"
                          onClick={() => {
                            if (invoiceDatePickerRef.current?.showPicker) {
                              invoiceDatePickerRef.current.showPicker();
                            } else {
                              invoiceDatePickerRef.current?.click();
                            }
                          }}
                          className="absolute right-0 text-slate-400 hover:text-blue-600 p-0.5 transition-colors no-print"
                        >
                          <Calendar size={13} />
                        </button>
                        <input
                          ref={invoiceDatePickerRef}
                          type="date"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.value) {
                              const [y, m, d] = e.target.value.split('-');
                              onChange({ ...quotation, invoiceDate: `${d}-${m}-${y}` });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-2">
                      <span className="text-slate-400 font-semibold">Ref Quote:</span>
                      <input
                        value={quotation.quotationNumber}
                        onChange={(e) => onChange({ ...quotation, quotationNumber: e.target.value })}
                        className="font-mono text-slate-500 w-36 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between md:justify-end gap-2">
                      <span className="text-slate-500 font-semibold">Quote No:</span>
                      <input
                        value={quotation.quotationNumber}
                        onChange={(e) => onChange({ ...quotation, quotationNumber: e.target.value })}
                        className="font-mono font-bold text-slate-900 w-36 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-2">
                      <span className="text-slate-500 font-semibold">Date:</span>
                      <div className="relative flex items-center">
                        <input
                          value={quotation.quotationDate}
                          placeholder="DD-MM-YYYY"
                          maxLength={10}
                          onChange={(e) => {
                            const formatted = formatDMYInput(e.target.value, quotation.quotationDate);
                            onChange({ ...quotation, quotationDate: formatted });
                          }}
                          onBlur={(e) => {
                            const validated = validateDMY(e.target.value);
                            if (validated !== e.target.value) {
                              onChange({ ...quotation, quotationDate: validated });
                            }
                          }}
                          className="font-medium text-slate-800 w-36 text-right pr-5 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          title="Select date"
                          onClick={() => {
                            if (quoteDatePickerRef.current?.showPicker) {
                              quoteDatePickerRef.current.showPicker();
                            } else {
                              quoteDatePickerRef.current?.click();
                            }
                          }}
                          className="absolute right-0 text-slate-400 hover:text-blue-600 p-0.5 transition-colors no-print"
                        >
                          <Calendar size={13} />
                        </button>
                        <input
                          ref={quoteDatePickerRef}
                          type="date"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.value) {
                              const [y, m, d] = e.target.value.split('-');
                              onChange({ ...quotation, quotationDate: `${d}-${m}-${y}` });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-2">
                      <span className="text-slate-500 font-semibold">Valid Until:</span>
                      <div className="relative flex items-center">
                        <input
                          value={quotation.validUntil}
                          placeholder="DD-MM-YYYY"
                          maxLength={10}
                          onChange={(e) => {
                            const formatted = formatDMYInput(e.target.value, quotation.validUntil);
                            onChange({ ...quotation, validUntil: formatted });
                          }}
                          onBlur={(e) => {
                            const validated = validateDMY(e.target.value);
                            if (validated !== e.target.value) {
                              onChange({ ...quotation, validUntil: validated });
                            }
                          }}
                          className="font-medium text-slate-800 w-36 text-right pr-5 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          title="Select valid until date"
                          onClick={() => {
                            if (validDatePickerRef.current?.showPicker) {
                              validDatePickerRef.current.showPicker();
                            } else {
                              validDatePickerRef.current?.click();
                            }
                          }}
                          className="absolute right-0 text-slate-400 hover:text-blue-600 p-0.5 transition-colors no-print"
                        >
                          <Calendar size={13} />
                        </button>
                        <input
                          ref={validDatePickerRef}
                          type="date"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.value) {
                              const [y, m, d] = e.target.value.split('-');
                              onChange({ ...quotation, validUntil: `${d}-${m}-${y}` });
                            }
                          }}
                        />
                      </div>
                      {(() => {
                        const exp = getQuotationExpiryStatus(quotation.validUntil);
                        return (
                          <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border ${exp.badgeClass}`}>
                            <Clock size={9} />
                            {exp.label}
                          </span>
                        );
                      })()}
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between md:justify-end gap-2">
                  <span className="text-blue-600 font-semibold">Event Date:</span>
                  <div className="relative flex items-center">
                    <input
                      value={quotation.eventDate || ''}
                      placeholder="DD-MM-YYYY"
                      maxLength={10}
                      onChange={(e) => {
                        const formatted = formatDMYInput(e.target.value, quotation.eventDate || '');
                        onChange({ ...quotation, eventDate: formatted });
                      }}
                      onBlur={(e) => {
                        const validated = validateDMY(e.target.value);
                        if (validated !== e.target.value) {
                          onChange({ ...quotation, eventDate: validated });
                        }
                      }}
                      className="font-bold text-blue-600 w-36 text-right pr-5 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-blue-300 placeholder:font-normal"
                    />
                    <button
                      type="button"
                      title="Pick Event Date from calendar"
                      onClick={() => {
                        if (eventDatePickerRef.current?.showPicker) {
                          eventDatePickerRef.current.showPicker();
                        } else {
                          eventDatePickerRef.current?.click();
                        }
                      }}
                      className="absolute right-0 text-slate-400 hover:text-blue-600 p-0.5 transition-colors no-print"
                    >
                      <Calendar size={13} />
                    </button>
                    <input
                      ref={eventDatePickerRef}
                      type="date"
                      className="sr-only"
                      onChange={(e) => {
                        if (e.target.value) {
                          const [y, m, d] = e.target.value.split('-');
                          onChange({ ...quotation, eventDate: `${d}-${m}-${y}` });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bill To & Venue Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bill To */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bill To (Client Details)</span>
                
                {savedClients.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-blue-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                    <UserCheck size={13} />
                    <select
                      onChange={(e) => handleSelectSavedClient(e.target.value)}
                      defaultValue=""
                      className="bg-transparent text-xs text-blue-600 font-semibold cursor-pointer focus:outline-none max-w-[170px] truncate"
                    >
                      <option value="" disabled>Load Saved Client...</option>
                      {savedClients.map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name} {c.company ? `(${c.company})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <input
                value={quotation.client.name}
                placeholder="Event Organizer / Client Name"
                onChange={(e) =>
                  onChange({ ...quotation, client: { ...quotation.client, name: e.target.value } })
                }
                className="text-base font-bold text-slate-900 w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
              />

              <input
                value={quotation.client.company}
                placeholder="Corporate / Production Agency"
                onChange={(e) =>
                  onChange({ ...quotation, client: { ...quotation.client, company: e.target.value } })
                }
                className="text-xs font-semibold text-slate-700 w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
              />

              <textarea
                rows={2}
                value={quotation.client.address}
                placeholder="Sector 29, Gurugram, Haryana 122001"
                onChange={(e) =>
                  onChange({ ...quotation, client: { ...quotation.client, address: e.target.value } })
                }
                className="text-xs text-slate-600 w-full bg-transparent resize-none border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  value={quotation.client.phone}
                  placeholder="+91 9876543210"
                  onChange={(e) =>
                    onChange({ ...quotation, client: { ...quotation.client, phone: e.target.value } })
                  }
                  className="bg-transparent text-slate-700 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                />
                <input
                  value={quotation.client.email}
                  placeholder="client@events.com"
                  onChange={(e) =>
                    onChange({ ...quotation, client: { ...quotation.client, email: e.target.value } })
                  }
                  className="bg-transparent text-slate-700 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <input
                value={quotation.client.gstin || ''}
                placeholder="CLIENT GSTIN (OPTIONAL)"
                onChange={(e) =>
                  onChange({ ...quotation, client: { ...quotation.client, gstin: e.target.value } })
                }
                className="text-xs font-mono uppercase bg-transparent text-slate-600 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Event Venue */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Event & Setup Location</span>
                <textarea
                  rows={3}
                  value={quotation.venue || ''}
                  placeholder="Client Venue, Delhi NCR"
                  onChange={(e) => onChange({ ...quotation, venue: e.target.value })}
                  className="text-xs text-slate-700 w-full bg-transparent resize-none border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="text-[11px] text-slate-400 bg-white/70 p-2.5 rounded-lg border border-slate-200">
                💡 Tip: Mentioning clear venue details guarantees logistics, transport, and labor are accurately quoted.
              </div>
            </div>

          </div>

          {/* Line Items Table & Helper Actions */}
          <div className="space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Setup &amp; Equipment Specifications</h2>
                
                {/* Switch for Auto-Calculate vs Manual Independent */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoCalc;
                    setAutoCalc(next);
                    if (next) {
                      toast.success('Auto-calc enabled: Changing Rate or Qty will auto-calculate Amount = Qty × Rate');
                    } else {
                      toast.info('Manual mode: Rate and Amount can be typed independently');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    autoCalc
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                      : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                  }`}
                  title={autoCalc ? 'Auto-calculate enabled (Qty × Rate = Amount). Click to switch to Independent.' : 'Independent mode (Type Rate and Amount freely). Click to enable Auto-Calculate.'}
                >
                  <Zap size={13} className={autoCalc ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'} />
                  <span>{autoCalc ? 'Auto-Calc (Qty × Rate): ON' : 'Auto-Calc: OFF (Independent)'}</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLedCalcOpen(true)}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                >
                  <Calculator size={15} />
                  <span>LED Wall Calculator</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCatalogOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                >
                  <BookOpen size={15} />
                  <span>Add from Catalog</span>
                </button>
              </div>
            </div>

            {/* Mobile View: Responsive Line Item Cards (md:hidden) */}
            <div className="md:hidden space-y-3">
              {quotation.lineItems.map((item, index) => {
                const itemAmount = getItemAmount(item);
                const isLegacyDummy = item.description === 'Setup Equipment / Service description';
                const displayDesc = isLegacyDummy ? '' : item.description;

                return (
                  <div 
                    key={item.id} 
                    className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs"
                  >
                    {/* Header: Item Number, SAC and Delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-mono font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px] text-slate-500 font-mono">
                          <span>SAC:</span>
                          <input
                            value={item.hsnSac || ''}
                            placeholder="9973"
                            onChange={(e) => handleUpdateItem(item.id, 'hsnSac', e.target.value)}
                            className="w-12 bg-transparent text-slate-700 font-bold focus:outline-none"
                          />
                        </div>
                      </div>

                      {quotation.lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Description Textarea */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Description &amp; Specifications
                      </label>
                      <textarea
                        rows={2}
                        value={displayDesc}
                        placeholder="Setup Equipment / Service description"
                        onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                        className="w-full text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400 placeholder:font-normal leading-relaxed"
                      />
                    </div>

                    {/* Qty, Unit, Rate, Amount Grid (Bidirectional) */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/80">
                      
                      {/* Qty & Unit */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Qty / Unit
                        </label>
                        <div className="flex items-center bg-white rounded-lg border border-slate-200 px-2 py-1.5 focus-within:border-blue-500">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity === 0 ? '' : item.quantity}
                            placeholder="1"
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            onBlur={() => {
                              if (!item.quantity || item.quantity <= 0) handleUpdateItem(item.id, 'quantity', 1);
                            }}
                            className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                          />
                          <input
                            value={item.unit || ''}
                            placeholder="Unit"
                            onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                            className="w-10 text-[10px] text-right text-slate-400 bg-transparent focus:outline-none placeholder:text-slate-300"
                          />
                        </div>
                      </div>

                      {/* Rate */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Rate (₹)
                        </label>
                        <div className="flex items-center bg-white rounded-lg border border-slate-200 px-2 py-1.5 focus-within:border-blue-500">
                          <input
                            type="number"
                            min={0}
                            value={item.rate === 0 ? '' : (item.rate ?? '')}
                            placeholder="0"
                            onChange={(e) => handleUpdateItem(item.id, 'rate', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none text-right"
                          />
                        </div>
                      </div>

                      {/* Manual Amount */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">
                            Amount (₹)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const computed = Math.round((item.quantity || 1) * (item.rate || 0) * 100) / 100;
                              handleUpdateItemAmount(item.id, computed);
                              toast.info(`Calculated: ${(item.quantity || 1)} × ₹${(item.rate || 0)} = ₹${computed}`);
                            }}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                            title="Auto-calc this line: Qty × Rate"
                          >
                            <Zap size={10} />
                            <span>Calc</span>
                          </button>
                        </div>
                        <div className="flex items-center bg-white rounded-lg border border-slate-200 px-2.5 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                          <span className="text-slate-400 text-xs font-semibold mr-1">₹</span>
                          <input
                            type="number"
                            min={0}
                            value={itemAmount === 0 ? '' : itemAmount}
                            placeholder="0"
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              handleUpdateItemAmount(item.id, val);
                            }}
                            className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none text-right"
                          />
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

            {/* Desktop View: Full Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-10 font-bold">#</th>
                    <th className="py-3 px-4 font-bold">Item Description &amp; Specifications</th>
                    <th className="py-3 px-3 text-center w-28 font-bold">Qty / Unit</th>
                    <th className="py-3 px-3 text-right w-32 font-bold">Rate (₹)</th>
                    <th className="py-3 px-4 text-right w-40 font-bold">Amount (₹)</th>
                    <th className="py-3 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {quotation.lineItems.map((item, index) => {
                    const itemAmount = getItemAmount(item);
                    const isLegacyDummy = item.description === 'Setup Equipment / Service description';
                    const displayDesc = isLegacyDummy ? '' : item.description;

                    return (
                      <tr key={item.id} className={index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-3 px-4">
                          <textarea
                            rows={1}
                            value={displayDesc}
                            placeholder="Setup Equipment / Service description"
                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                              const t = e.currentTarget;
                              t.style.height = 'auto';
                              t.style.height = t.scrollHeight + 'px';
                            }}
                            className="w-full resize-none font-medium text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                          />
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400">SAC:</span>
                            <input
                              value={item.hsnSac || ''}
                              placeholder="9973"
                              onChange={(e) => handleUpdateItem(item.id, 'hsnSac', e.target.value)}
                              className="text-[10px] font-mono w-16 text-slate-500 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:outline-none placeholder:text-slate-400"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity === 0 ? '' : item.quantity}
                            placeholder="1"
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            onBlur={() => {
                              if (!item.quantity || item.quantity <= 0) handleUpdateItem(item.id, 'quantity', 1);
                            }}
                            className="w-16 text-center font-bold text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none mx-auto block"
                          />
                          <input
                            value={item.unit || ''}
                            placeholder="Unit"
                            onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                            className="text-[10px] text-center text-slate-400 w-16 bg-transparent border-0 hover:border-slate-200 focus:outline-none mx-auto block mt-0.5 placeholder:text-slate-300"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            value={item.rate === 0 ? '' : (item.rate ?? '')}
                            placeholder="0"
                            onChange={(e) => handleUpdateItem(item.id, 'rate', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            className="w-24 text-right font-medium text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded px-2 py-1.5 focus:outline-none ml-auto block placeholder:text-slate-400 transition-colors"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 ml-auto">
                            <span className="text-slate-400 text-xs font-semibold">₹</span>
                            <input
                              type="number"
                              min={0}
                              value={itemAmount === 0 ? '' : itemAmount}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                handleUpdateItemAmount(item.id, val);
                              }}
                              className="w-28 text-right font-bold text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const computed = Math.round((item.quantity || 1) * (item.rate || 0) * 100) / 100;
                                handleUpdateItemAmount(item.id, computed);
                                toast.info(`Calculated: ${(item.quantity || 1)} × ₹${(item.rate || 0)} = ₹${computed}`);
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Auto-calculate this line: Qty × Rate"
                            >
                              <Zap size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {quotation.lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span>Add Custom Line Item</span>
            </button>

          </div>

          {/* Optional Modules Toolbar: UPI QR & Payment Ledger Switches */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Optional Add-on Features:
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              
              {/* UPI QR Switch */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                <QrCode size={13} className={isQrEnabled ? 'text-blue-600' : 'text-slate-400'} />
                <span className="text-xs font-semibold text-slate-700">UPI QR Code</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isQrEnabled}
                  onClick={() => {
                    const next = !isQrEnabled;
                    onChange({ ...quotation, enableUpiQr: next });
                    toast.info(`UPI QR Code ${next ? 'enabled' : 'disabled'}`);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isQrEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isQrEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Client Enters Amount Switch (Optional: Available when UPI QR is enabled) */}
              {isQrEnabled && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs animate-in fade-in duration-200">
                  <Smartphone size={13} className={allowCustomerEditQrAmount ? 'text-indigo-600' : 'text-slate-400'} />
                  <span className="text-xs font-semibold text-slate-700">Client Enters Amount</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowCustomerEditQrAmount}
                    onClick={() => {
                      const next = !allowCustomerEditQrAmount;
                      onChange({ ...quotation, allowCustomerEditQrAmount: next });
                      toast.info(next ? 'Client can now enter any amount at their end upon scanning QR' : 'QR payment amount is now fixed');
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      allowCustomerEditQrAmount ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    title="Allow client to enter any payment amount at their end when scanning QR"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        allowCustomerEditQrAmount ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Advance & Payment Ledger Switch */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                <CreditCard size={13} className={isLedgerEnabled ? 'text-emerald-600' : 'text-slate-400'} />
                <span className="text-xs font-semibold text-slate-700">Advance Ledger</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isLedgerEnabled}
                  onClick={() => {
                    const next = !isLedgerEnabled;
                    onChange({
                      ...quotation,
                      enablePaymentLedger: next,
                      advancePercentage: quotation.advancePercentage ?? 70,
                      advanceAmount: Math.round((grandTotal * (quotation.advancePercentage ?? 70)) / 100),
                    });
                    toast.info(`Advance & Payment Ledger ${next ? 'enabled' : 'disabled'}`);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isLedgerEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isLedgerEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>

          {/* Calculations & Bank Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            
            {/* Left: Bank Info, Optional Dynamic UPI QR & Optional Payment Ledger */}
            <div className="space-y-4">
              
              {/* Bank Details & Optional Live UPI QR Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <QrCode size={14} className={isQrEnabled ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Bank {isQrEnabled ? '& Instant UPI QR' : 'Details'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onChange({ ...quotation, enableUpiQr: !isQrEnabled })}
                      className="text-[11px] font-bold text-slate-500 hover:text-blue-600"
                    >
                      {isQrEnabled ? 'Hide QR' : '+ Add QR'}
                    </button>
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      Edit Info
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {/* Bank Text Details */}
                  <div className="text-xs space-y-1 text-slate-700 flex-1">
                    <div><span className="text-slate-400 font-medium">A/C Name:</span> <strong>{quotation.company.bankDetails.accountName || quotation.company.name}</strong></div>
                    <div><span className="text-slate-400 font-medium">Bank:</span> <strong>{quotation.company.bankDetails.bankName || 'Not Set'}</strong></div>
                    <div><span className="text-slate-400 font-medium">Account No:</span> <span className="font-mono font-bold text-slate-900">{quotation.company.bankDetails.accountNumber || '—'}</span></div>
                    <div><span className="text-slate-400 font-medium">IFSC Code:</span> <span className="font-mono font-bold text-slate-900">{quotation.company.bankDetails.ifscCode || '—'}</span></div>
                    {quotation.company.bankDetails.upiId ? (
                      <div className="text-blue-700 font-semibold pt-0.5">
                        <span className="text-slate-400 font-medium">UPI ID:</span> <span className="font-mono">{quotation.company.bankDetails.upiId}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-600">
                        Add UPI ID in Settings to enable Scan &amp; Pay QR
                      </div>
                    )}
                  </div>

                  {/* Live UPI QR Code Preview (Shown only when isQrEnabled is ON) */}
                  {isQrEnabled && liveQrUrl ? (
                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-blue-200 shadow-sm shrink-0 min-w-[175px] space-y-2">
                      <img
                        src={liveQrUrl}
                        alt="UPI Payment QR Code"
                        className="w-24 h-24 object-contain rounded"
                      />

                      {/* Switch-Based Mode: Open Amount (Client Enters Amount) vs Fixed Amount */}
                      <div className="w-full pt-1.5 border-t border-slate-100 flex flex-col items-center space-y-1.5">
                        <label className="flex items-center justify-between w-full text-[10px] font-bold text-slate-600 cursor-pointer">
                          <span title="When enabled, client can type custom payment amount at their end on PhonePe/GPay">Client Enters Amount</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={allowCustomerEditQrAmount}
                            onClick={() => {
                              const next = !allowCustomerEditQrAmount;
                              onChange({ ...quotation, allowCustomerEditQrAmount: next });
                              toast.info(next ? 'Client can now enter any amount upon scanning QR' : 'QR payment amount is now fixed');
                            }}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              allowCustomerEditQrAmount ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                allowCustomerEditQrAmount ? 'translate-x-3' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </label>

                        {allowCustomerEditQrAmount ? (
                          <div className="w-full text-center bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-1 rounded-md border border-indigo-200">
                            ✍️ Open Amount (Client Enters)
                          </div>
                        ) : (
                          <div className="w-full space-y-1">
                            {/* Editable QR Amount Input */}
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 shadow-2xs focus-within:border-blue-500 focus-within:bg-white">
                              <span className="text-[11px] font-bold text-slate-500 mr-1">₹</span>
                              <input
                                type="number"
                                min={0}
                                value={quotation.customQrAmount !== undefined && quotation.customQrAmount > 0 ? quotation.customQrAmount : targetQrAmount}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value) || 0;
                                  onChange({
                                    ...quotation,
                                    customQrAmount: val,
                                    qrAmountType: 'custom',
                                  });
                                }}
                                className="w-full text-center font-black text-xs text-slate-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                title="Edit fixed QR payment amount manually"
                              />
                              <PenLine size={11} className="text-slate-400 shrink-0 ml-0.5" />
                            </div>

                            {/* Preset Buttons: Auto Total vs Advance */}
                            <div className="flex items-center justify-center gap-1 text-[9px] pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onChange({
                                    ...quotation,
                                    customQrAmount: undefined,
                                    qrAmountType: 'total',
                                  });
                                  toast.info('QR amount reset to Total Payable');
                                }}
                                className={`px-2 py-0.5 rounded font-bold border transition-colors ${
                                  !quotation.customQrAmount && qrAmountType === 'total'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                                title="Snap QR amount to full quotation total"
                              >
                                Auto Total
                              </button>

                              {isLedgerEnabled && effectiveAdvanceAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onChange({
                                      ...quotation,
                                      customQrAmount: undefined,
                                      qrAmountType: 'advance',
                                    });
                                    toast.info('QR amount set to Advance Milestone');
                                  }}
                                  className={`px-2 py-0.5 rounded font-bold border transition-colors ${
                                    !quotation.customQrAmount && qrAmountType === 'advance'
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                  title="Snap QR amount to advance milestone"
                                >
                                  Advance
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <span className="text-[9px] text-slate-400 font-medium">
                        PhonePe • GPay • Paytm
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Optional Advance & Milestone Payment Tracking Ledger */}
              {isLedgerEnabled ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={14} className="text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Advance Milestone &amp; Payment Ledger
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        (quotation.paymentStatus || 'unpaid') === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : (quotation.paymentStatus || 'unpaid') === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {quotation.paymentStatus || 'unpaid'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onChange({ ...quotation, enablePaymentLedger: false })}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-600 ml-1"
                        title="Disable Advance Ledger"
                      >
                        Hide
                      </button>
                    </div>
                  </div>

                  {/* Milestone % Quick Selector */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Advance Requirement:</span>
                      <span className="font-bold text-slate-900">
                        {advancePercentage}% (₹{effectiveAdvanceAmount.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[30, 50, 70, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const amt = Math.round((grandTotal * pct) / 100);
                            onChange({
                              ...quotation,
                              advancePercentage: pct,
                              advanceAmount: amt,
                              paymentTerms: `${pct}% Advance with Confirmation | ${100 - pct}% Prior to Event Setup`,
                            });
                          }}
                          className={`text-[11px] font-bold py-1 px-2.5 rounded-lg border transition-all ${
                            advancePercentage === pct
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1 ml-auto shadow-2xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={advancePercentage}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                            const amt = Math.round((grandTotal * val) / 100);
                            onChange({ ...quotation, advancePercentage: val, advanceAmount: amt });
                          }}
                          className="w-11 text-right text-xs font-bold text-slate-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-xs text-slate-500 font-bold ml-1">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Tracking Entry Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Amount Paid (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={quotation.paidAmount === 0 ? '' : (quotation.paidAmount ?? '')}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          const newStatus: PaymentStatus = val >= grandTotal && grandTotal > 0
                            ? 'paid'
                            : val > 0
                            ? 'partial'
                            : 'unpaid';
                          onChange({
                            ...quotation,
                            paidAmount: val,
                            paymentStatus: newStatus,
                          });
                        }}
                        className="w-full text-xs font-bold text-emerald-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Payment Mode
                      </label>
                      <select
                        value={quotation.paymentMode || 'upi'}
                        onChange={(e) => onChange({ ...quotation, paymentMode: e.target.value as PaymentMode })}
                        className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="upi">UPI / QR</option>
                        <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Payment Reference / UTR / Cheque No
                      </label>
                      <input
                        value={quotation.transactionRef || ''}
                        placeholder="e.g. UTR #428901239 or Cheque #004521"
                        onChange={(e) => onChange({ ...quotation, transactionRef: e.target.value })}
                        className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Milestone Terms Line
                    </label>
                    <input
                      value={quotation.paymentTerms || ''}
                      placeholder="e.g. 50% Advance with PO | 50% on event setup"
                      onChange={(e) => onChange({ ...quotation, paymentTerms: e.target.value })}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 focus:outline-blue-500 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              ) : null}

            </div>

            {/* Right: Calculations Breakdown & Payable Ledger */}
            <div className="space-y-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                
                {/* Subtotal */}
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Discount (₹):</span>
                  <input
                    type="number"
                    min={0}
                    value={quotation.discountAmount === 0 ? '' : quotation.discountAmount}
                    placeholder="0"
                    onChange={(e) =>
                      onChange({ ...quotation, discountAmount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })
                    }
                    className="w-24 text-right font-medium text-emerald-600 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-500 placeholder:text-slate-400"
                  />
                </div>

                {/* GST Settings */}
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Tax:</span>
                    <select
                      value={quotation.taxScheme || 'cgst_sgst'}
                      onChange={(e) => {
                        const scheme = e.target.value as TaxScheme;
                        let rate = 18;
                        if (scheme === 'none') rate = 0;
                        if (scheme === 'gst_12') rate = 12;
                        if (scheme === 'gst_5') rate = 5;
                        onChange({ ...quotation, taxScheme: scheme, taxRate: rate });
                      }}
                      className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700"
                    >
                      <option value="cgst_sgst">CGST + SGST (18% Intra-State)</option>
                      <option value="igst">IGST (18% Inter-State)</option>
                      <option value="gst_12">GST (12%)</option>
                      <option value="custom">Custom Tax %</option>
                      <option value="none">Zero Tax (0%)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    {quotation.taxScheme === 'custom' && (
                      <input
                        type="number"
                        min={0}
                        value={quotation.taxRate === 0 ? '' : quotation.taxRate}
                        placeholder="18"
                        onChange={(e) =>
                          onChange({ ...quotation, taxRate: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })
                        }
                        className="w-12 text-right border border-slate-200 rounded px-1 text-xs"
                      />
                    )}
                    <span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Shipping & Logistics */}
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Logistics & Transportation (₹):</span>
                  <input
                    type="number"
                    min={0}
                    value={quotation.shippingCharges === 0 ? '' : quotation.shippingCharges}
                    placeholder="0"
                    onChange={(e) =>
                      onChange({ ...quotation, shippingCharges: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })
                    }
                    className="w-24 text-right font-medium text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-500 placeholder:text-slate-400"
                  />
                </div>

                {/* Adjustment / Round-off */}
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Adjustment / Round-off (+/- ₹):</span>
                  <input
                    type="number"
                    value={quotation.adjustmentAmount === 0 || quotation.adjustmentAmount === undefined ? '' : quotation.adjustmentAmount}
                    placeholder="0"
                    onChange={(e) =>
                      onChange({ ...quotation, adjustmentAmount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })
                    }
                    className="w-24 text-right font-medium text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-500 placeholder:text-slate-400"
                  />
                </div>

                {/* Total Payable */}
                <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-sm space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider">Total Payable:</span>
                    <span className="text-xl font-black">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-[10px] text-blue-200/90 font-medium italic pt-1 border-t border-slate-800 leading-tight">
                    {amountToWordsIndian(grandTotal)}
                  </div>
                </div>

                {/* Milestone & Payment Breakdown Box (Optional - shown only when isLedgerEnabled is ON) */}
                {isLedgerEnabled && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>Advance Milestone ({advancePercentage}%):</span>
                      <span className="font-bold text-slate-800">
                        ₹{effectiveAdvanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>Balance on Event Setup:</span>
                      <span className="font-medium text-slate-700">
                        ₹{Math.max(0, grandTotal - effectiveAdvanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {paidAmount > 0 && (
                      <div className="flex justify-between items-center text-xs text-emerald-700 pt-1 border-t border-dashed border-slate-200">
                        <span className="font-semibold">Amount Received:</span>
                        <span className="font-bold">
                          -₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {/* Final Balance Due Card */}
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-bold ${
                      balanceDue === 0 && grandTotal > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : paidAmount > 0
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-blue-50 text-blue-900 border-blue-200'
                    }`}>
                      <span className="uppercase tracking-wider text-[11px]">
                        {balanceDue === 0 && grandTotal > 0 ? 'Fully Paid' : 'Net Balance Due:'}
                      </span>
                      <span className="text-sm font-black font-mono">
                        ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* B2B GST Tax Breakdown (HSN / SAC Summary Table) */}
          {(() => {
            const gstBreakdown = computeGstTaxBreakdown(quotation);
            if (!gstBreakdown.hasTax) return null;
            return (
              <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Receipt size={14} className="text-blue-600" />
                    <span>Tax Invoice GST Breakdown (HSN / SAC Summary)</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                    B2B GST Compliance
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 font-bold text-[11px]">
                        <th className="py-2.5 px-3">HSN / SAC</th>
                        <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                        {gstBreakdown.isSplitTax ? (
                          <>
                            <th className="py-2.5 px-3 text-right">CGST Rate</th>
                            <th className="py-2.5 px-3 text-right">CGST Amt (₹)</th>
                            <th className="py-2.5 px-3 text-right">SGST Rate</th>
                            <th className="py-2.5 px-3 text-right">SGST Amt (₹)</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2.5 px-3 text-right">IGST Rate</th>
                            <th className="py-2.5 px-3 text-right">IGST Amt (₹)</th>
                          </>
                        )}
                        <th className="py-2.5 px-3 text-right font-black">Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gstBreakdown.rows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.hsnSac}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">₹{r.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          {gstBreakdown.isSplitTax ? (
                            <>
                              <td className="py-2.5 px-3 text-right text-slate-500">{r.cgstRate}%</td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">₹{(r.cgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="py-2.5 px-3 text-right text-slate-500">{r.sgstRate}%</td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">₹{(r.sgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 px-3 text-right text-slate-500">{r.igstRate}%</td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">₹{(r.igstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </>
                          )}
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{r.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/80 font-bold text-slate-900 border-t border-slate-200">
                        <td className="py-2.5 px-3">Total</td>
                        <td className="py-2.5 px-3 text-right">₹{gstBreakdown.totalTaxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        {gstBreakdown.isSplitTax ? (
                          <>
                            <td></td>
                            <td className="py-2.5 px-3 text-right">₹{gstBreakdown.totalCgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td></td>
                            <td className="py-2.5 px-3 text-right">₹{gstBreakdown.totalSgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </>
                        ) : (
                          <>
                            <td></td>
                            <td className="py-2.5 px-3 text-right">₹{gstBreakdown.totalIgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </>
                        )}
                        <td className="py-2.5 px-3 text-right font-black text-blue-700">₹{gstBreakdown.totalTaxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Terms & Conditions */}
          <div className="border-t-2 border-slate-200 pt-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Terms &amp; Conditions</h3>
              
              {/* Template Presets Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Load Template:</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const preset = TERMS_PRESETS.find((p) => p.id === e.target.value);
                    if (preset) {
                      onChange({ ...quotation, notes: preset.terms });
                      toast.success(`Loaded "${preset.title}" template`);
                      e.target.value = '';
                    }
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-medium cursor-pointer shadow-2xs"
                >
                  <option value="" disabled>Select Terms Preset...</option>
                  {TERMS_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              rows={6}
              value={quotation.notes}
              onChange={(e) => onChange({ ...quotation, notes: e.target.value })}
              className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 focus:outline-blue-500 leading-relaxed font-sans"
            />
          </div>

          {/* Client Sign-Off & Digital Signature Section */}
          <div className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool size={15} className="text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Client Acceptance &amp; Sign-Off
                </h4>
              </div>
              {quotation.clientSignature ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={12} />
                  Digitally Signed &amp; Accepted
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Awaiting Client Signature
                </span>
              )}
            </div>

            {quotation.clientSignature ? (
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-3">
                  <img
                    src={quotation.clientSignature.dataUrl}
                    alt="Client Signature"
                    className="h-12 max-w-[140px] object-contain bg-slate-50 p-1 rounded border border-slate-200"
                  />
                  <div className="text-xs text-slate-700">
                    <div className="font-bold text-slate-900">{quotation.clientSignature.signerName || 'Client Signatory'}</div>
                    {quotation.clientSignature.signerPhone && (
                      <div className="text-[11px] text-slate-500">{quotation.clientSignature.signerPhone}</div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Signed on {new Date(quotation.clientSignature.signedAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                  >
                    Change Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...quotation, clientSignature: undefined });
                      toast.info('Client signature removed');
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove signature"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-dashed border-slate-300">
                <div className="text-xs text-slate-500 text-center sm:text-left">
                  Capture client signature on touchscreen or mouse, or upload a signed sign-off image. Embeds directly into official PDF.
                </div>
                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  <PenTool size={14} />
                  <span>Capture Client Signature</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modals */}
      <LedCalculatorModal
        isOpen={isLedCalcOpen}
        onClose={() => setIsLedCalcOpen(false)}
        onAddLineItem={(item) => {
          onChange({ ...quotation, lineItems: [...quotation.lineItems, item] });
          toast.success('LED screen calculation added to quotation');
        }}
      />

      <CatalogPickerModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onAddItems={(items) => {
          onChange({ ...quotation, lineItems: [...quotation.lineItems, ...items] });
        }}
      />

      <ShareQuotationModal
        quotation={quotation}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={(sig) => {
          onChange({
            ...quotation,
            clientSignature: sig,
            status: sig && quotation.status === 'draft' ? 'approved' : quotation.status,
          });
          if (sig) {
            toast.success('Client signature captured and applied!');
          }
        }}
        existingSignature={quotation.clientSignature}
        clientName={quotation.client?.name}
        clientPhone={quotation.client?.phone}
      />

    </div>
  );
};
