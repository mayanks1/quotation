import { useState } from 'react';
import { Download, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

// ─── Build a pure-static HTML string from current state ───────────────────────
// html2canvas cannot read live <input>/<textarea> .value (it reads DOM attributes).
// So we build a plain-div clone with no form elements, inject it off-screen,
// capture it, then remove it. This is the only reliable cross-browser approach.
function buildPrintHTML(params: {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo: string;
  clientName: string;
  clientCompany: string;
  clientAddress: string;
  clientEmail: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  lineItems: LineItem[];
  taxRate: number;
  notes: string;
}): string {
  const {
    companyName, companyAddress, companyPhone, companyEmail, companyLogo,
    clientName, clientCompany, clientAddress, clientEmail,
    quotationNumber, quotationDate, validUntil,
    lineItems, taxRate, notes,
  } = params;

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const fmt = (n: number) => '&#8377;' + n.toFixed(2);
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const nl2br = (s: string) => esc(s).replace(/\n/g, '<br/>');

  const rows = lineItems
    .map(
      (item, i) => `
    <tr style="background:${i % 2 === 1 ? '#f8fafc' : '#ffffff'}">
      <td style="padding:10px 14px;font-size:13px;color:#0f172a">${esc(item.description)}</td>
      <td style="padding:10px 14px;text-align:center;font-size:13px;color:#0f172a">${item.quantity}</td>
      <td style="padding:10px 14px;text-align:right;font-size:13px;color:#0f172a">${fmt(item.rate)}</td>
      <td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:#0f172a">${fmt(item.quantity * item.rate)}</td>
    </tr>`
    )
    .join('');

  return `
<div style="background:#ffffff;padding:48px;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;width:860px;box-sizing:border-box">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e2e8f0;padding-bottom:28px;margin-bottom:28px">
    <div style="flex:1;padding-right:40px">
      ${companyLogo ? `<img src="${companyLogo}" style="height:64px;margin-bottom:14px;display:block" crossorigin="anonymous">` : ''}
      <div style="font-size:22px;font-weight:700;margin-bottom:8px">${esc(companyName)}</div>
      <div style="font-size:13px;color:#475569;line-height:1.7;margin-bottom:4px">${nl2br(companyAddress)}</div>
      <div style="font-size:13px;color:#475569;margin-bottom:2px">${esc(companyPhone)}</div>
      <div style="font-size:13px;color:#475569">${esc(companyEmail)}</div>
    </div>
    <div style="text-align:right;white-space:nowrap">
      <div style="font-size:38px;font-weight:800;letter-spacing:-1px;margin-bottom:12px">QUOTATION</div>
      <div style="font-size:13px;margin-bottom:4px;color:#475569">No:&nbsp;<strong style="color:#0f172a">${esc(quotationNumber)}</strong></div>
      <div style="font-size:13px;margin-bottom:4px;color:#475569">Date:&nbsp;<strong style="color:#0f172a">${esc(quotationDate)}</strong></div>
      <div style="font-size:13px;color:#475569">Valid Until:&nbsp;<strong style="color:#0f172a">${esc(validUntil)}</strong></div>
    </div>
  </div>

  <!-- Bill To -->
  <div style="margin-bottom:36px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Bill To</div>
    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px">
      <div style="font-size:17px;font-weight:600;margin-bottom:4px">${esc(clientName)}</div>
      <div style="font-size:13px;color:#475569;margin-bottom:2px">${esc(clientCompany)}</div>
      <div style="font-size:13px;color:#475569;line-height:1.7;margin-bottom:2px">${nl2br(clientAddress)}</div>
      <div style="font-size:13px;color:#475569">${esc(clientEmail)}</div>
    </div>
  </div>

  <!-- Items table -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
    <thead>
      <tr style="background:#1e293b;color:#ffffff">
        <th style="text-align:left;padding:12px 14px;font-size:13px;font-weight:600">Description</th>
        <th style="text-align:center;padding:12px 14px;font-size:13px;font-weight:600;width:80px">Qty</th>
        <th style="text-align:right;padding:12px 14px;font-size:13px;font-weight:600;width:120px">Rate</th>
        <th style="text-align:right;padding:12px 14px;font-size:13px;font-weight:600;width:120px">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Totals -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:36px">
    <div style="width:300px">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px">
        <span style="color:#475569">Subtotal</span><span style="color:#0f172a">${fmt(subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px">
        <span style="color:#475569">Tax (${taxRate}%)</span><span style="color:#0f172a">${fmt(taxAmount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1e293b;color:#ffffff;border-radius:8px;margin-top:8px">
        <span style="font-weight:600;font-size:14px">Total</span>
        <span style="font-weight:700;font-size:20px">${fmt(total)}</span>
      </div>
    </div>
  </div>

  <!-- Terms -->
  <div style="border-top:2px solid #e2e8f0;padding-top:20px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px">Terms &amp; Conditions</div>
    <div style="font-size:13px;line-height:1.9;color:#334155;background:#f8fafc;padding:16px 20px;border-radius:8px">${nl2br(notes)}</div>
  </div>

</div>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

function App() {
  const generateQuotationNumber = () =>
    `QT-${new Date().getTime().toString().slice(-8)}`;

  const [exporting, setExporting] = useState(false);

  const [companyName, setCompanyName] = useState('Tisha led walls');
  const [companyAddress, setCompanyAddress] = useState(
    'Plot No 183, near Parshuram Bhavan\nJharsa, Sector 39, Gurugram, Haryana 122001'
  );
  const [companyPhone, setCompanyPhone] = useState('+91 7703948857');
  const [companyEmail, setCompanyEmail] = useState('tishaledwalls@gmail.com');
  const [companyLogo, setCompanyLogo] = useState('');

  const [clientName, setClientName] = useState('Client Name');
  const [clientCompany, setClientCompany] = useState('Client Company');
  const [clientAddress, setClientAddress] = useState('456 Client Avenue\nCity, State 67890');
  const [clientEmail, setClientEmail] = useState('client@email.com');

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

  const [quotationNumber, setQuotationNumber] = useState(generateQuotationNumber());
  const [quotationDate, setQuotationDate] = useState(formatDate(new Date()));
  const [validUntil, setValidUntil] = useState(formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
  );

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Service/Product Description', quantity: 1, rate: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(18);
  const [notes, setNotes] = useState(
    "1. In Order to Confirm the Booking 70% of the approximate bill Amount will be required as Advance\n2. Balance 30% of the total approximate will be cleared a day prior of the event\n3. Tds deduction should not be more than 1% as per law because it's proprietor ship firm\n4. All the payments will be in Favour of Star Event & Entertainment + 18% Gst Extra as Applicable on billing"
  );

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const addLineItem = () =>
    setLineItems([...lineItems, { id: Date.now().toString(), description: 'New Item', quantity: 1, rate: 0 }]);

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter((i) => i.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) =>
    setLineItems(lineItems.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCompanyLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // 1. Build static HTML from current React state
      const html = buildPrintHTML({
        companyName, companyAddress, companyPhone, companyEmail, companyLogo,
        clientName, clientCompany, clientAddress, clientEmail,
        quotationNumber, quotationDate, validUntil,
        lineItems, taxRate, notes,
      });

      // 2. Inject into a hidden off-screen container
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;top:0;left:-9999px;z-index:-1;pointer-events:none';
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);

      const captureEl = wrapper.firstElementChild as HTMLElement;

      // 3. Capture the static clone — no form elements, no issues
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

      // 4. Remove the temp element
      document.body.removeChild(wrapper);

      // 5. Slice canvas into A4 pages
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

      pdf.save(`${quotationNumber}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6 px-3 md:py-8 md:px-4">
      <div className="max-w-5xl mx-auto">

        {/* Export Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2 md:px-6 md:py-3 rounded-lg font-medium transition-colors shadow-lg"
          >
            <Download size={20} />
            {exporting ? 'Generating PDF…' : 'Export as PDF'}
          </button>
        </div>

        {/* Editable card (for screen only) */}
        <div className="bg-white rounded-xl shadow-2xl">
          <div className="p-4 md:p-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-4 pb-4 border-b-2 border-slate-200">
              <div className="flex-1">
                <div className="mb-4">
                  {companyLogo ? (
                    <div className="relative inline-block group">
                      <img src={companyLogo} alt="Logo" className="h-16 md:h-20 w-auto object-contain" />
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded">
                        <ImageIcon size={24} className="text-white" />
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors">
                      <ImageIcon size={20} />
                      <span className="text-sm font-medium">Add Logo</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  className="text-xl md:text-2xl font-bold w-full border-0 border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                <textarea rows={2} value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)}
                  className="text-sm w-full resize-none border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                <input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)}
                  className="text-sm w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                <input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)}
                  className="text-sm w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
              </div>

              <div className="text-left md:text-right">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">QUOTATION</h1>
                <div className="space-y-1">
                  {([
                    ['No:', quotationNumber, setQuotationNumber],
                    ['Date:', quotationDate, setQuotationDate],
                    ['Valid Until:', validUntil, setValidUntil],
                  ] as [string, string, (v: string) => void][]).map(([label, value, setter], i) => (
                    <div key={i} className="flex items-center justify-between md:justify-end gap-2">
                      <span className="text-sm">{label}</span>
                      <input value={value} onChange={(e) => setter(e.target.value)}
                        className="text-sm w-32 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-10">
              <h2 className="text-sm font-semibold uppercase mb-3">Bill To:</h2>
              <div className="bg-slate-50 p-3 md:p-4 rounded-lg">
                <input value={clientName} onChange={(e) => setClientName(e.target.value)}
                  className="text-lg font-semibold w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                <input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)}
                  className="text-sm w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                <textarea rows={2} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)}
                  className="text-sm w-full resize-none bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                  className="text-sm w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
              </div>
            </div>

            {/* Table */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-center py-3 px-4 w-24">Qty</th>
                    <th className="text-right py-3 px-4 w-32">Rate</th>
                    <th className="text-right py-3 px-4 w-32">Amount</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={item.id} className={index % 2 ? 'bg-slate-50' : ''}>
                      <td className="py-3 px-4">
                        <textarea rows={1} value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                            const t = e.currentTarget;
                            t.style.height = 'auto';
                            t.style.height = t.scrollHeight + 'px';
                          }}
                          className="w-full resize-none bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                      </td>
                      <td className="py-3 px-4">
                        <input type="number" value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full text-center bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                      </td>
                      <td className="py-3 px-4">
                        <input type="number" value={item.rate}
                          onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ₹{(item.quantity * item.rate).toFixed(2)}
                      </td>
                      <td className="py-3 px-2">
                        {lineItems.length > 1 && (
                          <button onClick={() => removeLineItem(item.id)}
                            className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addLineItem}
                className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium px-4 py-2 hover:bg-blue-50 rounded-lg">
                <Plus size={20} />
                Add Line Item
              </button>
            </div>

            {/* Totals */}
            <div className="flex justify-center md:justify-end mb-8">
              <div className="w-full md:max-w-sm space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <span>Tax:</span>
                    <input type="number" value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-16 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                    %
                  </div>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 bg-slate-800 text-white px-4 rounded-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="border-t-2 pt-4">
              <h3 className="text-sm font-semibold uppercase mb-3">Terms & Conditions:</h3>
              <textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm bg-slate-50 p-3 md:p-4 rounded-lg resize-none border border-transparent hover:border-slate-300 focus:outline-none focus:border-blue-500" />
            </div>

          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          Tap "Export as PDF" to download — works on all devices including mobile
        </div>
      </div>
    </div>
  );
}

export default App;