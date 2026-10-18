import React, { useState } from 'react';
import { X, Calculator, Plus, Monitor, Zap, Box, Sliders } from 'lucide-react';
import { LineItem } from '../types/quotation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddLineItem: (item: LineItem) => void;
}

const COMMON_PRESETS = [
  { w: 10, h: 8, label: '10×8 ft (80 sq.ft)' },
  { w: 12, h: 8, label: '12×8 ft (96 sq.ft)' },
  { w: 16, h: 9, label: '16×9 ft (144 sq.ft)' },
  { w: 20, h: 10, label: '20×10 ft (200 sq.ft)' },
  { w: 24, h: 12, label: '24×12 ft (288 sq.ft)' },
  { w: 30, h: 10, label: '30×10 ft (300 sq.ft)' },
];

export const LedCalculatorModal: React.FC<Props> = ({ isOpen, onClose, onAddLineItem }) => {
  const [pitch, setPitch] = useState<'P2' | 'P3' | 'P4'>('P3');
  const [type, setType] = useState<'Indoor' | 'Outdoor'>('Indoor');

  // Use number | '' to allow clean backspacing without sticking to '0' or '1'
  const [widthFt, setWidthFt] = useState<number | ''>(12);
  const [heightFt, setHeightFt] = useState<number | ''>(8);
  const [ratePerSqFt, setRatePerSqFt] = useState<number | ''>(110);
  const [days, setDays] = useState<number | ''>(1);
  const [includeTruss, setIncludeTruss] = useState<boolean>(true);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  if (!isOpen) return null;

  // Safe numerical evaluations for display & calculations
  const numWidth = typeof widthFt === 'number' ? widthFt : (parseFloat(widthFt) || 0);
  const numHeight = typeof heightFt === 'number' ? heightFt : (parseFloat(heightFt) || 0);
  const numRate = typeof ratePerSqFt === 'number' ? ratePerSqFt : (parseFloat(ratePerSqFt) || 0);
  const numDays = typeof days === 'number' ? days : (parseInt(String(days)) || 1);

  const sqFt = Math.round(numWidth * numHeight * 100) / 100;
  const baseRate = Math.round(sqFt * numRate * numDays);

  // Approximate 500x500mm cabinets (approx 1.64 ft x 1.64 ft)
  const cabWidth = numWidth > 0 ? Math.ceil(numWidth / 1.64) : 0;
  const cabHeight = numHeight > 0 ? Math.ceil(numHeight / 1.64) : 0;
  const totalCabinets = cabWidth * cabHeight;
  const estimatedPowerKw = Math.round(totalCabinets * 0.25); // ~250W avg per cab
  const aspectRatio = numHeight > 0 ? (numWidth / numHeight).toFixed(2) : '1.00';

  // Check if current dimensions match a preset
  const matchedPreset = COMMON_PRESETS.find((p) => p.w === numWidth && p.h === numHeight);

  const handleSelectPreset = (w: number, h: number) => {
    setWidthFt(w);
    setHeightFt(h);
    setIsCustomMode(false);
  };

  const handleCustomModeClick = () => {
    setIsCustomMode(true);
  };

  const handleApply = () => {
    const finalWidth = numWidth > 0 ? numWidth : 10;
    const finalHeight = numHeight > 0 ? numHeight : 8;
    const finalRate = numRate > 0 ? numRate : 110;
    const finalDays = numDays > 0 ? numDays : 1;
    const finalSqFt = Math.round(finalWidth * finalHeight * 100) / 100;
    const finalTotal = Math.round(finalSqFt * finalRate * finalDays);

    const desc = `${pitch} ${type} LED Video Wall (${finalWidth}ft × ${finalHeight}ft = ${finalSqFt} Sq.Ft, ${totalCabinets} Panels)${finalDays > 1 ? ` for ${finalDays} Days` : ''}${includeTruss ? ' including Ground Support Truss Setup' : ''}`;

    const newItem: LineItem = {
      id: `item-led-${Date.now()}`,
      description: desc,
      quantity: 1,
      amount: finalTotal,
      rate: finalTotal,
      unit: `${finalSqFt} Sq.Ft`,
      hsnSac: '9973',
      dimensions: {
        widthFt: finalWidth,
        heightFt: finalHeight,
        sqFt: finalSqFt,
        days: finalDays,
      },
    };

    onAddLineItem(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-modal-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Calculator className="text-blue-400" size={22} />
            <div>
              <h3 className="text-lg font-bold">LED Wall Dimension &amp; Cost Calculator</h3>
              <p className="text-xs text-slate-400">Configure screen size, pixel pitch &amp; auto-calculate power &amp; panels</p>
            </div>
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
                  const p = e.target.value as 'P2' | 'P3' | 'P4';
                  setPitch(p);
                  if (p === 'P2') setRatePerSqFt(140);
                  if (p === 'P3') setRatePerSqFt(110);
                  if (p === 'P4') setRatePerSqFt(95);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="P2">P2 (Crisp / Conferences)</option>
                <option value="P3">P3 (Stage &amp; Concerts)</option>
                <option value="P4">P4 (Outdoor Daylight)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">Environment</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('Indoor')}
                  className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg border transition-all ${type === 'Indoor'
                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  Indoor
                </button>
                <button
                  type="button"
                  onClick={() => setType('Outdoor')}
                  className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg border transition-all ${type === 'Outdoor'
                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  Outdoor IP65
                </button>
              </div>
            </div>
          </div>

          {/* Dimension Selection Mode Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                Stage Dimensions:
              </span>
              <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                <Sliders size={12} />
                {isCustomMode || !matchedPreset ? 'Custom Dimensions Active' : matchedPreset.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {COMMON_PRESETS.map((preset) => {
                const isActive = !isCustomMode && numWidth === preset.w && numHeight === preset.h;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset.w, preset.h)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleCustomModeClick}
                className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 ${isCustomMode || !matchedPreset
                  ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 text-slate-600 border-dashed border-slate-300 hover:bg-slate-100'
                  }`}
              >
                <span>Custom Stage Size</span>
              </button>
            </div>
          </div>

          {/* Dimensions & Rates Inputs (allows clean erasing) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Width (ft)
              </label>
              <input
                type="number"
                min={1}
                step="any"
                value={widthFt}
                placeholder="e.g. 12"
                onChange={(e) => {
                  const val = e.target.value;
                  setIsCustomMode(true);
                  if (val === '') {
                    setWidthFt('');
                  } else {
                    const parsed = parseFloat(val);
                    setWidthFt(isNaN(parsed) ? '' : parsed);
                  }
                }}
                onBlur={() => {
                  if (widthFt === '' || (typeof widthFt === 'number' && widthFt <= 0)) {
                    setWidthFt(12);
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Height (ft)
              </label>
              <input
                type="number"
                min={1}
                step="any"
                value={heightFt}
                placeholder="e.g. 8"
                onChange={(e) => {
                  const val = e.target.value;
                  setIsCustomMode(true);
                  if (val === '') {
                    setHeightFt('');
                  } else {
                    const parsed = parseFloat(val);
                    setHeightFt(isNaN(parsed) ? '' : parsed);
                  }
                }}
                onBlur={() => {
                  if (heightFt === '' || (typeof heightFt === 'number' && heightFt <= 0)) {
                    setHeightFt(8);
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Rate (₹/sq.ft)
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={ratePerSqFt}
                placeholder="e.g. 110"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setRatePerSqFt('');
                  } else {
                    const parsed = parseFloat(val);
                    setRatePerSqFt(isNaN(parsed) ? '' : parsed);
                  }
                }}
                onBlur={() => {
                  if (ratePerSqFt === '') {
                    setRatePerSqFt(110);
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Event Days
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={days}
                placeholder="1"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setDays('');
                  } else {
                    const parsed = parseInt(val, 10);
                    setDays(isNaN(parsed) ? '' : parsed);
                  }
                }}
                onBlur={() => {
                  if (days === '' || (typeof days === 'number' && days < 1)) {
                    setDays(1);
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 focus:outline-blue-500"
              />
            </div>
          </div>

          {/* Specs breakdown card */}
          <div className="grid grid-cols-3 gap-3 bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 text-xs">
            <div className="flex items-center gap-2">
              <Monitor className="text-blue-600 shrink-0" size={18} />
              <div>
                <span className="text-slate-500 block font-medium">Total Area</span>
                <span className="font-bold text-slate-900 text-sm">{sqFt} Sq.Ft</span>
                <span className="text-[10px] text-slate-400">({aspectRatio}:1 aspect)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Box className="text-blue-600 shrink-0" size={18} />
              <div>
                <span className="text-slate-500 block font-medium">Cabinet Count</span>
                <span className="font-bold text-slate-900 text-sm">~{totalCabinets} Panels</span>
                <span className="text-[10px] text-slate-400">({cabWidth}W × {cabHeight}H)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="text-amber-600 shrink-0" size={18} />
              <div>
                <span className="text-slate-500 block font-medium">Req. Power</span>
                <span className="font-bold text-slate-900 text-sm">~{estimatedPowerKw} kW</span>
                <span className="text-[10px] text-slate-400">3-Phase GenSet</span>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeTruss}
              onChange={(e) => setIncludeTruss(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span>Mention Ground Support / Truss in line item description</span>
          </label>

          {/* Total & Action */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-500 block font-medium">Calculated Total</span>
              <span className="text-2xl font-black text-slate-900">
                ₹{baseRate.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
              >
                <Plus size={17} />
                Add to Quotation
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
