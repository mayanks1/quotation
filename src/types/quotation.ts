export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'invoiced';

export type TaxScheme = 'none' | 'gst_18' | 'gst_12' | 'gst_5' | 'cgst_sgst' | 'igst' | 'custom';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
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

export interface Quotation {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  eventDate?: string;
  venue?: string;
  status: QuotationStatus;
  
  // Parties
  company: CompanyProfile;
  client: ClientProfile;
  
  // Items & Money
  lineItems: LineItem[];
  discountAmount: number;
  taxScheme: TaxScheme;
  taxRate: number; // percentage, e.g. 18
  shippingCharges: number;
  
  // Terms & Payment
  notes: string;
  paymentTerms: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
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
