/**
 * Centralized Application URL and Public Domain Configuration
 * 
 * Ensures external-facing URLs (such as verification QR codes on PDFs,
 * WhatsApp share links, and public client portal links) always point to
 * the live production domain (https://tisha-invoice.pages.dev) even when
 * generated or tested in local development environments (localhost:5173 / localhost:5174).
 */

export const LIVE_PRODUCTION_ORIGIN = 'https://tisha-invoice.pages.dev';

/**
 * Returns the public-facing origin for URLs intended for external / client consumption.
 * - When running in localhost or local development, returns the live production origin
 *   so scanned QR codes on exported PDFs actually work from mobile devices in the real world.
 * - When running on a deployed domain (*.pages.dev or custom domain), uses the live window origin.
 */
export function getPublicAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const hostname = (window.location.hostname || '').toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local') ||
      hostname.includes('.local:')
    ) {
      return LIVE_PRODUCTION_ORIGIN;
    }
    return window.location.origin;
  }
  return LIVE_PRODUCTION_ORIGIN;
}

/**
 * Generates the public online review & sign-off portal URL for a quotation or invoice.
 */
export function getPublicQuoteUrl(quotationIdOrNumber: string): string {
  const origin = getPublicAppOrigin();
  return `${origin}/quote/${encodeURIComponent(quotationIdOrNumber)}/view`;
}

/**
 * Generates the public verification portal URL for an official payment receipt.
 */
export function getPublicReceiptUrl(
  receiptNumberOrId: string,
  params?: Record<string, string | number | undefined | null>
): string {
  const origin = getPublicAppOrigin();
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.set(key, String(val));
      }
    });
  }

  const queryString = searchParams.toString();
  return `${origin}/receipt/${encodeURIComponent(receiptNumberOrId)}/view${queryString ? `?${queryString}` : ''}`;
}

