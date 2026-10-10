import React, { useState } from 'react';
import { X, Calculator, Plus, Monitor, Zap, Box } from 'lucide-react';
import { LineItem } from '../types/quotation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddLineItem: (item: LineItem) => void;
}

export const LedCalculatorModal: React.FC<Props> = ({ isOpen, onClose, onAddLineItem }) => {
  const [pitch, setPitch] = useState<'P2.5' | 'P3.91' | 'P4.81'>('P3.91');
  const [type, setType] = useState<'Indoor' | 'Outdoor'>('Indoor');
  const [widthFt, setWidthFt] = useState<number>(12);
  const [heightFt, setHeightFt] = useState<number>(8);
  const [ratePerSqFt, setRatePerSqFt] = useState<number>(110);
  const [days, setDays] = useState<number>(1);
  const [includeTruss, setIncludeTruss] = useState<boolean>(true);

  if (!isOpen) return null;

  const sqFt = widthFt * heightFt;
  const baseRate = sqFt * ratePerSqFt * days;

  // Approximate 500x500mm cabinets (approx 1.64 ft x 1.64 ft)
  const cabWidth = Math.ceil(widthFt / 1.64);
  const cabHeight = Math.ceil(heightFt / 1.64);
  const totalCabinets = cabWidth * cabHeight;
  const estimatedPowerKw = Math.round(totalCabinets * 0.25); // ~250W avg per cab
  const aspectRatio = (widthFt / heightFt).toFixed(2);

  const handleApply = () => {
    const desc = `${pitch} ${type} LED Video Wall (${widthFt}ft x ${heightFt}ft = ${sqFt} Sq.Ft, ${totalCabinets} Cabinets)${days > 1 ? ` for ${days} Days` : ''}${includeTruss ? ' including Ground Support Truss Setup' : ''}`;
    
    const newItem: LineItem = {
      id: `item-led-${Date.now()}`,
      description: desc,
      quantity: 1,
      rate: baseRate,
      unit: `${sqFt} Sq.Ft`,
      hsnSac: '9973',
      dimensions: {
        widthFt,
        heightFt,
        sqFt,
        days,
      },
    };

    onAddLineItem(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Calculator className="text-blue-400" size={22} />
            <h3 className="text-lg font-bold">LED Wall Dimension & Cost Calculator</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Pitch & Environment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">Pixel Pitch</label>
              <select 
                value={pitch} 
                onChange={(e) => {
                  const p = e.target.value as 'P2.5' | 'P3.91' | 'P4.81';
                  setPitch(p);
                  if (p === 'P2.5') setRatePerSqFt(140);
                  if (p === 'P3.91') setRatePerSqFt(110);
                  if (p === 'P4.81') setRatePerSqFt(95);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="P2.5">P2.5 (Ultra Crisp / High-End Conferences)</option>
                <option value="P3.91">P3.91 (Industry Standard / Stage & Concerts)</option>
                <option value="P4.81">P4.81 (Outdoor High Brightness Daylight)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">Environment</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('Indoor')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${type === 'Indoor' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                >
                  Indoor
                </button>
                <button
                  type="button"
                  onClick={() => setType('Outdoor')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${type === 'Outdoor' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                >
                  Outdoor IP65
                </button>
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Width (ft)</label>
              <input 
                type="number" 
                min={1} 
                value={widthFt} 
                onChange={(e) => setWidthFt(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Height (ft)</label>
              <input 
                type="number" 
                min={1} 
                value={heightFt} 
                onChange={(e) => setHeightFt(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Rate (₹/sq.ft)</label>
              <input 
                type="number" 
                min={0} 
                value={ratePerSqFt} 
                onChange={(e) => setRatePerSqFt(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Event Days</label>
              <input 
                type="number" 
                min={1} 
                value={days} 
                onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 focus:outline-blue-500"
              />
            </div>
          </div>

          {/* Quick presets for common screen sizes */}
          <div>
            <span className="text-xs text-slate-500 font-medium block mb-1.5">Common Stage Dimensions:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { w: 10, h: 8, label: '10x8 ft (80 sq.ft)' },
                { w: 12, h: 8, label: '12x8 ft (96 sq.ft)' },
                { w: 16, h: 9, label: '16x9 ft (144 sq.ft)' },
                { w: 20, h: 10, label: '20x10 ft (200 sq.ft)' },
                { w: 24, h: 12, label: '24x12 ft (288 sq.ft)' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setWidthFt(preset.w);
                    setHeightFt(preset.h);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium ${widthFt === preset.w && heightFt === preset.h ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Specs breakdown card */}
          <div className="grid grid-cols-3 gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 text-xs">
            <div className="flex items-center gap-2">
              <Monitor className="text-blue-600 shrink-0" size={18} />
              <div>
                <span className="text-slate-500 block">Total Area</span>
                <span className="font-bold text-slate-900 text-sm">{sqFt} Sq.Ft</span>
                <span className="text-[10px] text-slate-400">({aspectRatio}:1 aspect)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Box className="text-blue-600 shrink-0" size={18} />
              <div>
                <span className="text-slate-500 block">Cabinet Count</span>
                <span className="font-bold text-slate-900 text-sm">~{totalCabinets} Panels</span>
                <span className="text-[10px] text-slate-400">({cabWidth}W × {cabHeight}H)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="text-amber-600 shrink-0" size={18} />
              <div>
                <span className="text-slate-500 block">Req. Power</span>
                <span className="font-bold text-slate-900 text-sm">~{estimatedPowerKw} kW</span>
                <span className="text-[10px] text-slate-400">3-Phase GenSet</span>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input 
              type="checkbox" 
              checked={includeTruss} 
              onChange={(e) => setIncludeTruss(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500" 
            />
            Mention Ground Support / Truss in line item description
          </label>

          {/* Total & Action */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-500 block">Calculated Total</span>
              <span className="text-2xl font-black text-slate-900">
                ₹{baseRate.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
              >
                <Plus size={18} />
                Add to Quotation
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
