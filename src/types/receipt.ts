import { ClientProfile, CompanyProfile, PaymentMode } from './quotation';

export type ReceiptMilestone = 'advance' | 'balance' | 'full' | 'partial';

export interface PaymentReceipt {
  id: string;
  receiptNumber: string; // e.g. REC-2026-0867
  receiptDate: string; // YYYY-MM-DD
  quotationId: string;
  quotationNumber: string;
  invoiceNumber?: string;
  
  // Parties
  client: ClientProfile;
  company: CompanyProfile;
  
  // Financials
  amountPaid: number;
  paymentMode: PaymentMode;
  transactionRef?: string;
  paymentMilestone: ReceiptMilestone;
  totalPayable: number;
  previousPaid: number;
  remainingBalance: number;
  
  // Event Reference
  eventDate?: string;
  venue?: string;
  notes?: string;
  
  // Metadata
  createdAt: string;
}
