import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, ArrowLeft, FileText } from 'lucide-react';
import { Quotation, ClientProfile, CompanyProfile } from '../types/quotation';
import { QuotationEditor } from '../components/QuotationEditor';
import { createBlankQuotation, storage } from '../services/storage';
import { useToast, useConfirm } from '../context/ToastContext';

interface Props {
  quotations: Quotation[];
  clients: ClientProfile[];
  company: CompanyProfile;
  onUpdateQuotation: (updated: Quotation) => void;
  onDuplicate: (quotation: Quotation) => void;
  onOpenSettings: () => void;
  onCreateNew: () => void;
}

interface InnerProps extends Props {
  id: string;
}

const QuoteEditorPageInner: React.FC<InnerProps> = ({
  id,
  quotations,
  clients,
  company,
  onUpdateQuotation,
  onDuplicate,
  onOpenSettings,
  onCreateNew,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { confirm } = useConfirm();

  const isNew = id === 'new';
  const savedQuote = useMemo(() => {
    return isNew ? null : quotations.find((q) => q.id === id);
  }, [isNew, quotations, id]);

  // Working draft kept in local state until explicitly saved
  const [draftQuote, setDraftQuote] = useState<Quotation>(() => {
    if (isNew) {
      const activeOrgId = typeof window !== 'undefined' ? localStorage.getItem('tisha_active_org_id') || 'org_tisha_main' : 'org_tisha_main';
      const blank = createBlankQuotation(company, activeOrgId);
      if (location.state?.prefilledClient) {
        const c = location.state.prefilledClient;
        blank.client = {
          name: c.name || '',
          company: c.company || '',
          address: c.address || '',
          phone: c.phone || '',
          email: c.email || '',
          gstin: c.gstin || '',
          organizationId: activeOrgId,
        };
      }
      return blank;
    }
    return savedQuote ? { ...savedQuote } : (null as any);
  });

  const [hasNewDraftEdits, setHasNewDraftEdits] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Compute dirty state
  const isDirty = useMemo(() => {
    if (isNew) return hasNewDraftEdits;
    if (!savedQuote || !draftQuote) return false;
    return JSON.stringify(draftQuote) !== JSON.stringify(savedQuote);
  }, [isNew, hasNewDraftEdits, draftQuote, savedQuote]);

  // Compute merged client list for autocomplete
  const availableClients = useMemo(() => {
    const list = clients && clients.length > 0 ? [...clients] : storage.getAllClients();
    const seen = new Set(list.map((c) => (c.name || '').toLowerCase().trim()));
    quotations.forEach((q) => {
      const name = (q.client?.name || '').trim();
      const norm = name.toLowerCase();
      if (name && norm !== 'event organizer / client name' && !seen.has(norm)) {
        seen.add(norm);
        list.push({
          id: `client-quote-${q.id}`,
          name: q.client.name,
          company: q.client.company || '',
          address: q.client.address || '',
          phone: q.client.phone || '',
          email: q.client.email || '',
          gstin: q.client.gstin || '',
        });
      }
    });
    return list;
  }, [clients, quotations]);

  // Save handler (explicit button or Ctrl+S)
  const handleSave = useCallback(async () => {
    if (!draftQuote) return;
    setIsSaving(true);
    try {
      onUpdateQuotation(draftQuote);
      if (isNew) {
        setHasNewDraftEdits(false);
        toast.success(`Quotation ${draftQuote.quotationNumber} saved successfully!`);
        navigate(`/quotes/${draftQuote.id}`, { replace: true });
      } else {
        toast.success(`Changes to ${draftQuote.quotationNumber} saved successfully!`);
      }
    } catch (err: any) {
      toast.error('Failed to save quotation: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  }, [draftQuote, isNew, onUpdateQuotation, navigate, toast]);

  // Discard handler
  const handleDiscard = useCallback(async () => {
    if (isNew) {
      const shouldDiscard = await confirm({
        title: 'Discard New Quotation Draft?',
        message: 'This will reset all details in this draft back to blank.',
        confirmText: 'Reset Draft',
        cancelText: 'Keep Editing',
        variant: 'warning',
      });
      if (shouldDiscard) {
        const blank = createBlankQuotation(company);
        setDraftQuote(blank);
        setHasNewDraftEdits(false);
        toast.info('Draft reset.');
      }
      return;
    }

    if (!savedQuote) return;
    const shouldDiscard = await confirm({
      title: 'Discard Unsaved Changes?',
      message: 'This will revert all your unsaved edits back to the last saved quotation state.',
      confirmText: 'Discard Changes',
      cancelText: 'Keep Editing',
      variant: 'warning',
    });
    if (shouldDiscard) {
      setDraftQuote({ ...savedQuote });
      toast.info('Reverted to saved version.');
    }
  }, [isNew, savedQuote, company, confirm, toast]);

  // Back navigation handler with confirmation prompt if dirty
  const handleBack = useCallback(async () => {
    if (isDirty) {
      const shouldLeave = await confirm({
        title: 'Unsaved Changes',
        message: isNew
          ? 'This new quotation has not been saved yet. Leaving now will discard it without saving anything to the database. Are you sure you want to exit?'
          : 'You have unsaved changes on this quotation. Do you want to discard your edits and leave?',
        confirmText: 'Discard & Leave',
        cancelText: 'Keep Editing',
        variant: 'danger',
      });
      if (!shouldLeave) return;
    }
    navigate('/quotes');
  }, [isDirty, isNew, confirm, navigate]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Browser refresh / tab close safety guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (!isNew && !savedQuote) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
          <FileText size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-base">Quotation Not Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            The quotation ID <span className="font-mono font-semibold">{id}</span> does not exist or may have been deleted.
          </p>
        </div>
        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={() => navigate('/quotes')}
            className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>View All Quotes</span>
          </button>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>+ New Quotation</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuotationEditor
      quotation={draftQuote}
      savedClients={availableClients}
      onChange={(updated) => {
        setDraftQuote(updated);
        if (isNew) setHasNewDraftEdits(true);
      }}
      onBack={handleBack}
      onDuplicate={(source) => {
        onDuplicate(source);
      }}
      onOpenSettings={onOpenSettings}
      isNewDraft={isNew}
      isDirty={isDirty}
      onSave={handleSave}
      onDiscard={handleDiscard}
      isSaving={isSaving}
    />
  );
};

export const QuoteEditorPage: React.FC<Props> = (props) => {
  const { id } = useParams<{ id: string }>();
  // Using key={id || 'new'} ensures component state is cleanly re-instantiated whenever the quotation ID changes
  return <QuoteEditorPageInner key={id || 'new'} {...props} id={id || 'new'} />;
};
