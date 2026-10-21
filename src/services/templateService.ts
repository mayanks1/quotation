import { Quotation, getItemAmount } from '../types/quotation';
import { getQuotationExpiryStatus } from '../utils/quotationExpiry';

export type TemplateKey = 'simpleTextBreakdown' | 'followUpReminder' | 'balancePaymentReminder';

export interface TemplateDefinition {
  key: TemplateKey;
  name: string;
  description: string;
  category: 'Quotation' | 'Follow-Up' | 'Finance';
  defaultTemplate: string;
}

export const TEMPLATE_DEFINITIONS: Record<TemplateKey, TemplateDefinition> = {
  simpleTextBreakdown: {
    key: 'simpleTextBreakdown',
    name: 'Simple Text Breakdown',
    description: 'Instant WhatsApp message with line items, setup scope, pricing summary, and bank/UPI details.',
    category: 'Quotation',
    defaultTemplate: `*{docTitle}: {quotationNumber}*
*From:* {companyName}
*To:* {clientName}{clientCompany}
*Date:* {date} (Valid until: {validUntil})
{eventDateLine}{venueLine}
*Scope of Setup / Line Items:*
{itemsList}

*Summary:*
• Subtotal: ₹{subtotal}{discountLine}{taxLine}{shippingLine}{adjustmentLine}
*Total Amount:* ₹{grandTotal}
{paymentMilestones}
{upiDetails}
{bankDetails}

Thank you for choosing {companyName}! Please let us know if you require any adjustments.`
  },

  followUpReminder: {
    key: 'followUpReminder',
    name: 'Follow-Up & Booking Reminder',
    description: 'Polite follow-up checking booking decision before quotation expiry to lock screen inventory.',
    category: 'Follow-Up',
    defaultTemplate: `Namaste *{clientName}*,

Following up regarding Quotation *#{quotationNumber}* from *{companyName}*{venuePhrase}{eventDatePhrase}.

• *Quoted Amount:* ₹{grandTotal}
• *Validity:* {validUntil} _({expiryStatus})_

{expiryNote}

{contactLine}Warm regards,
*{companyName}*`
  },

  balancePaymentReminder: {
    key: 'balancePaymentReminder',
    name: 'Balance Payment Reminder (T-24h)',
    description: 'Milestone reminder for upcoming event setup, alerting client to clear outstanding balance with UPI details.',
    category: 'Finance',
    defaultTemplate: `*PAYMENT REMINDER: EVENT SETUP BALANCE*
*From:* {companyName}
*To:* {clientName}{clientCompany}

Dear {clientName},
This is a friendly reminder regarding the upcoming LED Wall setup for your event:

• Quotation / Invoice: #{quotationNumber}
{eventDateLine}{venueLine}• Total Booking Amount: ₹{grandTotal}
{advanceReceivedLine}• *Outstanding Balance Due: ₹{balanceAmount}*

As per booking policy, balance clearance is required prior to equipment dispatch / venue setup.

{upiDetails}
{bankDetails}

Please share the UTR / payment confirmation screenshot once done. Thank you!
*{companyName}*`
  }
};

export const AVAILABLE_VARIABLES = [
  { tag: '{clientName}', label: 'Client Name', desc: 'Name of the client' },
  { tag: '{clientCompany}', label: 'Client Company', desc: 'Company or agency name' },
  { tag: '{quotationNumber}', label: 'Quote / Invoice #', desc: 'Proposal or invoice reference' },
  { tag: '{companyName}', label: 'Company Name', desc: 'Your company / organization' },
  { tag: '{date}', label: 'Quotation Date', desc: 'Date of creation' },
  { tag: '{validUntil}', label: 'Valid Until', desc: 'Expiry date' },
  { tag: '{eventDate}', label: 'Event Date', desc: 'Date of scheduled setup' },
  { tag: '{venue}', label: 'Venue', desc: 'Setup hotel or location' },
  { tag: '{grandTotal}', label: 'Grand Total', desc: 'Final total payable amount (₹)' },
  { tag: '{subtotal}', label: 'Subtotal', desc: 'Subtotal before tax & discounts' },
  { tag: '{paidAmount}', label: 'Paid Amount', desc: 'Total payments received (₹)' },
  { tag: '{balanceAmount}', label: 'Balance Due', desc: 'Remaining outstanding balance (₹)' },
  { tag: '{itemsList}', label: 'Items Scope', desc: 'Numbered list of rental line items' },
  { tag: '{upiDetails}', label: 'UPI / QR Block', desc: 'Instant UPI ID with clickable text' },
  { tag: '{bankDetails}', label: 'Bank Block', desc: 'Bank account, IFSC & account name' },
  { tag: '{expiryStatus}', label: 'Expiry Label', desc: 'e.g. Expires in 2 days' },
  { tag: '{expiryNote}', label: 'Expiry Message', desc: 'Dynamic note based on validity' },
  { tag: '{contactLine}', label: 'Call Contact Line', desc: 'Phone call prompt' },
];

