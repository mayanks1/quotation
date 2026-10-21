import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, Upload, Trash2, PenTool } from 'lucide-react';
import { ClientSignature } from '../types/quotation';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sig: ClientSignature | undefined) => void;
  existingSignature?: ClientSignature;
  clientName?: string;
  clientPhone?: string;
}

export const SignatureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  existingSignature,
  clientName = '',
  clientPhone = '',
}) => {
  useLockBodyScroll(isOpen);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSignerName(existingSignature?.signerName || clientName);
      setSignerPhone(existingSignature?.signerPhone || clientPhone);
      setUploadedImage(existingSignature?.dataUrl || null);
      setHasDrawn(!!existingSignature?.dataUrl);

      // Setup canvas on next tick
      setTimeout(() => {
        initCanvas();
      }, 50);
    }
  }, [isOpen, existingSignature, clientName, clientPhone]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Deep navy blue ink
    ctx.lineWidth = 2.5;

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);

    // If existing signature and not an uploaded image, we can keep hasDrawn true
    if (existingSignature?.dataUrl && !uploadedImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = existingSignature.dataUrl;
    }
  };

  if (!isOpen) return null;

  // Drawing mouse & touch coordinates
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
      // Prevent scrolling when drawing on touchscreen
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset uploaded image if user draws
    if (uploadedImage) {
      setUploadedImage(null);
    }

    ctx.strokeStyle = '#1e3a8a';
    ctx.fillStyle = '#1e3a8a';
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
    setUploadedImage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedImage(result);
      setHasDrawn(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    let finalDataUrl = uploadedImage;

    if (!finalDataUrl && hasDrawn && canvasRef.current) {
      finalDataUrl = canvasRef.current.toDataURL('image/png');
    }

    if (!finalDataUrl) {
      onSave(undefined);
      onClose();
      return;
    }

    onSave({
      dataUrl: finalDataUrl,
      signedAt: new Date().toISOString(),
      signerName: signerName.trim() || clientName || 'Authorized Signatory',
      signerPhone: signerPhone.trim() || undefined,
    });
    onClose();
  };

  const handleRemove = () => {
    onSave(undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white text-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <PenTool size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Client Sign-Off &amp; Signature</h3>
              <p className="text-xs text-slate-500">Sign directly on screen or upload a signed approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Signer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Authorized Signer Name
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:bg-white focus:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Designation / Contact Phone
              </label>
              <input
                type="text"
                value={signerPhone}
                onChange={(e) => setSignerPhone(e.target.value)}
                placeholder="e.g. Event Director / 9876543210"
                className="w-full text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:bg-white focus:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Canvas Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Sign in Box Below:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Clear</span>
                </button>
                <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors">
                  <Upload size={12} />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            <div className="relative w-full h-44 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden cursor-crosshair touch-none select-none">
              {uploadedImage ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-white">
                  <img
                    src={uploadedImage}
                    alt="Uploaded Signature"
                    className="max-h-32 object-contain"
                  />
                  <span className="text-[10px] text-slate-400 mt-1">Uploaded Signature Image</span>
                </div>
              ) : (
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
              )}

              {!hasDrawn && !uploadedImage && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-1">
                  <PenTool size={22} className="opacity-40" />
                  <span className="text-xs font-medium">Draw client signature with finger or mouse</span>
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-400 italic text-center">
              This signature will appear in the Client Acceptance section on the official PDF.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          {existingSignature ? (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
            >
              <Trash2 size={14} />
              <span>Remove Signature</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn && !uploadedImage}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <Check size={15} />
              <span>Apply Signature</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
