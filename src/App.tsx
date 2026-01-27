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
  const [clientAddress, setClientAddress] = useState('456 Client Avenue\nCity, State 67890');
  const [clientEmail, setClientEmail] = useState('client@email.com');

  const [quotationNumber, setQuotationNumber] = useState(generateQuotationNumber());
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Service/Product Description', quantity: 1, rate: 0 },
  ]);

  const [taxRate, setTaxRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('1. In Order to Confirm the Booking 70% of the approximate bill Amount will be required as Advance\n2. Balance 30% of the total approximate will be cleared a day prior of the event\n3. Tds deduction should not be more than 1% as per law because it\'s proprietor ship firm\n4. All the payments will be in Favour of Star Event & Entertainment + 18% Gst Extra as Applicable on billing');

  const subtotal = lineItems.reduce((sum, item) => sum + item.rate, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: 'New Item',
      quantity: 1,
      rate: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 print:p-0 print:bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="no-print mb-6 flex justify-end">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
            >
              <Printer size={20} />
              Export as PDF
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-2xl print:shadow-none print:rounded-none">
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-slate-200">
                <div className="flex-1">
                  <div className="mb-4">
                    {companyLogo ? (
                      <div className="relative inline-block group">
                        <img src={companyLogo} alt="Logo" className="h-20 w-auto object-contain" />
                        <label className="no-print absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded">
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
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="text-2xl font-bold text-slate-800 mb-2 w-full border-0 border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                  />
                  <textarea
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    rows={2}
                    className="text-slate-600 text-sm w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors resize-none print:border-0"
                  />
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="text-slate-600 text-sm w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                  />
                  <input
                    type="text"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="text-slate-600 text-sm w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                  />
                </div>

                <div className="text-right">
                  <h1 className="text-4xl font-bold text-slate-800 mb-2">QUOTATION</h1>
                  <div className="space-y-1">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm text-slate-600">No:</span>
                      <input
                        type="text"
                        value={quotationNumber}
                        onChange={(e) => setQuotationNumber(e.target.value)}
                        className="text-sm font-medium text-slate-800 w-32 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm text-slate-600">Date:</span>
                      <input
                        type="date"
                        value={quotationDate}
                        onChange={(e) => setQuotationDate(e.target.value)}
                        className="text-sm font-medium text-slate-800 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm text-slate-600">Valid Until:</span>
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="text-sm font-medium text-slate-800 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">Bill To:</h2>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="text-lg font-semibold text-slate-800 mb-1 w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                  />
                  <input
                    type="text"
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="text-sm text-slate-600 mb-2 w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                  />
                  <textarea
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    rows={2}
                    className="text-sm text-slate-600 w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors resize-none print:border-0"
                  />
                  <input
                    type="text"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="text-sm text-slate-600 w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                  />
                </div>
              </div>

              <div className="mb-2 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left py-3 px-4 font-semibold">Description</th>
                      <th className="text-center py-3 px-4 font-semibold w-24">Qty</th>
                      <th className="text-right py-3 px-4 font-semibold w-32">Rate</th>
                      <th className="text-right py-3 px-4 font-semibold w-32">Amount</th>
                      <th className="no-print w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="py-3 px-4">
                          {/* <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                            className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                          /> */}
                          <textarea
                            rows={1}
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(item.id, "description", e.target.value)
                            }
                            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                              const target = e.currentTarget
                              target.style.height = "auto"
                              target.style.height = target.scrollHeight + "px"
                            }}
                            className="w-full resize-none bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                          />


                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, 'quantity',e.target.value || 0)}
                            className="w-full text-center bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                          />
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          ₹{(item.rate).toFixed(2)}
                        </td>
                        <td className="no-print py-3 px-2">
                          {lineItems.length > 1 && (
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
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
                  className="no-print mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus size={20} />
                  Add Line Item
                </button>
              </div>

              <div className="flex justify-end mb-8">
                <div className="w-full max-w-sm space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-200" style={{display: 'none'}}>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">Discount:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="w-16 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                      />
                      <span className="text-slate-600">%</span>
                    </div>
                    <span className="font-medium">-₹{discountAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">Tax:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-16 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors print:border-0"
                      />
                      <span className="text-slate-600">%</span>
                    </div>
                    <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-3 bg-slate-800 text-white px-4 rounded-lg">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-xl font-bold">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-slate-200 pt-2">
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Terms & Conditions:</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  className="w-full text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors resize-none print:border-0 print:bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="no-print mt-6 text-center text-sm text-slate-600">
            Click "Export as PDF" and choose "Save as PDF" in the print dialog
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          input, textarea {
            border: none !important;
            background: transparent !important;
          }
          input:focus, textarea:focus {
            outline: none !important;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </>
  );
}

export default App;
