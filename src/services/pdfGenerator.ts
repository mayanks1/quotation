import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Quotation } from '../types/quotation';

export function buildQuotationHTML(quotation: Quotation): string {
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
  } = quotation;

  const subtotal = lineItems.reduce((acc, item) => acc + item.quantity * item.rate, 0);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  
  let taxAmount = 0;
  let taxLabel = `GST (${taxRate}%)`;
  let isSplitTax = false;
  let halfTaxRate = taxRate / 2;
  let halfTaxAmount = 0;

  if (taxRate > 0) {
    taxAmount = (discountedSubtotal * taxRate) / 100;
    if (taxScheme === 'cgst_sgst') {
      isSplitTax = true;
      halfTaxRate = taxRate / 2;
      halfTaxAmount = taxAmount / 2;
    } else if (taxScheme === 'igst') {
      taxLabel = `IGST (${taxRate}%)`;
    }
  }

  const grandTotal = discountedSubtotal + taxAmount + shippingCharges;

  const fmt = (n: number) => '&#8377;' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nl2br = (s: string) => esc(s).replace(/\n/g, '<br/>');

  const rows = lineItems.map((item, idx) => {
    const itemTotal = item.quantity * item.rate;
    return `
      <tr style="background:${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 12px;font-size:12px;color:#64748b;text-align:center;">${idx + 1}</td>
        <td style="padding:10px 12px;font-size:12px;color:#0f172a;line-height:1.5;">
          <div style="font-weight:600;">${esc(item.description)}</div>
          ${item.hsnSac ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">HSN/SAC: ${esc(item.hsnSac)}</div>` : ''}
        </td>
        <td style="padding:10px 12px;text-align:center;font-size:12px;color:#0f172a;">${item.quantity} ${item.unit ? `<span style="font-size:10px;color:#64748b;">${esc(item.unit)}</span>` : ''}</td>
        <td style="padding:10px 12px;text-align:right;font-size:12px;color:#0f172a;">${fmt(item.rate)}</td>
        <td style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#0f172a;">${fmt(itemTotal)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div id="quotation-print-target" style="background:#ffffff;padding:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;width:820px;box-sizing:border-box;margin:0 auto;line-height:1.4;">
      
      <!-- Top Brand Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2563eb;padding-bottom:20px;margin-bottom:24px;">
        <div style="flex:1;padding-right:30px;">
          ${company.logo ? `<img src="${company.logo}" style="height:56px;max-width:200px;object-fit:contain;margin-bottom:10px;display:block;" crossorigin="anonymous"/>` : ''}
          <div style="font-size:24px;font-weight:800;color:#1e3a8a;letter-spacing:-0.5px;">${esc(company.name)}</div>
          ${company.tagline ? `<div style="font-size:11px;color:#2563eb;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">${esc(company.tagline)}</div>` : ''}
          <div style="font-size:12px;color:#475569;line-height:1.6;">${nl2br(company.address)}</div>
          <div style="font-size:12px;color:#475569;margin-top:4px;">
            <span><strong>Phone:</strong> ${esc(company.phone)}</span>
            ${company.phoneAlt ? ` &bull; <span>${esc(company.phoneAlt)}</span>` : ''}
          </div>
          <div style="font-size:12px;color:#475569;"><strong>Email:</strong> ${esc(company.email)}</div>
          ${company.gstin ? `<div style="font-size:11px;color:#1e293b;margin-top:2px;font-weight:600;">GSTIN: ${esc(company.gstin)}</div>` : ''}
        </div>

        <div style="text-align:right;min-width:240px;">
          <div style="display:inline-block;background:#1e3a8a;color:#ffffff;padding:6px 16px;border-radius:6px;font-size:20px;font-weight:800;letter-spacing:1px;margin-bottom:12px;">QUOTATION</div>
          <table style="width:100%;font-size:12px;margin-top:4px;border-collapse:collapse;">
            <tr>
              <td style="text-align:right;color:#64748b;padding:3px 6px;">Quote No:</td>
              <td style="text-align:right;font-weight:700;color:#0f172a;padding:3px 0;">${esc(quotationNumber)}</td>
            </tr>
            <tr>
              <td style="text-align:right;color:#64748b;padding:3px 6px;">Date:</td>
              <td style="text-align:right;font-weight:600;color:#0f172a;padding:3px 0;">${esc(quotationDate)}</td>
            </tr>
            <tr>
              <td style="text-align:right;color:#64748b;padding:3px 6px;">Valid Until:</td>
              <td style="text-align:right;font-weight:600;color:#0f172a;padding:3px 0;">${esc(validUntil)}</td>
            </tr>
            ${eventDate ? `
            <tr>
              <td style="text-align:right;color:#64748b;padding:3px 6px;">Event Date:</td>
              <td style="text-align:right;font-weight:600;color:#2563eb;padding:3px 0;">${esc(eventDate)}</td>
            </tr>` : ''}
          </table>
        </div>
      </div>

      <!-- Parties Row: Bill To & Event Details -->
      <div style="display:flex;gap:20px;margin-bottom:24px;">
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;">
          <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">QUOTATION FOR (BILL TO):</div>
          <div style="font-size:15px;font-weight:700;color:#0f172a;">${esc(client.name)}</div>
          ${client.company ? `<div style="font-size:12px;font-weight:600;color:#334155;margin-bottom:4px;">${esc(client.company)}</div>` : ''}
          <div style="font-size:12px;color:#475569;line-height:1.5;">${nl2br(client.address)}</div>
          <div style="font-size:12px;color:#475569;margin-top:4px;">
            ${client.phone ? `<span><strong>Phone:</strong> ${esc(client.phone)}</span>` : ''}
            ${client.email ? ` &bull; <span>${esc(client.email)}</span>` : ''}
          </div>
          ${client.gstin ? `<div style="font-size:11px;color:#334155;margin-top:3px;font-weight:600;">Client GSTIN: ${esc(client.gstin)}</div>` : ''}
        </div>

        ${venue ? `
        <div style="width:280px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;">
          <div style="font-size:11px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">EVENT / SETUP VENUE:</div>
          <div style="font-size:13px;font-weight:600;color:#0f172a;line-height:1.5;">${nl2br(venue)}</div>
          ${eventDate ? `<div style="font-size:12px;color:#0369a1;margin-top:6px;font-weight:600;">Scheduled Date: ${esc(eventDate)}</div>` : ''}
        </div>` : ''}
      </div>

      <!-- Line Items Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#1e3a8a;color:#ffffff;">
            <th style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;width:35px;text-align:center;">#</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;text-align:left;">Description of Setup / Equipment</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;width:80px;text-align:center;">Qty</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;width:110px;text-align:right;">Rate (₹)</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;width:120px;text-align:right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Calculations and Bank Info Row -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;gap:20px;">
        
        <!-- Left Column: Bank Details & UPI -->
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;">
          <div style="font-size:11px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">BANK TRANSFER / UPI DETAILS</div>
          <table style="width:100%;font-size:12px;line-height:1.7;">
            <tr>
              <td style="color:#64748b;width:100px;">Account Name:</td>
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
          <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1;font-size:11px;color:#475569;">
            <strong style="color:#0f172a;">Payment Milestone:</strong> ${esc(paymentTerms)}
          </div>` : ''}
        </div>

        <!-- Right Column: Totals -->
        <div style="width:320px;">
          <table style="width:100%;font-size:12px;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Subtotal:</td>
              <td style="padding:6px 0;text-align:right;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${fmt(subtotal)}</td>
            </tr>
            ${discountAmount > 0 ? `
            <tr>
              <td style="padding:6px 0;color:#16a34a;border-bottom:1px solid #e2e8f0;">Discount:</td>
              <td style="padding:6px 0;text-align:right;color:#16a34a;font-weight:600;border-bottom:1px solid #e2e8f0;">-${fmt(discountAmount)}</td>
            </tr>` : ''}
            ${isSplitTax ? `
            <tr>
              <td style="padding:6px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">CGST (${halfTaxRate}%):</td>
              <td style="padding:6px 0;text-align:right;color:#0f172a;border-bottom:1px solid #e2e8f0;">${fmt(halfTaxAmount)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">SGST (${halfTaxRate}%):</td>
              <td style="padding:6px 0;text-align:right;color:#0f172a;border-bottom:1px solid #e2e8f0;">${fmt(halfTaxAmount)}</td>
            </tr>` : (taxRate > 0 ? `
            <tr>
              <td style="padding:6px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">${taxLabel}:</td>
              <td style="padding:6px 0;text-align:right;color:#0f172a;border-bottom:1px solid #e2e8f0;">${fmt(taxAmount)}</td>
            </tr>` : '')}
            ${shippingCharges > 0 ? `
            <tr>
              <td style="padding:6px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Logistics & Transportation:</td>
              <td style="padding:6px 0;text-align:right;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${fmt(shippingCharges)}</td>
            </tr>` : ''}
          </table>

          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#1e3a8a;color:#ffffff;border-radius:8px;margin-top:12px;">
            <span style="font-weight:700;font-size:13px;letter-spacing:0.5px;">TOTAL PAYABLE:</span>
            <span style="font-weight:800;font-size:18px;">${fmt(grandTotal)}</span>
          </div>
        </div>

      </div>

      <!-- Terms & Signature Row -->
      <div style="display:flex;gap:20px;align-items:flex-start;border-top:1px solid #cbd5e1;padding-top:18px;">
        
        <!-- Terms -->
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">TERMS &amp; CONDITIONS</div>
          <div style="font-size:10px;line-height:1.7;color:#475569;background:#f8fafc;padding:10px 14px;border-radius:6px;border:1px solid #e2e8f0;">
            ${nl2br(notes)}
          </div>
        </div>

        <!-- Signature Box -->
        <div style="width:240px;text-align:center;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#1e3a8a;margin-bottom:45px;">For ${esc(company.name)}</div>
          <div style="border-top:1px solid #94a3b8;width:80%;margin:0 auto;padding-top:4px;">
            <span style="font-size:11px;color:#64748b;font-weight:600;">Authorized Signatory</span>
          </div>
        </div>

      </div>

      <!-- Footer Note -->
      <div style="margin-top:20px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px dashed #e2e8f0;padding-top:8px;">
        This quotation is computer generated by Tisha LED Walls Quotation Management System.
      </div>

    </div>
  `;
}

export async function exportQuotationPDF(quotation: Quotation): Promise<void> {
  const html = buildQuotationHTML(quotation);

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

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let srcY = 0;
    let pageIndex = 0;

    while (srcY < canvas.height) {
      const sliceH = Math.min(pageHeightPx, canvas.height - srcY);

      const slice = document.createElement('canvas');
      slice.width = canvasW;
      slice.height = sliceH;
      const ctx = slice.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, sliceH);
      ctx.drawImage(canvas, 0, srcY, canvasW, sliceH, 0, 0, canvasW, sliceH);

      const imgData = slice.toDataURL('image/jpeg', 0.95);
      const sliceHMM = (sliceH / canvasW) * PDF_W_MM;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, PDF_W_MM, sliceHMM);

      srcY += sliceH;
      pageIndex++;
    }

    const filename = `${quotation.quotationNumber || 'Quotation'}_${(quotation.client?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    pdf.save(filename);
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}
