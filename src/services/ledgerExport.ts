import { LedgerRecord, parseDate, getYear, formatDate } from './sheetService';

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatTallyDateFromLedger(dateStr?: string): string {
  if (!dateStr) return '';
  const dt = parseDate(dateStr);
  if (!dt || isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}${m}${d}`; // YYYYMMDD
}

/**
 * Generates an Excel-compatible Collections & Outstanding Dues Register CSV
 */
export function generateLedgerCollectionsCsv(records: LedgerRecord[]): string {
  const headers = [
    'Date',
    'Client Name',
    'LED Screen / Setup',
    'Total Event Amount (₹)',
    'Amount Collected / Paid (₹)',
    'Outstanding Due (₹)',
    'Payment Status',
    'Notes / Remarks',
  ];

  const rows: string[] = [headers.map(csvEscape).join(',')];

  let totalEventAmt = 0;
  let totalCollectedAmt = 0;
  let totalPendingAmt = 0;

  for (const r of records) {
    const eventAmt = r.amount || 0;
    const paidAmt = r.status === 'Received' ? eventAmt : (r.paidAmount || 0);
    const pendingAmt = r.status === 'Received' ? 0 : (r.pendingAmount || Math.max(0, eventAmt - paidAmt));

    totalEventAmt += eventAmt;
    totalCollectedAmt += paidAmt;
    totalPendingAmt += pendingAmt;

    const row = [
      formatDate(r.date) || r.date,
      r.client || 'Client',
      r.size || 'LED Wall Setup',
      eventAmt.toFixed(2),
      paidAmt.toFixed(2),
      pendingAmt.toFixed(2),
      r.status,
      r.note || '',
    ];

    rows.push(row.map(csvEscape).join(','));
  }

  // Summary Row
  rows.push('');
  rows.push([
    'TOTAL SUMMARY',
    `Total Entries: ${records.length}`,
    '',
    totalEventAmt.toFixed(2),
    totalCollectedAmt.toFixed(2),
    totalPendingAmt.toFixed(2),
    `Recovery Rate: ${totalEventAmt > 0 ? ((totalCollectedAmt / totalEventAmt) * 100).toFixed(1) : '0.0'}%`,
    '',
  ].map(csvEscape).join(','));

  // UTF-8 BOM so Excel opens Hindi/special characters properly
  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Generates Tally Prime XML for Receipt Vouchers from live Payment Ledger records
 * Debits Bank / Cash, Credits Client Sundry Debtors ledger
 */
export function generateLedgerTallyReceiptsXml(records: LedgerRecord[], companyName: string = 'Tisha LED Walls'): string {
  let vouchersXml = '';
  let receiptCount = 0;

  for (const r of records) {
    const eventAmt = r.amount || 0;
    const paidAmt = r.status === 'Received' ? eventAmt : (r.paidAmount || 0);

    // Only generate Receipt Vouchers for records with actual collections
    if (paidAmt <= 0) continue;

    receiptCount++;
    const tallyDate = formatTallyDateFromLedger(r.date) || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanId = (r.id || `row-${r.sheetRow || receiptCount}`).replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    const yr = getYear(r.date) || new Date().getFullYear();
    const voucherNum = `REC-LEDGER-${yr}-${cleanId || receiptCount}`;
    const clientName = (r.client || 'Sundry Debtor').replace(/&/g, '&amp;');
    const narration = `Receipt for LED rental: ${r.size ? r.size.replace(/&/g, '&amp;') : 'Screen Setup'}. Event Date: ${r.date}. Status: ${r.status}${r.note ? ` - Ref/Note: ${r.note.replace(/&/g, '&amp;')}` : ''}`;

    vouchersXml += `
      <VOUCHER VCHTYPE="Receipt" ACTION="Create">
        <DATE>${tallyDate}</DATE>
        <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${voucherNum}</VOUCHERNUMBER>
        <PARTYLEDGERNAME>${clientName}</PARTYLEDGERNAME>
        <NARRATION>${narration}</NARRATION>
        
        <!-- Bank / Cash Debit -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Bank A/c</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${paidAmt.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <!-- Client Ledger Credit (Sundry Debtors) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${clientName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${paidAmt.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    `;
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

export function downloadLedgerFile(content: string, filename: string, mimeType: string) {
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
