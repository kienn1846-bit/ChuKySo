import React, { useState } from 'react';
import {
  Award,
  X,
  Key,
  Sparkles,
  ShieldCheck,
  User,
  Building,
  Mail,
  Lock,
} from 'lucide-react';
import { DigitalCertificate, ElGamalKeyPair, CertificateSubject } from '../../types';
import { generateElGamalKeyPair } from '../../crypto/elgamal';
import { issueCertificate } from '../../crypto/pki';

interface NewCertificateModalProps {
  rootCert: DigitalCertificate;
  rootKeyPair: ElGamalKeyPair;
  onSave: (cert: DigitalCertificate, keyPair: ElGamalKeyPair) => void;
  onClose: () => void;
  onNotify: (msg: string, type?: 'success' | 'danger' | 'info') => void;
}

export const NewCertificateModal: React.FC<NewCertificateModalProps> = ({
  rootCert,
  rootKeyPair,
  onSave,
  onClose,
  onNotify,
}) => {
  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('Đại học Công nghiệp Hà Nội');
  const [department, setDepartment] = useState('Khoa Công nghệ Thông tin');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [bitLength, setBitLength] = useState<512 | 1024 | 2048>(1024);
  const [validityYears, setValidityYears] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commonName.trim() || !email.trim()) {
      onNotify('Vui lòng nhập họ tên và email hợp lệ!', 'danger');
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Generate User ElGamal Key Pair
      const userKeyPair = generateElGamalKeyPair(bitLength, `${commonName} Key Pair`, true);

      // 2. Subject Info
      const subject: CertificateSubject = {
        commonName: commonName.trim(),
        organization: organization.trim(),
        department: department.trim(),
        email: email.trim(),
        studentId: studentId.trim() || undefined,
        country: 'VN',
      };

      // 3. Issue certificate signed by Root CA
      const newCert = await issueCertificate(
        subject,
        userKeyPair.publicKey,
        rootKeyPair,
        rootCert,
        validityYears
      );

      onSave(newCert, userKeyPair);
      onNotify(`Đã cấp phát chứng thư số thành công cho "${commonName}"!`, 'success');
      onClose();
    } catch (err: any) {
      console.error(err);
      onNotify(`Lỗi khi tạo chứng thư số: ${err.message}`, 'danger');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'rgba(37, 99, 235, 0.15)', color: 'var(--brand-blue)' }}>
              <Award size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Cấp Phát Chứng Thư Số Mới
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Bảo chứng và ký số bởi Cơ quan Chứng thực Gốc (Root CA)
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">
              <User size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Họ và tên người sử dụng (Common Name) <span style={{ color: 'var(--status-danger)' }}>*</span>:
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: Nguyễn Văn A"
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
            />
          </div>

          <div className="grid-2" style={{ gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">
                <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Địa chỉ Email <span style={{ color: 'var(--status-danger)' }}>*</span>:
              </label>
              <input
                type="email"
                className="form-input"
                required
                placeholder="nguyenvana@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mã định danh / MSSV:</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: 2021601234"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">
                <Building size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Tổ chức / Cơ quan:
              </label>
              <input
                type="text"
                className="form-input"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Khoa / Phòng ban:</label>
              <input
                type="text"
                className="form-input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">
                <Lock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Cỡ khóa ElGamal:
              </label>
              <select
                className="form-select"
                value={bitLength}
                onChange={(e) => setBitLength(Number(e.target.value) as any)}
              >
                <option value={1024}>1024-bit (Chuẩn đồ án & BTL - Khuyên dùng)</option>
                <option value={2048}>2048-bit (Chuẩn thương mại NIST)</option>
                <option value={512}>512-bit (Thử nghiệm nhanh)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Thời hạn hiệu lực:</label>
              <select
                className="form-select"
                value={validityYears}
                onChange={(e) => setValidityYears(Number(e.target.value))}
              >
                <option value={1}>1 Năm</option>
                <option value={2}>2 Năm (Mặc định)</option>
                <option value={5}>5 Năm</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isGenerating}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={isGenerating}>
              <Sparkles size={16} />
              <span>{isGenerating ? 'Đang sinh cặp khóa & ký CA...' : 'Tạo & Cấp Phát Chứng Thư'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
