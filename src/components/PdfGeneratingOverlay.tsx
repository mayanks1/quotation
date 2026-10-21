import React, { useState, useEffect } from 'react';
import { Receipt, Sparkles, ShieldCheck, FileCheck, CheckCircle2, X } from 'lucide-react';

interface PdfGeneratingOverlayProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  documentRef?: string;
  clientName?: string;
  onCancel?: () => void;
}

const STAGES = [
  'Synthesizing high-resolution layout...',
  'Applying verified digital stamp & credentials...',
  'Embedding tamper-evident QR verification...',
  'Compiling cryptographic PDF document...',
];

export const PdfGeneratingOverlay: React.FC<PdfGeneratingOverlayProps> = ({
  isOpen,
  title = 'Receipt is Generating...',
  subtitle = 'Please wait a moment while we render your official document',
  documentRef,
  clientName,
  onCancel,
}) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStageIdx(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => (prev + 1) % STAGES.length);
    }, 700);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      role="status"
      aria-live="polite"
      aria-label="Generating PDF Document"
    >
      {/* Background Soft Ambient Glow */}
      <div className="absolute w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse -z-10" />
      <div className="absolute w-72 h-72 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -z-10 translate-x-20 translate-y-20" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-3xl p-7 shadow-2xl shadow-blue-950/40 text-center overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top-Right Cancel / Dismiss Button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel PDF generation"
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer z-20"
          >
            <X size={18} />
          </button>
        )}

        {/* Top Gradient Accent Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400" />

        {/* Central Animated Badge */}
        <div className="relative mx-auto mb-5 w-20 h-20 flex items-center justify-center">
          {/* Outer Rotating Glow Ring */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-400 opacity-70 animate-spin [animation-duration:3s] blur-xs" />
          
          {/* Subtle Outer Corner Sparkle */}
          <Sparkles size={16} className="absolute -top-1 -right-1 text-emerald-400 animate-pulse z-10" />

          {/* Inner Clean Container - Perfectly Centered 64x64px */}
          <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700/80 flex items-center justify-center shadow-inner">
            {/* Perfectly Dead-Centered Vector Receipt with Centered Dollar Symbol */}
            <svg
              width="36"
              height="36"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-blue-400"
            >
              {/* Receipt Ticket Outline (symmetric around x=24, y=23) */}
              <path
                d="M10 6C10 4.89543 10.8954 4 12 4H36C37.1046 4 38 4.89543 38 6V42L34 39.5L30 42L26 39.5L24 40.5L22 39.5L18 42L14 39.5L10 42V6Z"
                fill="rgba(37, 99, 235, 0.12)"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dollar Vertical Stem (exactly at x=24 from y=12 to y=34) */}
              <line
                x1="24"
                y1="12"
                x2="24"
                y2="34"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Dollar S-Curve (balanced symmetrically at x=24, y=23) */}
              <path
                d="M29 17.5C29 15 26.8 13.5 24 13.5C21.2 13.5 19 15 19 17.5C19 20 21.5 21.3 24 22.3C26.5 23.3 29 24.6 29 27.5C29 30 26.8 31.5 24 31.5C21.2 31.5 19 30 19 27.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-black tracking-tight text-white flex items-center justify-center gap-2">
          <span>{title}</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </h3>

        {/* Optional Document Metadata Badge */}
        {(documentRef || clientName) && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/70 text-xs text-slate-300">
            {documentRef && (
              <span className="font-mono font-bold text-blue-400">{documentRef}</span>
            )}
            {documentRef && clientName && <span className="text-slate-500">&bull;</span>}
            {clientName && (
              <span className="font-medium text-slate-300 truncate max-w-[200px]">{clientName}</span>
            )}
          </div>
        )}

        {/* Subtitle */}
        <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
          {subtitle}
        </p>

        {/* Dynamic Live Step Indicator */}
        <div className="mt-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/90 text-left space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <FileCheck size={13} className="text-blue-400 shrink-0" />
              <span>Status</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold text-[10px] tracking-wide uppercase">
              Rendering HD
            </span>
          </div>

          <div className="text-xs font-semibold text-slate-200 flex items-center gap-2 min-h-[22px] transition-all">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0 animate-pulse" />
            <span className="truncate">{STAGES[currentStageIdx]}</span>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full animate-pulse transition-all duration-500"
              style={{
                width: `${((currentStageIdx + 1) / STAGES.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Cancel Action Button */}
        {onCancel && (
          <div className="mt-4 flex items-center justify-center">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700/90 bg-slate-800/90 hover:bg-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <X size={14} className="text-slate-400" />
              <span>Cancel Generation</span>
            </button>
          </div>
        )}

        {/* Security & Authenticity Trust Badge */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span>Digitally Signed &bull; SHA-256 Ledger Verified &bull; 300 DPI</span>
        </div>

      </div>
    </div>
  );
};
