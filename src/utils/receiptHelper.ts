import { Quotation, getItemAmount } from '../types/quotation';
import { PaymentReceipt, ReceiptMilestone } from '../types/receipt';

export function calculateQuotationTotals(quotation: Quotation) {
  const subtotal = quotation.lineItems.reduce((acc, item) => acc + getItemAmount(item), 0);
  const discountedSubtotal = Math.max(0, subtotal - (quotation.discountAmount || 0));

  const isZeroTax = quotation.taxScheme === 'none';
  const effectiveTaxRate = isZeroTax ? 0 : (quotation.taxRate || 0);
  const taxAmount = isZeroTax || effectiveTaxRate <= 0 ? 0 : (discountedSubtotal * effectiveTaxRate) / 100;

  const grandTotal = Math.max(0, discountedSubtotal + taxAmount + (quotation.shippingCharges || 0) + (quotation.adjustmentAmount || 0));
  const paidAmount = quotation.paidAmount || 0;
  const balanceDue = Math.max(0, grandTotal - paidAmount);

  const advancePercentage = quotation.advancePercentage ?? (quotation.advanceAmount && grandTotal > 0 ? Math.round((quotation.advanceAmount / grandTotal) * 100) : 70);
  const advanceRequirement = Math.round(grandTotal * (advancePercentage / 100));

  return {
    subtotal,
    discountedSubtotal,
    taxAmount,
    grandTotal,
    paidAmount,
    balanceDue,
    advancePercentage,
    advanceRequirement,
  };
}

export function generateReceiptNumber(quotationNumber: string, dateStr?: string): string {
  const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  // Strip non-alphanumeric except hyphen
  const clean = (quotationNumber || '001').replace(/^TLW-?/i, '').replace(/^Q-?/i, '').replace(/[^a-zA-Z0-9]/g, '');
  return `REC-${year}-${clean || '001'}`;
}

export function createReceiptFromQuotation(
  quotation: Quotation,
  overrides?: Partial<PaymentReceipt>
): PaymentReceipt {
  const { grandTotal, paidAmount, balanceDue, advanceRequirement } = calculateQuotationTotals(quotation);
  const receiptDate = quotation.paymentDate || new Date().toISOString().split('T')[0];

  let detectedMilestone: ReceiptMilestone = 'advance';
  if (paidAmount >= grandTotal && grandTotal > 0) {
    detectedMilestone = 'full';
  } else if (paidAmount >= advanceRequirement && advanceRequirement > 0 && paidAmount < grandTotal) {
    detectedMilestone = paidAmount > advanceRequirement ? 'partial' : 'advance';
  } else if (paidAmount > 0 && balanceDue === 0) {
    detectedMilestone = 'full';
  }

  const receiptNumber = generateReceiptNumber(quotation.quotationNumber, receiptDate);

  const receipt: PaymentReceipt = {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    receiptNumber,
    receiptDate,
    quotationId: quotation.id,
    quotationNumber: quotation.quotationNumber,
    invoiceNumber: quotation.invoiceNumber,
    client: { ...quotation.client },
    company: { ...quotation.company },
    amountPaid: paidAmount > 0 ? paidAmount : advanceRequirement,
    paymentMode: quotation.paymentMode || 'upi',
    transactionRef: quotation.transactionRef || '',
    paymentMilestone: detectedMilestone,
    totalPayable: grandTotal,
    previousPaid: 0,
    remainingBalance: balanceDue,
    eventDate: quotation.eventDate,
    venue: quotation.venue,
    notes: quotation.notes || '',
    createdAt: new Date().toISOString(),
    ...overrides,
  };

  return receipt;
}

/**
 * Formats any date string (ISO YYYY-MM-DD, DD-MM-YYYY, Date, or range) into dd/mm/yyyy
 */
export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (!str) return '';

  // Already dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // Already dd-mm-yyyy -> convert to dd/mm/yyyy
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str.replace(/-/g, '/');
  }

  // Single digit day/month like 1/11/2026 or 1-11-2026
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}/${month}/${year}`;
  }

  // ISO yyyy-mm-dd or yyyy/mm/dd
  if (/^\d{4}[\-\/]\d{2}[\-\/]\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split(/[\-\/]/);
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  // Check multi-day ranges like 24-25/10/2026 or text ranges
  if (str.includes('/') || str.toLowerCase().includes(' to ')) {
    return str;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}
