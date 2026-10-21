import React, { useState, useEffect, useRef } from 'react';
import {
  X, MessageSquare, Bell, Clock, RotateCcw, Save, Check,
  Copy, Sparkles, Tag, HelpCircle, Eye, Sliders
} from 'lucide-react';
import {
  TemplateKey,
  TEMPLATE_DEFINITIONS,
  AVAILABLE_VARIABLES,
  getTemplate,
  saveTemplate,
  resetTemplate,
  isTemplateCustomized,
  renderTemplate
} from '../services/templateService';
import { Quotation } from '../types/quotation';
import { useToast } from '../context/ToastContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TemplateKey;
  sampleQuotation?: Quotation | null;
}

export const MessageTemplatesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialTab = 'simpleTextBreakdown',
  sampleQuotation = null
}) => {
  useLockBodyScroll(isOpen);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TemplateKey>(initialTab);
  const [templateContent, setTemplateContent] = useState<string>(() => getTemplate(initialTab));
  const [isCustom, setIsCustom] = useState<boolean>(() => isTemplateCustomized(initialTab));
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync tab and load template
  useEffect(() => {
    if (isOpen) {
      const tabToUse = initialTab || 'simpleTextBreakdown';
      setActiveTab(tabToUse);
      setTemplateContent(getTemplate(tabToUse));
      setIsCustom(isTemplateCustomized(tabToUse));
    }
  }, [isOpen, initialTab]);

  const loadTemplate = (key: TemplateKey) => {
    setTemplateContent(getTemplate(key));
    setIsCustom(isTemplateCustomized(key));
  };

  const handleTabChange = (key: TemplateKey) => {
    setActiveTab(key);
    loadTemplate(key);
  };

  if (!isOpen) return null;

  const currentDef = TEMPLATE_DEFINITIONS[activeTab];

  // Dummy fallback quotation if none provided
  const dummyQuotation: Quotation = sampleQuotation || {
    id: 'demo-quote',
    quotationNumber: 'TLW-2610-502',
    quotationDate: '21/10/2026',
    validUntil: '28/10/2026',
    documentType: 'quotation',
    status: 'sent',
    company: {
      name: 'Tisha LED Walls',
      logo: '',
      address: 'Jharsa Village, Sector 39, Gurugram, Haryana',
      phone: '+91 97166 81122',
      email: 'sales@tishaledwalls.com',
      bankDetails: {
        accountName: 'Tisha LED Walls',
        bankName: 'HDFC Bank',
        accountNumber: '50200012345678',
        ifscCode: 'HDFC0001234',
        branch: 'Sector 39 Gurugram',
        upiId: 'tishaledwalls@hdfcbank'
      }
    },
    client: {
      name: 'Aman Sharma',
      company: 'Grand Royale Events & Weddings',
      address: 'Sector 49, Gurugram',
      phone: '+91 98111 22334',
      email: 'aman@grandroyale.com'
    },
    venue: 'The Leela Ambience, Gurugram',
    eventDate: '15/11/2026',
    lineItems: [
      {
        id: '1',
        description: 'P2.6 Indoor Curved High-Refresh LED Wall (24ft x 10ft)',
        quantity: 240,
        unit: 'Sq.Ft',
        rate: 120,
        amount: 28800
      },
      {
        id: '2',
        description: '4K Novastar Video Processor & Live Switching Console',
        quantity: 1,
        unit: 'Unit',
        rate: 5000,
        amount: 5000
      }
    ],
    taxScheme: 'gst_18',
    taxRate: 18,
    discountAmount: 1800,
    shippingCharges: 2500,
    adjustmentAmount: 0,
    enablePaymentLedger: true,
    advancePercentage: 70,
    paidAmount: 15000,
    paymentStatus: 'partial',
    enableUpiQr: true
  };

  // Insert variable at cursor position
  const handleInsertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateContent((prev) => prev + tag);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = templateContent;
    const updated = currentText.substring(0, start) + tag + currentText.substring(end);
    setTemplateContent(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleSave = () => {
    saveTemplate(activeTab, templateContent);
    setIsCustom(true);
    toast.success(`Template "${currentDef.name}" saved successfully!`);
  };

  const handleReset = () => {
    resetTemplate(activeTab);
    setTemplateContent(currentDef.defaultTemplate);
    setIsCustom(false);
    toast.info(`Reset "${currentDef.name}" to system default.`);
  };

  // Render live preview with current in-editor content
  let previewText = '';
  try {
    previewText = renderTemplate(activeTab, dummyQuotation, templateContent);
  } catch (e) {
    previewText = 'Preview unavailable (check syntax)';
  }

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      toast.success('Preview copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy preview');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Manage WhatsApp Message Templates</h3>
              <p className="text-xs text-slate-300">Customize text breakdown, follow-up reminders, and balance collection messages</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-3 sm:px-6 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {(Object.keys(TEMPLATE_DEFINITIONS) as TemplateKey[]).map((key) => {
            const def = TEMPLATE_DEFINITIONS[key];
            const isActive = activeTab === key;
            const custom = isTemplateCustomized(key);

            let Icon = MessageSquare;
            if (key === 'followUpReminder') Icon = Bell;
            if (key === 'balancePaymentReminder') Icon = Clock;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 border-slate-200 shadow-xs'
                    : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                <span>{def.name}</span>
                {custom && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" title="Customized Template" />
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
          {/* Header Card for Active Tab */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-slate-900">{currentDef.name}</h4>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isCustom
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isCustom ? 'Customized' : 'System Default'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{currentDef.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isCustom && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  title="Reset to factory default"
                >
                  <RotateCcw size={13} />
                  <span>Reset Default</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Eye size={13} />
                <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
              </button>
            </div>
          </div>

          {/* Quick Insert Variables Tags */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Tag size={12} className="text-emerald-600" />
                <span>Click dynamic tags to insert at cursor:</span>
              </span>
              <span className="text-[10px] text-slate-400">Available placeholders</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => handleInsertTag(v.tag)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-medium bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer active:scale-95"
                  title={v.desc}
                >
                  <span>+</span>
                  <span>{v.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Workspace: Editor + Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Editor Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Template Editor</span>
                <span className="text-[10px] font-normal text-slate-400">
                  {templateContent.length} characters
                </span>
              </label>

              <textarea
                ref={textareaRef}
                rows={14}
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Type your WhatsApp message template here..."
                className="w-full p-3 font-mono text-xs leading-relaxed rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-y shadow-xs"
              />
            </div>

            {/* Live Preview Box */}
            {showPreview && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" />
                    <span>Real-Time WhatsApp Preview</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyPreview}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy Preview'}</span>
                  </button>
                </div>

                <div className="relative rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 h-[290px] overflow-y-auto">
                  <pre className="text-xs leading-relaxed text-slate-800 font-sans whitespace-pre-wrap select-text">
                    {previewText}
                  </pre>
                </div>
                <p className="text-[10px] text-slate-400">
                  Preview rendered using live quotation / sample demo parameters.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
            <HelpCircle size={14} className="text-slate-400" />
            <span>Templates are saved locally and apply immediately to all quotations.</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Save size={14} />
              <span>Save Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
