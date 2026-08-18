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
} from 'lucide-react';
import { DigitalCertificate, ElGamalKeyPair, CertificateSubject } from '../../types';
import { generateElGamalKeyPair } from '../../crypto/elgamal';
import { issueCertificate } from '../../crypto/pki';
import { MathText } from '../common/MathView';

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
      const newCert = issueCertificate(
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
      <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
              <Award size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Cấp Phát Chứng Thư Số Mới (Issue Certificate)
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Ký duyệt bởi Cơ quan Chứng thực Gốc (Root CA)
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Form inputs */}
          <div className="form-group">
            <label className="form-label">
              <User size={14} style={{ display: 'inline', marginRight: '4px' }} /> Họ và tên người nhận (Common Name) *:
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: TS. Lê Văn Cường hoặc Nguyễn Mai Anh"
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
            />
          </div>

          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">
                <Building size={14} style={{ display: 'inline', marginRight: '4px' }} /> Tổ chức / Trường:
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

          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">
                <Mail size={14} style={{ display: 'inline', marginRight: '4px' }} /> Email cá nhân *:
              </label>
              <input
                type="email"
                className="form-input"
                required
                placeholder="email@edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mã định danh / MSSV:</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: 20215678"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
          </div>

          {/* Key Length & Validity */}
          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Độ dài khoá ElGamal (Bit Length):</label>
              <select
                className="form-select"
                value={bitLength}
                onChange={(e) => setBitLength(parseInt(e.target.value) as any)}
              >
                <option value={512}>512-bit (Thử nghiệm nhanh)</option>
                <option value={1024}>1024-bit (Tiêu chuẩn Đồ án BTL - Khuyên dùng)</option>
                <option value={2048}>2048-bit (Tiêu chuẩn An toàn cao cấp)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Thời hạn hiệu lực:</label>
              <select
                className="form-select"
                value={validityYears}
                onChange={(e) => setValidityYears(parseInt(e.target.value))}
              >
                <option value={1}>1 Năm</option>
                <option value={2}>2 Năm</option>
                <option value={3}>3 Năm</option>
                <option value={5}>5 Năm</option>
              </select>
            </div>
          </div>

          {/* Banner Info */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              lineHeight: '1.6',
            }}
          >
            <strong>Cơ chế tự động:</strong>{' '}
            <MathText text="Hệ thống sẽ sinh cặp số nguyên tố an toàn $p = 2q + 1$, tìm phần tử sinh $\alpha$, sinh khoá bí mật $x$ và tính khoá công khai $y = \alpha^x \pmod p$. Sau đó Root CA sẽ ký số ElGamal lên bản ghi chứng thư." />
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Huỷ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isGenerating}>
              <Sparkles size={16} />
              <span>{isGenerating ? 'Đang Sinh Khoá & Ký CA...' : 'Cấp Phát Chứng Thư'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
