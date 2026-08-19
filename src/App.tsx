import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Header } from './components/layout/Header';
import { SignDocumentView } from './components/sign/SignDocumentView';
import { VerifySignatureView } from './components/verify/VerifySignatureView';
import { CertificateManagerView } from './components/pki/CertificateManagerView';
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
  const [activeTab, setActiveTab] = useState<string>('pki');

  // Trạng thái lưu trữ dữ liệu
  const [rootCert, setRootCert] = useState<DigitalCertificate | null>(null);
  const [rootKeyPair, setRootKeyPair] = useState<ElGamalKeyPair | null>(null);
  const [certificates, setCertificates] = useState<DigitalCertificate[]>([]);
  const [keyPairs, setKeyPairs] = useState<Record<string, ElGamalKeyPair>>({});
  const [signingHistory, setSigningHistory] = useState<SigningHistoryItem[]>([]);
  const [activeCertId, setActiveCertIdState] = useState<string>('');

  // Dữ liệu tải trước phục vụ chuyển tiếp sang tab Xác thực
  const [preloadedVerifyPkg, setPreloadedVerifyPkg] = useState<SignedDocumentPackage | null>(null);
  const [preloadedVerifyFile, setPreloadedVerifyFile] = useState<File | null>(null);
  const [preloadedVerifyText, setPreloadedVerifyText] = useState<string | undefined>(undefined);

  // Danh sách thông báo Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Khởi tạo bộ lưu trữ khi ứng dụng tải
  useEffect(() => {
    const init = async () => {
      const data = await initializeStorage();
      setRootCert(data.rootCACert);
      setRootKeyPair(data.rootCAKeyPair);
      setCertificates(data.certificates);
      setKeyPairs(data.keyPairs);
      setSigningHistory(data.signingHistory);
      setActiveCertIdState(data.activeCertId);
    };
    init();
  }, []);

  // Đồng bộ giao diện Dark/Light mode vào thẻ HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Trợ lý hiển thị thông báo Toast
  const notify = (message: string, type: 'success' | 'danger' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const newToast: ToastMessage = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    // Tự động tắt thông báo sau 4.5 giây
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Cấu hình Chứng thư số đang kích hoạt
  const handleSetActiveCertId = (id: string) => {
    setActiveCertIdState(id);
    setActiveCertificateId(id);
  };

  // Lưu chứng thư số mới
  const handleSaveNewCert = (cert: DigitalCertificate, keyPair: ElGamalKeyPair) => {
    saveNewCertificate(cert, keyPair);
    setCertificates((prev) => [...prev, cert]);
    setKeyPairs((prev) => ({ ...prev, [cert.id]: keyPair }));
    setActiveCertIdState(cert.id);
  };

  // Cập nhật trạng thái chứng thư số (Hoạt động / Thu hồi)
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
  const handleResetStorage = async () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu của hệ thống?')) {
      const data = await resetStorage();
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

        {activeTab === 'lab' && <ElGamalLabView />}
      </main>

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

/**
 * React Error Boundary – catches runtime errors in any child component
 * and displays a recovery UI instead of a blank white screen.
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SignWCert ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0f1d',
          color: '#f1f5f9',
          fontFamily: 'system-ui, sans-serif',
          padding: '40px',
          textAlign: 'center',
          gap: '16px',
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Đã xảy ra lỗi hệ thống</h1>
          <p style={{ color: '#94a3b8', maxWidth: '500px', lineHeight: 1.6 }}>
            Một lỗi không mong muốn đã xảy ra trong quá trình xử lý. Vui lòng tải lại trang hoặc xóa dữ liệu cục bộ.
          </p>
          <code style={{ background: '#1e293b', padding: '12px 20px', borderRadius: '8px', fontSize: '0.82rem', color: '#ef4444', maxWidth: '600px', overflow: 'auto' }}>
            {this.state.error?.message || 'Unknown error'}
          </code>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '10px 24px', borderRadius: '8px', background: '#0284c7', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Tải lại trang
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ padding: '10px 24px', borderRadius: '8px', background: '#334155', color: '#f1f5f9', border: '1px solid #475569', cursor: 'pointer', fontWeight: 600 }}
            >
              Xóa dữ liệu & Tải lại
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppWithErrorBoundary() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
