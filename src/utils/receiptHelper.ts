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
