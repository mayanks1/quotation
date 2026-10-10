import React, { useState } from 'react';
import { 
  ArrowLeft, Download, Printer, Share2, Copy, Plus, 
  Trash2, Image as ImageIcon, Calculator, BookOpen, 
  Settings, UserCheck
} from 'lucide-react';
import { Quotation, LineItem, QuotationStatus, TaxScheme, ClientProfile } from '../types/quotation';
import { generateWhatsAppShareUrl } from '../services/whatsapp';
import { exportQuotationPDF } from '../services/pdfGenerator';
import { LedCalculatorModal } from './LedCalculatorModal';
import { CatalogPickerModal } from './CatalogPickerModal';

interface Props {
  quotation: Quotation;
  savedClients: ClientProfile[];
  onChange: (updated: Quotation) => void;
  onBack: () => void;
  onDuplicate: (q: Quotation) => void;
  onOpenSettings: () => void;
}

export const QuotationEditor: React.FC<Props> = ({
  quotation,
  savedClients,
  onChange,
  onBack,
  onDuplicate,
  onOpenSettings,
}) => {
  const [exporting, setExporting] = useState(false);
  const [isLedCalcOpen, setIsLedCalcOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // Math
  const subtotal = quotation.lineItems.reduce((acc, i) => acc + (i.quantity || 0) * (i.rate || 0), 0);
  const discountedSubtotal = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const taxAmount = (discountedSubtotal * (quotation.taxRate || 0)) / 100;
  const grandTotal = discountedSubtotal + taxAmount + (quotation.shippingCharges || 0);

  // Line item handlers
  const handleUpdateItem = (id: string, field: keyof LineItem, val: string | number) => {
    const updated = quotation.lineItems.map((item) =>
      item.id === id ? { ...item, [field]: val } : item
    );
    onChange({ ...quotation, lineItems: updated });
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      rate: 0,
      unit: '',
      hsnSac: '',
    };
    onChange({ ...quotation, lineItems: [...quotation.lineItems, newItem] });
  };

  const handleRemoveItem = (id: string) => {
    if (quotation.lineItems.length <= 1) return;
    onChange({
      ...quotation,
      lineItems: quotation.lineItems.filter((i) => i.id !== id),
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({
        ...quotation,
        company: { ...quotation.company, logo: reader.result as string },
      });
    };
    reader.readAsDataURL(file);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportQuotationPDF(quotation);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF generation encountered an error. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const url = generateWhatsAppShareUrl(quotation);
    window.open(url, '_blank');
  };

  const handleSelectSavedClient = (clientIdOrName: string) => {
    const found = savedClients.find((c) => c.id === clientIdOrName || c.name === clientIdOrName);
    if (found) {
      onChange({
        ...quotation,
        client: {
          ...quotation.client,
          name: found.name,
          company: found.company || '',
          address: found.address || '',
          phone: found.phone || '',
          email: found.email || '',
          gstin: found.gstin || '',
        },
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      
      {/* Top Controller Bar */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sticky top-4 z-40">
        
        {/* Back and Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
            <span>All Quotes</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Status:</span>
            <select
              value={quotation.status}
              onChange={(e) => onChange({ ...quotation, status: e.target.value as QuotationStatus })}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none transition-colors ${
                quotation.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : quotation.status === 'sent'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : quotation.status === 'invoiced'
                  ? 'bg-purple-50 text-purple-700 border-purple-300'
                  : quotation.status === 'rejected'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent to Client</option>
              <option value="approved">Approved / Confirmed</option>
              <option value="invoiced">Invoiced</option>
              <option value="rejected">Rejected / Cancelled</option>
            </select>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          <button
            onClick={() => onDuplicate(quotation)}
            title="Duplicate as new quote"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Copy size={15} />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            onClick={handleNativePrint}
            title="Print or Save as Vector PDF"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={handleWhatsApp}
            title="Send formatted breakdown directly to client on WhatsApp"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
          >
            <Share2 size={15} />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            <Download size={16} />
            <span>{exporting ? 'Generating PDF…' : 'Download PDF'}</span>
          </button>
        </div>

      </div>

      {/* Main Quotation Sheet */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
        <div className="p-6 md:p-12 space-y-8">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-slate-200">
            
            {/* Company Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 mb-2">
                {quotation.company.logo ? (
                  <div className="relative group inline-block">
                    <img
                      src={quotation.company.logo}
                      alt="Logo"
                      className="h-14 md:h-16 w-auto object-contain rounded"
                    />
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded">
                      <ImageIcon size={18} className="text-white" />
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors text-xs font-semibold text-slate-700">
                    <ImageIcon size={16} />
                    <span>Upload Logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                )}

                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                >
                  <Settings size={13} />
                  <span>Edit Company / Bank Info</span>
                </button>
              </div>

              <input
                value={quotation.company.name}
                onChange={(e) =>
                  onChange({ ...quotation, company: { ...quotation.company, name: e.target.value } })
                }
                className="text-2xl font-black text-slate-900 w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
              />

              <input
                value={quotation.company.tagline || ''}
                placeholder="Tagline / Description"
                onChange={(e) =>
                  onChange({ ...quotation, company: { ...quotation.company, tagline: e.target.value } })
                }
                className="text-xs text-blue-600 font-bold uppercase tracking-wider w-full border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
              />

              <textarea
                rows={2}
                value={quotation.company.address}
                onChange={(e) =>
                  onChange({ ...quotation, company: { ...quotation.company, address: e.target.value } })
                }
                className="text-xs text-slate-500 w-full resize-none border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
              />

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <input
                  value={quotation.company.phone}
                  onChange={(e) =>
                    onChange({ ...quotation, company: { ...quotation.company, phone: e.target.value } })
                  }
                  className="w-36 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                />
                <input
                  value={quotation.company.email}
                  onChange={(e) =>
                    onChange({ ...quotation, company: { ...quotation.company, email: e.target.value } })
                  }
                  className="w-48 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {quotation.company.gstin && (
                <div className="text-xs font-semibold text-slate-700">
                  GSTIN: {quotation.company.gstin}
                </div>
              )}
            </div>

            {/* Quotation Metadata Card */}
            <div className="text-left md:text-right min-w-[260px] space-y-2">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-3">QUOTATION</h1>
              
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between md:justify-end gap-2">
                  <span className="text-slate-500 font-semibold">Quote No:</span>
                  <input
                    value={quotation.quotationNumber}
                    onChange={(e) => onChange({ ...quotation, quotationNumber: e.target.value })}
                    className="font-mono font-bold text-slate-900 w-36 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between md:justify-end gap-2">
                  <span className="text-slate-500 font-semibold">Date:</span>
                  <input
                    value={quotation.quotationDate}
                    onChange={(e) => onChange({ ...quotation, quotationDate: e.target.value })}
                    className="font-medium text-slate-800 w-36 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between md:justify-end gap-2">
                  <span className="text-slate-500 font-semibold">Valid Until:</span>
                  <input
                    value={quotation.validUntil}
                    onChange={(e) => onChange({ ...quotation, validUntil: e.target.value })}
                    className="font-medium text-slate-800 w-36 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between md:justify-end gap-2">
                  <span className="text-blue-600 font-semibold">Event Date:</span>
                  <input
                    value={quotation.eventDate || ''}
                    placeholder="DD-MM-YYYY"
                    onChange={(e) => onChange({ ...quotation, eventDate: e.target.value })}
                    className="font-bold text-blue-600 w-36 text-right border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Bill To & Venue Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bill To */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bill To (Client Details)</span>
                
                {savedClients.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-blue-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                    <UserCheck size={13} />
                    <select
                      onChange={(e) => handleSelectSavedClient(e.target.value)}
                      defaultValue=""
                      className="bg-transparent text-xs text-blue-600 font-semibold cursor-pointer focus:outline-none max-w-[170px] truncate"
                    >
                      <option value="" disabled>Load Saved Client...</option>
                      {savedClients.map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name} {c.company ? `(${c.company})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <input
                value={quotation.client.name}
                placeholder="Event Organizer / Client Name"
                onChange={(e) =>
                  onChange({ ...quotation, client: { ...quotation.client, name: e.target.value } })
                }
                className="text-base font-bold text-slate-900 w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
              />

              <input
                value={quotation.client.company}
                placeholder="Corporate / Production Agency"
                onChange={(e) =>
                  onChange({ ...quotation, client: { ...quotation.client, company: e.target.value } })
                }
                className="text-xs font-semibold text-slate-700 w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
              />

              <textarea
                rows={2}
                value={quotation.client.address}
                placeholder="Sector 29, Gurugram, Haryana 122001"
                onChange={(e) =>
                  onChange({ ...quotation, client: { ...quotation.client, address: e.target.value } })
                }
                className="text-xs text-slate-600 w-full bg-transparent resize-none border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  value={quotation.client.phone}
                  placeholder="+91 9876543210"
                  onChange={(e) =>
                    onChange({ ...quotation, client: { ...quotation.client, phone: e.target.value } })
                  }
                  className="bg-transparent text-slate-700 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                />
                <input
                  value={quotation.client.email}
                  placeholder="client@events.com"
                  onChange={(e) =>
                    onChange({ ...quotation, client: { ...quotation.client, email: e.target.value } })
                  }
                  className="bg-transparent text-slate-700 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <input
                value={quotation.client.gstin || ''}
                placeholder="CLIENT GSTIN (OPTIONAL)"
                onChange={(e) =>
                  onChange({ ...quotation, client: { ...quotation.client, gstin: e.target.value } })
                }
                className="text-xs font-mono uppercase bg-transparent text-slate-600 border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Event Venue */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Event & Setup Location</span>
                <textarea
                  rows={3}
                  value={quotation.venue || ''}
                  placeholder="Client Venue, Delhi NCR"
                  onChange={(e) => onChange({ ...quotation, venue: e.target.value })}
                  className="text-xs text-slate-700 w-full bg-transparent resize-none border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="text-[11px] text-slate-400 bg-white/70 p-2.5 rounded-lg border border-slate-200">
                💡 Tip: Mentioning clear venue details guarantees logistics, transport, and labor are accurately quoted.
              </div>
            </div>

          </div>

          {/* Line Items Table & Helper Actions */}
          <div className="space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Setup & Equipment Specifications</h2>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLedCalcOpen(true)}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                >
                  <Calculator size={15} />
                  <span>LED Wall Calculator</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCatalogOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                >
                  <BookOpen size={15} />
                  <span>Add from Catalog</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-10 font-bold">#</th>
                    <th className="py-3 px-4 font-bold">Item Description & Specifications</th>
                    <th className="py-3 px-3 text-center w-24 font-bold">Qty / Unit</th>
                    <th className="py-3 px-4 text-right w-32 font-bold">Rate (₹)</th>
                    <th className="py-3 px-4 text-right w-32 font-bold">Amount (₹)</th>
                    <th className="py-3 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {quotation.lineItems.map((item, index) => {
                    const lineTotal = (item.quantity || 0) * (item.rate || 0);
                    const isLegacyDummy = item.description === 'Setup Equipment / Service description';
                    const displayDesc = isLegacyDummy ? '' : item.description;

                    return (
                      <tr key={item.id} className={index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-3 px-4">
                          <textarea
                            rows={1}
                            value={displayDesc}
                            placeholder="Setup Equipment / Service description"
                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                              const t = e.currentTarget;
                              t.style.height = 'auto';
                              t.style.height = t.scrollHeight + 'px';
                            }}
                            className="w-full resize-none font-medium text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                          />
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400">SAC:</span>
                            <input
                              value={item.hsnSac || ''}
                              placeholder="9973"
                              onChange={(e) => handleUpdateItem(item.id, 'hsnSac', e.target.value)}
                              className="text-[10px] font-mono w-16 text-slate-500 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:outline-none placeholder:text-slate-400"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-16 text-center font-bold text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none mx-auto block"
                          />
                          <input
                            value={item.unit || ''}
                            placeholder="Day"
                            onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                            className="text-[10px] text-center text-slate-400 w-16 bg-transparent border-0 hover:border-slate-200 focus:outline-none mx-auto block mt-0.5 placeholder:text-slate-300"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            min={0}
                            value={item.rate === 0 && !displayDesc ? '' : item.rate}
                            placeholder="0"
                            onChange={(e) => handleUpdateItem(item.id, 'rate', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            className="w-24 text-right font-medium text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none ml-auto block placeholder:text-slate-400"
                          />
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {quotation.lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span>Add Custom Line Item</span>
            </button>

          </div>

          {/* Calculations & Bank Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            
            {/* Bank Info & Payment Terms */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bank Details for Advance</span>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    Change
                  </button>
                </div>
                <div className="text-xs space-y-1 text-slate-700">
                  <div><strong>A/C Name:</strong> {quotation.company.bankDetails.accountName}</div>
                  <div><strong>Bank:</strong> {quotation.company.bankDetails.bankName}</div>
                  <div><strong>Account No:</strong> <span className="font-mono font-bold">{quotation.company.bankDetails.accountNumber}</span></div>
                  <div><strong>IFSC:</strong> <span className="font-mono font-bold">{quotation.company.bankDetails.ifscCode}</span></div>
                  {quotation.company.bankDetails.upiId && (
                    <div className="text-blue-700 font-semibold">
                      <strong>UPI ID:</strong> {quotation.company.bankDetails.upiId}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Payment Milestone Term
                </label>
                <input
                  value={quotation.paymentTerms || ''}
                  placeholder="e.g. 70% Advance | 30% Before Event Delivery"
                  onChange={(e) => onChange({ ...quotation, paymentTerms: e.target.value })}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-blue-500"
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                
                {/* Subtotal */}
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Discount (₹):</span>
                  <input
                    type="number"
                    min={0}
                    value={quotation.discountAmount || 0}
                    onChange={(e) =>
                      onChange({ ...quotation, discountAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-24 text-right font-medium text-emerald-600 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-500"
                  />
                </div>

                {/* GST Settings */}
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Tax:</span>
                    <select
                      value={quotation.taxScheme || 'cgst_sgst'}
                      onChange={(e) => {
                        const scheme = e.target.value as TaxScheme;
                        let rate = 18;
                        if (scheme === 'none') rate = 0;
                        if (scheme === 'gst_12') rate = 12;
                        if (scheme === 'gst_5') rate = 5;
                        onChange({ ...quotation, taxScheme: scheme, taxRate: rate });
                      }}
                      className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700"
                    >
                      <option value="cgst_sgst">CGST + SGST (18% Intra-State)</option>
                      <option value="igst">IGST (18% Inter-State)</option>
                      <option value="gst_12">GST (12%)</option>
                      <option value="custom">Custom Tax %</option>
                      <option value="none">Zero Tax (0%)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    {quotation.taxScheme === 'custom' && (
                      <input
                        type="number"
                        min={0}
                        value={quotation.taxRate}
                        onChange={(e) =>
                          onChange({ ...quotation, taxRate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-12 text-right border border-slate-200 rounded px-1 text-xs"
                      />
                    )}
                    <span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Shipping & Logistics */}
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Logistics & Transportation (₹):</span>
                  <input
                    type="number"
                    min={0}
                    value={quotation.shippingCharges || 0}
                    onChange={(e) =>
                      onChange({ ...quotation, shippingCharges: parseFloat(e.target.value) || 0 })
                    }
                    className="w-24 text-right font-medium text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-500"
                  />
                </div>

                {/* Total */}
                <div className="flex justify-between items-center p-3 bg-slate-900 text-white rounded-lg">
                  <span className="font-bold text-xs uppercase tracking-wider">Total Payable:</span>
                  <span className="text-xl font-black">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

              </div>
            </div>

          </div>

          {/* Terms & Conditions */}
          <div className="border-t-2 border-slate-200 pt-6 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Terms &amp; Conditions</h3>
            <textarea
              rows={6}
              value={quotation.notes}
              onChange={(e) => onChange({ ...quotation, notes: e.target.value })}
              className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 focus:outline-blue-500 leading-relaxed font-sans"
            />
          </div>

        </div>
      </div>

      {/* Modals */}
      <LedCalculatorModal
        isOpen={isLedCalcOpen}
        onClose={() => setIsLedCalcOpen(false)}
        onAddLineItem={(item) => {
          onChange({ ...quotation, lineItems: [...quotation.lineItems, item] });
        }}
      />

      <CatalogPickerModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onAddItems={(items) => {
          onChange({ ...quotation, lineItems: [...quotation.lineItems, ...items] });
        }}
      />

    </div>
  );
};
