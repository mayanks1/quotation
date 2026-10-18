import { Quotation, getItemAmount } from '../types/quotation';

export function exportQuotationsToCSV(quotations: Quotation[]): void {
  const headers = [
    'Document Type',
    'Document No',
    'Date',
    'Client Name',
    'Client Company',
    'Client Phone',
    'Client GSTIN',
    'Status',
    'Items Count',
    'Subtotal (INR)',
    'Discount (INR)',
    'Tax Scheme',
    'Tax Rate (%)',
    'Tax Amount (INR)',
    'Shipping / Logistics (INR)',
    'Total Payable (INR)',
    'Payment Status',
    'Payment Mode',
    'Amount Paid (INR)',
    'Balance Due (INR)',
    'Transaction Ref',
    'Event Date',
    'Venue',
  ];

  const escapeCSV = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = quotations.map((q) => {
    const isZeroTax = q.taxScheme === 'none';
    const effectiveTaxRate = isZeroTax ? 0 : (q.taxRate || 0);
    const subtotal = q.lineItems.reduce((acc, item) => acc + getItemAmount(item), 0);
    const discountedSubtotal = Math.max(0, subtotal - (q.discountAmount || 0));
    const taxAmount = isZeroTax ? 0 : (discountedSubtotal * effectiveTaxRate) / 100;
    const grandTotal = Math.max(0, discountedSubtotal + taxAmount + (q.shippingCharges || 0) + (q.adjustmentAmount || 0));
    const paid = q.paidAmount || 0;
    const balance = Math.max(0, grandTotal - paid);

    const docNo = q.documentType === 'invoice' ? (q.invoiceNumber || q.quotationNumber) : q.quotationNumber;
    const docDate = q.documentType === 'invoice' && q.invoiceDate ? q.invoiceDate : q.quotationDate;

    return [
      escapeCSV(q.documentType === 'invoice' ? 'Tax Invoice' : 'Quotation'),
      escapeCSV(docNo),
      escapeCSV(docDate),
      escapeCSV(q.client?.name || ''),
      escapeCSV(q.client?.company || ''),
      escapeCSV(q.client?.phone || ''),
      escapeCSV(q.client?.gstin || ''),
      escapeCSV(q.status),
      escapeCSV(q.lineItems?.length || 0),
      escapeCSV(subtotal.toFixed(2)),
      escapeCSV((q.discountAmount || 0).toFixed(2)),
      escapeCSV(q.taxScheme),
      escapeCSV(effectiveTaxRate),
      escapeCSV(taxAmount.toFixed(2)),
      escapeCSV((q.shippingCharges || 0).toFixed(2)),
      escapeCSV(grandTotal.toFixed(2)),
      escapeCSV(q.paymentStatus || 'unpaid'),
      escapeCSV(q.paymentMode || 'upi'),
      escapeCSV(paid.toFixed(2)),
      escapeCSV(balance.toFixed(2)),
      escapeCSV(q.transactionRef || ''),
      escapeCSV(q.eventDate || ''),
      escapeCSV(q.venue || ''),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quotations_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
