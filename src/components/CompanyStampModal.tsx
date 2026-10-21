import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, Upload, Trash2, PenTool, Building2, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { OFFICIAL_TISHA_STAMP } from '../config/officialStamp';
import { compositeDrawnStampDataUrl } from '../utils/generateStampPng';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stampDataUrl: string, setAsDefault?: boolean) => void;
  existingStamp?: string;
  companyName?: string;
}

export const CompanyStampModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  existingStamp = '',
  companyName = 'Tisha LED Walls',
}) => {
  useLockBodyScroll(isOpen);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'default' | 'upload'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [inkColor, setInkColor] = useState<string>('#1e3a8a'); // Deep navy blue by default
  const [strokeWidth, setStrokeWidth] = useState<number>(2.8);
  const [includeStampFrame, setIncludeStampFrame] = useState<boolean>(true);
  const [setAsDefault, setSetAsDefault] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      if (existingStamp) {
        setUploadedImage(existingStamp);
        // If an existing stamp is present, start on draw tab so user can draw anytime
        setActiveTab('draw');
      } else {
        setUploadedImage(null);
        setActiveTab('draw');
      }
      setHasDrawn(false);

      setTimeout(() => {
        initCanvas();
      }, 70);
    }
  }, [isOpen, existingStamp]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;
    ctx.lineWidth = strokeWidth;

    ctx.clearRect(0, 0, rect.width, rect.height);
  };

  useEffect(() => {
    if (activeTab === 'draw') {
      setTimeout(() => {
        initCanvas();
      }, 60);
    }
  }, [activeTab, includeStampFrame]);

  // Dynamically update context ink color & stroke width
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = inkColor;
        ctx.fillStyle = inkColor;
        ctx.lineWidth = strokeWidth;
      }
    }
  }, [inkColor, strokeWidth, activeTab]);

  if (!isOpen) return null;

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;
    ctx.lineWidth = strokeWidth;
    const { x, y } = getCoordinates(e);

    // Immediate circular dot on single click / tap
    const dotRadius = Math.max(1.8, strokeWidth / 1.5);
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveDrawn = () => {
    if (!canvasRef.current || !hasDrawn) return;

    const finalStampData = compositeDrawnStampDataUrl(canvasRef.current, {
      companyName,
      location: 'GURUGRAM (HARYANA)',
      includeFrame: includeStampFrame,
      primaryColor: inkColor,
    });

    onSave(finalStampData, setAsDefault);
    onClose();
  };

  const handleSaveUploaded = () => {
    if (!uploadedImage) return;
    onSave(uploadedImage, setAsDefault);
    onClose();
  };

  const handleSetOfficialDefault = () => {
    onSave(OFFICIAL_TISHA_STAMP, true);
    onClose();
  };

  const handleRemove = () => {
    onSave('', true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white text-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Company Stamp &amp; Signature Studio</h3>
              <p className="text-xs text-slate-500">Draw custom signature, set official default, or upload stamp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 3 Nav Tabs */}
        <div className="px-5 pt-3.5 pb-2 bg-white flex items-center gap-1.5 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
              activeTab === 'draw'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <PenTool size={14} />
            <span>Draw Stamp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('default')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
              activeTab === 'default'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sparkles size={14} />
            <span>Official Stamp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Upload size={14} />
            <span>Upload File</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">

          {/* TAB 1: DRAW STAMP */}
          {activeTab === 'draw' && (
            <div className="space-y-3">
              {/* Controls Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Ink Color:</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { color: '#1e3a8a', label: 'Navy' },
                      { color: '#0f172a', label: 'Dark Slate' },
                      { color: '#b91c1c', label: 'Stamp Red' },
                      { color: '#2563eb', label: 'Royal Blue' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setInkColor(c.color)}
                        className={`w-5 h-5 rounded-full border transition-transform ${
                          inkColor === c.color ? 'scale-115 ring-2 ring-blue-400 ring-offset-1 shadow-xs' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                    <span>Width:</span>
                    {[
                      { label: 'Fine', val: 2 },
                      { label: 'Med', val: 2.8 },
                      { label: 'Bold', val: 3.8 },
                    ].map((w) => (
                      <button
                        key={w.val}
                        type="button"
                        onClick={() => setStrokeWidth(w.val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          strokeWidth === w.val
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200/70 transition-colors"
                  >
                    <RotateCcw size={12} />
                    <span>Clear Pad</span>
                  </button>
                </div>
              </div>

              {/* Live Interactive Stamp Canvas Studio */}
              <div className="relative w-full aspect-[460/240] max-h-56 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden cursor-crosshair touch-none select-none shadow-inner flex items-center justify-center">
                
                {/* Stamp Frame Underlay (if includeStampFrame is checked) */}
                {includeStampFrame && (
                  <div className="absolute inset-0 pointer-events-none p-2 sm:p-3 flex flex-col justify-between">
                    {/* Outer double frame simulated visually */}
                    <div className="w-full h-full rounded-xl border-[2.5px] border-blue-900/80 p-1 flex flex-col justify-between bg-blue-50/20">
                      <div className="w-full h-full rounded-lg border border-dashed border-blue-900/60 p-2 flex flex-col justify-between">
                        
                        {/* Stamp Header */}
                        <div className="text-center pt-0.5">
                          <div className="text-xs sm:text-sm font-black text-blue-950 uppercase tracking-[0.16em]">
                            {companyName || 'TISHA LED WALLS'}
                          </div>
                          <div className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                            GURUGRAM (HARYANA)
                          </div>
                        </div>

                        {/* Middle row: Seal on left, Signature guide on right */}
                        <div className="flex items-center justify-between px-2">
                          <div className="w-12 h-12 rounded-full border-2 border-blue-900/80 bg-blue-50/80 flex flex-col items-center justify-center shadow-2xs">
                            <ShieldCheck size={16} className="text-blue-800" />
                            <span className="text-[6.5px] font-black text-blue-900 tracking-tighter">VERIFIED</span>
                            <span className="text-[5.5px] font-bold text-blue-600">SEAL</span>
                          </div>

                          {!hasDrawn && (
                            <div className="flex-1 text-center text-slate-400 text-xs font-medium italic animate-pulse">
                              Sign with pen, mouse, or touch here...
                            </div>
                          )}
                        </div>

                        {/* Stamp Footer */}
                        <div className="border-t border-dashed border-blue-900/40 pt-1 text-center">
                          <span className="text-[9px] sm:text-[10px] font-black text-blue-900 tracking-widest uppercase">
                            &#9733; AUTHORIZED SIGNATORY &#9733;
                          </span>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* Transparent Interactive Drawing Canvas on top */}
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full block bg-transparent relative z-10"
                />

                {!includeStampFrame && !hasDrawn && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-1">
                    <PenTool size={22} className="opacity-40" />
                    <span className="text-xs font-medium">Draw your official signature here</span>
                    <span className="text-[10px] text-slate-400">Touchscreen, stylus, or mouse supported</span>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 bg-slate-50/90 p-3 rounded-xl border border-slate-200/70 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeStampFrame}
                    onChange={(e) => setIncludeStampFrame(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Compose inside Official Tisha LED Walls rubber stamp frame</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-900">
                  <input
                    type="checkbox"
                    checked={setAsDefault}
                    onChange={(e) => setSetAsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Set as Company Default Stamp (automatically applied to all new quotations)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: OFFICIAL STAMP PRESET */}
          {activeTab === 'default' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm max-w-sm">
                  <img
                    src={OFFICIAL_TISHA_STAMP}
                    alt="Official Tisha LED Walls Stamp"
                    className="w-full max-h-44 object-contain"
                  />
                </div>

                <div className="space-y-1 text-center max-w-md">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-700">
                    <CheckCircle2 size={15} />
                    <span>Official Verified Stamp Preset</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Includes company header <strong>TISHA LED WALLS</strong>, location <strong>GURUGRAM (HARYANA)</strong>, verified security seal, and authorized signatory. Pre-configured for immediate endorsement on all quotations, invoices, and gate passes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSetOfficialDefault}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  <Sparkles size={15} />
                  <span>Set Official Stamp as Default</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD FILE */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center space-y-2">
                {uploadedImage ? (
                  <div className="w-full flex flex-col items-center space-y-2">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <img
                        src={uploadedImage}
                        alt="Uploaded Stamp"
                        className="max-h-36 max-w-[240px] object-contain"
                      />
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <Check size={13} />
                      Stamp Image Ready
                    </span>
                    <label className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                      <span>Choose Different File</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-3 p-4">
                    <label className="flex flex-col items-center justify-center cursor-pointer p-5 w-full border border-dashed border-slate-300 rounded-xl hover:bg-white transition-colors bg-white/60">
                      <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 shadow-2xs">
                        <Upload size={20} />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Click to upload stamp / signature image</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP, or SVG accepted</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-900">
                  <input
                    type="checkbox"
                    checked={setAsDefault}
                    onChange={(e) => setSetAsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Set as Company Default Stamp (automatically applied to all new quotations)</span>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          {existingStamp ? (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
            >
              <Trash2 size={13} />
              <span>Remove Stamp</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Cancel
            </button>

            {activeTab === 'draw' && (
              <button
                type="button"
                onClick={handleSaveDrawn}
                disabled={!hasDrawn}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                <Check size={14} />
                <span>{setAsDefault ? 'Save & Set as Default Stamp' : 'Save Stamp'}</span>
              </button>
            )}

            {activeTab === 'default' && (
              <button
                type="button"
                onClick={handleSetOfficialDefault}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                <Sparkles size={14} />
                <span>Set as Default Stamp</span>
              </button>
            )}

            {activeTab === 'upload' && (
              <button
                type="button"
                onClick={handleSaveUploaded}
                disabled={!uploadedImage}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                <Check size={14} />
                <span>{setAsDefault ? 'Save & Set as Default Stamp' : 'Save Stamp'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
