import { Quotation, getItemAmount } from '../types/quotation';
import { renderTemplate } from './templateService';

export const formatQuotationWhatsAppText = (quotation: Quotation): string => {
  return renderTemplate('simpleTextBreakdown', quotation);
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

  const isInvoice = quotation.documentType === 'invoice';
  const docTitle = isInvoice ? 'TAX INVOICE' : 'QUOTATION';
  const docNumber = isInvoice ? (quotation.invoiceNumber || quotation.quotationNumber) : quotation.quotationNumber;

  let text = `*${docTitle}: ${docNumber}*\n`;
  text += `Hello ${quotation.client?.name || 'Sir/Madam'},\n\n`;
  text += `Please find attached the official PDF ${isInvoice ? 'tax invoice' : 'quotation'} document from *${quotation.company.name}*.\n`;
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

export const formatPaymentReceiptWhatsAppText = (receipt: import('../types/receipt').PaymentReceipt): string => {
  const milestoneMap: Record<string, string> = {
    advance: 'Advance Booking Milestone',
    balance: 'Final Balance Settlement',
    full: 'Full Payment Settlement',
    partial: 'Partial Payment',
  };

  const modeMap: Record<string, string> = {
    upi: 'UPI / QR',
    bank_transfer: 'Bank Transfer (NEFT/RTGS)',
    cash: 'Cash',
    cheque: 'Cheque',
  };

  let text = `*OFFICIAL PAYMENT RECEIPT: ${receipt.receiptNumber}*\n`;
  text += `*From:* ${receipt.company.name}\n`;
  text += `*To:* ${receipt.client.name}${receipt.client.company ? ` (${receipt.client.company})` : ''}\n`;
  text += `*Receipt Date:* ${receipt.receiptDate}\n\n`;

  text += `Dear ${receipt.client.name || 'Valued Client'},\n`;
  text += `We have successfully received and acknowledged your payment of *₹${receipt.amountPaid.toLocaleString('en-IN')}*.\n\n`;

  text += `*Payment Particulars:*\n`;
  text += `• Reference: ${receipt.invoiceNumber ? `Invoice #${receipt.invoiceNumber}` : `Quotation #${receipt.quotationNumber}`}\n`;
  text += `• Milestone: ${milestoneMap[receipt.paymentMilestone] || receipt.paymentMilestone}\n`;
  text += `• Payment Mode: ${modeMap[receipt.paymentMode] || receipt.paymentMode}\n`;
  if (receipt.transactionRef) {
    text += `• Ref / UTR: ${receipt.transactionRef}\n`;
  }
  if (receipt.eventDate) {
    text += `• Event Date: ${receipt.eventDate}\n`;
  }
  if (receipt.venue) {
    text += `• Venue: ${receipt.venue}\n`;
  }

  text += `\n*Account Summary:*\n`;
  text += `• Total Booking Value: ₹${receipt.totalPayable.toLocaleString('en-IN')}\n`;
  text += `• Amount Received: *₹${receipt.amountPaid.toLocaleString('en-IN')}*\n`;
  if (receipt.remainingBalance > 0) {
    text += `• *Net Balance Due:* ₹${receipt.remainingBalance.toLocaleString('en-IN')}\n`;
  } else {
    text += `• Status: *FULLY CLEARED & PAID (₹0 Balance)*\n`;
  }

  text += `\nThank you for choosing ${receipt.company.name}!`;

  return text;
};

export const generateWhatsAppReceiptUrl = (receipt: import('../types/receipt').PaymentReceipt, customPhone?: string): string => {
  const text = formatPaymentReceiptWhatsAppText(receipt);
  const targetPhone = customPhone !== undefined ? customPhone : (receipt.client?.phone || '');
  const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text);

  if (cleanPhone.length >= 10) {
    const fullNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullNumber}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
};

export const generateWhatsAppReceiptPdfNoticeUrl = (
  receipt: import('../types/receipt').PaymentReceipt,
  filename: string,
  customPhone?: string
): string => {
  let text = receipt.amountPaid > 0 
    ? `*OFFICIAL PAYMENT RECEIPT: ${receipt.receiptNumber}*\n`
    : `*OFFICIAL BOOKING STATEMENT & PAYMENT REQUEST: ${receipt.receiptNumber}*\n`;

  text += `Dear ${receipt.client.name || 'Valued Client'},\n\n`;

  if (receipt.amountPaid > 0) {
    text += `Please find attached your official payment receipt from *${receipt.company.name}*.\n\n`;
    text += `• *Amount Received:* ₹${receipt.amountPaid.toLocaleString('en-IN')}\n`;
    text += `• *Mode:* ${receipt.paymentMode.toUpperCase().replace('_', ' ')}\n`;
    if (receipt.remainingBalance > 0) {
      text += `• *Net Balance Due:* ₹${receipt.remainingBalance.toLocaleString('en-IN')}\n`;
    } else {
      text += `• *Status:* FULLY CLEARED & PAID (₹0 Balance)\n`;
    }
  } else {
    text += `Please find attached your official booking statement from *${receipt.company.name}*.\n\n`;
    text += `• *Total Booking Amount:* ₹${receipt.totalPayable.toLocaleString('en-IN')}\n`;
    text += `• *Payment Status:* PENDING / PAYMENT DUE\n`;
    text += `• *Net Amount Payable:* *₹${receipt.totalPayable.toLocaleString('en-IN')}*\n`;
  }

  text += `\n📄 *Attached PDF:* ${filename}\n\n`;
  text += `Thank you for choosing ${receipt.company.name}!`;

  const targetPhone = customPhone !== undefined ? customPhone : (receipt.client?.phone || '');
  const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text);

  if (cleanPhone.length >= 10) {
    const fullNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullNumber}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
};

export const formatBalanceReminderWhatsAppText = (quotation: Quotation): string => {
  return renderTemplate('balancePaymentReminder', quotation);
};

export const generateWhatsAppBalanceReminderUrl = (quotation: Quotation, customPhone?: string): string => {
  const text = formatBalanceReminderWhatsAppText(quotation);
  const targetPhone = customPhone !== undefined ? customPhone : (quotation.client?.phone || '');
  const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text);

  if (cleanPhone.length >= 10) {
    const fullNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullNumber}?text=${encoded}`;
  }

  return `https://wa.me/?text=${encoded}`;
};
