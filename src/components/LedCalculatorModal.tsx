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

interface PitchSpec {
  name: string;
  cabinetWidthMm: number;
  cabinetHeightMm: number;
  cabinetWidthFt: number; // e.g. 576mm / 304.8 = 1.88976 ft
  cabinetHeightFt: number;
  cabinetAreaSqFt: number;
  label: string;
  indoorAvgWatts: number;
  indoorMaxWatts: number;
  outdoorAvgWatts: number;
  outdoorMaxWatts: number;
}

const PITCH_SPECS: Record<'P2' | 'P3' | 'P4', PitchSpec> = {
  P2: {
    name: 'P2 (Conferences • 500×500mm)',
    cabinetWidthMm: 500,
    cabinetHeightMm: 500,
    cabinetWidthFt: 500 / 304.8, // 1.64042 ft
    cabinetHeightFt: 500 / 304.8,
    cabinetAreaSqFt: 2.691,
    label: '500×500mm',
    indoorAvgWatts: 75,
    indoorMaxWatts: 140,
    outdoorAvgWatts: 100,
    outdoorMaxWatts: 180,
  },
  P3: {
    name: 'P3 (Stage & Concerts • 500×500mm)',
    cabinetWidthMm: 500,
    cabinetHeightMm: 500,
    cabinetWidthFt: 500 / 304.8, // 1.64042 ft
    cabinetHeightFt: 500 / 304.8,
    cabinetAreaSqFt: 2.691,
    label: '500×500mm',
    indoorAvgWatts: 85,
    indoorMaxWatts: 160,
    outdoorAvgWatts: 120,
    outdoorMaxWatts: 200,
  },
  P4: {
    name: 'P4 (Outdoor Daylight • 576×576mm)',
    cabinetWidthMm: 576,
    cabinetHeightMm: 576,
    cabinetWidthFt: 576 / 304.8, // 1.88976 ft
    cabinetHeightFt: 576 / 304.8,
    cabinetAreaSqFt: 3.571,
    label: '576×576mm',
    indoorAvgWatts: 100,
    indoorMaxWatts: 180,
    outdoorAvgWatts: 130,
    outdoorMaxWatts: 240,
  },
};

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

  const currentSpec = PITCH_SPECS[pitch];

  const sqFt = Math.round(numWidth * numHeight * 100) / 100;
  const baseRate = Math.round(sqFt * numRate * numDays);

  // Exact cabinet calculations based on true cabinet dimensions (576x576mm for P4, 500x500mm for P2/P3)
  const cabWidth = numWidth > 0 ? Math.max(1, Math.round(numWidth / currentSpec.cabinetWidthFt)) : 0;
  const cabHeight = numHeight > 0 ? Math.max(1, Math.round(numHeight / currentSpec.cabinetHeightFt)) : 0;
  const totalCabinets = cabWidth * cabHeight;

  // Realistic power calculations based on cabinet specs and environment (Indoor vs Outdoor)
  const avgWattsPerCab = type === 'Indoor' ? currentSpec.indoorAvgWatts : currentSpec.outdoorAvgWatts;
  const maxWattsPerCab = type === 'Indoor' ? currentSpec.indoorMaxWatts : currentSpec.outdoorMaxWatts;
  const totalAvgWatts = totalCabinets * avgWattsPerCab;
  const totalMaxWatts = totalCabinets * maxWattsPerCab;

  // Running power in kW
  const estimatedPowerKw = totalAvgWatts > 0
    ? (totalAvgWatts >= 10000 ? (totalAvgWatts / 1000).toFixed(0) : (totalAvgWatts / 1000).toFixed(1))
    : '0';

  const peakPowerKw = totalMaxWatts > 0 ? (totalMaxWatts / 1000).toFixed(1) : '0';

  // Practical electrical supply & generator sizing recommendation
  const powerSupplyRecommend = totalAvgWatts <= 3500
    ? 'Single-Phase 16A / 5 kVA'
    : totalAvgWatts <= 7500
    ? '3-Phase 16A / 10 kVA'
    : totalAvgWatts <= 15000
    ? '3-Phase 32A / 15-20 kVA'
    : '3-Phase GenSet 25+ kVA';

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

    const desc = `${pitch} ${type} LED Video Wall (${finalWidth}ft × ${finalHeight}ft = ${finalSqFt} Sq.Ft, ${totalCabinets} Panels @ ${currentSpec.label})${finalDays > 1 ? ` for ${finalDays} Days` : ''}${includeTruss ? ' including Ground Support Truss Setup' : ''}`;

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
                <option value="P2">P2 (Indoor Conferences • 500×500mm)</option>
                <option value="P3">P3 (Stage &amp; Concerts • 500×500mm)</option>
                <option value="P4">P4 (Outdoor Daylight • 576×576mm)</option>
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
                <span className="text-slate-400 font-normal">({currentSpec.label})</span>
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
                <span className="text-[10px] text-slate-400">({cabWidth}W × {cabHeight}H • {currentSpec.label})</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="text-amber-600 shrink-0" size={18} />
              <div className="min-w-0">
                <span className="text-slate-500 block font-medium">Req. Power</span>
                <span className="font-bold text-slate-900 text-sm">~{estimatedPowerKw} kW</span>
                <span className="text-[10px] text-slate-400 truncate block" title={`${powerSupplyRecommend} (Peak ~${peakPowerKw} kW)`}>
                  {powerSupplyRecommend}
                </span>
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
