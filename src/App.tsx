import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Quotation, CompanyProfile, ClientProfile } from './types/quotation';
import { storage, createBlankQuotation } from './services/storage';
import { HeaderNav } from './components/HeaderNav';
import { QuotationEditor } from './components/QuotationEditor';
import { QuotationList } from './components/QuotationList';
import { ClientDirectory } from './components/ClientDirectory';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { useToast } from './context/ToastContext';

export function App() {
  const toast = useToast();
  const [company, setCompany] = useState<CompanyProfile>(() => storage.getCompanyProfile());
  const [quotations, setQuotations] = useState<Quotation[]>(() => storage.getAllQuotations());
  const [activeQuoteId, setActiveQuoteId] = useState<string>(() => storage.getActiveQuotationId() || '');
  const [clients, setClients] = useState<ClientProfile[]>(() => storage.getAllClients());
  const [activeTab, setActiveTab] = useState<'editor' | 'list' | 'clients'>('list');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active quotation reference
  const currentQuote = quotations.find((q) => q.id === activeQuoteId) || (quotations.length > 0 ? quotations[0] : null);

  useEffect(() => {
    storage.initialize().then(({ quotations: qList, clients: cList, company: comp }) => {
      setQuotations(qList);
      setClients(cList);
      setCompany(comp);
      const activeId = storage.getActiveQuotationId();
      if (activeId && qList.some((q) => q.id === activeId)) {
        setActiveQuoteId(activeId);
      } else if (qList.length > 0) {
        setActiveQuoteId(qList[0].id);
      } else {
        setActiveQuoteId('');
      }
    });
  }, []);

  useEffect(() => {
    if (currentQuote && currentQuote.id !== activeQuoteId) {
      setActiveQuoteId(currentQuote.id);
    }
  }, [currentQuote, activeQuoteId]);

  const handleRestoreBackup = () => {
    setQuotations(storage.getAllQuotations());
    setClients(storage.getAllClients());
    setCompany(storage.getCompanyProfile());
    const first = storage.getAllQuotations()[0];
    if (first) {
      setActiveQuoteId(first.id);
    } else {
      setActiveQuoteId('');
      setActiveTab('list');
    }
  };

  // Handlers
  const handleCreateNew = () => {
    const newQuote = createBlankQuotation(company);
    storage.saveQuotation(newQuote);
    setQuotations((prev) => [newQuote, ...prev]);
    setActiveQuoteId(newQuote.id);
    setActiveTab('editor');
    toast.success(`Created new quotation ${newQuote.quotationNumber}`);
  };

  const handleSelectQuotation = (id: string) => {
    setActiveQuoteId(id);
    storage.setActiveQuotationId(id);
    setActiveTab('editor');
  };

  const handleUpdateQuotation = (updated: Quotation) => {
    storage.saveQuotation(updated);
    setQuotations((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    // Refresh clients list if newly captured
    setClients(storage.getAllClients());
  };

  const handleDuplicate = (source: Quotation) => {
    const duplicated = storage.duplicateQuotation(source);
    setQuotations((prev) => [duplicated, ...prev]);
    setActiveQuoteId(duplicated.id);
    setActiveTab('editor');
  };

  const handleDelete = (id: string) => {
    storage.deleteQuotation(id);
    const remaining = quotations.filter((q) => q.id !== id);
    setQuotations(remaining);
    if (activeQuoteId === id) {
      if (remaining.length > 0) {
        setActiveQuoteId(remaining[0].id);
      } else {
        setActiveQuoteId('');
        setActiveTab('list');
      }
    }
  };

  const handleSaveCompany = (updated: CompanyProfile) => {
    storage.saveCompanyProfile(updated);
    setCompany(updated);
    // Optionally update company profile in active quote
    if (currentQuote) {
      handleUpdateQuotation({ ...currentQuote, company: updated });
    }
  };

  const handleSaveClient = (client: ClientProfile) => {
    storage.saveClient(client);
    setClients(storage.getAllClients());
  };

  const handleDeleteClient = (idOrName: string) => {
    storage.deleteClient(idOrName);
    setClients(storage.getAllClients());
    try {
      localStorage.setItem('tisha_clients_v2', JSON.stringify(storage.getAllClients()));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateQuoteForClient = (client: ClientProfile) => {
    const newQuote = createBlankQuotation(company);
    newQuote.client = {
      name: client.name,
      company: client.company || '',
      address: client.address || '',
      phone: client.phone || '',
      email: client.email || '',
      gstin: client.gstin || '',
    };
    storage.saveQuotation(newQuote);
    setQuotations((prev) => [newQuote, ...prev]);
    setActiveQuoteId(newQuote.id);
    setActiveTab('editor');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <HeaderNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onCreateNew={handleCreateNew}
        hasActiveQuote={!!currentQuote}
      />

      {/* Main Body */}
      <main className="flex-1 p-3 sm:p-6 md:p-8">
        {activeTab === 'list' && (
          <QuotationList
            quotations={quotations}
            onSelectQuotation={handleSelectQuotation}
            onCreateNew={handleCreateNew}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'editor' && currentQuote && (
          <QuotationEditor
            quotation={currentQuote}
            savedClients={clients}
            onChange={handleUpdateQuotation}
            onBack={() => setActiveTab('list')}
            onDuplicate={handleDuplicate}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {activeTab === 'editor' && !currentQuote && (
          <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Plus size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">No Quotation Selected</h3>
              <p className="text-xs text-slate-500 mt-1">
                You can create a new blank quotation or view your quotations list.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
              >
                View All Quotes
              </button>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                + New Quotation
              </button>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <ClientDirectory
            clients={clients}
            onSelectClientForQuote={handleCreateQuoteForClient}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
          />
        )}
      </main>

      {/* Global Settings Modal */}
      <CompanySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        company={company}
        onSave={handleSaveCompany}
        onRestoreBackup={handleRestoreBackup}
      />

    </div>
  );
}

export default App;