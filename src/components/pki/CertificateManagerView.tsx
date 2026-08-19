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
  Building2,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* Title & Actions Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Award size={26} color="var(--accent-cyan)" />
            <span>Quản Lý Chứng Thư Số & Cơ Quan Chứng Thực (PKI)</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
            Hạ tầng Quản lý Khóa Công khai (PKI), cấp phát, thu hồi và thẩm định chứng thư số điện tử.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="file"
            ref={importInputRef}
            style={{ display: 'none' }}
            onChange={handleImportCert}
            accept=".json,.crt"
          />
          <button className="btn btn-secondary" onClick={() => importInputRef.current?.click()}>
            <Upload size={16} />
            <span>Nhập Chứng Thư (.crt)</span>
          </button>
          <button className="btn btn-primary" onClick={() => setIsNewCertModalOpen(true)}>
            <Plus size={16} />
            <span>Cấp Phát Chứng Thư Mới</span>
          </button>
        </div>
      </div>

      {/* Root CA Trust Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(15, 23, 42, 0.6))',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          boxShadow: 'var(--shadow-md)',
          padding: '22px 26px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  {rootCert.subject.commonName}
                </strong>
                <span className="badge badge-cyan" style={{ fontSize: '0.74rem', padding: '2px 8px' }}>ROOT CA</span>
                <span className="badge badge-success" style={{ fontSize: '0.74rem', padding: '2px 8px' }}>HOẠT ĐỘNG</span>
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span><Building2 size={13} style={{ display: 'inline', marginRight: '4px' }} />Tổ chức: <strong>{rootCert.subject.organization}</strong></span>
                <span>Serial: <code>{rootCert.serialNumber}</code></span>
                <span>Cỡ khóa: <strong>ElGamal-2048b</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setSelectedCertForModal(rootCert)}
            >
              <Eye size={14} /> Xem Chi Tiết CA
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => downloadCertificateFile(rootCert)}
            >
              <Download size={14} /> Tải Chứng Thư CA
            </button>
          </div>
        </div>
      </div>

      {/* Search & Certificates Registry Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px', fontSize: '0.88rem' }}
              placeholder="Tìm theo tên, email, serial, đơn vị..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Danh bạ: <strong>{filteredCerts.length}</strong> chứng thư đã đăng ký
          </span>
        </div>

        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Chủ Thể Chứng Thư</th>
                <th style={{ width: '28%' }}>Đơn Vị & Phòng Ban</th>
                <th style={{ width: '16%' }}>Thuật Toán & Serial</th>
                <th style={{ width: '12%', whiteSpace: 'nowrap' }}>Thời Hạn Hiệu Lực</th>
                <th style={{ width: '6%', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng Thái</th>
                <th style={{ width: '8%', textAlign: 'right', whiteSpace: 'nowrap' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCerts.map((cert) => {
                const isActiveSigner = cert.id === activeCertId;
                const keyPair = keyPairs[cert.id];

                return (
                  <tr key={cert.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: cert.isRootCA ? 'rgba(37, 99, 235, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: cert.isRootCA ? 'var(--brand-blue)' : 'var(--status-success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                          }}
                        >
                          {cert.subject.commonName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.94rem' }}>
                            {cert.subject.commonName}
                            {isActiveSigner && (
                              <span className="badge badge-cyan" style={{ marginLeft: '8px', fontSize: '0.72rem' }}>
                                Đang chọn ký
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {cert.subject.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{cert.subject.organization}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {cert.subject.department || cert.subject.studentId || '-'}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--brand-blue)' }}>
                        ElGamal-{cert.publicKey.bitLength || 1024}b
                      </div>
                      <code style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {cert.serialNumber}
                      </code>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Đến {new Date(cert.validTo).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span className={`badge ${cert.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ whiteSpace: 'nowrap' }}>
                        {cert.status === 'active' ? 'Hợp lệ' : 'Bị thu hồi'}
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
                            title="Chọn làm người ký hiện tại"
                          >
                            <Key size={14} />
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedCertForModal(cert)}
                          title="Xem chi tiết chứng thư X.509"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Download .crt */}
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => downloadCertificateFile(cert)}
                          title="Tải tệp chứng thư (.crt.json)"
                        >
                          <Download size={14} />
                        </button>

                        {/* Revoke / Unrevoke (Only for non-root) */}
                        {!cert.isRootCA && (
                          <button
                            className={`btn btn-sm ${cert.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => {
                              const newStatus = cert.status === 'active' ? 'revoked' : 'active';
                              onUpdateStatus(cert.id, newStatus);
                              onNotify(`Đã cập nhật trạng thái chứng thư sang: ${newStatus === 'active' ? 'Hợp lệ' : 'Bị thu hồi'}`, 'info');
                            }}
                            title={cert.status === 'active' ? 'Thu hồi chứng thư (Revoke)' : 'Khôi phục chứng thư'}
                          >
                            <ShieldAlert size={14} />
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
