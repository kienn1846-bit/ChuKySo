import React from 'react';
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
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
              <Award size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Chi tiết chứng thư số điện tử
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Mã số serial: <code style={{ color: 'var(--accent-cyan)' }}>{cert.serialNumber}</code>
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Certificate Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Badge Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: cert.status === 'active' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
              border: `1px solid ${cert.status === 'active' ? 'var(--status-success-border)' : 'var(--status-danger-border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color={cert.status === 'active' ? 'var(--status-success)' : 'var(--status-danger)'} />
              <strong style={{ color: cert.status === 'active' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                Trạng thái: {cert.status === 'active' ? 'HỢP LỆ & ĐANG HOẠT ĐỘNG' : 'ĐÃ BỊ THU HỒI (REVOKED)'}
              </strong>
            </div>
            <span className="badge badge-indigo">
              {cert.isRootCA ? 'Root Certificate Authority (CA)' : 'End-Entity User Certificate'}
            </span>
          </div>

          {/* Subject & Issuer Grid */}
          <div className="grid-2" style={{ gap: '14px' }}>
            {/* Subject Box */}
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} /> Chủ thể (Subject)
              </div>
              <div style={{ fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Họ và tên:</strong> {cert.subject.commonName}</div>
                <div><strong>Tổ chức:</strong> {cert.subject.organization}</div>
                {cert.subject.department && <div><strong>Đơn vị:</strong> {cert.subject.department}</div>}
                {cert.subject.studentId && <div><strong>Mã định danh/MSSV:</strong> {cert.subject.studentId}</div>}
                <div><strong>Email:</strong> {cert.subject.email}</div>
              </div>
            </div>

            {/* Issuer Box */}
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-indigo)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={15} /> Cơ quan cấp phát (Issuer)
              </div>
              <div style={{ fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Tên CA:</strong> {cert.issuer.commonName}</div>
                <div><strong>Tổ chức:</strong> {cert.issuer.organization}</div>
                <div><strong>Serial CA:</strong> <code>{cert.issuer.serialNumber}</code></div>
                <div style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  Hiệu lực: {new Date(cert.validFrom).toLocaleDateString('vi-VN')} → {new Date(cert.validTo).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Public Key Info */}
          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={15} color="var(--accent-cyan)" /> Thông Tin Khoá Công Khai ElGamal ({cert.publicKey.bitLength || 1024}-bit)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Số nguyên tố Modulus (<MathView math="p" />): </span>
                <div className="code-block" style={{ marginTop: '2px', padding: '6px', fontSize: '0.75rem' }}>
                  {cert.publicKey.p}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Phần tử sinh (Generator <MathView math="g \text{ / } \alpha" />): </span>
                <div className="code-block" style={{ marginTop: '2px', padding: '6px', fontSize: '0.75rem' }}>
                  {cert.publicKey.g}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Khoá công khai (<MathView math="y = g^x \pmod p" />): </span>
                <div className="code-block" style={{ marginTop: '2px', padding: '6px', fontSize: '0.75rem' }}>
                  {cert.publicKey.y}
                </div>
              </div>
            </div>
          </div>

          {/* Fingerprint & CA Signature */}
          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
            <div>
              <Fingerprint size={14} style={{ display: 'inline', marginRight: '4px' }} />
              <strong>SHA-256 Thumbprint: </strong>
              <code style={{ color: 'var(--accent-cyan)' }}>{cert.thumbprint}</code>
            </div>
            <div style={{ marginTop: '6px' }}>
              <strong>Chữ ký số của CA trên chứng thư (r, s): </strong>
              <code style={{ color: '#a5b4fc' }}>r={cert.caSignature.r.slice(0, 20)}..., s={cert.caSignature.s.slice(0, 20)}...</code>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button className="btn btn-secondary" onClick={() => downloadCertificateFile(cert)}>
              <Download size={15} />
              <span>Tải File Chứng Thư (.crt.json)</span>
            </button>
            {keyPair && (
              <button className="btn btn-outline" onClick={() => downloadPrivateKeyFile(cert, keyPair)}>
                <Key size={15} />
                <span>Tải Khoá Bí Mật (.key.json)</span>
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
