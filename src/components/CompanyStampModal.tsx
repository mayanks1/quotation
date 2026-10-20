import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, Upload, Trash2, PenTool, Building2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { OFFICIAL_TISHA_STAMP } from '../config/officialStamp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stampDataUrl: string) => void;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [inkColor, setInkColor] = useState<string>('#1e3a8a'); // Deep navy blue by default

  useEffect(() => {
    if (isOpen) {
      if (existingStamp) {
        setUploadedImage(existingStamp);
        setActiveTab('upload');
      } else {
        setUploadedImage(null);
        setActiveTab('draw');
      }
      setHasDrawn(false);

      // Initialize canvas if draw mode
      setTimeout(() => {
        initCanvas();
      }, 60);
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
    ctx.lineWidth = 2.8;

    ctx.clearRect(0, 0, rect.width, rect.height);
  };

  useEffect(() => {
    if (activeTab === 'draw') {
      setTimeout(() => {
        initCanvas();
      }, 50);
    }
  }, [activeTab]);

  // Dynamically update context ink color without wiping canvas content
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = inkColor;
        ctx.fillStyle = inkColor;
      }
    }
  }, [inkColor, activeTab]);

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
    const { x, y } = getCoordinates(e);

    // Draw an immediate circular dot so single clicks or taps (e.g. dot on 'i' or period) draw cleanly
    const dotRadius = Math.max(1.8, ctx.lineWidth / 1.5);
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Start line path from the dot coordinate
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

  const handleSave = () => {
    if (activeTab === 'upload' && uploadedImage) {
      onSave(uploadedImage);
      onClose();
      return;
    }

    if (activeTab === 'draw' && hasDrawn && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
      return;
    }

    // If nothing new was added, keep existing or close
    if (existingStamp) {
      onSave(existingStamp);
    }
    onClose();
  };

  const handleRemove = () => {
    onSave('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white text-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Official Stamp &amp; Signature</h3>
              <p className="text-xs text-slate-500">{companyName} — Authorized Representative</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="px-5 pt-4 pb-2 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
              activeTab === 'draw'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <PenTool size={14} />
            <span>Draw Signature</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Upload size={14} />
            <span>Upload Stamp / Image</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {activeTab === 'draw' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span>Ink Color:</span>
                  <div className="flex items-center gap-1 ml-1">
                    {[
                      { color: '#1e3a8a', label: 'Navy' },
                      { color: '#0f172a', label: 'Black' },
                      { color: '#991b1b', label: 'Stamp Red' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => setInkColor(c.color)}
                        className={`w-5 h-5 rounded-full border transition-transform ${
                          inkColor === c.color ? 'scale-110 ring-2 ring-blue-400 ring-offset-1' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Clear Pad</span>
                </button>
              </div>

              {/* Canvas Area */}
              <div className="relative w-full h-48 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden cursor-crosshair touch-none select-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full block bg-white"
                />

                {!hasDrawn && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-1">
                    <PenTool size={22} className="opacity-40" />
                    <span className="text-xs font-medium">Draw your official signature here</span>
                    <span className="text-[10px] text-slate-300">Touchscreen, stylus, or mouse supported</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
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
                    <button
                      type="button"
                      onClick={() => setUploadedImage(OFFICIAL_TISHA_STAMP)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Sparkles size={14} />
                      <span>Use Official Tisha LED Walls Stamp</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">— OR UPLOAD YOUR OWN FILE —</span>
                    <label className="flex flex-col items-center justify-center cursor-pointer p-4 w-full border border-dashed border-slate-300 rounded-lg hover:bg-white transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                        <Upload size={18} />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Click to upload stamp / signature file</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, or WEBP</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-2.5 text-[11px] text-blue-800 flex items-start gap-2">
            <Check size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <span>
              This signature &amp; stamp will automatically endorse your quotations, client review portals, PDFs, and gate passes.
            </span>
          </div>
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
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Check size={14} />
              <span>Save Official Stamp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
