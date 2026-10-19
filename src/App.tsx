import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Quotation, CompanyProfile, ClientProfile } from './types/quotation';
import { storage, createBlankQuotation } from './services/storage';
import { HeaderNav } from './components/HeaderNav';
import { QuotationList } from './components/QuotationList';
import { ClientDirectory } from './components/ClientDirectory';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PublicQuoteView } from './pages/PublicQuoteView';
import { QuoteEditorPage } from './pages/QuoteEditorPage';
import { UsersPage } from './pages/UsersPage';
import { useToast } from './context/ToastContext';

export function App() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [company, setCompany] = useState<CompanyProfile>(() => storage.getCompanyProfile());
  const [quotations, setQuotations] = useState<Quotation[]>(() => storage.getAllQuotations());
  const [activeQuoteId, setActiveQuoteId] = useState<string>(() => storage.getActiveQuotationId() || '');
  const [clients, setClients] = useState<ClientProfile[]>(() => storage.getAllClients());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      }
    });
  }, []);

  const handleRestoreBackup = () => {
    setQuotations(storage.getAllQuotations());
    setClients(storage.getAllClients());
    setCompany(storage.getCompanyProfile());
    const first = storage.getAllQuotations()[0];
    if (first) {
      setActiveQuoteId(first.id);
    }
    toast.success('Backup data restored successfully!');
  };

  // Handlers
  const handleCreateNew = () => {
    const newQuote = createBlankQuotation(company);
    storage.saveQuotation(newQuote);
    storage.setActiveQuotationId(newQuote.id);
    setQuotations((prev) => [newQuote, ...prev]);
    setActiveQuoteId(newQuote.id);
    toast.success(`Created new quotation ${newQuote.quotationNumber}`);
    navigate(`/quotes/${newQuote.id}`);
  };

  const handleSelectQuotation = (id: string) => {
    setActiveQuoteId(id);
    storage.setActiveQuotationId(id);
    navigate(`/quotes/${id}`);
  };

  const handleUpdateQuotation = (updated: Quotation) => {
    storage.saveQuotation(updated);
    setQuotations((prev) => {
      const exists = prev.some((q) => q.id === updated.id);
      if (exists) {
        return prev.map((q) => (q.id === updated.id ? updated : q));
      }
      return [updated, ...prev];
    });
    setActiveQuoteId(updated.id);
    setClients(storage.getAllClients());
  };

  const handleDuplicate = (source: Quotation) => {
    const duplicated = storage.duplicateQuotation(source);
    setQuotations((prev) => [duplicated, ...prev]);
    setActiveQuoteId(duplicated.id);
    storage.setActiveQuotationId(duplicated.id);
    toast.success(`Duplicated ${source.quotationNumber} -> ${duplicated.quotationNumber}`);
    navigate(`/quotes/${duplicated.id}`);
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
      }
      if (location.pathname.startsWith('/quotes/')) {
        navigate('/quotes');
      }
    }
    toast.info('Quotation deleted.');
  };

  const handleSaveCompany = async (updated: CompanyProfile) => {
    await storage.saveCompanyProfile(updated);
    setCompany(updated);
  };

  const handleSaveClient = (client: ClientProfile) => {
    storage.saveClient(client);
    setClients(storage.getAllClients());
    toast.success(`Saved client ${client.name}`);
  };

  const handleDeleteClient = (idOrName: string) => {
    storage.deleteClient(idOrName);
    setClients(storage.getAllClients());
    toast.info('Client removed.');
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
    storage.setActiveQuotationId(newQuote.id);
    setQuotations((prev) => [newQuote, ...prev]);
    setActiveQuoteId(newQuote.id);
    toast.success(`Created quotation for ${client.name}`);
    navigate(`/quotes/${newQuote.id}`);
  };

  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Public Client Online Review & Sign-Off Portal */}
      <Route path="/quote/:id/view" element={<PublicQuoteView />} />

      {/* Protected SaaS Workspace Routes */}
      <Route
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
              <HeaderNav
                onOpenSettings={() => setIsSettingsOpen(true)}
                onCreateNew={handleCreateNew}
                hasActiveQuote={!!activeQuoteId}
                activeQuoteId={activeQuoteId}
              />
              <main className="flex-1 p-3 sm:p-6 md:p-8">
                <Outlet />
              </main>
              <CompanySettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                company={company}
                onSave={handleSaveCompany}
                onRestoreBackup={handleRestoreBackup}
              />
            </div>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/quotes" replace />} />
        <Route
          path="/quotes"
          element={
            <QuotationList
              quotations={quotations}
              onSelectQuotation={handleSelectQuotation}
              onCreateNew={handleCreateNew}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onRestoreBackup={handleRestoreBackup}
            />
          }
        />
        <Route
          path="/quotes/:id"
          element={
            <QuoteEditorPage
              quotations={quotations}
              clients={clients}
              company={company}
              onUpdateQuotation={handleUpdateQuotation}
              onDuplicate={handleDuplicate}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onCreateNew={handleCreateNew}
            />
          }
        />
        <Route
          path="/clients"
          element={
            <ClientDirectory
              clients={clients}
              onSelectClientForQuote={handleCreateQuoteForClient}
              onSaveClient={handleSaveClient}
              onDeleteClient={handleDeleteClient}
            />
          }
        />
        <Route path="/team" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/quotes" replace />} />
      </Route>
    </Routes>
  );
}

export default App;