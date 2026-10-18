import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Quotation, getItemAmount } from '../types/quotation';
import { generateUpiQrDataUrl } from './upiQr';
import { amountToWordsIndian } from '../utils/numberToWords';
import { computeGstTaxBreakdown } from '../utils/gstTaxBreakdown';

export function buildQuotationHTML(quotation: Quotation, upiQrDataUrl?: string): string {
  const {
    quotationNumber,
    quotationDate,
    validUntil,
    eventDate,
    venue,
    company,
    client,
    lineItems,
    discountAmount = 0,
    taxScheme = 'cgst_sgst',
    taxRate = 18,
    shippingCharges = 0,
    notes,
    paymentTerms,
    documentType = 'quotation',
    invoiceNumber,
    advancePercentage = 70,
    advanceAmount,
    paidAmount = 0,
  } = quotation;

  const subtotal = lineItems.reduce((acc, item) => acc + getItemAmount(item), 0);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  
  const isZeroTax = taxScheme === 'none';
  const effectiveTaxRate = isZeroTax ? 0 : (taxRate || 0);
  let taxAmount = 0;
  let taxLabel = `GST (${effectiveTaxRate}%)`;
  let isSplitTax = false;
  let halfTaxRate = effectiveTaxRate / 2;
  let halfTaxAmount = 0;

  if (!isZeroTax && effectiveTaxRate > 0) {
    taxAmount = (discountedSubtotal * effectiveTaxRate) / 100;
    if (taxScheme === 'cgst_sgst') {
      isSplitTax = true;
      halfTaxRate = effectiveTaxRate / 2;
      halfTaxAmount = taxAmount / 2;
    } else if (taxScheme === 'igst') {
      taxLabel = `IGST (${effectiveTaxRate}%)`;
    }
  }

  const grandTotal = Math.max(0, discountedSubtotal + taxAmount + shippingCharges + (quotation.adjustmentAmount || 0));

  const fmt = (n: number) => '&#8377;' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nl2br = (s: string) => esc(s).replace(/\n/g, '<br/>');

  const rows = lineItems.map((item, idx) => {
    const itemTotal = getItemAmount(item);
    const itemRate = item.rate ?? (item.quantity ? itemTotal / item.quantity : itemTotal);
    return `
      <tr data-pdf-block="table-row" style="background:${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};border-bottom:1px solid #e2e8f0;">
        <td style="padding:7px 10px;font-size:11.5px;color:#64748b;text-align:center;">${idx + 1}</td>
        <td style="padding:7px 10px;font-size:11.5px;color:#0f172a;line-height:1.35;">
          <div style="font-weight:600;">${esc(item.description)}</div>
          ${item.hsnSac ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">HSN/SAC: ${esc(item.hsnSac)}</div>` : ''}
        </td>
        <td style="padding:7px 10px;text-align:center;font-size:11.5px;color:#0f172a;">${item.quantity || 1} ${item.unit ? `<span style="font-size:10px;color:#64748b;">${esc(item.unit)}</span>` : ''}</td>
        <td style="padding:7px 10px;text-align:right;font-size:11.5px;color:#0f172a;">${fmt(itemRate)}</td>
        <td style="padding:7px 10px;text-align:right;font-size:11.5px;font-weight:600;color:#0f172a;">${fmt(itemTotal)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div id="quotation-print-target" style="background:#ffffff;padding:24px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;width:800px;box-sizing:border-box;margin:0 auto;line-height:1.35;">
      
      <!-- Top Brand Header -->
      <div data-pdf-block="header" style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:14px;">
        <div style="flex:1;padding-right:24px;">
          ${company.logo ? `<img src="${company.logo}" style="height:48px;max-width:180px;object-fit:contain;margin-bottom:6px;display:block;" crossorigin="anonymous"/>` : ''}
          <div style="font-size:22px;font-weight:800;color:#1e3a8a;letter-spacing:-0.4px;">${esc(company.name)}</div>
          ${company.tagline ? `<div style="font-size:10.5px;color:#2563eb;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">${esc(company.tagline)}</div>` : ''}
          <div style="font-size:11px;color:#475569;line-height:1.45;">${nl2br(company.address)}</div>
          <div style="font-size:11px;color:#475569;margin-top:3px;">
            <span><strong>Phone:</strong> ${esc(company.phone)}</span>
            ${company.phoneAlt ? ` &bull; <span>${esc(company.phoneAlt)}</span>` : ''}
          </div>
          <div style="font-size:11px;color:#475569;"><strong>Email:</strong> ${esc(company.email)}</div>
          ${company.gstin ? `<div style="font-size:11px;color:#1e293b;margin-top:2px;font-weight:600;">GSTIN: ${esc(company.gstin)}</div>` : ''}
        </div>

        <div style="text-align:right;min-width:230px;">
          <!-- Badge -->
          <svg width="170" height="36" viewBox="0 0 170 36" style="display:inline-block;margin-bottom:8px;vertical-align:middle;">
            <rect width="170" height="36" rx="6" fill="${documentType === 'invoice' ? '#047857' : '#1e3a8a'}"/>
            <text x="85" y="19" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="${documentType === 'invoice' ? '14' : '15'}" font-weight="800" letter-spacing="1.2">
              ${documentType === 'invoice' ? 'TAX INVOICE' : 'QUOTATION'}
            </text>
          </svg>
          <table style="width:100%;font-size:11.5px;margin-top:2px;border-collapse:collapse;">
            <tr>
              <td style="text-align:right;color:#64748b;padding:2px 6px;">${documentType === 'invoice' ? 'Invoice No:' : 'Quote No:'}</td>
              <td style="text-align:right;font-weight:700;color:#0f172a;padding:2px 0;">${esc(documentType === 'invoice' ? (invoiceNumber || quotationNumber) : quotationNumber)}</td>
            </tr>
            <tr>
              <td style="text-align:right;color:#64748b;padding:2px 6px;">Date:</td>
              <td style="text-align:right;font-weight:600;color:#0f172a;padding:2px 0;">${esc(quotationDate)}</td>
            </tr>
            <tr>
              <td style="text-align:right;color:#64748b;padding:2px 6px;">Valid Until:</td>
              <td style="text-align:right;font-weight:600;color:#0f172a;padding:2px 0;">${esc(validUntil)}</td>
            </tr>
            ${quotation.revisionNumber && quotation.revisionNumber > 1 ? `
            <tr>
              <td style="text-align:right;color:#64748b;padding:2px 6px;">Revision:</td>
              <td style="text-align:right;font-weight:700;color:#1e40af;padding:2px 0;">Rev ${quotation.revisionNumber}${quotation.parentQuoteNumber ? ` <span style="font-size:9.5px;color:#64748b;font-weight:normal;">(${esc(quotation.parentQuoteNumber)})</span>` : ''}</td>
            </tr>` : ''}
            ${eventDate ? `
            <tr>
              <td style="text-align:right;color:#64748b;padding:2px 6px;">Event Date:</td>
              <td style="text-align:right;font-weight:600;color:#2563eb;padding:2px 0;">${esc(eventDate)}</td>
            </tr>` : ''}
          </table>
        </div>
      </div>

      <!-- Parties Row: Bill To & Event Details -->
      <div data-pdf-block="parties" style="display:flex;gap:14px;margin-bottom:14px;">
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:9px 12px;">
          <div style="font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">QUOTATION FOR (BILL TO):</div>
          <div style="font-size:13.5px;font-weight:700;color:#0f172a;">${esc(client.name)}</div>
          ${client.company ? `<div style="font-size:11px;font-weight:600;color:#334155;margin-bottom:2px;">${esc(client.company)}</div>` : ''}
          <div style="font-size:11px;color:#475569;line-height:1.4;">${nl2br(client.address)}</div>
          <div style="font-size:11px;color:#475569;margin-top:3px;">
            ${client.phone ? `<span><strong>Phone:</strong> ${esc(client.phone)}</span>` : ''}
            ${client.email ? ` &bull; <span>${esc(client.email)}</span>` : ''}
          </div>
          ${client.gstin ? `<div style="font-size:10.5px;color:#334155;margin-top:2px;font-weight:600;">Client GSTIN: ${esc(client.gstin)}</div>` : ''}
        </div>

        ${venue ? `
        <div style="width:260px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:9px 12px;">
          <div style="font-size:10px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">EVENT / SETUP VENUE:</div>
          <div style="font-size:11.5px;font-weight:600;color:#0f172a;line-height:1.4;">${nl2br(venue)}</div>
          ${eventDate ? `<div style="font-size:11px;color:#0369a1;margin-top:3px;font-weight:600;">Scheduled Date: ${esc(eventDate)}</div>` : ''}
        </div>` : ''}
      </div>

      <!-- Line Items Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <thead data-pdf-block="table-header">
          <tr style="background:#1e3a8a;color:#ffffff;">
            <th style="padding:7px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;width:35px;text-align:center;">#</th>
            <th style="padding:7px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;text-align:left;">Description of Setup / Equipment</th>
            <th style="padding:7px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;width:75px;text-align:center;">Qty</th>
            <th style="padding:7px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;width:100px;text-align:right;">Rate (₹)</th>
            <th style="padding:7px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;width:110px;text-align:right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Calculations and Bank Info Row -->
      <div data-pdf-block="finance" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:14px;">
        
        <!-- Left Column: Bank Details & Live UPI QR -->
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:9px 12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div style="flex:1;">
            <div style="font-size:10px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">BANK TRANSFER / UPI DETAILS</div>
            <table style="width:100%;font-size:11px;line-height:1.5;">
              <tr>
                <td style="color:#64748b;width:95px;">Account Name:</td>
                <td style="font-weight:600;color:#0f172a;">${esc(company.bankDetails.accountName)}</td>
              </tr>
              <tr>
                <td style="color:#64748b;">Bank Name:</td>
                <td style="font-weight:600;color:#0f172a;">${esc(company.bankDetails.bankName)}</td>
              </tr>
              <tr>
                <td style="color:#64748b;">Account No:</td>
                <td style="font-weight:700;color:#0f172a;letter-spacing:0.5px;">${esc(company.bankDetails.accountNumber)}</td>
              </tr>
              <tr>
                <td style="color:#64748b;">IFSC Code:</td>
                <td style="font-weight:700;color:#0f172a;">${esc(company.bankDetails.ifscCode)}</td>
              </tr>
              ${company.bankDetails.branch ? `
              <tr>
                <td style="color:#64748b;">Branch:</td>
                <td style="color:#334155;">${esc(company.bankDetails.branch)}</td>
              </tr>` : ''}
              ${company.bankDetails.upiId ? `
              <tr>
                <td style="color:#2563eb;font-weight:700;">UPI ID:</td>
                <td style="font-weight:700;color:#2563eb;">${esc(company.bankDetails.upiId)}</td>
              </tr>` : ''}
            </table>
            ${paymentTerms ? `
            <div style="margin-top:6px;padding-top:5px;border-top:1px dashed #cbd5e1;font-size:10px;color:#475569;">
              <strong style="color:#0f172a;">Payment Milestone:</strong> ${esc(paymentTerms)}
            </div>` : ''}
          </div>

          ${upiQrDataUrl ? `
          <div style="text-align:center;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;min-width:96px;">
            <img src="${upiQrDataUrl}" style="width:86px;height:86px;display:block;margin:0 auto;" />
            <div style="font-size:8.5px;font-weight:800;color:${quotation.allowCustomerEditQrAmount ? '#6366f1' : '#1e3a8a'};margin-top:3px;text-transform:uppercase;letter-spacing:0.4px;">
              ${quotation.allowCustomerEditQrAmount ? 'Open Amount' : `Scan &amp; Pay: ${fmt(quotation.customQrAmount && quotation.customQrAmount > 0 ? quotation.customQrAmount : (quotation.qrAmountType === 'advance' && quotation.enablePaymentLedger && quotation.advanceAmount ? quotation.advanceAmount : grandTotal))}`}
            </div>
            <div style="font-size:7.5px;color:#64748b;margin-top:1px;">
              ${quotation.allowCustomerEditQrAmount ? 'Enter amount on scan' : 'PhonePe &bull; GPay &bull; Paytm'}
            </div>
          </div>
          ` : ''}
        </div>

        <!-- Right Column: Totals & Ledger -->
        <div style="width:300px;">
          <table style="width:100%;font-size:11px;border-collapse:collapse;">
            <tr>
              <td style="padding:3px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Subtotal:</td>
              <td style="padding:3px 0;text-align:right;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${fmt(subtotal)}</td>
            </tr>
            ${discountAmount > 0 ? `
            <tr>
              <td style="padding:3px 0;color:#16a34a;border-bottom:1px solid #e2e8f0;">Discount:</td>
              <td style="padding:3px 0;text-align:right;color:#16a34a;font-weight:600;border-bottom:1px solid #e2e8f0;">-${fmt(discountAmount)}</td>
            </tr>` : ''}
            ${isSplitTax ? `
            <tr>
              <td style="padding:3px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">CGST (${halfTaxRate}%):</td>
              <td style="padding:3px 0;text-align:right;color:#0f172a;border-bottom:1px solid #e2e8f0;">${fmt(halfTaxAmount)}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">SGST (${halfTaxRate}%):</td>
              <td style="padding:3px 0;text-align:right;color:#0f172a;border-bottom:1px solid #e2e8f0;">${fmt(halfTaxAmount)}</td>
            </tr>` : (taxRate > 0 ? `
            <tr>
              <td style="padding:3px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">${taxLabel}:</td>
              <td style="padding:3px 0;text-align:right;color:#0f172a;border-bottom:1px solid #e2e8f0;">${fmt(taxAmount)}</td>
            </tr>` : '')}
            ${shippingCharges > 0 ? `
            <tr>
              <td style="padding:3px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Logistics & Transportation:</td>
              <td style="padding:3px 0;text-align:right;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${fmt(shippingCharges)}</td>
            </tr>` : ''}
            ${quotation.adjustmentAmount ? `
            <tr>
              <td style="padding:3px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Adjustment / Round-off:</td>
              <td style="padding:3px 0;text-align:right;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${quotation.adjustmentAmount > 0 ? '+' : ''}${fmt(quotation.adjustmentAmount)}</td>
            </tr>` : ''}
          </table>

          <div style="padding:8px 12px;background:#1e3a8a;color:#ffffff;border-radius:6px;margin-top:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:700;font-size:11.5px;letter-spacing:0.5px;">TOTAL PAYABLE:</span>
              <span style="font-weight:800;font-size:15.5px;">${fmt(grandTotal)}</span>
            </div>
            <div style="font-size:8.5px;color:#bfdbfe;font-style:italic;margin-top:4px;padding-top:3px;border-top:1px solid rgba(255,255,255,0.25);line-height:1.25;">
              ${esc(amountToWordsIndian(grandTotal))}
            </div>
          </div>

          <!-- Milestones Ledger Breakdown (Optional - only when enablePaymentLedger is true) -->
          ${quotation.enablePaymentLedger ? `
          <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;margin-top:8px;font-size:10px;">
            <div style="display:flex;justify-content:space-between;color:#1e3a8a;font-weight:600;">
              <span>Advance Required (${advancePercentage}%):</span>
              <span>${fmt(advanceAmount && advanceAmount <= grandTotal && advanceAmount > 0 ? advanceAmount : Math.round(grandTotal * (advancePercentage / 100)))}</span>
            </div>
            <div style="display:flex;justify-content:space-between;color:#64748b;margin-top:2px;">
              <span>Balance on Delivery (${100 - advancePercentage}%):</span>
              <span>${fmt(Math.max(0, grandTotal - (advanceAmount && advanceAmount <= grandTotal && advanceAmount > 0 ? advanceAmount : Math.round(grandTotal * (advancePercentage / 100)))))}</span>
            </div>
            ${paidAmount > 0 ? `
            <div style="display:flex;justify-content:space-between;color:#15803d;font-weight:700;margin-top:4px;padding-top:3px;border-top:1px dashed #cbd5e1;">
              <span>Amount Received:</span>
              <span>-${fmt(paidAmount)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;color:#b91c1c;font-weight:800;margin-top:1px;">
              <span>Balance Due:</span>
              <span>${fmt(Math.max(0, grandTotal - paidAmount))}</span>
            </div>` : ''}
          </div>
          ` : ''}
        </div>

      </div>

      <!-- B2B GST Breakout Table (Only when GST is active) -->
      ${(() => {
        const gstBreakdown = computeGstTaxBreakdown(quotation);
        if (!gstBreakdown.hasTax) return '';
        return `
        <div data-pdf-block="gst-breakdown" style="margin-bottom:14px;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;font-size:9.5px;">
          <div style="background:#f1f5f9;padding:4px 8px;font-weight:700;color:#1e3a8a;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #cbd5e1;">
            TAX INVOICE GST BREAKDOWN (HSN / SAC SUMMARY)
          </div>
          <table style="width:100%;border-collapse:collapse;text-align:right;">
            <thead>
              <tr style="background:#f8fafc;color:#475569;font-weight:600;border-bottom:1px solid #cbd5e1;font-size:9px;">
                <th style="padding:4px 8px;text-align:left;">HSN/SAC</th>
                <th style="padding:4px 8px;">Taxable Value</th>
                ${gstBreakdown.isSplitTax ? `
                <th style="padding:4px 8px;">CGST Rate</th>
                <th style="padding:4px 8px;">CGST Amount</th>
                <th style="padding:4px 8px;">SGST Rate</th>
                <th style="padding:4px 8px;">SGST Amount</th>
                ` : `
                <th style="padding:4px 8px;">IGST Rate</th>
                <th style="padding:4px 8px;">IGST Amount</th>
                `}
                <th style="padding:4px 8px;">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              ${gstBreakdown.rows.map(r => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:4px 8px;text-align:left;font-weight:600;color:#0f172a;">${esc(r.hsnSac)}</td>
                <td style="padding:4px 8px;">${fmt(r.taxableAmount)}</td>
                ${gstBreakdown.isSplitTax ? `
                <td style="padding:4px 8px;">${r.cgstRate}%</td>
                <td style="padding:4px 8px;">${fmt(r.cgstAmount || 0)}</td>
                <td style="padding:4px 8px;">${r.sgstRate}%</td>
                <td style="padding:4px 8px;">${fmt(r.sgstAmount || 0)}</td>
                ` : `
                <td style="padding:4px 8px;">${r.igstRate}%</td>
                <td style="padding:4px 8px;">${fmt(r.igstAmount || 0)}</td>
                `}
                <td style="padding:4px 8px;font-weight:600;color:#0f172a;">${fmt(r.totalTax)}</td>
              </tr>
              `).join('')}
              <tr style="background:#f8fafc;font-weight:700;color:#0f172a;border-top:1px solid #cbd5e1;">
                <td style="padding:4px 8px;text-align:left;">Total</td>
                <td style="padding:4px 8px;">${fmt(gstBreakdown.totalTaxableAmount)}</td>
                ${gstBreakdown.isSplitTax ? `
                <td></td>
                <td style="padding:4px 8px;">${fmt(gstBreakdown.totalCgstAmount)}</td>
                <td></td>
                <td style="padding:4px 8px;">${fmt(gstBreakdown.totalSgstAmount)}</td>
                ` : `
                <td></td>
                <td style="padding:4px 8px;">${fmt(gstBreakdown.totalIgstAmount)}</td>
                `}
                <td style="padding:4px 8px;">${fmt(gstBreakdown.totalTaxAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        `;
      })()}

      <!-- Terms & Signature Row -->
      <div data-pdf-block="terms-sig" style="display:flex;gap:14px;align-items:flex-start;border-top:1px solid #cbd5e1;padding-top:12px;margin-bottom:28px;">
        
        <!-- Terms -->
        <div style="flex:1;">
          <div style="font-size:10px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">TERMS &amp; CONDITIONS</div>
          <div style="font-size:9.5px;line-height:1.55;color:#475569;background:#f8fafc;padding:10px 12px 14px 12px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:8px;">
            ${nl2br(notes)}
          </div>
        </div>

        <!-- Signatures Column -->
        <div style="width:230px;display:flex;flex-direction:column;gap:12px;">
          <!-- Company Signatory -->
          <div style="text-align:center;padding-top:4px;">
            <div style="font-size:11px;font-weight:700;color:#1e3a8a;margin-bottom:30px;">For ${esc(company.name)}</div>
            <div style="border-top:1px solid #94a3b8;width:85%;margin:0 auto;padding-top:4px;">
              <span style="font-size:9.5px;color:#64748b;font-weight:600;">Authorized Signatory</span>
            </div>
          </div>

          <!-- Client Signature & Acceptance -->
          ${quotation.clientSignature ? `
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;text-align:center;">
            <div style="font-size:8.5px;font-weight:800;color:#16a34a;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px;">
              &#10003; Client Acceptance &amp; Sign-off
            </div>
            <img src="${quotation.clientSignature.dataUrl}" style="height:36px;max-width:140px;object-fit:contain;margin:2px auto;display:block;" />
            <div style="font-size:9.5px;font-weight:700;color:#0f172a;margin-top:2px;">
              ${esc(quotation.clientSignature.signerName || quotation.client?.name || 'Client Signatory')}
            </div>
            <div style="font-size:8px;color:#64748b;">
              Signed: ${new Date(quotation.clientSignature.signedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          ` : `
          <div style="border:1px dashed #cbd5e1;border-radius:6px;padding:8px;text-align:center;">
            <div style="font-size:8.5px;font-weight:600;color:#64748b;margin-bottom:26px;">Customer Acceptance Signature</div>
            <div style="border-top:1px solid #cbd5e1;width:80%;margin:0 auto;padding-top:3px;">
              <span style="font-size:8px;color:#94a3b8;">Authorized Sign &amp; Stamp</span>
            </div>
          </div>
          `}
        </div>

      </div>

      <!-- Footer Note -->
      <div data-pdf-block="footer" style="text-align:center;font-size:9.5px;color:#94a3b8;border-top:1px dashed #e2e8f0;padding-top:10px;margin-top:6px;">
        This quotation is computer generated by Tisha LED Walls Quotation Management System.
      </div>

    </div>
  `;
}

// Compute accurate offsetTop within root container
function getElementOffsetTop(el: HTMLElement, root: HTMLElement): number {
  let top = 0;
  let curr: HTMLElement | null = el;
  while (curr && curr !== root) {
    top += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement | null;
  }
  return top;
}

export async function generateQuotationPDFDoc(quotation: Quotation): Promise<{ pdf: jsPDF; filename: string }> {
  let upiQrDataUrl = '';
  // Only generate QR code when enableUpiQr switch is ON (optional feature)
  if (quotation.enableUpiQr && quotation.company?.bankDetails?.upiId) {
    const isZeroTax = quotation.taxScheme === 'none';
    const effectiveTaxRate = isZeroTax ? 0 : (quotation.taxRate || 0);
    const subtotal = quotation.lineItems.reduce((acc, item) => acc + getItemAmount(item), 0);
    const discountedSubtotal = Math.max(0, subtotal - (quotation.discountAmount || 0));
    const taxAmount = isZeroTax ? 0 : (discountedSubtotal * effectiveTaxRate) / 100;
    const grandTotal = Math.max(0, discountedSubtotal + taxAmount + (quotation.shippingCharges || 0) + (quotation.adjustmentAmount || 0));
    
    const advancePercentage = quotation.advancePercentage ?? 70;
    const computedAdvanceAmt = Math.round(grandTotal * (advancePercentage / 100));
    const effectiveAdvanceAmt = quotation.advanceAmount && quotation.advanceAmount <= grandTotal && quotation.advanceAmount > 0
      ? quotation.advanceAmount
      : computedAdvanceAmt;

    const qrTargetAmount = quotation.allowCustomerEditQrAmount
      ? undefined
      : (quotation.customQrAmount !== undefined && quotation.customQrAmount > 0
          ? quotation.customQrAmount
          : (quotation.qrAmountType === 'advance' && quotation.enablePaymentLedger
              ? effectiveAdvanceAmt
              : grandTotal));

    upiQrDataUrl = await generateUpiQrDataUrl({
      upiId: quotation.company.bankDetails.upiId,
      payeeName: quotation.company.bankDetails.accountName || quotation.company.name,
      amount: qrTargetAmount,
      transactionNote: `${quotation.documentType === 'invoice' ? 'Inv' : 'Quote'} ${quotation.documentType === 'invoice' ? (quotation.invoiceNumber || quotation.quotationNumber) : quotation.quotationNumber}`,
    }, 200);
  }

  const html = buildQuotationHTML(quotation, upiQrDataUrl);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;top:0;left:-9999px;z-index:-1;pointer-events:none;background:#ffffff;';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  const captureEl = wrapper.firstElementChild as HTMLElement;

  try {
    const canvas = await html2canvas(captureEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: captureEl.scrollWidth,
      height: captureEl.scrollHeight,
      windowWidth: captureEl.scrollWidth,
      windowHeight: captureEl.scrollHeight,
    });

    const PDF_W_MM = 210;
    const PDF_H_MM = 297;
    const canvasW = canvas.width;
    const pageHeightPx = Math.round((PDF_H_MM / PDF_W_MM) * canvasW);
    const scaleFactor = canvas.height / captureEl.offsetHeight;

    // Collect all atomic content blocks using accurate DOM offsetTop
    const blockEls = Array.from(captureEl.querySelectorAll('[data-pdf-block]')) as HTMLElement[];
    const blocks = blockEls.map((el) => {
      const elTop = getElementOffsetTop(el, captureEl);
      const elHeight = el.offsetHeight;
      return {
        top: Math.round(elTop * scaleFactor),
        bottom: Math.round((elTop + elHeight) * scaleFactor),
      };
    }).sort((a, b) => a.top - b.top);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let currentSrcY = 0;
    let pageIndex = 0;
    const bottomMarginPx = Math.round(16 * scaleFactor);

    while (currentSrcY < canvas.height) {
      const remainingH = canvas.height - currentSrcY;
      const topPaddingPx = pageIndex === 0 ? 0 : Math.round(16 * scaleFactor);
      const availablePageH = pageHeightPx - topPaddingPx - bottomMarginPx;

      // If remaining content fits completely on this page
      if (remainingH <= (pageHeightPx - topPaddingPx)) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasW;
        pageCanvas.height = pageHeightPx;
        const ctx = pageCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, pageHeightPx);
        ctx.drawImage(canvas, 0, currentSrcY, canvasW, remainingH, 0, topPaddingPx, canvasW, remainingH);

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.98);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, PDF_W_MM, PDF_H_MM);
        break;
      }

      // If content overflows, find a safe break point that does NOT slice through any block
      const candidateCutY = currentSrcY + availablePageH;
      let safeCutY = candidateCutY;

      // Find any block that straddles candidateCutY
      const straddling = blocks.find(b => b.top < candidateCutY && b.bottom > candidateCutY);
      if (straddling && straddling.top > currentSrcY + 40) {
        // Cut right above this block so it starts cleanly on the next page
        safeCutY = straddling.top - 4;
      }

      const sliceH = safeCutY - currentSrcY;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvasW;
      pageCanvas.height = pageHeightPx;
      const ctx = pageCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, pageHeightPx);
      ctx.drawImage(canvas, 0, currentSrcY, canvasW, sliceH, 0, topPaddingPx, canvasW, sliceH);

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.98);
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, PDF_W_MM, PDF_H_MM);

      currentSrcY = safeCutY;
      pageIndex++;
    }

    const filename = `${quotation.quotationNumber || 'Quotation'}_${(quotation.client?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    return { pdf, filename };
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}

export async function exportQuotationPDF(quotation: Quotation): Promise<void> {
  const { pdf, filename } = await generateQuotationPDFDoc(quotation);
  pdf.save(filename);
}

export async function generateQuotationPDFFile(quotation: Quotation): Promise<{ file: File; blob: Blob; filename: string }> {
  const { pdf, filename } = await generateQuotationPDFDoc(quotation);
  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  return { file, blob, filename };
}
