import { Quotation, getItemAmount } from '../types/quotation';

export const formatQuotationWhatsAppText = (quotation: Quotation): string => {
  const subtotal = quotation.lineItems.reduce((acc, i) => acc + getItemAmount(i), 0);
  const discounted = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const isZeroTax = quotation.taxScheme === 'none';
  const effectiveTaxRate = isZeroTax ? 0 : (quotation.taxRate || 0);
  const tax = isZeroTax ? 0 : (discounted * effectiveTaxRate) / 100;
  const grandTotal = Math.max(0, discounted + tax + (quotation.shippingCharges || 0) + (quotation.adjustmentAmount || 0));

  const isInvoice = quotation.documentType === 'invoice';
  const docTitle = isInvoice ? 'TAX INVOICE' : 'QUOTATION';
  const docNumber = isInvoice ? (quotation.invoiceNumber || quotation.quotationNumber) : quotation.quotationNumber;

  let text = `*${docTitle}: ${docNumber}*\n`;
  text += `*From:* ${quotation.company.name}\n`;
  text += `*To:* ${quotation.client.name}${quotation.client.company ? ` (${quotation.client.company})` : ''}\n`;
  text += `*Date:* ${isInvoice && quotation.invoiceDate ? quotation.invoiceDate : quotation.quotationDate} (Valid until: ${quotation.validUntil})\n`;
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
  if (effectiveTaxRate > 0) {
    text += `\n• GST (${effectiveTaxRate}%): ₹${tax.toLocaleString('en-IN')}`;
  }
  if (quotation.shippingCharges > 0) {
    text += `\n• Logistics / Transport: ₹${quotation.shippingCharges.toLocaleString('en-IN')}`;
  }
  if (quotation.adjustmentAmount) {
    text += `\n• Adjustment / Round-off: ${quotation.adjustmentAmount > 0 ? '+' : ''}₹${quotation.adjustmentAmount.toLocaleString('en-IN')}`;
  }
  text += `\n*Total Amount:* ₹${grandTotal.toLocaleString('en-IN')}`;

  if (quotation.enablePaymentLedger) {
    const advancePercentage = quotation.advancePercentage ?? (quotation.advanceAmount && grandTotal > 0 ? Math.round((quotation.advanceAmount / grandTotal) * 100) : 70);
    const advanceReq = Math.round(grandTotal * (advancePercentage / 100));
    const paid = quotation.paidAmount || 0;
    const balance = Math.max(0, grandTotal - paid);

    if (advanceReq > 0 && paid === 0) {
      text += `\n• Advance Milestone (${advancePercentage}%): ₹${advanceReq.toLocaleString('en-IN')}`;
      text += `\n• Balance on Setup: ₹${Math.max(0, grandTotal - advanceReq).toLocaleString('en-IN')}`;
    } else if (paid > 0) {
      text += `\n• Amount Paid: ₹${paid.toLocaleString('en-IN')} (${(quotation.paymentStatus || 'received').toUpperCase()})`;
      text += `\n• Balance Due: ₹${balance.toLocaleString('en-IN')}`;
    }
  }
  text += `\n`;

  if (quotation.enableUpiQr && quotation.company.bankDetails?.upiId) {
    if (quotation.allowCustomerEditQrAmount) {
      text += `\n*Instant UPI Payment:* ${quotation.company.bankDetails.upiId} _(Open Amount - enter desired payment on scan)_`;
    } else {
      const isCustomQr = quotation.qrAmountType === 'custom' && quotation.customQrAmount !== undefined && quotation.customQrAmount > 0;
      const advancePercentage = quotation.advancePercentage ?? (quotation.advanceAmount && grandTotal > 0 ? Math.round((quotation.advanceAmount / grandTotal) * 100) : 70);
      const advanceReq = Math.round(grandTotal * (advancePercentage / 100));
      const qrTargetAmount = isCustomQr
        ? quotation.customQrAmount!
        : (quotation.qrAmountType === 'advance' && quotation.enablePaymentLedger ? advanceReq : grandTotal);
      text += `\n*Instant UPI Payment:* ${quotation.company.bankDetails.upiId} (Amount: ₹${qrTargetAmount.toLocaleString('en-IN')})`;
    }
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
  let text = `*OFFICIAL PAYMENT RECEIPT: ${receipt.receiptNumber}*\n`;
  text += `Dear ${receipt.client.name || 'Valued Client'},\n\n`;
  text += `Please find attached your official payment receipt from *${receipt.company.name}*.\n\n`;
  text += `• *Amount Received:* ₹${receipt.amountPaid.toLocaleString('en-IN')}\n`;
  text += `• *Mode:* ${receipt.paymentMode.toUpperCase().replace('_', ' ')}\n`;
  if (receipt.remainingBalance > 0) {
    text += `• *Net Balance Due:* ₹${receipt.remainingBalance.toLocaleString('en-IN')}\n`;
  } else {
    text += `• *Status:* FULLY CLEARED & PAID (₹0 Balance)\n`;
  }
  text += `\n📄 *Attached PDF Receipt:* ${filename}\n\n`;
  text += `Thank you for your business!\n*${receipt.company.name}*`;

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
  const subtotal = quotation.lineItems.reduce((acc, i) => acc + getItemAmount(i), 0);
  const discounted = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const isZeroTax = quotation.taxScheme === 'none';
  const effectiveTaxRate = isZeroTax ? 0 : (quotation.taxRate || 0);
  const tax = isZeroTax ? 0 : (discounted * effectiveTaxRate) / 100;
  const grandTotal = Math.max(0, discounted + tax + (quotation.shippingCharges || 0) + (quotation.adjustmentAmount || 0));

  const paid = quotation.paidAmount || 0;
  const balance = Math.max(0, grandTotal - paid);

  let text = `*PAYMENT REMINDER: EVENT SETUP BALANCE*\n`;
  text += `*From:* ${quotation.company.name}\n`;
  text += `*To:* ${quotation.client.name}${quotation.client.company ? ` (${quotation.client.company})` : ''}\n\n`;

  text += `Dear ${quotation.client.name || 'Sir/Madam'},\n`;
  text += `This is a friendly reminder regarding the upcoming LED Wall setup for your event:\n\n`;

  text += `• Quotation / Invoice: ${quotation.invoiceNumber || quotation.quotationNumber}\n`;
  if (quotation.eventDate) text += `• Event Date: ${quotation.eventDate}\n`;
  if (quotation.venue) text += `• Venue: ${quotation.venue}\n`;
  text += `• Total Booking Amount: ₹${grandTotal.toLocaleString('en-IN')}\n`;
  if (paid > 0) {
    text += `• Advance Received: ₹${paid.toLocaleString('en-IN')}\n`;
  }
  text += `• *Outstanding Balance Due: ₹${balance.toLocaleString('en-IN')}*\n\n`;

  text += `As per booking policy, balance clearance is required prior to equipment dispatch / venue setup.\n\n`;

  if (quotation.company.bankDetails?.upiId) {
    text += `*Quick UPI Payment:* ${quotation.company.bankDetails.upiId}\n`;
  }
  if (quotation.company.bankDetails?.bankName) {
    text += `*Bank:* ${quotation.company.bankDetails.bankName} | A/C: ${quotation.company.bankDetails.accountNumber} | IFSC: ${quotation.company.bankDetails.ifscCode}\n\n`;
  }

  text += `Please share the UTR / payment confirmation screenshot once done. Thank you!\n${quotation.company.name}`;

  return text;
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