const STORAGE_KEY = 'tisha_custom_message_templates';

/**
 * Returns saved template or the system default
 */
export const getTemplate = (key: TemplateKey): string => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed[key] === 'string' && parsed[key].trim()) {
        return parsed[key];
      }
    }
  } catch (err) {
    // ignore
  }
  return TEMPLATE_DEFINITIONS[key].defaultTemplate;
};

/**
 * Saves custom template string
 */
export const saveTemplate = (key: TemplateKey, templateStr: string): void => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing[key] = templateStr;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('tisha_templates_updated', { detail: { key } }));
  } catch (err) {
    console.error('Failed to save message template:', err);
  }
};

/**
 * Resets a template to system default
 */
export const resetTemplate = (key: TemplateKey): void => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const existing = JSON.parse(raw);
      delete existing[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('tisha_templates_updated', { detail: { key } }));
    }
  } catch (err) {
    console.error('Failed to reset message template:', err);
  }
};

/**
 * Check if a template has been customized by user
 */
export const isTemplateCustomized = (key: TemplateKey): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Boolean(parsed && typeof parsed[key] === 'string' && parsed[key].trim());
    }
  } catch (err) {
    // ignore
  }
  return false;
};

/**
 * Interpolates a template against a real Quotation object
 */
