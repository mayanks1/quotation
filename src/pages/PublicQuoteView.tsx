import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FileText, Download, ShieldCheck, 
  AlertCircle, ArrowLeft,
  QrCode, ExternalLink, PenTool
} from 'lucide-react';
import { storage } from '../services/storage';
import { Quotation, getItemAmount } from '../types/quotation';
import { exportQuotationPDF } from '../services/pdfGenerator';
import { generateUpiQrDataUrl, buildUpiPaymentUrl } from '../services/upiQr';
import { getQuotationExpiryStatus } from '../utils/quotationExpiry';
import { SignatureModal } from '../components/SignatureModal';
import { useToast } from '../context/ToastContext';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { cloudSync } from '../services/cloudSync';

export const PublicQuoteView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [upiDeepLink, setUpiDeepLink] = useState<string>('');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const loadProposal = async () => {
      try {
        await storage.initialize();
        const all = storage.getAllQuotations();
        let found = all.find((q) => q.id === id || q.quotationNumber.toLowerCase() === id.toLowerCase());

        // If not in local storage (e.g. client viewing on their personal phone/laptop), query Supabase directly
        if (!found && cloudSync.isEnabled() && supabase) {
          const { data, error } = await supabase
            .from('quotations')
            .select('*')
            .or(`id.eq.${id},quotation_number.ilike.${id}`)
            .maybeSingle();

          if (!error && data) {
            found = {
              id: data.id,
              quotationNumber: data.quotation_number,
              quotationDate: data.quotation_date,
              validUntil: data.valid_until,
              eventDate: data.event_date || undefined,
              venue: data.venue || undefined,
              status: data.status,
              company: data.company,
              client: data.client,
              lineItems: data.line_items || [],
              discountAmount: Number(data.discount_amount || 0),
              taxScheme: data.tax_scheme,
              taxRate: Number(data.tax_rate || 18),
              shippingCharges: Number(data.shipping_charges || 0),
              notes: data.notes || '',
              paymentTerms: data.payment_terms || '',
              createdAt: data.created_at || new Date().toISOString(),
              updatedAt: data.updated_at || new Date().toISOString(),
            };
            // Cache in local storage for subsequent views
            storage.saveQuotation(found);
          }
        }

        if (found) {
          setQuotation(found);
        }
      } catch (err) {
        console.error('Error fetching proposal:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProposal();
  }, [id]);

  useEffect(() => {
    if (!quotation) return;
    const calculateTotal = () => {
      const sub = (quotation.lineItems || []).reduce((sum, item) => sum + getItemAmount(item), 0);
      const disc = quotation.discountAmount || 0;
      const taxable = Math.max(0, sub - disc);
      const isZeroTax = quotation.taxScheme === 'none';
      const tax = isZeroTax ? 0 : ((taxable * (quotation.taxRate || 0)) / 100);
      const shipping = quotation.shippingCharges || 0;
      const adjustment = quotation.adjustmentAmount || 0;
      return Math.round(taxable + tax + shipping + adjustment);
    };

    const totalPayable = calculateTotal();
    const effectiveAdvance = quotation.advancePercentage
      ? Math.round((totalPayable * quotation.advancePercentage) / 100)
      : (quotation.advanceAmount || 0);

    const isCustom = quotation.qrAmountType === 'custom' && quotation.customQrAmount !== undefined && quotation.customQrAmount > 0;
    const isAdvance = quotation.qrAmountType === 'advance' && quotation.enablePaymentLedger && effectiveAdvance > 0;

    const targetAmount = quotation.allowCustomerEditQrAmount
      ? undefined
      : isCustom
      ? Math.min(quotation.customQrAmount!, totalPayable > 0 ? totalPayable : quotation.customQrAmount!)
      : isAdvance
      ? effectiveAdvance
      : totalPayable;

    const payeeUpi = quotation.company?.bankDetails?.upiId || 'mayanksaini99-1@okhdfcbank';
    const payeeName = quotation.company?.bankDetails?.accountName || quotation.company?.name || 'Tisha LED Walls';
    const effectiveAmount = targetAmount && targetAmount > 0 ? targetAmount : undefined;

    const link = buildUpiPaymentUrl({
      upiId: payeeUpi,
      payeeName: payeeName,
      amount: effectiveAmount,
      transactionNote: `Payment for ${quotation.quotationNumber}`,
    });
    setUpiDeepLink(link);

    generateUpiQrDataUrl({
      upiId: payeeUpi,
      payeeName: payeeName,
      amount: effectiveAmount,
      transactionNote: `Payment for ${quotation.quotationNumber}`,
    }).then(setQrCodeDataUrl).catch(console.error);
  }, [quotation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-400">Loading proposal details...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="max-w-md w-full bg-neutral-950 p-8 rounded-2xl border border-neutral-800 text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold">Quotation Not Found</h2>
          <p className="text-xs text-neutral-400">
            The quotation link may be invalid or has been archived.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
          >
            <ArrowLeft size={14} />
            <span>Go to Portal Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = (quotation.lineItems || []).reduce((sum, item) => sum + getItemAmount(item), 0);
  const discount = quotation.discountAmount || 0;
  const taxable = Math.max(0, subtotal - discount);
  const isZeroTax = quotation.taxScheme === 'none';
  const tax = isZeroTax ? 0 : ((taxable * (quotation.taxRate || 0)) / 100);
  const grandTotal = Math.round(taxable + tax + (quotation.shippingCharges || 0) + (quotation.adjustmentAmount || 0));
  const advanceAmount = quotation.advancePercentage ? Math.round((grandTotal * quotation.advancePercentage) / 100) : (quotation.advanceAmount || 0);

  const expiry = getQuotationExpiryStatus(quotation.validUntil);

  const handleSaveSignature = (sig: {
    dataUrl: string;
    signedAt: string;
    signerName: string;
    signerPhone?: string;
  }) => {
    const updated: Quotation = {
      ...quotation,
      clientSignature: sig,
      status: 'Approved',
    };
    storage.saveQuotation(updated);
    setQuotation(updated);
    toast.success('Thank you! Quotation digitally accepted and signed.');
  };

  const upiId = quotation.company?.bankDetails?.upiId || 'mayanksaini99-1@okhdfcbank';
  const companyName = quotation.company?.name || 'Tisha LED Walls';

  return (
    <div className="min-h-screen bg-neutral-900 text-slate-100 py-6 sm:py-10 px-3 sm:px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Top Floating Client Action Bar */}
        <div className="bg-neutral-950/90 border border-neutral-800 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white">{quotation.quotationNumber}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  quotation.status === 'Approved'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {quotation.status}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${expiry.badgeClass}`}>
                  {expiry.label}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Client Proposal by <strong className="text-neutral-200">{companyName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!quotation.clientSignature ? (
              <button
                onClick={() => setIsSignModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <PenTool size={14} />
                <span>Accept &amp; Sign</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold">
                <ShieldCheck size={15} />
                <span>Digitally Signed</span>
              </div>
            )}

            <button
              onClick={() => exportQuotationPDF(quotation)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Quotation Document Body */}
        <div className="bg-white text-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10 border border-neutral-200">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
            <div className="flex items-center gap-4">
              {quotation.company?.logo ? (
                <img
                  src={quotation.company.logo}
                  alt={companyName}
                  className="h-16 w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xl">
                  {companyName.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{companyName}</h2>
                {quotation.company?.tagline && (
                  <p className="text-xs text-slate-500">{quotation.company.tagline}</p>
                )}
                {quotation.company?.phone && (
                  <p className="text-xs text-slate-600 mt-1">📞 {quotation.company.phone}</p>
                )}
                {quotation.company?.gstin && (
                  <p className="text-xs text-slate-600">GSTIN: <span className="font-mono font-semibold">{quotation.company.gstin}</span></p>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs uppercase font-extrabold text-blue-600 tracking-wider">Official Quotation</div>
              <div className="text-2xl font-black text-slate-900">{quotation.quotationNumber}</div>
              <div className="text-xs text-slate-500 mt-1">Date: {quotation.quotationDate}</div>
              <div className="text-xs text-slate-500">Valid Until: {quotation.validUntil}</div>
            </div>
          </div>

          {/* Client Details */}
          <div className="my-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Prepared For</div>
              <div className="text-sm font-bold text-slate-900">{quotation.client?.name || 'Valued Client'}</div>
              {quotation.client?.company && (
                <div className="text-xs text-slate-700 font-semibold">{quotation.client.company}</div>
              )}
              {quotation.client?.phone && (
                <div className="text-xs text-slate-500 mt-0.5">Phone: {quotation.client.phone}</div>
              )}
              {quotation.client?.email && (
                <div className="text-xs text-slate-500">Email: {quotation.client.email}</div>
              )}
              {quotation.client?.address && (
                <div className="text-xs text-slate-500 mt-1">{quotation.client.address}</div>
              )}
            </div>

            {(quotation.venue || quotation.eventDate) && (
              <div className="sm:text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Event Information</div>
                {quotation.venue && (
                  <div className="text-xs text-slate-600">Venue: {quotation.venue}</div>
                )}
                {quotation.eventDate && (
                  <div className="text-xs text-slate-500 mt-0.5">Event Date: {quotation.eventDate}</div>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto my-6 border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Description &amp; Specifications</th>
                  <th className="py-2.5 px-3 text-center">Qty / Days</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(quotation.lineItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{item.description}</div>
                      {item.specifications && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.specifications}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                      {item.quantity} {item.unit || 'Unit'} {item.days > 1 ? `× ${item.days}d` : ''}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                      ₹{item.rate.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                      ₹{getItemAmount(item).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & UPI QR Code Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 pt-4 border-t border-slate-200">
            {/* UPI QR Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="UPI QR Code"
                  className="w-28 h-28 object-contain bg-white p-1 rounded-lg border border-slate-200 flex-shrink-0"
                />
              ) : (
                <div className="w-28 h-28 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                  <QrCode size={36} />
                </div>
              )}
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-900">Scan &amp; Pay via UPI</div>
                <div className="text-[11px] text-slate-500">
                  {quotation.allowCustomerEditQrAmount
                    ? 'Scan and enter any custom payment amount'
                    : `Scan with PhonePe, GPay, or Paytm`}
                </div>
                <div className="font-mono text-[11px] font-semibold text-blue-600">
                  {upiId}
                </div>
                <a
                  href={upiDeepLink || `upi://pay?pa=${upiId}&pn=${encodeURIComponent(companyName)}&cu=INR`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline pt-1"
                >
                  <span>Open in Mobile UPI App</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between py-1">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1 text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono font-semibold">-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between py-1">
                  <span>GST ({quotation.taxRate}%):</span>
                  <span className="font-mono font-semibold">₹{tax.toLocaleString('en-IN')}</span>
                </div>
              )}
              {(quotation.shippingCharges || 0) > 0 && (
                <div className="flex justify-between py-1">
                  <span>Transportation &amp; Logistics:</span>
                  <span className="font-mono font-semibold">₹{(quotation.shippingCharges || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {(quotation.adjustmentAmount || 0) !== 0 && (
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Adjustment / Round-off:</span>
                  <span className="font-mono font-semibold">
                    {quotation.adjustmentAmount! > 0 ? `+₹${quotation.adjustmentAmount}` : `-₹${Math.abs(quotation.adjustmentAmount!)}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
              {advanceAmount > 0 && (
                <div className="flex justify-between py-1 text-blue-600 font-semibold border-t border-slate-100">
                  <span>Advance Due:</span>
                  <span className="font-mono">₹{advanceAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Conditions */}
          {(quotation.notes || quotation.paymentTerms) && (
            <div className="my-6 pt-4 border-t border-slate-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Terms &amp; Conditions</div>
              <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans">
                {quotation.notes || quotation.paymentTerms}
              </div>
            </div>
          )}

          {/* Dual Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-200">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Authorized Signatory
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-800">{companyName}</div>
                <div className="text-slate-500 mt-1">Authorized Representative</div>
                {quotation.company?.signature ? (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col items-center">
                    <img
                      src={quotation.company.signature}
                      alt="Official Stamp & Signature"
                      className="h-16 w-auto max-w-[200px] object-contain"
                    />
                    <div className="text-[10px] text-slate-400 font-medium mt-1">Official Digital Stamp &amp; Signature</div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-300 font-serif italic text-slate-400 text-center">
                    Official Signature &amp; Stamp
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Client Acceptance &amp; Sign-off
              </div>
              {quotation.clientSignature ? (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-2">
                    <ShieldCheck size={15} />
                    <span>Digitally Signed &amp; Accepted</span>
                  </div>
                  <img
                    src={quotation.clientSignature.dataUrl}
                    alt="Client Signature"
                    className="h-14 w-auto max-w-[200px] object-contain bg-white rounded border border-emerald-200 p-1"
                  />
                  <div className="font-bold text-slate-800 mt-2">{quotation.clientSignature.signerName}</div>
                  {quotation.clientSignature.signerPhone && (
                    <div className="text-slate-500">{quotation.clientSignature.signerPhone}</div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1">
                    Timestamp: {new Date(quotation.clientSignature.signedAt).toLocaleString('en-IN')}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
                  <p className="text-xs text-slate-500 mb-3">
                    Accept this proposal online by drawing your digital signature.
                  </p>
                  <button
                    onClick={() => setIsSignModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                  >
                    <PenTool size={13} />
                    <span>Sign &amp; Accept Quotation</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onSave={handleSaveSignature}
        existingSignature={quotation.clientSignature}
      />
    </div>
  );
};
