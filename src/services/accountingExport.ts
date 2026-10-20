import { Quotation } from '../types/quotation';
import { calculateQuotationTotals } from '../utils/receiptHelper';
import { parseDateStr } from '../utils/quotationExpiry';

// Helper to escape CSV fields
function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Format date to DD-MMM-YYYY for GST Portal (e.g. 20-Oct-2026)
export function formatGstDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = parseDateStr(dateStr) || new Date(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatTallyDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = parseDateStr(dateStr) || new Date(dateStr);
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`; // YYYYMMDD
}

/**
 * Generates GSTR-1 Excel-compatible CSV string with UTF-8 BOM
 */
export function generateGstr1Csv(quotations: Quotation[]): string {
  const headers = [
    'GSTIN/UIN of Recipient',
    'Receiver Name',
    'Invoice / Quote Number',
    'Invoice Date',
    'Invoice Value',
    'Place Of Supply',
    'Reverse Charge',
    'Applicable % of Tax Rate',
    'Invoice Type',
    'E-Commerce GSTIN',
    'Rate',
    'Taxable Value',
    'Cess Amount',
    'Integrated Tax (IGST)',
    'Central Tax (CGST)',
    'State/UT Tax (SGST)',
  ];

  const rows: string[] = [headers.map(csvEscape).join(',')];

  for (const quote of quotations) {
    const { discountedSubtotal, taxAmount, grandTotal } = calculateQuotationTotals(quote);

    const clientGst = quote.client.gstin || (quote.client as any).gstNumber || '';
    const isB2B = Boolean(clientGst && clientGst.trim().length >= 15);
    const invoiceType = isB2B ? 'Regular B2B' : 'B2C (Small)';
    const gstin = clientGst;
    const receiverName = quote.client.company || quote.client.name || 'Client';
    const invoiceNum = quote.invoiceNumber || quote.quotationNumber;
    const invoiceDate = formatGstDate(quote.invoiceDate || quote.quotationDate);
    const isInterState = quote.taxScheme === 'igst';

    let igst = 0;
    let cgst = 0;
    let sgst = 0;

    if (quote.taxScheme !== 'none' && (quote.taxRate || 0) > 0) {
      if (isInterState) {
        igst = taxAmount;
      } else {
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
      }
    }

    const pos = quote.venue?.includes(',') ? quote.venue.split(',').pop()?.trim() : '06-Haryana';

    const row = [
      gstin,
      receiverName,
      invoiceNum,
      invoiceDate,
      grandTotal.toFixed(2),
      pos,
      'N', // Reverse Charge
      '', // Applicable %
      invoiceType,
      '', // E-Commerce GSTIN
      quote.taxScheme === 'none' ? '0' : String(quote.taxRate || 18),
      discountedSubtotal.toFixed(2),
      '0.00', // Cess
      igst.toFixed(2),
      cgst.toFixed(2),
      sgst.toFixed(2),
    ];

    rows.push(row.map(csvEscape).join(','));
  }

  // Prepend UTF-8 BOM so Excel opens Hindi / special symbols and formatting cleanly
  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Generates Tally Prime XML for Sales and Receipts
 */
export function generateTallyXml(quotations: Quotation[]): string {
  const companyName = quotations[0]?.company.name || 'Tisha LED Walls';

  let vouchersXml = '';

  for (const quote of quotations) {
    const { discountedSubtotal, taxAmount, grandTotal } = calculateQuotationTotals(quote);
    const tallyDate = formatTallyDate(quote.invoiceDate || quote.quotationDate);
    const voucherNum = quote.invoiceNumber || quote.quotationNumber;
    const clientName = (quote.client.company || quote.client.name || 'Sundry Debtor').replace(/&/g, '&amp;');
    const isInterState = quote.taxScheme === 'igst';

    let igst = 0;
    let cgst = 0;
    let sgst = 0;

    if (quote.taxScheme !== 'none' && (quote.taxRate || 0) > 0) {
      if (isInterState) {
        igst = taxAmount;
      } else {
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
      }
    }

    // 1. Sales Voucher
    vouchersXml += `
      <VOUCHER VCHTYPE="Sales" ACTION="Create">
        <DATE>${tallyDate}</DATE>
        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${voucherNum}</VOUCHERNUMBER>
        <REFERENCE>${voucherNum}</REFERENCE>
        <PARTYLEDGERNAME>${clientName}</PARTYLEDGERNAME>
        <NARRATION>Quotation #${quote.quotationNumber} - ${quote.venue ? `Venue: ${quote.venue.replace(/&/g, '&amp;')}` : 'LED Screen Rental'}</NARRATION>
        
        <!-- Party Debit Ledger -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${clientName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${grandTotal.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <!-- Sales Credit Ledger -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>LED Screen Rental Services</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${discountedSubtotal.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
    `;

    if (cgst > 0) {
      vouchersXml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>CGST Output (${(quote.taxRate || 18) / 2}%)</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${cgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      `;
    }

    if (sgst > 0) {
      vouchersXml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>SGST Output (${(quote.taxRate || 18) / 2}%)</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${sgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      `;
    }

    if (igst > 0) {
      vouchersXml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>IGST Output (${quote.taxRate || 18}%)</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${igst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      `;
    }

    if (quote.shippingCharges && quote.shippingCharges > 0) {
      vouchersXml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Transportation &amp; Freight Charges</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${quote.shippingCharges.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      `;
    }

    if (quote.adjustmentAmount) {
      vouchersXml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Round Off</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${quote.adjustmentAmount < 0 ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
          <AMOUNT>${Math.abs(quote.adjustmentAmount).toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      `;
    }

    vouchersXml += `
      </VOUCHER>
    `;

    // 2. Receipt Voucher (if payment was logged)
    if (quote.paidAmount && quote.paidAmount > 0) {
      const receiptDate = formatTallyDate(quote.paymentDate || quote.quotationDate);
      const bankLedger = quote.paymentMode === 'cash' ? 'Cash' : (quote.company.bankDetails?.bankName || 'Bank A/c');

      vouchersXml += `
        <VOUCHER VCHTYPE="Receipt" ACTION="Create">
          <DATE>${receiptDate}</DATE>
          <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
          <VOUCHERNUMBER>REC-${voucherNum}</VOUCHERNUMBER>
          <PARTYLEDGERNAME>${clientName}</PARTYLEDGERNAME>
          <NARRATION>Payment received via ${quote.paymentMode || 'UPI'} against Quote #${quote.quotationNumber} ${quote.transactionRef ? `Ref: ${quote.transactionRef.replace(/&/g, '&amp;')}` : ''}</NARRATION>
          
          <!-- Bank/Cash Debit -->
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${bankLedger.replace(/&/g, '&amp;')}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${quote.paidAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>

          <!-- Client Credit -->
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${clientName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${quote.paidAmount.toFixed(2)}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>
      `;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName.replace(/&/g, '&amp;')}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        ${vouchersXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
