import QRCode from 'qrcode';

export interface UpiPaymentDetails {
  upiId: string;
  payeeName: string;
  amount?: number;
  transactionNote?: string;
  referenceId?: string;
}

/**
 * Builds the NPCI-compliant standard UPI payment link string
 */
export function buildUpiPaymentUrl(details: UpiPaymentDetails): string {
  const { upiId, payeeName, amount, transactionNote, referenceId } = details;
  if (!upiId) return '';

  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent((payeeName || 'Tisha LED Walls').trim());
  const cleanNote = encodeURIComponent((transactionNote || 'Quotation Advance').trim().slice(0, 50));

  let url = `upi://pay?pa=${cleanUpi}&pn=${cleanName}&cu=INR&tn=${cleanNote}`;
  if (amount !== undefined && amount > 0) {
    const cleanAmount = Number(amount).toFixed(2);
    url += `&am=${cleanAmount}`;
  }
  if (referenceId) {
    url += `&tr=${encodeURIComponent(referenceId)}`;
  }
  return url;
}

/**
 * Generates an SVG or PNG DataURL of the UPI QR Code
 */
export async function generateUpiQrDataUrl(
  details: UpiPaymentDetails,
  width: number = 220
): Promise<string> {
  const upiUrl = buildUpiPaymentUrl(details);
  if (!upiUrl) return '';

  try {
    return await QRCode.toDataURL(upiUrl, {
      width,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err);
    return '';
  }
}
