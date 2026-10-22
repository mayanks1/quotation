import React, { useState } from 'react';
import {
  X, Truck, Printer, Copy, Check, MessageCircle,
  Calendar, MapPin, User, Phone, Plus, Trash2, ShieldCheck, FileText
} from 'lucide-react';
import { Quotation } from '../types/quotation';
import { useToast } from '../context/ToastContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
}

interface EquipmentItem {
  id: string;
  description: string;
  quantity: number | string;
  unit: string;
  remarks: string;
}

export const DeliveryChallanModal: React.FC<Props> = ({ isOpen, onClose, quotation }) => {
  useLockBodyScroll(isOpen);
  const toast = useToast();

  const defaultGatePassNo = `TLW-GP-${new Date().getFullYear()}-${quotation.quotationNumber.replace(/^TLW-QT-/i, '').replace(/[^a-zA-Z0-9-]/g, '') || '001'}`;

  // Form states
  const [challanNumber, setChallanNumber] = useState(defaultGatePassNo);
  const [passType, setPassType] = useState<'Returnable Gate Pass' | 'Non-Returnable Delivery Challan'>('Returnable Gate Pass');
  const [dispatchDate, setDispatchDate] = useState(quotation.eventDate || new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState('');
  const [venue, setVenue] = useState(quotation.venue || '');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporterName, setTransporterName] = useState('Dedicated Commercial Transport');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [technicianPhone, setTechnicianPhone] = useState('');
  const [dispatchPurpose, setDispatchPurpose] = useState('Temporary Event Display Rental & On-Site Production');

  // Auto-populate equipment items from line items
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>(() => {
    const list: EquipmentItem[] = quotation.lineItems.map((item, idx) => ({
      id: `eq-${idx + 1}`,
      description: item.description,
      quantity: item.quantity || 1,
      unit: item.unit || 'Units',
      remarks: 'Flight Cased / Main Display'
    }));

    // Add standard supporting AV peripherals if not already included
    if (!list.some(i => i.description.toLowerCase().includes('processor'))) {
      list.push({
        id: `eq-proc`,
        description: 'NovaStar Ultra HD Video Processor & Controller',
        quantity: 1,
        unit: 'Unit',
        remarks: 'Main Switcher Rack'
      });
    }
    if (!list.some(i => i.description.toLowerCase().includes('cable'))) {
      list.push({
        id: `eq-cables`,
        description: 'Heavy-Duty Power & Signal Looms (HDMI / SDI / Cat6 / PowerCON)',
        quantity: 1,
        unit: 'Lot',
        remarks: 'Protective Cable Case'
      });
    }

    return list;
  });

  if (!isOpen) return null;

  const handleAddItem = () => {
    setEquipmentList(prev => [
      ...prev,
      {
        id: `eq-${Date.now()}`,
        description: '',
        quantity: 1,
        unit: 'Units',
        remarks: 'Good Condition'
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setEquipmentList(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof EquipmentItem, value: any) => {
    setEquipmentList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print preview. Please check browser popups.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Equipment Delivery Challan & Gate Pass - ${challanNumber}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 36px; color: #0f172a; background: #fff; line-height: 1.4; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 18px; }
          .brand-title { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
          .brand-tagline { font-size: 12px; color: #475569; margin-top: 2px; }
          .brand-details { font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.5; }
          .doc-badge { text-align: right; }
          .doc-type { font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }
          .pass-tag { display: inline-block; background: #0f172a; color: #fff; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 4px; margin-top: 4px; text-transform: uppercase; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; background: #f8fafc; }
          .meta-col { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
          .meta-row { display: flex; }
          .meta-label { width: 130px; font-weight: 700; color: #475569; }
          .meta-val { font-weight: 600; color: #0f172a; flex: 1; }
          .table-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 12px; }
          th { background: #e2e8f0; text-align: left; padding: 8px 10px; font-weight: 800; color: #1e293b; border: 1px solid #cbd5e1; }
          td { padding: 8px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
          .text-center { text-align: center; }
          .declaration { border: 1px solid #e2e8f0; background: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-size: 11px; color: #475569; margin-bottom: 30px; }
          .sig-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 40px; }
          .sig-box { border-top: 1.5px solid #0f172a; padding-top: 8px; text-align: center; font-size: 11px; font-weight: 700; color: #1e293b; }
          .sig-role { font-size: 10px; color: #64748b; font-weight: 500; margin-top: 2px; }
          @media print {
            body { padding: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand-title">${quotation.company.name || 'TISHA LED WALLS'}</div>
            <div class="brand-tagline">Premium Indoor & Outdoor LED Display Screen Solutions</div>
            <div class="brand-details">
              ${quotation.company.address || ''}<br/>
              Phone: ${quotation.company.phone || ''} ${quotation.company.gstin && quotation.company.gstin !== 'N/A' ? `| GSTIN: ${quotation.company.gstin}` : ''}
            </div>
          </div>
          <div class="doc-badge">
            <div class="doc-type">Delivery Challan &amp; Gate Pass</div>
            <div class="pass-tag">${passType}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
              <strong>Pass #:</strong> ${challanNumber}<br/>
              <strong>Date:</strong> ${dispatchDate}
            </div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-col">
            <div class="meta-row">
              <span class="meta-label">Consignee / Client:</span>
              <span class="meta-val">${quotation.client.name || 'Valued Client'} ${quotation.client.company ? `(${quotation.client.company})` : ''}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Event Venue / Site:</span>
              <span class="meta-val">${venue || 'As per Event Schedule'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Dispatch Purpose:</span>
              <span class="meta-val">${dispatchPurpose}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Quotation Ref:</span>
              <span class="meta-val">${quotation.quotationNumber}</span>
            </div>
          </div>

          <div class="meta-col">
            <div class="meta-row">
              <span class="meta-label">Vehicle Number:</span>
              <span class="meta-val">${vehicleNumber || 'Pending Allotment'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Transporter / Carrier:</span>
              <span class="meta-val">${transporterName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Driver In-Charge:</span>
              <span class="meta-val">${driverName || '—'} ${driverPhone ? `(${driverPhone})` : ''}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Technical Lead:</span>
              <span class="meta-val">${technicianName || '—'} ${technicianPhone ? `(${technicianPhone})` : ''}</span>
            </div>
          </div>
        </div>

        <div class="table-title">Inventory &amp; Equipment Outward Manifest</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="text-center">#</th>
              <th>Description of Goods &amp; Hardware Components</th>
              <th style="width: 65px;" class="text-center">Qty</th>
              <th style="width: 75px;">Unit</th>
              <th style="width: 180px;">Remarks / Packaging</th>
            </tr>
          </thead>
          <tbody>
            ${equipmentList.map((item, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td><strong>${item.description}</strong></td>
                <td class="text-center"><strong>${item.quantity}</strong></td>
                <td>${item.unit}</td>
                <td style="color: #475569;">${item.remarks || 'Standard Kit'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="declaration">
          <strong>DECLARATION &amp; SECURITY INSTRUCTIONS:</strong>
          The equipment listed above is dispatched on a temporary rental basis for the designated event and is not for sale. 
          All materials must be inspected at the entrance gate and cleared for return post-event in identical operating condition. 
          ${returnDate ? `Expected Return Date: <strong>${returnDate}</strong>.` : ''}
        </div>

        <div class="sig-grid">
          <div class="sig-box">
            ${quotation.company.signature ? `<img src="${quotation.company.signature}" style="height:28px;max-width:90px;object-fit:contain;margin:0 auto 2px;display:block;" />` : ''}
            Prepared By
            <div class="sig-role">Warehouse Storekeeper</div>
            <div style="margin-top:3px;text-align:center;">
              <svg width="130" height="16" viewBox="0 0 130 16" style="display:inline-block;vertical-align:middle;">
                <rect width="130" height="16" rx="8" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1"/>
                <text x="65" y="8" text-anchor="middle" dominant-baseline="central" fill="#047857" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="7.5" font-weight="800" letter-spacing="0.5">
                  &#10003; DIGITALLY ENDORSED
                </text>
              </svg>
            </div>
          </div>
          <div class="sig-box">
            Verified By
            <div class="sig-role">Technical Supervisor</div>
          </div>
          <div class="sig-box">
            Transporter / Driver
            <div class="sig-role">Carrier Sign &amp; Date</div>
          </div>
          <div class="sig-box">
            Venue Security In / Out
            <div class="sig-role">Official Stamp &amp; Signature</div>
          </div>
        </div>

        <div style="margin-top:24px;border-top:1px dashed #cbd5e1;padding-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#64748b;">
          <div>${quotation.company.name || 'Tisha LED Walls'} &bull; Official Delivery Challan &amp; Venue Gate Pass &bull; Pass #${challanNumber}</div>
          <div style="font-weight:700;color:#059669;">&#10003; Tamper-Protected Electronic Record</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleShareWhatsApp = () => {
    const lines = [
      `🚚 *EQUIPMENT DELIVERY CHALLAN & GATE PASS*`,
      `*Pass #:* ${challanNumber}`,
      `*Client:* ${quotation.client.name}`,
      `*Venue:* ${venue || 'Event Site'}`,
      `*Date:* ${dispatchDate}`,
      ``,
      `🚛 *Transport Details:*`,
      `• Vehicle No: ${vehicleNumber || 'TBD'}`,
      `• Driver: ${driverName || 'TBD'} ${driverPhone ? `(${driverPhone})` : ''}`,
      `• Technician: ${technicianName || 'TBD'} ${technicianPhone ? `(${technicianPhone})` : ''}`,
      ``,
      `📦 *Equipment Manifest:*`,
      ...equipmentList.map((item, i) => `${i + 1}. ${item.description} - ${item.quantity} ${item.unit}`),
      ``,
      `*Purpose:* ${dispatchPurpose}`,
      `— *${quotation.company.name || 'Tisha LED Walls'}*`
    ];

    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Delivery Challan &amp; Venue Gate Pass</h3>
              <p className="text-xs text-slate-300">Generate official transport documentation for venue entry/exit security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 text-slate-900">
          {/* Top Config Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gate Pass / Challan #</label>
              <input
                type="text"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pass Category</label>
              <select
                value={passType}
                onChange={(e) => setPassType(e.target.value as any)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
              >
                <option value="Returnable Gate Pass">Returnable Gate Pass</option>
                <option value="Non-Returnable Delivery Challan">Non-Returnable Delivery Challan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dispatch Date</label>
              <input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Transport & Crew Details */}
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Truck size={14} className="text-blue-600" />
              Transport &amp; Personnel Logistics
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vehicle Registration #</label>
                <input
                  type="text"
                  placeholder="e.g. DL 1L AA 1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Venue / Unloading Site</label>
                <input
                  type="text"
                  placeholder="Hotel / Convention Center Name"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Driver Name &amp; Contact</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Driver Name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
                  />
                  <input
                    type="text"
                    placeholder="Mobile #"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-32 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Technical Lead / Engineer</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Technician Name"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
                  />
                  <input
                    type="text"
                    placeholder="Mobile #"
                    value={technicianPhone}
                    onChange={(e) => setTechnicianPhone(e.target.value)}
                    className="w-32 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Equipment Manifest */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText size={14} className="text-blue-600" />
                Dispatched Equipment Items ({equipmentList.length})
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 w-20">Qty</th>
                    <th className="p-2.5 w-24">Unit</th>
                    <th className="p-2.5">Remarks / Serial</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {equipmentList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                          placeholder="Description of item"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 text-center font-bold text-slate-900 bg-white focus:outline-none focus:border-blue-600"
                          min="1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 text-slate-900 bg-white font-medium focus:outline-none focus:border-blue-600"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.remarks}
                          onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 text-slate-900 bg-white font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                          placeholder="Flight cases, cables, etc."
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Official Gate Pass format with 4 authorization signature blocks.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <MessageCircle size={14} />
              <span>WhatsApp Manifest</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              <Printer size={14} />
              <span>Print / Save Gate Pass (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
