import { Quotation, getItemAmount } from '../types/quotation';

export interface ExpiryStatus {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
  label: string;
  badgeClass: string;
}

/**
 * Parses DD-MM-YYYY or YYYY-MM-DD or standard strings to Date object
 */
export const parseDateStr = (dateStr?: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Calculates days remaining until expiration and returns styled status badge metadata
 */
export function getQuotationExpiryStatus(validUntil?: string): ExpiryStatus {
  const target = parseDateStr(validUntil);
  if (!target) {
    return {
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: 999,
      label: 'No Expiry',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.round((startOfTarget - startOfToday) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return {
      isExpired: true,
      isExpiringSoon: false,
      daysRemaining: diffDays,
      label: `Expired (${Math.abs(diffDays)}d ago)`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    };
  } else if (diffDays === 0) {
    return {
      isExpired: false,
      isExpiringSoon: true,
      daysRemaining: 0,
      label: 'Expires Today',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-extrabold animate-pulse',
    };
  } else if (diffDays === 1) {
    return {
      isExpired: false,
      isExpiringSoon: true,
      daysRemaining: 1,
      label: 'Expires Tomorrow',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
    };
  } else if (diffDays <= 3) {
    return {
      isExpired: false,
      isExpiringSoon: true,
      daysRemaining: diffDays,
      label: `${diffDays} days left`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  } else {
    return {
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: diffDays,
      label: `${diffDays} days left`,
      badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    };
  }
}

/**
 * Formats polite, high-converting WhatsApp follow-up reminder text
 */
export function formatQuotationReminderText(quotation: Quotation): string {
  const expiry = getQuotationExpiryStatus(quotation.validUntil);
  const clientName = quotation.client?.name || 'Sir / Madam';
  const companyName = quotation.company?.name || 'Tisha LED Walls';
  
  const subtotal = quotation.lineItems.reduce((acc, i) => acc + getItemAmount(i), 0);
  const discounted = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const isZeroTax = quotation.taxScheme === 'none';
  const effectiveTaxRate = isZeroTax ? 0 : (quotation.taxRate || 0);
  const tax = isZeroTax ? 0 : (discounted * effectiveTaxRate) / 100;
  const grandTotal = Math.max(0, discounted + tax + (quotation.shippingCharges || 0) + (quotation.adjustmentAmount || 0));

  let text = `Namaste *${clientName}*,\n\n`;
  text += `Following up regarding Quotation *#${quotation.quotationNumber}* from *${companyName}*`;
  if (quotation.venue) {
    text += ` for your upcoming event at *${quotation.venue}*`;
  }
  if (quotation.eventDate) {
    text += ` on *${quotation.eventDate}*`;
  }
  text += `.\n\n`;

  text += `• *Quoted Amount:* ₹${grandTotal.toLocaleString('en-IN')}\n`;
  text += `• *Validity:* ${quotation.validUntil} _(${expiry.label})_\n\n`;

  if (expiry.isExpired) {
    text += `The initial proposal period has ended, but we would love to refresh this quotation and confirm LED screen inventory for you.\n\n`;
  } else if (expiry.isExpiringSoon) {
    text += `This proposal will be expiring soon. Kindly let us know if you would like us to reserve the LED wall panels and technical crew for your event date.\n\n`;
  } else {
    text += `Please let us know if you require any adjustments to the screen sizes, pitch options, or setup schedule.\n\n`;
  }

  if (quotation.company?.phone) {
    text += `Feel free to reply here or call us directly at *${quotation.company.phone}*.\n\n`;
  }
  text += `Warm regards,\n*${companyName}*`;

  return text;
}

/**
 * Builds direct WhatsApp URL for 1-click follow-up reminder
 */
export function generateWhatsAppReminderUrl(quotation: Quotation, customPhone?: string): string {
  const text = formatQuotationReminderText(quotation);
  const targetPhone = customPhone !== undefined ? customPhone : (quotation.client?.phone || '');
  const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text);

  if (cleanPhone.length >= 10) {
    const fullNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullNumber}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
