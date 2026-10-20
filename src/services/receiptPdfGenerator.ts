import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PaymentReceipt } from '../types/receipt';
import { amountToWordsIndian } from '../utils/numberToWords';
import { OFFICIAL_TISHA_STAMP } from '../config/officialStamp';

export function buildReceiptHTML(receipt: PaymentReceipt): string {
  const {
    receiptNumber,
    receiptDate,
    quotationNumber,
    invoiceNumber,
    client,
    company,
    amountPaid,
    paymentMode,
    transactionRef,
    paymentMilestone,
    totalPayable,
    previousPaid = 0,
    remainingBalance,
    eventDate,
    venue,
    notes,
  } = receipt;

  const fmt = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const modeLabels: Record<string, string> = {
    upi: 'UPI / QR Code',
    bank_transfer: 'Bank Transfer (NEFT / RTGS / IMPS)',
    cash: 'Cash',
    cheque: 'Cheque',
  };

  const milestoneLabels: Record<string, string> = {
    advance: 'Advance Booking Milestone',
    balance: 'Final Balance Settlement',
    full: 'Full Payment Settlement',
    partial: 'Partial Payment',
  };

  const stampImg = company.signature || (company as any).stampUrl || OFFICIAL_TISHA_STAMP;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; color: #0f172a; width: 800px; padding: 40px; box-sizing: border-box; line-height: 1.45;">
      
      <!-- Top Decorative Accent -->
      <div style="height: 6px; background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 50%, #059669 100%); border-radius: 4px; margin-bottom: 24px;"></div>

      <!-- Header Section -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
        <div style="max-width: 440px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">${esc(company.name || 'TISHA LED WALLS')}</h1>
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
            Professional Audio-Visual &amp; LED Display Systems
          </div>
          <div style="font-size: 11px; color: #475569; line-height: 1.5;">
            ${company.address ? `${esc(company.address)}<br/>` : ''}
            ${company.phone ? `Phone: <strong>${esc(company.phone)}</strong> &bull; ` : ''}
            ${company.email ? `Email: <strong>${esc(company.email)}</strong>` : ''}
            ${company.gstin ? `<br/>GSTIN: <strong style="font-family: monospace; color: #0f172a;">${esc(company.gstin)}</strong>` : ''}
          </div>
        </div>

        <div style="text-align: right;">
          <!-- Official Money Receipt Badge using SVG for guaranteed pixel-perfect centering -->
          <svg width="204" height="30" viewBox="0 0 204 30" style="display:inline-block;margin-bottom:8px;vertical-align:middle;">
            <rect width="204" height="30" rx="6" fill="#0f172a"/>
            <text x="102" y="15" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="11" font-weight="900" letter-spacing="1.2">
              OFFICIAL MONEY RECEIPT
            </text>
          </svg>
          <table style="margin-left: auto; font-size: 12px; border-collapse: collapse;">
            <tr>
              <td style="color: #64748b; font-weight: 600; padding: 2.5px 8px; text-align: right; vertical-align: middle;">Receipt No:</td>
              <td style="font-weight: 800; font-family: monospace; font-size: 13px; color: #0f172a; padding: 2.5px 0; vertical-align: middle; text-align: right;">${esc(receiptNumber)}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600; padding: 2.5px 8px; text-align: right; vertical-align: middle;">Receipt Date:</td>
              <td style="font-weight: 700; color: #0f172a; padding: 2.5px 0; vertical-align: middle; text-align: right;">${esc(receiptDate)}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600; padding: 2.5px 8px; text-align: right; vertical-align: middle;">Status:</td>
              <td style="padding: 2.5px 0; vertical-align: middle; text-align: right;">
                ${amountPaid > 0 ? `
                  <svg width="155" height="22" viewBox="0 0 155 22" style="display:inline-block;vertical-align:middle;">
                    <rect width="155" height="22" rx="11" fill="#dcfce7"/>
                    <text x="77.5" y="11" text-anchor="middle" dominant-baseline="central" fill="#166534" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="9.5" font-weight="800" letter-spacing="0.5">
                      &#10003; PAYMENT RECEIVED
                    </text>
                  </svg>
                ` : `
                  <svg width="175" height="22" viewBox="0 0 175 22" style="display:inline-block;vertical-align:middle;">
                    <rect width="175" height="22" rx="11" fill="#fef3c7"/>
                    <text x="87.5" y="11" text-anchor="middle" dominant-baseline="central" fill="#92400e" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="9.5" font-weight="800" letter-spacing="0.5">
                      PAYMENT DUE / PENDING
                    </text>
                  </svg>
                `}
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Two-Column Information Cards -->
      <div style="display: flex; gap: 16px; margin-top: 20px; margin-bottom: 20px;">
        <!-- Left: Received From -->
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;">
          <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            Received With Thanks From
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
            ${esc(client.name || 'Valued Client')}
          </div>
          ${client.company ? `<div style="font-size: 12px; font-weight: 600; color: #2563eb; margin-bottom: 4px;">${esc(client.company)}</div>` : ''}
          <div style="font-size: 11px; color: #475569; line-height: 1.5;">
            ${client.phone ? `Phone: <strong>${esc(client.phone)}</strong><br/>` : ''}
            ${client.email ? `Email: ${esc(client.email)}<br/>` : ''}
            ${client.gstin ? `GSTIN: <span style="font-family: monospace; font-weight: 700;">${esc(client.gstin)}</span>` : ''}
          </div>
          ${venue || eventDate ? `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #334155;">
              ${eventDate ? `<strong>Event Date:</strong> ${esc(eventDate)} ` : ''}
              ${venue ? `&bull; <strong>Venue:</strong> ${esc(venue)}` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Right: Payment Particulars -->
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;">
          <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            Payment &amp; Booking Particulars
          </div>
          <table style="width: 100%; font-size: 11px; border-collapse: collapse; line-height: 1.7;">
            <tr>
              <td style="color: #64748b; font-weight: 600; width: 45%;">Related Quotation / Ref:</td>
              <td style="font-weight: 700; color: #0f172a; font-family: monospace;">
                ${esc(invoiceNumber ? `Invoice #${invoiceNumber}` : `Quotation #${quotationNumber}`)}
              </td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Payment Mode:</td>
              <td style="font-weight: 700; color: #0f172a;">${modeLabels[paymentMode] || paymentMode}</td>
            </tr>
            ${transactionRef ? `
              <tr>
                <td style="color: #64748b; font-weight: 600;">Transaction / UTR:</td>
                <td style="font-weight: 700; color: #0f172a; font-family: monospace;">${esc(transactionRef)}</td>
              </tr>
            ` : ''}
            <tr>
              <td style="color: #64748b; font-weight: 600;">Payment Milestone:</td>
              <td style="font-weight: 800; color: #059669;">${milestoneLabels[paymentMilestone] || paymentMilestone}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Highlight Amount Box -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px solid #86efac; border-radius: 10px; padding: 18px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
            Amount Received (INR)
          </div>
          <div style="font-size: 28px; font-weight: 900; color: #15803d; letter-spacing: -0.5px;">
            ${fmt(amountPaid)}
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #166534; font-style: italic; margin-top: 4px;">
            ${amountToWordsIndian(amountPaid)}
          </div>
        </div>
        <div style="text-align: right; border-left: 2px dashed #bbf7d0; padding-left: 20px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Net Balance Due</div>
          <div style="font-size: 18px; font-weight: 800; color: ${remainingBalance <= 0 ? '#15803d' : '#dc2626'}; margin-top: 2px;">
            ${remainingBalance <= 0 ? '₹0.00 (Fully Paid)' : fmt(remainingBalance)}
          </div>
        </div>
      </div>

      <!-- Ledger Summary Breakdown Table -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 10px 14px;">Description / Breakdown</th>
              <th style="padding: 10px 14px; text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 14px; color: #334155;">Total Agreed Booking Value (Inclusive of GST &amp; Logistics)</td>
              <td style="padding: 10px 14px; text-align: right; font-weight: 600;">${fmt(totalPayable)}</td>
            </tr>
            ${previousPaid > 0 ? `
              <tr style="border-bottom: 1px solid #f1f5f9; color: #64748b;">
                <td style="padding: 10px 14px;">Previous Payments Received</td>
                <td style="padding: 10px 14px; text-align: right; font-weight: 600;">-${fmt(previousPaid)}</td>
              </tr>
            ` : ''}
            <tr style="border-bottom: 1px solid #e2e8f0; background: #faf5ff;">
              <td style="padding: 10px 14px; font-weight: 700; color: #166534;">
                Payment Acknowledged in this Receipt (${milestoneLabels[paymentMilestone] || paymentMilestone})
              </td>
              <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #166534; font-size: 13px;">
                ${fmt(amountPaid)}
              </td>
            </tr>
            <tr style="background: #f8fafc; font-weight: 800;">
              <td style="padding: 12px 14px; text-transform: uppercase; font-size: 11px; color: #0f172a;">
                Remaining Net Balance Due
              </td>
              <td style="padding: 12px 14px; text-align: right; font-size: 14px; color: ${remainingBalance <= 0 ? '#15803d' : '#0f172a'}; font-family: monospace;">
                ${fmt(remainingBalance)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Notes / Terms & Conditions -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
        <div style="max-width: 440px; font-size: 10px; color: #64748b; line-height: 1.6;">
          <strong style="color: #334155;">TERMS &amp; DECLARATION:</strong><br/>
          &bull; This receipt is issued subject to realization of cheque / online electronic funds transfer.<br/>
          &bull; The remaining balance must be settled prior to equipment dispatch or setup at the venue.<br/>
          &bull; This is an authentic computer-generated money receipt from ${esc(company.name || 'Tisha LED Walls')}.
          ${notes ? `<div style="margin-top: 4px; color: #334155;"><strong>Note:</strong> ${esc(notes)}</div>` : ''}
        </div>

        <!-- Stamp & Signatory -->
        <div style="text-align: center; width: 230px;">
          <div style="height: 90px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
            ${stampImg ? `<img src="${stampImg}" alt="Official Stamp" style="max-height: 85px; max-width: 200px; object-fit: contain;" />` : ''}
          </div>
          <div style="border-top: 1px solid #0f172a; padding-top: 4px;">
            <div style="font-size: 11px; font-weight: 800; color: #0f172a;">${esc(company.name || 'TISHA LED WALLS')}</div>
            <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Authorized Signatory</div>
          </div>
        </div>
      </div>

      <!-- Footer Bar -->
      <div style="margin-top: 24px; padding-top: 8px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 9px; color: #94a3b8; letter-spacing: 0.5px;">
        ${esc(company.name || 'Tisha LED Walls')} &bull; Quotation &amp; Operations Suite &bull; Computer-Generated Receipt ${esc(receiptNumber)}
      </div>

    </div>
  `;
}

export async function generateReceiptPDFDoc(receipt: PaymentReceipt): Promise<{ pdf: jsPDF; filename: string }> {
  const html = buildReceiptHTML(receipt);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;top:0;left:-9999px;z-index:-1;pointer-events:none;background:#ffffff;width:800px;';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  const captureEl = (wrapper.firstElementChild as HTMLElement) || wrapper;

  try {
    const canvas = await html2canvas(captureEl, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 800,
      windowWidth: 800,
    });

    const imgWidth = 210; // A4 mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: imgHeight > 297 ? [imgWidth, imgHeight] : 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

    const filename = `${receipt.receiptNumber || 'Receipt'}_${(receipt.client?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    return { pdf, filename };
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}

export async function exportReceiptPDF(receipt: PaymentReceipt): Promise<void> {
  const { pdf, filename } = await generateReceiptPDFDoc(receipt);
  pdf.save(filename);
}

export async function generateReceiptPDFFile(receipt: PaymentReceipt): Promise<{ file: File; blob: Blob; filename: string }> {
  const { pdf, filename } = await generateReceiptPDFDoc(receipt);
  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  return { file, blob, filename };
}

export function printReceipt(receipt: PaymentReceipt): void {
  const html = buildReceiptHTML(receipt);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt ${receipt.receiptNumber}</title>
        <style>
          @page { size: auto; margin: 10mm; }
          body { margin: 0; background: #ffffff; }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