export const renderTemplate = (key: TemplateKey, quotation: Quotation, customTemplateStr?: string): string => {
  const templateStr = customTemplateStr !== undefined ? customTemplateStr : getTemplate(key);

  const subtotal = quotation.lineItems.reduce((acc, i) => acc + getItemAmount(i), 0);
  const discounted = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const isZeroTax = quotation.taxScheme === 'none';
  const effectiveTaxRate = isZeroTax ? 0 : (quotation.taxRate || 0);
  const tax = isZeroTax ? 0 : (discounted * effectiveTaxRate) / 100;
  const grandTotal = Math.max(0, discounted + tax + (quotation.shippingCharges || 0) + (quotation.adjustmentAmount || 0));
  const paid = quotation.paidAmount || 0;
  const balance = Math.max(0, grandTotal - paid);

  const isInvoice = quotation.documentType === 'invoice';
  const docTitle = isInvoice ? 'TAX INVOICE' : 'QUOTATION';
  const docNumber = isInvoice ? (quotation.invoiceNumber || quotation.quotationNumber) : quotation.quotationNumber;
  const clientName = quotation.client?.name || 'Sir / Madam';
  const clientCompany = quotation.client?.company ? ` (${quotation.client.company})` : '';
  const companyName = quotation.company?.name || 'Tisha LED Walls';

  // Format line items
  let itemsList = '';
  quotation.lineItems.forEach((item, index) => {
    const itemTotal = getItemAmount(item);
    const itemRate = item.rate ?? (item.quantity ? itemTotal / item.quantity : itemTotal);
    itemsList += `${index + 1}. ${item.description} - Qty: ${item.quantity || 1} ${item.unit || ''} @ ₹${itemRate.toLocaleString('en-IN')} = ₹${itemTotal.toLocaleString('en-IN')}\n`;
  });
  itemsList = itemsList.trimEnd();

  // Payment milestones
  let paymentMilestones = '';
  if (quotation.enablePaymentLedger) {
    const advancePercentage = quotation.advancePercentage ?? (quotation.advanceAmount && grandTotal > 0 ? Math.round((quotation.advanceAmount / grandTotal) * 100) : 70);
    const advanceReq = Math.round(grandTotal * (advancePercentage / 100));

    if (advanceReq > 0 && paid === 0) {
      paymentMilestones += `• Advance Milestone (${advancePercentage}%): ₹${advanceReq.toLocaleString('en-IN')}\n`;
      paymentMilestones += `• Balance on Setup: ₹${Math.max(0, grandTotal - advanceReq).toLocaleString('en-IN')}`;
    } else if (paid > 0) {
      paymentMilestones += `• Amount Paid: ₹${paid.toLocaleString('en-IN')} (${(quotation.paymentStatus || 'received').toUpperCase()})\n`;
      paymentMilestones += `• Balance Due: ₹${balance.toLocaleString('en-IN')}`;
    }
  }

  // UPI details
  let upiDetails = '';
  if (quotation.company.bankDetails?.upiId) {
    upiDetails = `*Instant UPI Payment:* ${quotation.company.bankDetails.upiId}`;
  }

  // Bank details
  let bankDetails = '';
  if (quotation.company.bankDetails?.bankName) {
    bankDetails = `*Bank:* ${quotation.company.bankDetails.bankName} | A/C: ${quotation.company.bankDetails.accountNumber} | IFSC: ${quotation.company.bankDetails.ifscCode}`;
  }

  const expiry = getQuotationExpiryStatus(quotation.validUntil);
  let expiryNote = '';
  if (expiry.isExpired) {
    expiryNote = `The initial proposal period has ended, but we would love to refresh this quotation and confirm LED screen inventory for you.`;
  } else if (expiry.isExpiringSoon) {
    expiryNote = `This proposal will be expiring soon. Kindly let us know if you would like us to reserve the LED wall panels and technical crew for your event date.`;
  } else {
    expiryNote = `Please let us know if you require any adjustments to the screen sizes, pitch options, or setup schedule.`;
  }

  let contactLine = '';
  if (quotation.company?.phone) {
    contactLine = `Feel free to reply here or call us directly at *${quotation.company.phone}*.\n\n`;
  }

  // Replacements dictionary
  const replacements: Record<string, string> = {
    '{docTitle}': docTitle,
    '{quotationNumber}': docNumber,
    '{companyName}': companyName,
    '{clientName}': clientName,
    '{clientCompany}': clientCompany,
    '{date}': isInvoice && quotation.invoiceDate ? quotation.invoiceDate : (quotation.quotationDate || ''),
    '{validUntil}': quotation.validUntil || '',
    '{eventDate}': quotation.eventDate || '',
    '{eventDateLine}': quotation.eventDate ? `*Event Date:* ${quotation.eventDate}\n` : '',
    '{eventDatePhrase}': quotation.eventDate ? ` on *${quotation.eventDate}*` : '',
    '{venue}': quotation.venue || '',
    '{venueLine}': quotation.venue ? `*Venue:* ${quotation.venue}\n` : '',
    '{venuePhrase}': quotation.venue ? ` for your upcoming event at *${quotation.venue}*` : '',
    '{itemsList}': itemsList,
    '{subtotal}': subtotal.toLocaleString('en-IN'),
    '{discountLine}': quotation.discountAmount > 0 ? `\n• Discount: -₹${quotation.discountAmount.toLocaleString('en-IN')}` : '',
    '{taxLine}': effectiveTaxRate > 0 ? `\n• GST (${effectiveTaxRate}%): ₹${tax.toLocaleString('en-IN')}` : '',
    '{shippingLine}': quotation.shippingCharges > 0 ? `\n• Logistics / Transport: ₹${quotation.shippingCharges.toLocaleString('en-IN')}` : '',
    '{adjustmentLine}': quotation.adjustmentAmount ? `\n• Adjustment: ${quotation.adjustmentAmount > 0 ? '+' : ''}₹${quotation.adjustmentAmount.toLocaleString('en-IN')}` : '',
    '{grandTotal}': grandTotal.toLocaleString('en-IN'),
    '{advanceAmount}': Math.round(grandTotal * 0.7).toLocaleString('en-IN'),
    '{advanceReceivedLine}': paid > 0 ? `• Advance Received: ₹${paid.toLocaleString('en-IN')}\n` : '',
    '{paidAmount}': paid.toLocaleString('en-IN'),
    '{balanceAmount}': balance.toLocaleString('en-IN'),
    '{paymentMilestones}': paymentMilestones,
    '{upiDetails}': upiDetails,
    '{bankDetails}': bankDetails,
    '{expiryStatus}': expiry.label,
    '{expiryNote}': expiryNote,
    '{contactLine}': contactLine,
  };

  let rendered = templateStr;
  for (const [tag, value] of Object.entries(replacements)) {
    rendered = rendered.split(tag).join(value);
  }

  // Clean multiple blank lines
  return rendered.replace(/\n{3,}/g, '\n\n').trim();
};
