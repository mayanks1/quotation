import { Quotation, getItemAmount } from '../types/quotation';

export const formatQuotationWhatsAppText = (quotation: Quotation): string => {
  const subtotal = quotation.lineItems.reduce((acc, i) => acc + getItemAmount(i), 0);
  const discounted = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const isZeroTax = quotation.taxScheme === 'none';
  const effectiveTaxRate = isZeroTax ? 0 : (quotation.taxRate || 0);
  const tax = isZeroTax ? 0 : (discounted * effectiveTaxRate) / 100;
  const grandTotal = discounted + tax + (quotation.shippingCharges || 0);

  let text = `*QUOTATION: ${quotation.quotationNumber}*\n`;
  text += `*From:* ${quotation.company.name}\n`;
  text += `*To:* ${quotation.client.name}${quotation.client.company ? ` (${quotation.client.company})` : ''}\n`;
  text += `*Date:* ${quotation.quotationDate} (Valid until: ${quotation.validUntil})\n`;
  if (quotation.eventDate) text += `*Event Date:* ${quotation.eventDate}\n`;
  if (quotation.venue) text += `*Venue:* ${quotation.venue}\n`;
  text += `\n*Scope of Setup / Line Items:*\n`;

  quotation.lineItems.forEach((item, index) => {
    const itemTotal = getItemAmount(item);
    const itemRate = item.rate ?? (item.quantity ? itemTotal / item.quantity : itemTotal);
    text += `${index + 1}. ${item.description} - Qty: ${item.quantity || 1} ${item.unit || ''} @ ₹${itemRate.toLocaleString('en-IN')} = ₹${itemTotal.toLocaleString('en-IN')}\n`;
  });

  text += `\n*Summary:*`;
  text += `\n• Subtotal: ₹${subtotal.toLocaleString('en-IN')}`;
  if (quotation.discountAmount > 0) {
    text += `\n• Discount: -₹${quotation.discountAmount.toLocaleString('en-IN')}`;
  }
  if (quotation.taxRate > 0) {
    text += `\n• GST (${quotation.taxRate}%): ₹${tax.toLocaleString('en-IN')}`;
  }
  if (quotation.shippingCharges > 0) {
    text += `\n• Logistics / Transport: ₹${quotation.shippingCharges.toLocaleString('en-IN')}`;
  }
  text += `\n*Total Amount:* ₹${grandTotal.toLocaleString('en-IN')}\n`;

  if (quotation.company.bankDetails?.upiId) {
    text += `\n*Advance Payment UPI:* ${quotation.company.bankDetails.upiId}`;
  }
  if (quotation.company.bankDetails?.bankName) {
    text += `\n*Bank:* ${quotation.company.bankDetails.bankName} | A/C: ${quotation.company.bankDetails.accountNumber} | IFSC: ${quotation.company.bankDetails.ifscCode}\n`;
  }

  text += `\nThank you for choosing ${quotation.company.name}! Please let us know if you require any adjustments.`;

  return text;
};

export const generateWhatsAppShareUrl = (quotation: Quotation, customPhone?: string): string => {
  const text = formatQuotationWhatsAppText(quotation);
  const targetPhone = customPhone !== undefined ? customPhone : (quotation.client?.phone || '');
  const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text);

  if (cleanPhone.length >= 10) {
    const fullNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullNumber}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
};

export const generateWhatsAppPdfNoticeUrl = (quotation: Quotation, filename: string, customPhone?: string): string => {
  const subtotal = quotation.lineItems.reduce((acc, i) => acc + getItemAmount(i), 0);
  const discounted = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const isZeroTax = quotation.taxScheme === 'none';
  const effectiveTaxRate = isZeroTax ? 0 : (quotation.taxRate || 0);
  const tax = isZeroTax ? 0 : (discounted * effectiveTaxRate) / 100;
  const grandTotal = discounted + tax + (quotation.shippingCharges || 0);

  let text = `*QUOTATION: ${quotation.quotationNumber}*\n`;
  text += `Hello ${quotation.client?.name || 'Sir/Madam'},\n\n`;
  text += `Please find attached the official PDF quotation document from *${quotation.company.name}*.\n`;
  if (quotation.venue) text += `*Venue:* ${quotation.venue}\n`;
  if (quotation.eventDate) text += `*Event Date:* ${quotation.eventDate}\n`;
  text += `*Total Amount:* ₹${grandTotal.toLocaleString('en-IN')}\n\n`;
  text += `📄 *PDF File:* ${filename}\n\n`;
  text += `Thank you for choosing ${quotation.company.name}!`;

  const targetPhone = customPhone !== undefined ? customPhone : (quotation.client?.phone || '');
  const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text);

  if (cleanPhone.length >= 10) {
    const fullNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullNumber}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
};
