import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, FileText } from 'lucide-react';
import { Quotation, ClientProfile, CompanyProfile } from '../types/quotation';
import { QuotationEditor } from '../components/QuotationEditor';
import { createBlankQuotation, storage } from '../services/storage';
import { useToast } from '../context/ToastContext';

interface Props {
  quotations: Quotation[];
  clients: ClientProfile[];
  company: CompanyProfile;
  onUpdateQuotation: (updated: Quotation) => void;
  onDuplicate: (quotation: Quotation) => void;
  onOpenSettings: () => void;
  onCreateNew: () => void;
}

export const QuoteEditorPage: React.FC<Props> = ({
  quotations,
  clients,
  company,
  onUpdateQuotation,
  onDuplicate,
  onOpenSettings,
  onCreateNew,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const isNew = id === 'new';
  const quote = quotations.find((q) => q.id === id);

  // If route is /quotes/new, auto-create and navigate to the new ID
  useEffect(() => {
    if (isNew) {
      const newQuote = createBlankQuotation(company);
      storage.saveQuotation(newQuote);
      storage.setActiveQuotationId(newQuote.id);
      onUpdateQuotation(newQuote);
      toast.success(`Created quotation ${newQuote.quotationNumber}`);
      navigate(`/quotes/${newQuote.id}`, { replace: true });
    }
  }, [isNew, company]);

  // Compute merged client list for autocomplete (must run on every render before any early returns)
  const availableClients = React.useMemo(() => {
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

  if (isNew) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Creating new quotation draft...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
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
            className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span>View All Quotes</span>
          </button>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
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
      quotation={quote}
      savedClients={availableClients}
      onChange={onUpdateQuotation}
      onBack={() => navigate('/quotes')}
      onDuplicate={(source) => {
        onDuplicate(source);
      }}
      onOpenSettings={onOpenSettings}
    />
  );
};
