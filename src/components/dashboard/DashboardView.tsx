import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  FileSignature,
  SearchCheck,
  Award,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  Cpu,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { DigitalCertificate, SigningHistoryItem } from '../../types';
import { runCryptoSelfTests } from '../../crypto/crypto.test';
import { MathView } from '../common/MathView';

interface DashboardViewProps {
  certificates: DigitalCertificate[];
  rootCert: DigitalCertificate;
  signingHistory: SigningHistoryItem[];
  setActiveTab: (tab: string) => void;
  onSelectCert: (cert: DigitalCertificate) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  certificates,
  rootCert,
  signingHistory,
  setActiveTab,
}) => {
  const [selfTestResults, setSelfTestResults] = useState<{
    allPassed: boolean;
    results: { testName: string; passed: boolean; message: string; durationMs: number }[];
  } | null>(null);

  useEffect(() => {
    runCryptoSelfTests().then(setSelfTestResults);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(99, 102, 241, 0.15))',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-cyan">
              <Sparkles size={13} /> Bài tập lớn môn An toàn bảo mật thông tin
            </span>
            <span className="badge badge-indigo">Chuẩn PKI & ElGamal-2048</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
            Hệ thống ký số văn bản điện tử hệ mật ElGamal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', lineHeight: '1.6', marginBottom: '20px' }}>
            Giải pháp toàn diện ứng dụng chữ ký số ElGamal trên trường số nguyên lớn <MathView math="\mathbb{Z}_p^*" />, tích hợp
            hạ tầng quản lý khóa công khai (PKI) với cơ quan chứng thực gốc (Root CA), đóng dấu điện tử trực quan trên tài liệu PDF và xác thực 3 lớp an toàn.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button className="btn btn-primary btn-lg" onClick={() => setActiveTab('pki')}>
              <Award size={18} />
              <span>1. Quản lý chứng thư CA</span>
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => setActiveTab('sign')}>
              <FileSignature size={18} />
              <span>2. Ký số văn bản</span>
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => setActiveTab('verify')}>
              <SearchCheck size={18} />
              <span>3. Xác thực chữ ký</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {certificates.length}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Chứng thư số đã cấp</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-success)',
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              2048-bit
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Cỡ khóa an toàn tối đa</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-indigo)',
            }}
          >
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              SHA-256
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Hàm băm thông điệp</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-warning)',
            }}
          >
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {signingHistory.length}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Lượt ký trong phiên</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Features & Self-Test Panel */}
      <div className="grid-2">
        {/* Module Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Lock size={18} color="var(--accent-cyan)" />
                <span>Quy trình & chức năng hệ thống</span>
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px',
                  background: 'var(--bg-input)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => setActiveTab('pki')}
              >
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
                  <Award size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    1. Quản lý chứng thư số & cơ quan chứng thực (PKI)
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Cấp phát chứng thư số người dùng chuẩn cấu trúc X.509, ký duyệt bởi Root CA, xuất và nhập tệp tin <code>.crt</code>, <code>.key</code>.
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-dim)" />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px',
                  background: 'var(--bg-input)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => setActiveTab('sign')}
              >
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                  <FileSignature size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    2. Ký số văn bản & đóng con dấu điện tử (PDF)
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Băm tài liệu SHA-256, tính toán cặp chữ ký ElGamal (r, s), đính kèm con dấu điện tử trực quan và nhúng chữ ký số vào văn bản.
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-dim)" />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px',
                  background: 'var(--bg-input)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => setActiveTab('verify')}
              >
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-success)' }}>
                  <SearchCheck size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    3. Xác thực chữ ký 3 lớp & báo cáo kiểm tra
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Kiểm tra tính toàn vẹn (Integrity), đối chiếu phương trình toán học <MathView math="v_1 \equiv v_2 \pmod p" /> và thẩm định chứng thư số từ Root CA.
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-dim)" />
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic Self-Test & System Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <ShieldCheck size={18} color="var(--status-success)" />
                <span>Kiểm tra tự động các thuật toán số học</span>
              </h2>
              {selfTestResults && (
                <span className={`badge ${selfTestResults.allPassed ? 'badge-success' : 'badge-danger'}`}>
                  {selfTestResults.allPassed ? 'Tất cả đạt (100%)' : 'Có lỗi'}
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Hệ thống tự động thực thi các ca kiểm thử số học trên nền tảng BigInt thuần túy để chứng minh tính chuẩn xác trước hội đồng:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selfTestResults ? (
                selfTestResults.results.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {t.passed ? (
                        <CheckCircle2 size={16} color="var(--status-success)" />
                      ) : (
                        <AlertCircle size={16} color="var(--status-danger)" />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.testName}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>{t.message}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {t.durationMs.toFixed(1)}ms
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  Đang chạy kiểm thử số học...
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
              }}
            >
              <strong>Cơ quan chứng thực gốc (Root CA):</strong> {rootCert.subject.commonName}
              <br />
              <strong>Mã số serial:</strong> <code style={{ color: 'var(--accent-cyan)' }}>{rootCert.serialNumber}</code> | <strong>Thuật toán:</strong> ElGamal-2048 / SHA-256
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
