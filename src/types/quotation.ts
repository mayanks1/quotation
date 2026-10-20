export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'invoiced';

export type TaxScheme = 'none' | 'gst_18' | 'gst_12' | 'gst_5' | 'cgst_sgst' | 'igst' | 'custom';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  amount?: number;
  rate?: number;
  // Optional industry metadata
  hsnSac?: string;
  unit?: string; // 'Days', 'Sq.Ft', 'Units', 'Set', 'Lot'
  dimensions?: {
    widthFt?: number;
    heightFt?: number;
    sqFt?: number;
    days?: number;
  };
}

export const getItemAmount = (item: Partial<LineItem> | null | undefined): number => {
  if (!item) return 0;
  if (item.amount !== undefined && item.amount !== null && !isNaN(Number(item.amount))) {
    return Number(item.amount);
  }
  return (Number(item.quantity) || 1) * (Number(item.rate) || 0);
};

export interface BankDetails {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId: string;
}

export interface CompanyProfile {
  name: string;
  logo: string;
  tagline?: string;
  address: string;
  phone: string;
  phoneAlt?: string;
  email: string;
  website?: string;
  gstin?: string;
  pan?: string;
  bankDetails: BankDetails;
  signature?: string; // Base64 or URL for official company stamp & signature
}

export interface ClientProfile {
  id?: string;
  name: string;
  company: string;
  address: string;
  email: string;
  phone: string;
  gstin?: string;
}

export type DocumentType = 'quotation' | 'invoice';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMode = 'upi' | 'bank_transfer' | 'cash' | 'cheque';

export interface Quotation {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  eventDate?: string;
  venue?: string;
  status: QuotationStatus;

  // Document Type & Invoicing
  documentType?: DocumentType;
  invoiceNumber?: string;
  invoiceDate?: string;
  revisionNumber?: number; // e.g. 1, 2, 3...
  parentQuoteNumber?: string; // original quote number if revised
  
  // Parties
  company: CompanyProfile;
  client: ClientProfile;
  
  // Items & Money
  lineItems: LineItem[];
  discountAmount: number;
  taxScheme: TaxScheme;
  taxRate: number; // percentage, e.g. 18
  shippingCharges: number;
  
  // Optional Feature Toggles
  enableUpiQr?: boolean;
  qrAmountType?: 'total' | 'advance' | 'custom';
  customQrAmount?: number;
  allowCustomerEditQrAmount?: boolean; // switch based: if true, QR code allows customer to enter amount at their end
  enablePaymentLedger?: boolean;
  adjustmentAmount?: number; // optional manual round-off / adjustment (+/-)

  // Payment Tracking Ledger
  advancePercentage?: number;
  advanceAmount?: number;
  paidAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
  transactionRef?: string;
  paymentDate?: string;

  // Terms & Payment
  notes: string;
  paymentTerms: string;
  
  // Client Sign-off & Digital Signature
  clientSignature?: ClientSignature;

  // Timestamps & Trash Management (30-day retention)
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string; // ISO date string when moved to trash
}

export interface ClientSignature {
  dataUrl: string; // Base64 PNG signature data
  signedAt: string; // ISO date timestamp or formatted string
  signerName?: string; // Authorized client person name
  signerPhone?: string; // Signer contact
}

export interface CatalogItem {
  id: string;
  title: string;
  category: string;
  description: string;
  defaultRate: number;
  unit: string;
  hsnSac: string;
  isCustom?: boolean;
}
