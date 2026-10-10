import { Quotation } from '../types/quotation';

export const generateWhatsAppShareUrl = (quotation: Quotation): string => {
  const subtotal = quotation.lineItems.reduce((acc, i) => acc + i.quantity * i.rate, 0);
  const discounted = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const tax = (discounted * (quotation.taxRate || 0)) / 100;
  const grandTotal = discounted + tax + (quotation.shippingCharges || 0);

  const cleanPhone = (quotation.client?.phone || '').replace(/[^0-9]/g, '');

  let text = `*QUOTATION: ${quotation.quotationNumber}*\n`;
  text += `*From:* ${quotation.company.name}\n`;
  text += `*To:* ${quotation.client.name} (${quotation.client.company || 'Client'})\n`;
  text += `*Date:* ${quotation.quotationDate} (Valid until: ${quotation.validUntil})\n`;
  if (quotation.eventDate) text += `*Event Date:* ${quotation.eventDate}\n`;
  if (quotation.venue) text += `*Venue:* ${quotation.venue}\n`;
  text += `\n*Scope of Setup / Line Items:*\n`;

  quotation.lineItems.forEach((item, index) => {
    const itemTotal = item.quantity * item.rate;
    text += `${index + 1}. ${item.description} - Qty: ${item.quantity} ${item.unit || ''} @ ₹${item.rate.toLocaleString('en-IN')} = ₹${itemTotal.toLocaleString('en-IN')}\n`;
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

  const encoded = encodeURIComponent(text);

  if (cleanPhone.length >= 10) {
    // If phone starts with country code or 10 digits
    const fullNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullNumber}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
};
