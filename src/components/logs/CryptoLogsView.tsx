import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Key,
  FileSignature,
  SearchCheck,
  Lock,
  Unlock,
  Award,
  Trash2,
  Download,
  Copy,
  Check,
  Filter,
  Play,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Terminal,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import { CryptoLogEntry, CryptoLogStep } from '../../types';
import { cryptoLogger } from '../../services/crypto-logger';
import {
  elgamal_generate_keys,
  elgamal_encrypt,
  elgamal_decrypt,
  elgamal_sign,
  elgamal_verify,
} from '../../crypto/elgamal';
import { MathView, MathText } from '../common/MathView';

interface CryptoLogsViewProps {
  onNotify: (msg: string, type?: 'success' | 'danger' | 'info') => void;
}

export const CryptoLogsView: React.FC<CryptoLogsViewProps> = ({ onNotify }) => {
  const [logs, setLogs] = useState<CryptoLogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRunningDemo, setIsRunningDemo] = useState(false);

  useEffect(() => {
    const unsubscribe = cryptoLogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
      if (updatedLogs.length > 0 && !expandedLogId) {
        setExpandedLogId(updatedLogs[0].id);
      }
    });
    return unsubscribe;
  }, []);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'keygen' && (log.category === 'keygen' || log.category === 'pki-issue')) ||
      (selectedCategory === 'sign' && log.category === 'sign') ||
      (selectedCategory === 'verify' && log.category === 'verify') ||
      (selectedCategory === 'crypto' && (log.category === 'encrypt' || log.category === 'decrypt'));

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      log.title.toLowerCase().includes(query) ||
      log.description.toLowerCase().includes(query) ||
      log.actor.toLowerCase().includes(query) ||
      JSON.stringify(log.rawSummary).toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  // Copy text helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onNotify('Đã sao chép vào bộ nhớ tạm!', 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run interactive student project test
  const handleRunInteractiveDemo = () => {
    setIsRunningDemo(true);
    try {
      // 1. Generate demo 16-bit key
      const keyPair = elgamal_generate_keys(16, 'Sinh Viên HaUI Demo', false);
      
      // 2. Encrypt & Decrypt text
      const msg = 'HAUI';
      const encResult = elgamal_encrypt(msg, keyPair.publicKey);
      elgamal_decrypt(encResult.ciphertext, keyPair.publicKey, keyPair.privateKey);

      // 3. Sign & Verify hash
      const dummyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const sigResult = elgamal_sign(dummyHash, keyPair.publicKey, keyPair.privateKey);
      elgamal_verify(dummyHash, sigResult.signature, keyPair.publicKey);

      onNotify('Đã thực thi chu trình thuật toán và ghi nhật ký thành công!', 'success');
    } catch (e: any) {
      onNotify(`Lỗi chạy demo: ${e.message}`, 'danger');
    } finally {
      setIsRunningDemo(false);
    }
  };

  // Export logs to JSON or TXT
  const handleExportLogs = () => {
    if (logs.length === 0) {
      onNotify('Chưa có nhật ký nào để xuất!', 'info');
      return;
    }

    let reportText = `================================================================================\n`;
    reportText += `BÁO CÁO NHẬT KÝ THỰC THI THUẬT TOÁN MẬT MÃ ELGAMAL & PKI\n`;
    reportText += `Hệ thống: SignWCert - Đại học Công nghiệp Hà Nội\n`;
    reportText += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n`;
    reportText += `Tổng số hành vi ghi nhận: ${logs.length}\n`;
    reportText += `================================================================================\n\n`;

    logs.forEach((log, index) => {
      reportText += `[${index + 1}] ${log.title.toUpperCase()} (${new Date(log.timestamp).toLocaleString('vi-VN')})\n`;
      reportText += `    - Thể loại: ${log.category} | Tác tử: ${log.actor} | Thời gian tính: ${log.durationMs.toFixed(2)} ms\n`;
      reportText += `    - Mô tả: ${log.description}\n`;
      reportText += `    - Các bước toán học:\n`;
      log.steps.forEach((s) => {
        reportText += `        + Bước ${s.stepNumber}: ${s.name}\n`;
        reportText += `          Chi tiết: ${s.description}\n`;
        if (s.formula) reportText += `          Công thức: ${s.formula}\n`;
        reportText += `          Biến số: ${JSON.stringify(s.variables)}\n`;
      });
      reportText += `--------------------------------------------------------------------------------\n\n`;
    });

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nhat_Ky_Thuat_Toan_ElGamal_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Đã tải tệp báo cáo nhật ký thuật toán (.txt)!', 'success');
  };

  // Clear logs
  const handleClearLogs = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ nhật ký thực thi thuật toán?')) {
      cryptoLogger.clearLogs();
      onNotify('Đã xóa toàn bộ nhật ký!', 'info');
    }
  };

  // Get category badge styling
  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'keygen':
      case 'pki-issue':
        return <span className="badge badge-cyan"><Key size={12} /> Sinh Khóa / PKI</span>;
      case 'sign':
        return <span className="badge badge-success"><FileSignature size={12} /> Ký Số</span>;
      case 'verify':
        return <span className="badge badge-purple"><SearchCheck size={12} /> Xác Thực</span>;
      case 'encrypt':
        return <span className="badge badge-amber"><Lock size={12} /> Mã Hóa</span>;
      case 'decrypt':
        return <span className="badge badge-cyan"><Unlock size={12} /> Giải Mã</span>;
      default:
        return <span className="badge badge-cyan"><Terminal size={12} /> Thuật Toán</span>;
    }
  };

  return (
    <div className="tab-content-container">
      {/* Header Banner */}
      <div className="view-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ScrollText size={26} color="var(--accent-blue)" />
              <span>Nhật ký thực thi thuật toán</span>
            </h1>
            <div className="view-description" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              <MathText>
                Theo dõi vết thực thi từng bước toán học: Sinh khóa ElGamal, Cấp chứng thư PKI, Ký số $(r, s)$, Thẩm định $v_1 \equiv v_2 \pmod p$, Mã hóa &amp; Giải mã.
              </MathText>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRunInteractiveDemo}
              disabled={isRunningDemo}
            >
              <Play size={14} />
              <span>{isRunningDemo ? 'Đang chạy...' : 'Chạy thử nghiệm thuật toán'}</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportLogs} disabled={logs.length === 0}>
              <Download size={14} />
              <span>Xuất báo cáo</span>
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleClearLogs} disabled={logs.length === 0}>
              <Trash2 size={14} />
              <span>Xóa nhật ký</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview Grid - only if logs exist */}
      {logs.length > 0 && (
        <div className="grid-4" style={{ marginBottom: '20px', gap: '14px' }}>
          <div className="stat-card">
            <div className="stat-label">Tổng số nhật ký</div>
            <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{logs.length}</div>
            <div className="stat-desc">Vết tính toán đã lưu</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Sinh khóa & PKI</div>
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
              {logs.filter((l) => l.category === 'keygen' || l.category === 'pki-issue').length}
            </div>
            <div className="stat-desc">Modulo p, g, x, y</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Ký số & xác thực</div>
            <div className="stat-value" style={{ color: 'var(--status-success)' }}>
              {logs.filter((l) => l.category === 'sign' || l.category === 'verify').length}
            </div>
            <div className="stat-desc">Cặp (r, s) & v₁ ≡ v₂</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Mã hóa / giải mã</div>
            <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>
              {logs.filter((l) => l.category === 'encrypt' || l.category === 'decrypt').length}
            </div>
            <div className="stat-desc">Khối bản mã (c₁, c₂)</div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar - only if logs exist */}
      {logs.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('all')}
            >
              Tất cả ({logs.length})
            </button>
            <button
              className={`btn btn-sm ${selectedCategory === 'keygen' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('keygen')}
            >
              Sinh Khóa / PKI
            </button>
            <button
              className={`btn btn-sm ${selectedCategory === 'sign' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('sign')}
            >
              Ký Số
            </button>
            <button
              className={`btn btn-sm ${selectedCategory === 'verify' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('verify')}
            >
              Xác Thực
            </button>
            <button
              className={`btn btn-sm ${selectedCategory === 'crypto' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('crypto')}
            >
              Mã Hóa / Giải Mã
            </button>
          </div>

          <div style={{ minWidth: '240px' }}>
            <input
              type="text"
              className="form-input"
              style={{ padding: '6px 12px', fontSize: '0.84rem' }}
              placeholder="Tìm kiếm theo tiêu đề, biến số..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Log List / Empty State */}
      {logs.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.04), var(--bg-card))',
            border: '1px dashed var(--border-subtle)',
            borderRadius: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              margin: '0 auto 18px auto',
            }}
          >
            <ScrollText size={32} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            Nhật Ký Thực Thi Đang Trống
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '540px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
            Hệ thống chỉ ghi vết khi bạn thực hiện các thao tác mật mã học thực tế như <strong>Cấp chứng thư số</strong>, <strong>Ký số tài liệu</strong>, hoặc <strong>Xác thực chữ ký</strong>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleRunInteractiveDemo} disabled={isRunningDemo}>
              <Play size={16} />
              <span>{isRunningDemo ? 'Đang Chạy Thử Nghiệm...' : 'Chạy Thử Nghiệm Thuật Toán Mẫu'}</span>
            </button>
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Info size={36} style={{ opacity: 0.4, margin: '0 auto 10px auto' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Không tìm thấy nhật ký phù hợp bộ lọc</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
            Vui lòng thử từ khóa tìm kiếm khác hoặc chuyển danh mục.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="card"
                style={{
                  border: isExpanded ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease',
                  padding: '18px 20px',
                }}
              >
                {/* Log Item Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {getCategoryBadge(log.category)}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                        {log.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Tác tử: <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{log.actor}</span> | Thời gian: {new Date(log.timestamp).toLocaleString('vi-VN')} ({log.durationMs.toFixed(2)} ms)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                      {log.steps.length} bước toán học
                    </div>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Expanded Details: Step-by-Step Math Breakdown */}
                {isExpanded && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                      <MathText>{log.description}</MathText>
                    </div>

                    {/* Timeline of Steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {log.steps.map((step) => (
                        <div
                          key={step.stepNumber}
                          style={{
                            background: 'var(--bg-input)',
                            borderRadius: '8px',
                            padding: '14px 16px',
                            borderLeft: '3px solid var(--accent-blue)',
                            border: '1px solid var(--border-subtle)',
                            borderLeftWidth: '3px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>
                              Bước {step.stepNumber}: {step.name}
                            </div>
                            {step.formula && (
                              <div style={{ fontSize: '0.82rem', background: 'rgba(59, 130, 246, 0.12)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.25)', color: 'var(--accent-blue)' }}>
                                <MathView math={step.formula} />
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '10px' }}>
                            <MathText>{step.description}</MathText>
                          </div>

                          {/* Variable breakdown */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '6px' }}>
                            {Object.entries(step.variables).map(([key, val]) => (
                              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', gap: '10px' }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: '140px' }}>
                                  {key}:
                                </span>
                                <span
                                  style={{
                                    fontFamily: '"JetBrains Mono", Consolas, monospace',
                                    color: 'var(--text-main)',
                                    wordBreak: 'break-all',
                                    textAlign: 'right',
                                    flex: 1,
                                  }}
                                >
                                  {val.length > 80 ? val.substring(0, 75) + '...' : val}
                                </span>
                                <button
                                  className="btn-icon"
                                  style={{ padding: '2px', width: '22px', height: '22px' }}
                                  title="Sao chép giá trị đầy đủ"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(val, `${step.stepNumber}_${key}`);
                                  }}
                                >
                                  {copiedKey === `${step.stepNumber}_${key}` ? (
                                    <Check size={12} color="var(--status-success)" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
