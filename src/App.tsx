import { useState, useEffect } from 'react';
import { Quotation, CompanyProfile, ClientProfile } from './types/quotation';
import { storage, createBlankQuotation } from './services/storage';
import { HeaderNav } from './components/HeaderNav';
import { QuotationEditor } from './components/QuotationEditor';
import { QuotationList } from './components/QuotationList';
import { ClientDirectory } from './components/ClientDirectory';
import { CompanySettingsModal } from './components/CompanySettingsModal';

export function App() {
  const [company, setCompany] = useState<CompanyProfile>(() => storage.getCompanyProfile());
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    const list = storage.getAllQuotations();
    if (list.length > 0) return list;
    // Initialize first quotation if brand new
    const initial = createBlankQuotation(storage.getCompanyProfile());
    storage.saveQuotation(initial);
    return [initial];
  });

  const [activeQuoteId, setActiveQuoteId] = useState<string>(() => {
    const stored = storage.getActiveQuotationId();
    if (stored) return stored;
    return quotations[0]?.id || '';
  });

  const [clients, setClients] = useState<ClientProfile[]>(() => storage.getAllClients());
  const [activeTab, setActiveTab] = useState<'editor' | 'list' | 'clients'>('editor');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active quotation reference
  const currentQuote = quotations.find((q) => q.id === activeQuoteId) || quotations[0];

  useEffect(() => {
    if (currentQuote && currentQuote.id !== activeQuoteId) {
      setActiveQuoteId(currentQuote.id);
    }
  }, [currentQuote, activeQuoteId]);

  // Handlers
  const handleCreateNew = () => {
    const newQuote = createBlankQuotation(company);
    storage.saveQuotation(newQuote);
    setQuotations((prev) => [newQuote, ...prev]);
    setActiveQuoteId(newQuote.id);
    setActiveTab('editor');
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
        const fresh = createBlankQuotation(company);
        storage.saveQuotation(fresh);
        setQuotations([fresh]);
        setActiveQuoteId(fresh.id);
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
    const updated = clients.filter((c) => c.id !== idOrName && c.name !== idOrName);
    setClients(updated);
    try {
      localStorage.setItem('tisha_clients_v2', JSON.stringify(updated));
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
      />

    </div>
  );
}

export default App;