import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Download,
  Printer,
  ExternalLink,
  Share2,
  CheckCircle2,
  Receipt as ReceiptIcon,
  FileText,
  Calendar,
  Building2,
  CreditCard,
  AlertCircle,
  Clock,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { PaymentReceipt, ReceiptMilestone } from '../types/receipt';
import { PaymentMode } from '../types/quotation';
import { amountToWordsIndian } from '../utils/numberToWords';
import { OFFICIAL_TISHA_STAMP } from '../config/officialStamp';
import { DEFAULT_COMPANY } from '../config/defaults';
import { generateReceiptPDFDoc, printReceipt } from '../services/receiptPdfGenerator';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { storage } from '../services/storage';
import { generateWhatsAppReceiptPdfNoticeUrl, formatPaymentReceiptWhatsAppText } from '../services/whatsapp';
import { useToast } from '../context/ToastContext';
import { getPublicQuoteUrl } from '../utils/appUrl';
import { formatDisplayDate } from '../utils/receiptHelper';

export const PublicReceiptView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadReceipt = async () => {
      try {
        const receiptNumberParam = searchParams.get('rec') || id || '';
        const clientParam = searchParams.get('client') || '';
        const amtParam = searchParams.get('amt');
        const dueParam = searchParams.get('due');
        const dateParam = searchParams.get('date');
        const modeParam = (searchParams.get('mode') as PaymentMode) || 'bank_transfer';
        const milestoneParam = (searchParams.get('milestone') as ReceiptMilestone) || 'full';
        const refParam = searchParams.get('ref') || '';
        const quoteParam = searchParams.get('q') || '';
        const invParam = searchParams.get('inv') || '';
        const venueParam = searchParams.get('venue') || '';
        const eventDateParam = searchParams.get('eventDate') || '';
        const notesParam = searchParams.get('notes') || '';

        // 1. Initial quick build from URL query parameters (instant 0ms render for clients scanning QR)
        let initialReceipt: PaymentReceipt | null = null;
        if (clientParam || amtParam !== null || receiptNumberParam) {
          const amt = amtParam !== null ? parseFloat(amtParam) : 0;
          const due = dueParam !== null ? parseFloat(dueParam) : 0;

          initialReceipt = {
            id: `rec-${receiptNumberParam || Date.now()}`,
            receiptNumber: receiptNumberParam || 'REC-OFFICIAL',
            receiptDate: dateParam || new Date().toISOString().split('T')[0],
            quotationId: quoteParam,
            quotationNumber: quoteParam,
            invoiceNumber: invParam || undefined,
            client: {
              name: clientParam || 'Valued Client',
              company: clientParam || '',
              phone: searchParams.get('phone') || '',
              email: searchParams.get('email') || '',
              address: searchParams.get('address') || '',
            },
            company: {
              ...DEFAULT_COMPANY,
              signature: OFFICIAL_TISHA_STAMP,
            },
            amountPaid: isNaN(amt) ? 0 : amt,
            paymentMode: modeParam,
            transactionRef: refParam || undefined,
            paymentMilestone: milestoneParam,
            totalPayable: (isNaN(amt) ? 0 : amt) + (isNaN(due) ? 0 : due),
            previousPaid: 0,
            remainingBalance: isNaN(due) ? 0 : due,
            venue: venueParam || undefined,
            eventDate: eventDateParam || undefined,
            notes: notesParam || undefined,
            createdAt: new Date().toISOString(),
          };

          if (isMounted) {
            setReceipt(initialReceipt);
            setIsLoading(false);
          }
        }

        // 2. Fetch enriched details from LocalStorage or Supabase
        await storage.initialize?.();
        const savedCompany = storage.getCompanyProfile?.() || DEFAULT_COMPANY;
        const cleanReceiptNum = (receiptNumberParam || '').toUpperCase().trim();
        const cleanId = cleanReceiptNum.replace(/^REC-?/i, '').replace(/^[0-9]+-?/i, '');

        let enrichedReceipt = initialReceipt;

        // Try Supabase payment_ledger query if configured
        if (isSupabaseConfigured() && supabase) {
          try {
            const { data: ledgerRows, error } = await supabase
              .from('payment_ledger')
              .select('*')
              .or(`id.ilike.%${cleanId}%,invoice_number.eq.${cleanReceiptNum},invoice_number.eq.${invParam || 'NONE'}`)
              .limit(1);

            if (!error && ledgerRows && ledgerRows.length > 0) {
              const row = ledgerRows[0];
              const paidAmt = row.status === 'Received' ? (row.amount || 0) : (row.paid_amount || row.paidAmount || 0);
              const totalAmt = row.amount || 0;
              const pendingAmt = row.status === 'Received' ? 0 : (row.pending_amount || row.pendingAmount || Math.max(0, totalAmt - paidAmt));

              enrichedReceipt = {
                id: row.id || `rec-${cleanReceiptNum}`,
                receiptNumber: cleanReceiptNum || `REC-${new Date().getFullYear()}-${cleanId || '001'}`,
                receiptDate: row.date || dateParam || new Date().toISOString().split('T')[0],
                quotationId: row.linked_quotation_id || row.linkedQuotationId || quoteParam,
                quotationNumber: quoteParam || row.invoice_number || '',
                invoiceNumber: invParam || row.invoice_number || undefined,
                client: {
                  name: row.client || clientParam || 'Valued Client',
                  company: row.client || '',
                  phone: initialReceipt?.client.phone || '',
                  email: initialReceipt?.client.email || '',
                  address: initialReceipt?.client.address || '',
                },
                company: {
                  ...savedCompany,
                  signature: savedCompany.signature || OFFICIAL_TISHA_STAMP,
                },
                amountPaid: paidAmt || initialReceipt?.amountPaid || 0,
                paymentMode: (row.payment_mode || row.paymentMode || modeParam) as PaymentMode,
                transactionRef: row.transaction_ref || row.transactionRef || refParam || undefined,
                paymentMilestone: row.status === 'Received' ? 'full' : milestoneParam,
                totalPayable: totalAmt || initialReceipt?.totalPayable || paidAmt,
                previousPaid: 0,
                remainingBalance: pendingAmt,
                notes: row.note || notesParam || (row.size ? `Event Screen: ${row.size}` : undefined),
                createdAt: row.created_at || new Date().toISOString(),
              };
            }
          } catch (err) {
            console.warn('Supabase ledger lookup note:', err);
          }
        }

        // If quotation number is present, fetch quotation details for complete cross-reference
        const quoteRef = enrichedReceipt?.quotationNumber || quoteParam;
        if (quoteRef && isSupabaseConfigured() && supabase) {
          try {
            const { data: qData } = await supabase
              .from('quotations')
              .select('*')
              .or(`id.eq.${quoteRef},quotation_number.ilike.${quoteRef}`)
              .maybeSingle();

            if (qData && enrichedReceipt) {
              enrichedReceipt = {
                ...enrichedReceipt,
                quotationNumber: qData.quotation_number || enrichedReceipt.quotationNumber,
                invoiceNumber: qData.invoice_number || enrichedReceipt.invoiceNumber,
                venue: enrichedReceipt.venue || qData.venue,
                eventDate: enrichedReceipt.eventDate || qData.event_date,
                client: {
                  name: qData.client?.name || enrichedReceipt.client.name,
                  company: qData.client?.company || enrichedReceipt.client.company,
                  phone: qData.client?.phone || enrichedReceipt.client.phone,
                  email: qData.client?.email || enrichedReceipt.client.email,
                  address: qData.client?.address || enrichedReceipt.client.address,
                },
              };
            }
          } catch (e) {}
        }

        if (isMounted) {
          if (enrichedReceipt) {
            setReceipt(enrichedReceipt);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load public receipt:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadReceipt();
    return () => {
      isMounted = false;
    };
  }, [id, searchParams]);

  const handleDownloadPdf = async () => {
    if (!receipt || isExporting) return;
    setIsExporting(true);
    try {
      const { pdf, filename } = await generateReceiptPDFDoc(receipt);
      pdf.save(filename);
      toast.success(`Downloaded Official Receipt ${receipt.receiptNumber}`);
    } catch (err) {
      console.error('Failed to export PDF receipt:', err);
      toast.error('Failed to download PDF receipt.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!receipt) return;
    printReceipt(receipt);
  };

  const handleShareWhatsApp = () => {
    if (!receipt) return;
    const text = formatPaymentReceiptWhatsAppText(receipt);
    const cleanPhone = (receipt.client?.phone || '').replace(/[^0-9]/g, '');
    const fullNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const encoded = encodeURIComponent(text);
    const url = fullNumber ? `https://wa.me/${fullNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Public verification link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 font-medium tracking-wide">
            Verifying Official Digital Record...
          </p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="max-w-md w-full bg-neutral-900/90 p-8 rounded-2xl border border-neutral-800 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">Official Record Not Found</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            The verification reference link may be incomplete or invalid. Please check your official receipt voucher or contact Tisha LED Walls.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
            >
              <ArrowLeft size={14} />
              <span>Go to Sign In Portal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fmt = (n: number) =>
    '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const stampImg = receipt.company.signature || OFFICIAL_TISHA_STAMP;
  const isSettled = receipt.remainingBalance <= 0;
  const quoteRef = receipt.quotationNumber;
  const invoiceRef = receipt.invoiceNumber;

  const modeLabels: Record<string, string> = {
    upi: 'UPI Electronic Clearance',
    bank_transfer: 'Bank Transfer (NEFT / RTGS / IMPS)',
    cash: 'Cash Payment',
    cheque: 'Cheque Payment',
    card: 'Credit / Debit Card',
  };

  const milestoneLabels: Record<string, string> = {
    advance: 'Advance Booking Token',
    balance: 'Final Balance Settlement',
    full: 'Full Payment Settlement',
    partial: 'Partial Payment',
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 py-6 sm:py-10 px-3 sm:px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Top Official SaaS Verification Header */}
        <div className="bg-neutral-900/95 border border-emerald-500/30 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight text-white">
                  Official Payment Receipt
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  Verified &amp; Authentic Record
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Direct Ledger Cross-Reference &bull; Ref #{receipt.receiptNumber}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy verification link"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-neutral-700"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              title="Print Receipt"
              className="hidden sm:inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-neutral-700"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              <Download size={14} className={isExporting ? 'animate-bounce' : ''} />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* Linked Proposal / Invoice Notice Banner (If Available) */}
        {quoteRef && (
          <div className="bg-blue-950/40 border border-blue-800/60 p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-blue-200 shadow-md">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-400 shrink-0" />
              <span>
                Linked Proposal Record:{' '}
                <strong className="text-white font-mono">{quoteRef}</strong>
                {invoiceRef && ` (Invoice #${invoiceRef})`}
              </span>
            </div>
            <a
              href={getPublicQuoteUrl(quoteRef)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-blue-400 hover:text-blue-300 underline underline-offset-4 shrink-0 transition-colors"
            >
              <span>View Online Proposal Portal</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* The Printable Official Receipt Card */}
        <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 sm:p-10">

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-900">
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                {receipt.company.name || 'TISHA LED WALLS'}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">
                {receipt.company.tagline || 'Professional LED Video Walls & Stage Setup Solutions'}
              </div>
              <div className="text-[11px] text-slate-600 mt-2 space-y-0.5 leading-snug">
                <div>{receipt.company.address || 'Plot No 183, near Parshuram Bhavan, Jharsa, Sector 39, Gurugram, Haryana 122001'}</div>
                <div>
                  Phone: <strong>{receipt.company.phone || '+91 7703948857'}</strong>
                  {receipt.company.email && ` • Email: ${receipt.company.email}`}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none w-full sm:w-auto border sm:border-0 border-slate-200">
              <div className="inline-block px-3 py-1 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-md shadow-xs">
                Official Receipt
              </div>
              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <div>
                  Receipt No:{' '}
                  <strong className="font-mono text-slate-950 font-extrabold text-sm">
                    {receipt.receiptNumber}
                  </strong>
                </div>
                <div>
                  Receipt Date:{' '}
                  <strong className="text-slate-900 font-bold">{formatDisplayDate(receipt.receiptDate)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Parties & Booking Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-6">
            
            {/* Bill To / Client Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">
                Payment Acknowledged From (Client)
              </div>
              <div className="mt-3">
                <div className="text-base font-black text-slate-950">
                  {receipt.client.name}
                </div>
                {receipt.client.company && receipt.client.company.trim().toLowerCase() !== (receipt.client.name || '').trim().toLowerCase() && (
                  <div className="text-xs text-slate-600 font-bold mt-0.5">
                    {receipt.client.company}
                  </div>
                )}
                <div className="text-xs text-slate-600 mt-2 space-y-1">
                  {receipt.client.phone && <div>Phone: <strong>{receipt.client.phone}</strong></div>}
                  {receipt.client.email && <div>Email: {receipt.client.email}</div>}
                  {receipt.client.address && <div>Address: {receipt.client.address}</div>}
                </div>
              </div>
            </div>

            {/* Payment Particulars */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">
                Payment Particulars
              </div>
              <div className="mt-3 space-y-2 text-xs">
                {(invoiceRef || quoteRef) && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{invoiceRef ? 'Related Invoice:' : 'Related Quotation:'}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {invoiceRef ? `Invoice #${invoiceRef}` : `Quotation #${quoteRef}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-bold text-slate-900">
                    {modeLabels[receipt.paymentMode] || receipt.paymentMode}
                  </span>
                </div>
                {receipt.transactionRef && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Transaction / UTR:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {receipt.transactionRef}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Milestone:</span>
                  <span className="font-bold text-emerald-700">
                    {milestoneLabels[receipt.paymentMilestone] || receipt.paymentMilestone}
                  </span>
                </div>
                {receipt.eventDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Event Date:</span>
                    <span className="font-bold text-slate-900">{formatDisplayDate(receipt.eventDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Highlight Amount Received Box */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="text-[10px] sm:text-[11px] font-black text-emerald-800 uppercase tracking-widest">
                Amount Received &amp; Credited
              </div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-800 tracking-tight mt-1 font-mono">
                {fmt(receipt.amountPaid)}
              </div>
              <div className="text-xs font-semibold text-emerald-700 italic mt-1">
                {amountToWordsIndian(receipt.amountPaid)}
              </div>
            </div>

            <div className="sm:border-l-2 sm:border-emerald-200 sm:pl-6 text-left sm:text-right w-full sm:w-auto">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Net Remaining Balance
              </div>
              <div className={`text-2xl sm:text-3xl font-black font-mono mt-1 ${isSettled ? 'text-emerald-700' : 'text-slate-900'}`}>
                {fmt(receipt.remainingBalance)}
              </div>
              <div className="mt-1">
                {isSettled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    <CheckCircle2 size={12} />
                    Fully Cleared (₹0 Due)
                  </span>
                ) : (
                  <span className="text-xs text-amber-700 font-bold">
                    Balance payable upon setup
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Terms, Verification & Endorsement Section */}
          <div className="border-t-2 border-slate-200 pt-6 mt-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            
            {/* Left: Verification Badge & Terms */}
            <div className="max-w-md space-y-3">
              <div className="text-[10px] text-slate-500 leading-relaxed">
                <strong className="text-slate-700">TERMS &amp; DECLARATION:</strong><br />
                &bull; This receipt is issued subject to realization of funds / online electronic clearance.<br />
                &bull; Equipment dispatch requires balance settlement prior to event setup at venue.<br />
                &bull; This is an authentic computer-generated official receipt issued by {receipt.company.name || 'Tisha LED Walls'}.
                {receipt.notes && (
                  <div className="mt-1.5 text-slate-700">
                    <strong>Note:</strong> {receipt.notes}
                  </div>
                )}
              </div>

              {/* Digital Tamper-Protection Pill */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-[10px]">
                  <div className="font-extrabold text-slate-900 uppercase tracking-wider">
                    Tamper-Protected Official Record
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Authenticated cross-reference &bull; Ref #{receipt.receiptNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Official Stamp & Signature */}
            <div className="text-center w-full md:w-56 pt-4 md:pt-0">
              <div className="h-20 flex items-center justify-center mb-1">
                {stampImg && (
                  <img
                    src={stampImg}
                    alt="Official Rubber Stamp"
                    className="max-h-20 max-w-[190px] object-contain"
                  />
                )}
              </div>
              <div className="border-t border-slate-900 pt-2">
                <div className="text-xs font-black text-slate-950 uppercase">
                  {receipt.company.name || 'TISHA LED WALLS'}
                </div>
                <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                  Authorized Signatory
                </div>
                <div className="mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    ✓ DIGITALLY ENDORSED
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
export default PublicReceiptView;

