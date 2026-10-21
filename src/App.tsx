import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Quotation, CompanyProfile, ClientProfile } from './types/quotation';
import { storage, createBlankQuotation } from './services/storage';
import { HeaderNav } from './components/HeaderNav';
import { QuotationList } from './components/QuotationList';
import { ClientDirectory } from './components/ClientDirectory';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { CatalogPickerModal } from './components/CatalogPickerModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PublicQuoteView } from './pages/PublicQuoteView';
import { QuoteEditorPage } from './pages/QuoteEditorPage';
import { UsersPage } from './pages/UsersPage';
import { PaymentLedgerPage } from './pages/PaymentLedgerPage';
import { useToast } from './context/ToastContext';
import { useAuth } from './context/AuthContext';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { passcodeService } from './services/passcodeService';
import { backupService } from './services/backupService';
import { LedgerPasscodeModal } from './components/ledger/LedgerPasscodeModal';
import { Lock } from 'lucide-react';

function LedgerRouteGuard() {
  const { isSuperAdmin, hasPermission, isPaymentLedgerEnabled } = useAuth();
  const navigate = useNavigate();
  const [isUnlocked, setIsUnlocked] = useState(() => passcodeService.isSessionUnlocked());

  if (!isPaymentLedgerEnabled) {
    return <Navigate to="/quotes" replace />;
  }

  if (!isSuperAdmin && !hasPermission('canViewPaymentLedger')) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <Lock size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-base">Payment Ledger Locked</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            You do not have permission to access the Payment Ledger. Access is regulated by the Super Admin in the Team &amp; Role Management Permissions Matrix.
          </p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <LedgerPasscodeModal
        isOpen={true}
        onClose={() => navigate('/quotes')}
        onSuccess={() => setIsUnlocked(true)}
      />
    );
  }

  return <PaymentLedgerPage />;
}

function ClientsRouteGuard({ clients, onSelectClientForQuote, onSaveClient, onDeleteClient }: any) {
  const { isSuperAdmin, hasPermission } = useAuth();
  if (!isSuperAdmin && !hasPermission('canManageClients')) {
    return <Navigate to="/quotes" replace />;
  }
  return (
    <ClientDirectory
      clients={clients}
      onSelectClientForQuote={onSelectClientForQuote}
      onSaveClient={onSaveClient}
      onDeleteClient={onDeleteClient}
    />
  );
}

function TeamRouteGuard() {
  const { isSuperAdmin, hasPermission } = useAuth();
  if (!isSuperAdmin && !hasPermission('canManageUsers')) {
    return <Navigate to="/quotes" replace />;
  }
  return <UsersPage />;
}

export function App() {
  useIdleTimeout();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organization, isSuperAdmin } = useAuth();
  const activeOrgId = user?.organizationId || organization?.id || 'org_tisha_main';

  const [company, setCompany] = useState<CompanyProfile>(() => storage.getCompanyProfile());
  const [quotations, setQuotations] = useState<Quotation[]>(() => storage.getAllQuotations());
  const [activeQuoteId, setActiveQuoteId] = useState<string>(() => storage.getActiveQuotationId() || '');
  const [clients, setClients] = useState<ClientProfile[]>(() => storage.getAllClients());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // Workspace-scoped quotations & clients
  const displayedQuotations = isSuperAdmin
    ? quotations
    : quotations.filter((q) => q.organizationId === activeOrgId || (!q.organizationId && activeOrgId === 'org_tisha_main'));

  const displayedClients = isSuperAdmin
    ? clients
    : clients.filter((c) => c.organizationId === activeOrgId || (!c.organizationId && activeOrgId === 'org_tisha_main'));

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

    // Check & trigger automated daily backup once per calendar day
    backupService.checkAndRunAutomatedDailyBackup();
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
    const newQuote = createBlankQuotation(company, activeOrgId);
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
    storage.moveToTrash(id);
    const remaining = storage.getAllQuotations();
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
    toast.info('Quotation moved to Trash (retained for 30 days).');
  };

  const handleRestoreQuotation = (id: string) => {
    storage.restoreFromTrash(id);
    setQuotations(storage.getAllQuotations());
    toast.success('Quotation restored from Trash successfully!');
  };

  const handlePermanentlyDelete = (id: string) => {
    storage.permanentlyDelete(id);
    setQuotations(storage.getAllQuotations());
    toast.success('Quotation permanently deleted.');
  };

  const handleEmptyTrash = () => {
    storage.emptyTrash();
    setQuotations(storage.getAllQuotations());
    toast.success('Trash emptied permanently.');
  };

  const handleSaveCompany = async (updated: CompanyProfile) => {
    await storage.saveCompanyProfile(updated);
    setCompany(updated);
    if (activeQuoteId) {
      setQuotations((prev) =>
        prev.map((q) => {
          if (q.id === activeQuoteId) {
            const updatedQuote = { ...q, company: updated };
            storage.saveQuotation(updatedQuote);
            return updatedQuote;
          }
          return q;
        })
      );
    }
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
    const newQuote = createBlankQuotation(company, activeOrgId);
    newQuote.client = {
      name: client.name,
      company: client.company || '',
      address: client.address || '',
      phone: client.phone || '',
      email: client.email || '',
      gstin: client.gstin || '',
      organizationId: activeOrgId,
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
            <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans transition-colors duration-300">
              <HeaderNav
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenCatalog={() => setIsCatalogOpen(true)}
                onCreateNew={handleCreateNew}
                hasActiveQuote={!!activeQuoteId}
                activeQuoteId={activeQuoteId}
              />
              <main className={`flex-1 ${location.pathname.startsWith('/ledger') ? 'p-0' : 'p-3 sm:p-6 md:p-8'}`}>
                <Outlet />
              </main>
              <CompanySettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                company={company}
                onSave={handleSaveCompany}
                onRestoreBackup={handleRestoreBackup}
                onOpenCatalog={() => setIsCatalogOpen(true)}
              />
              <CatalogPickerModal
                isOpen={isCatalogOpen}
                onClose={() => setIsCatalogOpen(false)}
                mode="manage"
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
              quotations={displayedQuotations}
              onSelectQuotation={handleSelectQuotation}
              onCreateNew={handleCreateNew}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onRestoreBackup={handleRestoreBackup}
              onRestoreQuotation={handleRestoreQuotation}
              onPermanentDelete={handlePermanentlyDelete}
              onEmptyTrash={handleEmptyTrash}
            />
          }
        />
        <Route
          path="/quotes/:id"
          element={
            <QuoteEditorPage
              quotations={displayedQuotations}
              clients={displayedClients}
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
            <ClientsRouteGuard
              clients={displayedClients}
              onSelectClientForQuote={handleCreateQuoteForClient}
              onSaveClient={handleSaveClient}
              onDeleteClient={handleDeleteClient}
            />
          }
        />
        <Route path="/ledger" element={<LedgerRouteGuard />} />
        <Route path="/team" element={<TeamRouteGuard />} />
        <Route path="*" element={<Navigate to="/quotes" replace />} />
      </Route>
    </Routes>
  );
}

export default App;