import { useState } from 'react';
import { Printer, Plus, Trash2, Image as ImageIcon } from 'lucide-react';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

function App() {
  const generateQuotationNumber = () => {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-8);
    return `QT-${timestamp}`;
  };

  const [companyName, setCompanyName] = useState('Tisha led walls');
  const [companyAddress, setCompanyAddress] = useState('Plot No 183, near Parshuram Bhavan\nJharsa, Sector 39, Gurugram, Haryana 122001');
  const [companyPhone, setCompanyPhone] = useState('+91 7703948857');
  const [companyEmail, setCompanyEmail] = useState('tishaledwalls@gmail.com');
  const [companyLogo, setCompanyLogo] = useState('');

  const [clientName, setClientName] = useState('Client Name');
  const [clientCompany, setClientCompany] = useState('Client Company');
  const [clientAddress, setClientAddress] = useState(
    '456 Client Avenue\nCity, State 67890'
  );
  const [clientEmail, setClientEmail] = useState('client@email.com');

  const [quotationNumber, setQuotationNumber] = useState(generateQuotationNumber());
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
  );

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Service/Product Description', quantity: 1, rate: 0 },
  ]);

  const [taxRate, setTaxRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState(
    "1. In Order to Confirm the Booking 70% of the approximate bill Amount will be required as Advance\n2. Balance 30% of the total approximate will be cleared a day prior of the event\n3. Tds deduction should not be more than 1% as per law because it's proprietor ship firm\n4. All the payments will be in Favour of Star Event & Entertainment + 18% Gst Extra as Applicable on billing"
  );

  const subtotal = lineItems.reduce((sum, item) => sum + item.rate, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: 'New Item', quantity: 1, rate: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (
    id: string,
    field: keyof LineItem,
    value: string | number
  ) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setCompanyLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePrint = () => window.print();

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6 px-3 md:py-8 md:px-4 print:p-0 print:bg-white">
        <div className="max-w-5xl mx-auto">

          {/* Export Button */}
          <div className="no-print mb-6 flex justify-end">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
            >
              <Printer size={20} />
              Export as PDF
            </button>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-2xl print:shadow-none print:rounded-none">
            <div className="p-4 md:p-12">

              {/* Header */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-4 pb-4 border-b-2 border-slate-200">

                {/* Company */}
                <div className="flex-1">
                  <div className="mb-4">
                    {companyLogo ? (
                      <div className="relative inline-block group">
                        <img
                          src={companyLogo}
                          alt="Logo"
                          className="h-16 md:h-20 w-auto object-contain"
                        />
                        <label className="no-print absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded">
                          <ImageIcon size={24} className="text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="no-print inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors">
                        <ImageIcon size={20} />
                        <span className="text-sm font-medium">Add Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="text-xl md:text-2xl font-bold w-full border-0 border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                  />

                  <textarea
                    rows={2}
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="text-sm w-full resize-none border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                  />

                  <input
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="text-sm w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                  />

                  <input
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="text-sm w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                  />
                </div>

                {/* Quotation Info */}
                <div className="text-left md:text-right">
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    QUOTATION
                  </h1>

                  <div className="space-y-1">
                    {[
                      ['No:', quotationNumber, setQuotationNumber],
                      ['Date:', quotationDate, setQuotationDate],
                      ['Valid Until:', validUntil, setValidUntil],
                    ].map(([label, value, setter]: any, i) => (
                      <div key={i} className="flex items-center justify-between md:justify-end gap-2">
                        <span className="text-sm">{label}</span>
                        <input
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          className="text-sm w-32 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-10">
                <h2 className="text-sm font-semibold uppercase mb-3">Bill To:</h2>
                <div className="bg-slate-50 p-3 md:p-4 rounded-lg">

                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="text-lg font-semibold w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                  />

                  <input
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="text-sm w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                  />

                  <textarea
                    rows={2}
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="text-sm w-full resize-none bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                  />

                  <input
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="text-sm w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="mb-2 overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left py-3 px-4">Description</th>
                      <th className="text-center py-3 px-4 w-24">Qty</th>
                      <th className="text-right py-3 px-4 w-32">Rate</th>
                      <th className="text-right py-3 px-4 w-32">Amount</th>
                      <th className="no-print w-12"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={item.id} className={index % 2 ? 'bg-slate-50' : ''}>
                        <td className="py-3 px-4">
                          <textarea
                            rows={1}
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(item.id, 'description', e.target.value)
                            }
                            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                              const t = e.currentTarget;
                              t.style.height = 'auto';
                              t.style.height = t.scrollHeight + 'px';
                            }}
                            className="w-full resize-none bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <input
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(item.id, 'quantity', e.target.value || 0)
                            }
                            className="w-full text-center text-sm md:text-base bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) =>
                              updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)
                            }
                            className="w-full text-right text-sm md:text-base bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                          />
                        </td>

                        <td className="py-3 px-4 text-right font-medium">
                          ₹{item.rate.toFixed(2)}
                        </td>

                        <td className="no-print py-3 px-2">
                          {lineItems.length > 1 && (
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  onClick={addLineItem}
                  className="no-print mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium px-4 py-2 hover:bg-blue-50 rounded-lg"
                >
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
                      <input
                        value={taxRate}
                        onChange={(e) =>
                          setTaxRate(parseFloat(e.target.value) || 0)
                        }
                        className="w-16 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0"
                      />
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

              {/* Notes */}
              <div className="border-t-2 pt-4">
                <h3 className="text-sm font-semibold uppercase mb-3">
                  Terms & Conditions:
                </h3>

                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm md:text-base bg-slate-50 p-3 md:p-4 rounded-lg resize-none border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none print:border-0 print:bg-transparent"
                />
              </div>

            </div>
          </div>

          <div className="no-print mt-6 text-center text-sm">
            Click "Export as PDF" and choose "Save as PDF" in the print dialog
          </div>

        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin:0; }
          .no-print { display:none !important; }
          input, textarea {
            border:none !important;
            background:transparent !important;
          }
          input:focus, textarea:focus { outline:none !important; }
          @page { margin:0.5in; }
        }
      `}</style>
    </>
  );
}

export default App;
