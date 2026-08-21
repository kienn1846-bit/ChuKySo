import React, { useState } from 'react';
import {
  Award,
  X,
  Download,
  Key,
  ShieldCheck,
  Calendar,
  Building,
  Mail,
  User,
  Fingerprint,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DigitalCertificate, ElGamalKeyPair } from '../../types';
import { downloadCertificateFile, downloadPrivateKeyFile } from '../../services/storage-service';
import { MathView } from '../common/MathView';

interface CertificateDetailsModalProps {
  cert: DigitalCertificate;
  keyPair?: ElGamalKeyPair;
  onClose: () => void;
}

export const CertificateDetailsModal: React.FC<CertificateDetailsModalProps> = ({
  cert,
  keyPair,
  onClose,
}) => {
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'rgba(37, 99, 235, 0.15)', color: 'var(--brand-blue)' }}>
              <Award size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Chi tiết chứng thư số điện tử X.509
              </h3>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Mã số serial: <code style={{ color: 'var(--brand-blue)' }}>{cert.serialNumber}</code>
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Certificate Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Status Badge Banner */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              background: cert.status === 'active' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
              border: `1px solid ${cert.status === 'active' ? 'var(--status-success-border)' : 'var(--status-danger-border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} color={cert.status === 'active' ? 'var(--status-success)' : 'var(--status-danger)'} />
              <strong style={{ color: cert.status === 'active' ? 'var(--status-success)' : 'var(--status-danger)', fontSize: '0.94rem' }}>
                Trạng thái: {cert.status === 'active' ? 'Hợp lệ & đang hoạt động' : 'Đã bị thu hồi (Revoked)'}
              </strong>
            </div>
            <span className="badge badge-blue">
              {cert.isRootCA ? 'Root Certificate Authority (CA)' : 'End-Entity User Certificate'}
            </span>
          </div>

          {/* Subject & Issuer Grid */}
          <div className="grid-2" style={{ gap: '16px' }}>
            {/* Subject Box */}
            <div style={{ background: 'var(--bg-input)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: 'var(--brand-blue)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <User size={16} /> Chủ thể (Subject)
              </div>
              <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><strong>Họ và tên:</strong> {cert.subject.commonName}</div>
                <div><strong>Tổ chức:</strong> {cert.subject.organization}</div>
                {cert.subject.department && <div><strong>Đơn vị / Khoa:</strong> {cert.subject.department}</div>}
                {cert.subject.studentId && <div><strong>Mã định danh/MSSV:</strong> {cert.subject.studentId}</div>}
                <div><strong>Email:</strong> {cert.subject.email}</div>
              </div>
            </div>

            {/* Issuer Box */}
            <div style={{ background: 'var(--bg-input)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-indigo)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <Building size={16} /> Cơ quan cấp phát (Issuer)
              </div>
              <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><strong>Tên CA:</strong> {cert.issuer.commonName}</div>
                <div><strong>Tổ chức:</strong> {cert.issuer.organization}</div>
                <div><strong>Serial CA:</strong> <code>{cert.issuer.serialNumber}</code></div>
                <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  Hiệu lực: <strong>{new Date(cert.validFrom).toLocaleDateString('vi-VN')}</strong> → <strong>{new Date(cert.validTo).toLocaleDateString('vi-VN')}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Public & Private Key Info */}
          <div style={{ background: 'var(--bg-input)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
              <Key size={16} color="var(--brand-blue)" /> Thông tin khóa mật mã ElGamal ({cert.publicKey.bitLength || 1024}-bit)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Số nguyên tố Modulus (<MathView math="p" />): </span>
                <div className="code-block" style={{ marginTop: '4px', padding: '8px', fontSize: '0.76rem' }}>
                  {cert.publicKey.p}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Phần tử sinh (Generator <MathView math="g \text{ / } \alpha" />): </span>
                <div className="code-block" style={{ marginTop: '4px', padding: '8px', fontSize: '0.76rem' }}>
                  {cert.publicKey.g}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Khóa công khai (<MathView math="y = g^x \pmod p" />): </span>
                <div className="code-block" style={{ marginTop: '4px', padding: '8px', fontSize: '0.76rem' }}>
                  {cert.publicKey.y}
                </div>
              </div>
              {keyPair?.privateKey?.x && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={14} color="#f59e0b" />
                      <span>Khóa bí mật (<MathView math="x" />):</span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      {showPrivateKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showPrivateKey ? 'Ẩn khóa bí mật' : 'Hiện khóa bí mật'}</span>
                    </button>
                  </div>
                  <div
                    className="code-block"
                    style={{
                      marginTop: '4px',
                      padding: '8px',
                      fontSize: '0.76rem',
                      fontFamily: 'var(--font-mono)',
                      color: showPrivateKey ? '#38bdf8' : 'var(--text-dim)',
                      letterSpacing: showPrivateKey ? 'normal' : '2px',
                      userSelect: showPrivateKey ? 'all' : 'none',
                      border: showPrivateKey ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-subtle)',
                      background: showPrivateKey ? 'rgba(15, 23, 42, 0.85)' : 'var(--bg-card)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {showPrivateKey ? keyPair.privateKey.x : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fingerprint & CA Signature */}
          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.84rem' }}>
            <div>
              <Fingerprint size={15} style={{ display: 'inline', marginRight: '6px' }} />
              <strong>SHA-256 Thumbprint: </strong>
              <code style={{ color: 'var(--brand-blue)' }}>{cert.thumbprint}</code>
            </div>
            <div style={{ marginTop: '8px' }}>
              <strong>Chữ ký số của CA trên chứng thư (r, s): </strong>
              <code style={{ color: '#a5b4fc' }}>r={cert.caSignature.r.slice(0, 24)}..., s={cert.caSignature.s.slice(0, 24)}...</code>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button className="btn btn-secondary" onClick={() => downloadCertificateFile(cert)}>
              <Download size={15} />
              <span>Tải tệp chứng thư (.crt.json)</span>
            </button>
            {keyPair && (
              <button className="btn btn-outline" onClick={() => downloadPrivateKeyFile(cert, keyPair)}>
                <Key size={15} />
                <span>Tải khóa bí mật (.key.json)</span>
              </button>
            )}
            <button className="btn btn-primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
