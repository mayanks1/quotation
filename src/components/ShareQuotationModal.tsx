import React, { useState } from 'react';
import { 
  X, Share2, FileText, Download, Copy, Check, 
  MessageSquare, ExternalLink, Loader2, Smartphone, 
  AlertCircle, ChevronDown, ChevronUp, IndianRupee 
} from 'lucide-react';
import { Quotation } from '../types/quotation';
import { formatQuotationWhatsAppText, generateWhatsAppShareUrl, generateWhatsAppPdfNoticeUrl } from '../services/whatsapp';
import { generateQuotationPDFFile, exportQuotationPDF } from '../services/pdfGenerator';
import { useToast } from '../context/ToastContext';

interface Props {
  quotation: Quotation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareQuotationModal: React.FC<Props> = ({
  quotation,
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const [customPhone, setCustomPhone] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync phone from quotation when opened
  React.useEffect(() => {
    if (quotation) {
      setCustomPhone(quotation.client?.phone || '');
    }
  }, [quotation]);

  if (!isOpen || !quotation) return null;

  const subtotal = quotation.lineItems.reduce((acc, i) => acc + i.quantity * i.rate, 0);
  const discounted = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const tax = (discounted * (quotation.taxRate || 0)) / 100;
  const grandTotal = discounted + tax + (quotation.shippingCharges || 0);

  const formattedText = formatQuotationWhatsAppText(quotation);

  // 1. Share PDF Document (Mobile Native Web Share API or Desktop Download + WhatsApp)
  const handleSharePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const { file, filename } = await generateQuotationPDFFile(quotation);

      // Check if native Web Share with files is supported (Android, iOS Safari/Chrome, macOS)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Quotation ${quotation.quotationNumber}`,
            text: `Official Quotation ${quotation.quotationNumber} - ${quotation.company.name}`,
          });
          toast.success('Shared successfully via native share!');
          onClose();
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            // User cancelled share picker
            return;
          }
          console.warn('Native share error, falling back:', shareErr);
        }
      }

      // Desktop / Non-WebShare Fallback:
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
      const waUrl = generateWhatsAppPdfNoticeUrl(quotation, filename, customPhone);
      window.open(waUrl, '_blank');

      toast.success(`PDF downloaded as "${filename}". Opening WhatsApp to attach file!`);
      onClose();
    } catch (err) {
      console.error('PDF share error:', err);
      toast.error('Failed to generate PDF for sharing. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Direct Download PDF
  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      await exportQuotationPDF(quotation);
      toast.success(`PDF downloaded for ${quotation.quotationNumber}`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // 3. Share Plain Text Summary via WhatsApp
  const handleShareText = () => {
    const waUrl = generateWhatsAppShareUrl(quotation, customPhone);
    window.open(waUrl, '_blank');
    toast.info('Opening WhatsApp with quotation text summary...');
    onClose();
  };

  // 4. Copy Text Breakdown to Clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      toast.success('Quotation summary copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Failed to copy text.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Share Quotation</h3>
              <p className="text-xs text-slate-500 font-mono">
                {quotation.quotationNumber} • <span className="font-semibold text-slate-700">{quotation.client?.name || 'Client'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-slate-700">
          
          {/* Quick Info Chip */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Payable</div>
              <div className="text-lg font-black text-slate-900 flex items-center mt-0.5">
                <IndianRupee size={16} className="-mr-0.5" />
                {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="font-semibold text-slate-700">{quotation.lineItems.length} setup item{quotation.lineItems.length !== 1 ? 's' : ''}</span>
              {quotation.eventDate && (
                <div className="text-blue-600 font-medium text-[11px] mt-0.5">Event: {quotation.eventDate}</div>
              )}
            </div>
          </div>

          {/* Recipient Phone Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Client WhatsApp Number</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="tel"
                placeholder="e.g. 9876543210 (or leave blank to select in WhatsApp)"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Entering phone opens chat with this number directly. If left empty, WhatsApp contact picker opens.
            </p>
          </div>

          {/* Sharing Options Title */}
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-1">
            Choose Sharing Format:
          </div>

          {/* Option A: PDF Sharing */}
          <div className="p-3.5 sm:p-4 rounded-xl border-2 border-blue-500/20 bg-blue-50/40 hover:bg-blue-50/70 transition-all space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-extrabold text-sm text-slate-900">Official PDF Document</h4>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-600 text-white uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Sends full branded PDF document with company letterhead, terms, and signature. On mobile phones, this attaches directly into WhatsApp!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSharePDF}
                disabled={isGeneratingPdf}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Preparing PDF...</span>
                  </>
                ) : (
                  <>
                    <Share2 size={14} />
                    <span>Share PDF Document</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloadingPdf}
                title="Download PDF to computer"
                className="flex items-center justify-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg text-xs font-bold transition-all"
              >
                {isDownloadingPdf ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>

          {/* Option B: WhatsApp Text Summary */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                <MessageSquare size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-sm text-slate-900">Simple Text Breakdown</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Instant message with line items, setup scope, pricing summary, and bank/UPI details directly in WhatsApp chat text.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareText}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
              >
                <Share2 size={14} />
                <span>Send on WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                title="Copy formatted text to clipboard"
                className="flex items-center justify-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg text-xs font-bold transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Text Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full p-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 flex items-center justify-between"
            >
              <span>Preview WhatsApp Text Message</span>
              {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showPreview && (
              <div className="p-3 bg-white border-t border-slate-100">
                <pre className="text-[11px] leading-relaxed text-slate-800 font-sans whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-40 overflow-y-auto">
                  {formattedText}
                </pre>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
