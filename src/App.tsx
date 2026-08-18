import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { SignDocumentView } from './components/sign/SignDocumentView';
import { VerifySignatureView } from './components/verify/VerifySignatureView';
import { CertificateManagerView } from './components/pki/CertificateManagerView';
import { CryptoLogsView } from './components/logs/CryptoLogsView';
import { ElGamalLabView } from './components/lab/ElGamalLabView';
import { Toast, ToastMessage } from './components/common/Toast';
import {
  initializeStorage,
  saveNewCertificate,
  updateCertificateStatus,
  addSigningHistory,
  setActiveCertificateId,
  resetStorage,
} from './services/storage-service';
import {
  DigitalCertificate,
  ElGamalKeyPair,
  SignedDocumentPackage,
  SigningHistoryItem,
} from './types';
import './styles/index.css';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Storage State
  const [rootCert, setRootCert] = useState<DigitalCertificate | null>(null);
  const [rootKeyPair, setRootKeyPair] = useState<ElGamalKeyPair | null>(null);
  const [certificates, setCertificates] = useState<DigitalCertificate[]>([]);
  const [keyPairs, setKeyPairs] = useState<Record<string, ElGamalKeyPair>>({});
  const [signingHistory, setSigningHistory] = useState<SigningHistoryItem[]>([]);
  const [activeCertId, setActiveCertIdState] = useState<string>('');

  // Preloaded data for verification transition
  const [preloadedVerifyPkg, setPreloadedVerifyPkg] = useState<SignedDocumentPackage | null>(null);
  const [preloadedVerifyFile, setPreloadedVerifyFile] = useState<File | null>(null);
  const [preloadedVerifyText, setPreloadedVerifyText] = useState<string | undefined>(undefined);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Initialize Store on load
  useEffect(() => {
    const data = initializeStorage();
    setRootCert(data.rootCACert);
    setRootKeyPair(data.rootCAKeyPair);
    setCertificates(data.certificates);
    setKeyPairs(data.keyPairs);
    setSigningHistory(data.signingHistory);
    setActiveCertIdState(data.activeCertId);
  }, []);

  // Sync theme attribute to HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Toast helper
  const notify = (message: string, type: 'success' | 'danger' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const newToast: ToastMessage = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4.5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Set Active Cert
  const handleSetActiveCertId = (id: string) => {
    setActiveCertIdState(id);
    setActiveCertificateId(id);
  };

  // Save new Certificate
  const handleSaveNewCert = (cert: DigitalCertificate, keyPair: ElGamalKeyPair) => {
    saveNewCertificate(cert, keyPair);
    setCertificates((prev) => [...prev, cert]);
    setKeyPairs((prev) => ({ ...prev, [cert.id]: keyPair }));
    setActiveCertIdState(cert.id);
  };

  // Update Certificate Status (Revoke / Active)
  const handleUpdateStatus = (certId: string, status: 'active' | 'revoked') => {
    updateCertificateStatus(certId, status);
    setCertificates((prev) =>
      prev.map((c) => (c.id === certId ? { ...c, status } : c))
    );
  };

  // Add Signing History
  const handleAddHistory = (item: SigningHistoryItem) => {
    addSigningHistory(item);
    setSigningHistory((prev) => [item, ...prev]);
  };

  // Reset demo storage
  const handleResetStorage = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu của hệ thống?')) {
      const data = resetStorage();
      setRootCert(data.rootCACert);
      setRootKeyPair(data.rootCAKeyPair);
      setCertificates(data.certificates);
      setKeyPairs(data.keyPairs);
      setSigningHistory(data.signingHistory);
      setActiveCertIdState(data.activeCertId);
      notify('Đã khôi phục dữ liệu mẫu hệ thống thành công!', 'success');
    }
  };

  // Switch to verify view with preloaded package
  const handleGoToVerifyWithPackage = (
    pkg: SignedDocumentPackage,
    file?: File | null,
    text?: string
  ) => {
    setPreloadedVerifyPkg(pkg);
    setPreloadedVerifyFile(file || null);
    setPreloadedVerifyText(text);
    setActiveTab('verify');
    notify(`Đã chuyển gói chữ ký của "${pkg.fileName}" sang màn hình xác thực!`, 'info');
  };

  const activeCert = certificates.find((c) => c.id === activeCertId) || certificates[0];

  if (!rootCert || !rootKeyPair) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-main)' }}>
        <div>Đang khởi tạo hệ thống PKI và Cặp khoá ElGamal...</div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCert={activeCert}
        theme={theme}
        setTheme={setTheme}
        onResetStorage={handleResetStorage}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardView
            certificates={certificates}
            rootCert={rootCert}
            signingHistory={signingHistory}
            setActiveTab={setActiveTab}
            onSelectCert={(cert) => handleSetActiveCertId(cert.id)}
          />
        )}

        {activeTab === 'sign' && (
          <SignDocumentView
            certificates={certificates}
            keyPairs={keyPairs}
            activeCertId={activeCertId}
            setActiveCertId={handleSetActiveCertId}
            onAddHistory={handleAddHistory}
            onNotify={notify}
            onGoToVerifyWithPackage={handleGoToVerifyWithPackage}
          />
        )}

        {activeTab === 'verify' && (
          <VerifySignatureView
            rootCert={rootCert}
            preloadedPackage={preloadedVerifyPkg}
            preloadedFile={preloadedVerifyFile}
            preloadedText={preloadedVerifyText}
            onNotify={notify}
          />
        )}

        {activeTab === 'pki' && (
          <CertificateManagerView
            rootCert={rootCert}
            rootKeyPair={rootKeyPair}
            certificates={certificates}
            keyPairs={keyPairs}
            activeCertId={activeCertId}
            setActiveCertId={handleSetActiveCertId}
            onSaveNewCert={handleSaveNewCert}
            onUpdateStatus={handleUpdateStatus}
            onNotify={notify}
          />
        )}

        {activeTab === 'logs' && (
          <CryptoLogsView onNotify={notify} />
        )}

        {activeTab === 'lab' && <ElGamalLabView />}
      </main>

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;


