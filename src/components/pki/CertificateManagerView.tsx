import React, { useState, useRef } from 'react';
import {
  Award,
  Plus,
  Upload,
  Search,
  Eye,
  Key,
  ShieldCheck,
  ShieldAlert,
  Download,
  CheckCircle2,
  Trash2,
  Lock,
} from 'lucide-react';
import { DigitalCertificate, ElGamalKeyPair } from '../../types';
import { CertificateDetailsModal } from './CertificateDetailsModal';
import { NewCertificateModal } from './NewCertificateModal';
import { downloadCertificateFile, downloadPrivateKeyFile } from '../../services/storage-service';

interface CertificateManagerViewProps {
  rootCert: DigitalCertificate;
  rootKeyPair: ElGamalKeyPair;
  certificates: DigitalCertificate[];
  keyPairs: Record<string, ElGamalKeyPair>;
  activeCertId: string;
  setActiveCertId: (id: string) => void;
  onSaveNewCert: (cert: DigitalCertificate, keyPair: ElGamalKeyPair) => void;
  onUpdateStatus: (certId: string, status: 'active' | 'revoked') => void;
  onNotify: (msg: string, type?: 'success' | 'danger' | 'info') => void;
}

export const CertificateManagerView: React.FC<CertificateManagerViewProps> = ({
  rootCert,
  rootKeyPair,
  certificates,
  keyPairs,
  activeCertId,
  setActiveCertId,
  onSaveNewCert,
  onUpdateStatus,
  onNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCertForModal, setSelectedCertForModal] = useState<DigitalCertificate | null>(null);
  const [isNewCertModalOpen, setIsNewCertModalOpen] = useState(false);

  const importInputRef = useRef<HTMLInputElement>(null);

  // Filtered certificates
  const filteredCerts = certificates.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.subject.commonName.toLowerCase().includes(term) ||
      c.subject.email.toLowerCase().includes(term) ||
      c.serialNumber.toLowerCase().includes(term) ||
      c.subject.organization.toLowerCase().includes(term)
    );
  });

  // Handle Certificate Import
  const handleImportCert = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedCert: DigitalCertificate = JSON.parse(event.target?.result as string);
          if (importedCert.serialNumber && importedCert.publicKey && importedCert.caSignature) {
            // Check duplicate
            if (certificates.some((c) => c.serialNumber === importedCert.serialNumber)) {
              onNotify('Chứng thư số này đã tồn tại trong kho lưu trữ!', 'info');
              return;
            }
            // Create dummy or empty keypair placeholder if key not present
            const dummyKeyPair: ElGamalKeyPair = {
              id: importedCert.id,
              name: `${importedCert.subject.commonName} (Imported)`,
              publicKey: importedCert.publicKey,
              privateKey: { x: '0' },
              createdAt: importedCert.createdAt,
              bitLength: importedCert.publicKey.bitLength || 1024,
            };
            onSaveNewCert(importedCert, dummyKeyPair);
            onNotify(`Đã nhập chứng thư số "${importedCert.subject.commonName}" thành công!`, 'success');
          } else {
            onNotify('Tệp tin không đúng định dạng chứng thư số JSON!', 'danger');
          }
        } catch (err: any) {
          onNotify(`Lỗi đọc file chứng thư: ${err.message}`, 'danger');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Actions Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={24} color="var(--accent-cyan)" />
            <span>Quản lý chứng thư số & cơ quan chứng thực (PKI)</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Hạ tầng quản lý khóa công khai (PKI), cấp phát, thu hồi và thẩm định chứng thư số bởi Root CA.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="file"
            ref={importInputRef}
            style={{ display: 'none' }}
            onChange={handleImportCert}
            accept=".json,.crt"
          />
          <button className="btn btn-secondary" onClick={() => importInputRef.current?.click()}>
            <Upload size={16} />
            <span>Nhập chứng thư (.crt)</span>
          </button>
          <button className="btn btn-primary" onClick={() => setIsNewCertModalOpen(true)}>
            <Plus size={16} />
            <span>Cấp phát chứng thư mới</span>
          </button>
        </div>
      </div>

      {/* Root CA Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(99, 102, 241, 0.08))',
          border: '1px solid rgba(6, 182, 212, 0.3)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{rootCert.subject.commonName}</strong>
                <span className="badge badge-cyan">ROOT CA</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Tổ chức: {rootCert.subject.organization} | Serial: <code>{rootCert.serialNumber}</code>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setSelectedCertForModal(rootCert)}
            >
              <Eye size={14} /> Xem chi tiết CA
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => downloadCertificateFile(rootCert)}
            >
              <Download size={14} /> Tải chứng thư CA
            </button>
          </div>
        </div>
      </div>

      {/* Search & Certificates Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', fontSize: '0.86rem' }}
              placeholder="Tìm theo tên, email, serial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Tổng số: <strong>{filteredCerts.length}</strong> chứng thư
          </span>
        </div>

        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Chủ thể</th>
                <th>Đơn vị / MSSV</th>
                <th>Thuật toán & Serial</th>
                <th>Thời hạn hiệu lực</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCerts.map((cert) => {
                const isActiveSigner = cert.id === activeCertId;
                const keyPair = keyPairs[cert.id];

                return (
                  <tr key={cert.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: cert.isRootCA ? 'rgba(6, 182, 212, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                            color: cert.isRootCA ? 'var(--accent-cyan)' : 'var(--accent-indigo)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                          }}
                        >
                          {cert.subject.commonName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {cert.subject.commonName}
                            {isActiveSigner && (
                              <span className="badge badge-cyan" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>
                                Đang chọn ký
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {cert.subject.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{cert.subject.organization}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                        {cert.subject.department || cert.subject.studentId || '-'}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        ElGamal-{cert.publicKey.bitLength || 1024}b
                      </div>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {cert.serialNumber}
                      </code>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Đến {new Date(cert.validTo).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${cert.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {cert.status === 'active' ? 'Hoạt động' : 'Bị thu hồi'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {/* Select as active signer button */}
                        {!isActiveSigner && cert.status === 'active' && keyPair && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setActiveCertId(cert.id);
                              onNotify(`Đã chọn "${cert.subject.commonName}" làm người ký mặc định`, 'info');
                            }}
                            title="Chọn làm người ký"
                          >
                            <Key size={13} />
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedCertForModal(cert)}
                          title="Xem chi tiết chứng thư X.509"
                        >
                          <Eye size={13} />
                        </button>

                        {/* Download .crt */}
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => downloadCertificateFile(cert)}
                          title="Tải tệp chứng thư (.crt.json)"
                        >
                          <Download size={13} />
                        </button>

                        {/* Revoke / Unrevoke (Only for non-root) */}
                        {!cert.isRootCA && (
                          <button
                            className={`btn btn-sm ${cert.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => {
                              const newStatus = cert.status === 'active' ? 'revoked' : 'active';
                              onUpdateStatus(cert.id, newStatus);
                              onNotify(`Đã cập nhật trạng thái chứng thư sang: ${newStatus === 'active' ? 'Hoạt động' : 'Bị thu hồi'}`, 'info');
                            }}
                            title={cert.status === 'active' ? 'Thu hồi chứng thư (Revoke)' : 'Khôi phục chứng thư'}
                          >
                            <ShieldAlert size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedCertForModal && (
        <CertificateDetailsModal
          cert={selectedCertForModal}
          keyPair={keyPairs[selectedCertForModal.id]}
          onClose={() => setSelectedCertForModal(null)}
        />
      )}

      {/* New Certificate Modal */}
      {isNewCertModalOpen && (
        <NewCertificateModal
          rootCert={rootCert}
          rootKeyPair={rootKeyPair}
          onSave={onSaveNewCert}
          onClose={() => setIsNewCertModalOpen(false)}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};
