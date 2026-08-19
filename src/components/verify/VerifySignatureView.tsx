import React, { useState, useEffect, useRef } from 'react';
import {
  SearchCheck,
  Upload,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Download,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  DigitalCertificate,
  ElGamalSignature,
  SignedDocumentPackage,
  VerificationResult,
} from '../../types';
import { hashFile, hashString, hashToBigIntMod } from '../../crypto/hash';
import { verifyElGamal } from '../../crypto/elgamal';
import { verifyCertificate } from '../../crypto/pki';
import { generateVerificationReportPdf } from '../../services/pdf-service';
import { downloadFile } from '../../services/storage-service';
import { MathView } from '../common/MathView';

interface VerifySignatureViewProps {
  rootCert: DigitalCertificate;
  preloadedPackage?: SignedDocumentPackage | null;
  preloadedFile?: File | null;
  preloadedText?: string;
  onNotify: (msg: string, type?: 'success' | 'danger' | 'info') => void;
}

export const VerifySignatureView: React.FC<VerifySignatureViewProps> = ({
  rootCert,
  preloadedPackage,
  preloadedFile,
  preloadedText,
  onNotify,
}) => {
  const [docFile, setDocFile] = useState<File | null>(preloadedFile || null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigPackage, setSigPackage] = useState<SignedDocumentPackage | null>(preloadedPackage || null);
  const [manualText, setManualText] = useState<string>(preloadedText || '');

  const [verifyMode, setVerifyMode] = useState<'package' | 'manual'>(
    preloadedText !== undefined ? 'manual' : 'package'
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showMathDetails, setShowMathDetails] = useState(true);

  // Sync props when user clicks "Xác thực ngay" from signing tab
  useEffect(() => {
    if (preloadedPackage) {
      setSigPackage(preloadedPackage);
      setVerificationResult(null);
      if (preloadedText !== undefined) {
        setManualText(preloadedText);
        setVerifyMode('manual');
      } else if (preloadedFile) {
        setDocFile(preloadedFile);
        setVerifyMode('package');
      }
    }
  }, [preloadedPackage, preloadedFile, preloadedText]);

  const docInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // Handle Signature JSON file upload
  const handleSigFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSigFile(file);
      try {
        const text = await file.text();
        const pkg: SignedDocumentPackage = JSON.parse(text);
        if (pkg.format === 'SignWCert-v1' && pkg.signature && pkg.certificate) {
          setSigPackage(pkg);
          setVerificationResult(null);
          onNotify(`Đã nạp gói chữ ký của "${pkg.certificate.subject.commonName}"`, 'info');
        } else {
          onNotify('Tệp tin không đúng định dạng chữ ký SignWCert-v1!', 'danger');
        }
      } catch (err: any) {
        onNotify(`Lỗi đọc file chữ ký: ${err.message}`, 'danger');
      }
    }
  };

  // Handle Document file upload
  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocFile(e.target.files[0]);
      setVerificationResult(null);
    }
  };

  // Perform 3-Layer Verification
  const handleVerify = async () => {
    if (!sigPackage) {
      onNotify('Vui lòng tải lên gói chữ ký số (.sig.json)!', 'danger');
      return;
    }

    setIsVerifying(true);

    try {
      let calculatedDocHash = '';

      if (verifyMode === 'manual') {
        calculatedDocHash = await hashString(manualText);
      } else {
        if (!docFile) {
          onNotify('Vui lòng chọn tài liệu gốc để kiểm tra tính toàn vẹn!', 'danger');
          setIsVerifying(false);
          return;
        }
        calculatedDocHash = await hashFile(docFile);
      }

      const expectedDocHash = sigPackage.documentHash;
      const cert = sigPackage.certificate;
      const sig = sigPackage.signature;

      // 1. Layer 1: Integrity Check (Hash Comparison)
      const integrityValid = calculatedDocHash.toLowerCase() === expectedDocHash.toLowerCase();

      // 2. Layer 2: ElGamal Mathematical Verification
      const mathResult = verifyElGamal(calculatedDocHash, sig, cert.publicKey);

      // 3. Layer 3: PKI Certificate Verification
      const certResult = await verifyCertificate(cert, rootCert.publicKey);

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!integrityValid) {
        errors.push('TÍNH TOÀN VẸN THẤT BẠI: Mã băm tài liệu thực tế không khớp với mã băm trong chữ ký! Tài liệu đã bị chỉnh sửa hoặc bị làm giả.');
      }
      if (!mathResult.isValid) {
        errors.push('XÁC THỰC TOÁN HỌC THẤT BẠI: Phương trình ElGamal v1 != v2 mod p! Cặp chữ ký (r, s) không tương ứng với khoá công khai.');
      }
      if (!certResult.isValid) {
        if (certResult.isRevoked) {
          errors.push('CHỨNG THƯ SỐ BỊ THU HỒI: Chứng thư số của người ký đã bị vô hiệu hoá bởi Cơ quan Chứng thực (Root CA).');
        } else if (certResult.isExpired) {
          warnings.push('CHỨNG THƯ SỐ HẾT HẠN: Thời điểm xác thực vượt quá kỳ hạn của chứng thư số.');
        } else {
          errors.push('CHỨNG THƯ KHÔNG TIN CẬY: Chữ ký của Root CA trên chứng thư số không hợp lệ.');
        }
      }

      const overallValid = integrityValid && mathResult.isValid && certResult.isValid;

      const result: VerificationResult = {
        isValid: overallValid,
        integrityValid,
        signatureValid: mathResult.isValid,
        certificateValid: certResult.isValid,
        documentHash: expectedDocHash,
        fileHashCalculated: calculatedDocHash,
        signerName: cert.subject.commonName,
        signerOrg: cert.subject.organization,
        signedAt: sigPackage.signedAt,
        certificate: cert,
        signature: sig,
        mathDetails: {
          p: cert.publicKey.p,
          g: cert.publicKey.g,
          y: cert.publicKey.y,
          r: sig.r,
          s: sig.s,
          m: mathResult.m,
          v1: mathResult.v1,
          v2: mathResult.v2,
          isEqual: mathResult.isValid,
        },
        checks: [
          {
            name: 'Lớp 1: Tính toàn vẹn văn bản (SHA-256 Integrity)',
            status: integrityValid ? 'pass' : 'fail',
            message: integrityValid
              ? 'Mã băm khớp 100% — Tài liệu nguyên bản, không bị thay đổi bất kỳ ký tự nào.'
              : 'Mã băm sai lệch — Tài liệu đã bị sửa đổi nội dung!',
            detail: `Gốc: ${expectedDocHash.slice(0, 20)}... | Hiện tại: ${calculatedDocHash.slice(0, 20)}...`,
          },
          {
            name: 'Lớp 2: Xác thực toán học ElGamal (Mathematical Authenticity)',
            status: mathResult.isValid ? 'pass' : 'fail',
            message: mathResult.isValid
              ? 'Phương trình v1 ≡ v2 (mod p) thoả mãn — Chữ ký toán học chính xác 100%.'
              : 'Phương trình v1 ≢ v2 (mod p) — Chữ ký toán học không hợp lệ!',
            detail: `v1 = ${mathResult.v1.slice(0, 24)}... | v2 = ${mathResult.v2.slice(0, 24)}...`,
          },
          {
            name: 'Lớp 3: Độ tin cậy Chứng thư số & CA (PKI Trust Chain)',
            status: certResult.isValid ? 'pass' : certResult.isExpired ? 'warning' : 'fail',
            message: certResult.isValid
              ? `Chứng thư số hợp lệ, được cấp bởi ${cert.issuer.commonName} và còn hạn sử dụng.`
              : certResult.reason || 'Chứng thư không hợp lệ!',
            detail: `Serial: ${cert.serialNumber} | Thumbprint: ${cert.thumbprint.slice(0, 20)}...`,
          },
        ],
        errors,
        warnings,
        verifiedAt: new Date().toISOString(),
      };

      setVerificationResult(result);

      if (overallValid) {
        // Subtle professional celebration (green/teal tones, low-key)
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 }, colors: ['#10b981', '#06b6d4', '#3b82f6'], gravity: 1.2 });
        onNotify('XÁC THỰC THÀNH CÔNG: Chữ ký số ElGamal hợp lệ và tài liệu toàn vẹn!', 'success');
      } else {
        onNotify('CẢNH BÁO: Chữ ký số không hợp lệ hoặc tài liệu đã bị sửa đổi!', 'danger');
      }
    } catch (err: any) {
      console.error(err);
      onNotify(`Lỗi trong quá trình xác thực: ${err.message}`, 'danger');
    } finally {
      setIsVerifying(false);
    }
  };

  // Export PDF Audit Verification Report
  const handleExportReportPdf = async () => {
    if (!verificationResult) return;
    try {
      const pdfBytes = await generateVerificationReportPdf(
        verificationResult,
        docFile ? docFile.name : 'van_ban_xac_thuc.txt'
      );
      downloadFile(pdfBytes, `BienBan_KiemTra_ChuKySo_${Date.now()}.pdf`, 'application/pdf');
      onNotify('Đã xuất Biên bản xác thực chữ ký PDF thành công!', 'success');
    } catch (err: any) {
      onNotify(`Lỗi xuất biên bản: ${err.message}`, 'danger');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SearchCheck size={24} color="var(--status-success)" />
          <span>Xác thực chữ ký số 3 lớp</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Thẩm định tính toàn vẹn văn bản (SHA-256), đối chiếu phương trình đồng dư toán học ElGamal <MathView math="v_1 \equiv v_2 \pmod p" /> và kiểm tra chuỗi chứng thực PKI Root CA.
        </p>
      </div>

      <div className="grid-2">
        {/* Upload Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Step 1: Upload Signature Package */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FileCheck size={18} color="var(--accent-cyan)" />
                <span>1. Tải gói chữ ký số (.sig.json)</span>
              </h3>
              {sigPackage && <span className="badge badge-success">Đã nạp</span>}
            </div>

            <input
              type="file"
              ref={sigInputRef}
              style={{ display: 'none' }}
              onChange={handleSigFileChange}
              accept=".json,.sig,.esig"
            />

            <div
              className="dropzone"
              onClick={() => sigInputRef.current?.click()}
              style={{ padding: '24px 16px' }}
            >
              <FileCheck className="dropzone-icon" />
              {sigPackage ? (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {sigPackage.fileName}.sig.json
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Người ký: <strong>{sigPackage.certificate.subject.commonName}</strong> ({sigPackage.certificate.subject.organization})
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Thời gian ký: {new Date(sigPackage.signedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    Chọn tệp chữ ký số (.sig.json)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Chứa cặp chữ ký (r, s) và chứng thư số của người ký
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Upload Original Document */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Upload size={18} color="var(--accent-blue)" />
                <span>2. Tải tài liệu cần kiểm chứng</span>
              </h3>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                className={`btn btn-sm ${verifyMode === 'package' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setVerifyMode('package')}
              >
                <FileText size={14} /> Kiểm tra tệp tin (File / PDF)
              </button>
              <button
                className={`btn btn-sm ${verifyMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setVerifyMode('manual')}
              >
                <FileText size={14} /> Kiểm tra văn bản thuần
              </button>
            </div>

            {verifyMode === 'package' ? (
              <div>
                <input
                  type="file"
                  ref={docInputRef}
                  style={{ display: 'none' }}
                  onChange={handleDocFileChange}
                />
                <div
                  className="dropzone"
                  onClick={() => docInputRef.current?.click()}
                  style={{ padding: '24px 16px' }}
                >
                  <Upload className="dropzone-icon" />
                  {docFile ? (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{docFile.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {(docFile.size / 1024).toFixed(1)} KB | Bấm để đổi tệp
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        Chọn tệp tin gốc cần xác thực
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Hỗ trợ file PDF, Word, Ảnh, tệp nhị phân...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Nhập nội dung văn bản kiểm tra:</label>
                <textarea
                  className="form-textarea"
                  rows={6}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Dán nội dung văn bản cần kiểm chứng..."
                />
              </div>
            )}

            {/* Verify Action Button */}
            <div style={{ marginTop: '20px' }}>
              <button
                className="btn btn-success btn-lg"
                style={{ width: '100%' }}
                onClick={handleVerify}
                disabled={isVerifying || !sigPackage}
              >
                <SearchCheck size={20} />
                <span>{isVerifying ? 'Đang thẩm định toán học 3 lớp...' : 'Tiến hành xác thực chữ ký'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Verification Result Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {verificationResult ? (
            <div
              className="card"
              style={{
                border: `1px solid ${verificationResult.isValid ? 'var(--status-success-border)' : 'var(--status-danger-border)'}`,
                background: verificationResult.isValid
                  ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.1), var(--bg-card))'
                  : 'linear-gradient(180deg, rgba(239, 68, 68, 0.1), var(--bg-card))',
              }}
            >
              {/* Verdict Header */}
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {verificationResult.isValid ? (
                    <div style={{ padding: '6px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--status-success)' }}>
                      <CheckCircle2 size={24} />
                    </div>
                  ) : (
                    <div style={{ padding: '6px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--status-danger)' }}>
                      <XCircle size={24} />
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: verificationResult.isValid ? 'var(--status-success)' : 'var(--status-danger)' }}>
                      {verificationResult.isValid ? 'CHỮ KÝ HỢP LỆ & TOÀN VẸN' : 'CHỮ KÝ KHÔNG HỢP LỆ / CẢNH BÁO'}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Xác thực lúc: {new Date(verificationResult.verifiedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>

                <span className={`badge ${verificationResult.isValid ? 'badge-success' : 'badge-danger'}`}>
                  {verificationResult.isValid ? 'Đạt 3/3 lớp' : 'Không đạt'}
                </span>
              </div>

              {/* 3-Layer Check Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                {verificationResult.checks.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-input)',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        {c.name}
                      </span>
                      <span className={`badge ${c.status === 'pass' ? 'badge-success' : c.status === 'warning' ? 'badge-warning' : 'badge-danger'}`}>
                        {c.status === 'pass' ? '✓ ĐẠT' : c.status === 'warning' ? '! CẢNH BÁO' : '✗ KHÔNG ĐẠT'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{c.message}</div>
                    {c.detail && (
                      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: '4px' }}>
                        {c.detail}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Math Equation Visualizer Dropdown */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', justifyContent: 'space-between' }}
                  onClick={() => setShowMathDetails(!showMathDetails)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={15} color="var(--accent-indigo)" />
                    <span>Chi Tiết Đối Chiếu Phương Trình Đồng Dư ElGamal</span>
                  </span>
                  {showMathDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showMathDetails && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                    <div className="math-formula" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Vế trái:</span>
                        <MathView math="v_1 = g^m \pmod p" />
                      </div>
                      <code style={{ fontSize: '0.78rem', color: '#38bdf8', wordBreak: 'break-all' }}>
                        = {verificationResult.mathDetails.v1}
                      </code>
                    </div>
                    <div className="math-formula" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Vế phải:</span>
                        <MathView math="v_2 = (y^r \cdot r^s) \pmod p" />
                      </div>
                      <code style={{ fontSize: '0.78rem', color: '#10b981', wordBreak: 'break-all' }}>
                        = {verificationResult.mathDetails.v2}
                      </code>
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: '6px', background: verificationResult.mathDetails.isEqual ? 'var(--status-success-bg)' : 'var(--status-danger-bg)', border: `1px solid ${verificationResult.mathDetails.isEqual ? 'var(--status-success-border)' : 'var(--status-danger-border)'}`, color: verificationResult.mathDetails.isEqual ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Kết luận:</span>
                      <MathView math={verificationResult.mathDetails.isEqual ? 'v_1 \\equiv v_2 \\pmod p' : 'v_1 \\not\\equiv v_2 \\pmod p'} />
                      <span>({verificationResult.mathDetails.isEqual ? 'Phương trình đồng dư nghiệm đúng' : 'Phương trình không đồng dư'})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action: Export Report PDF */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleExportReportPdf}>
                  <Download size={16} />
                  <span>Xuất Biên Bản Kiểm Tra PDF</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <SearchCheck size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
              <h4 style={{ color: 'var(--text-main)', fontWeight: 700, marginBottom: '6px' }}>
                Chưa Có Kết Quả Xác Thực
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Tải lên tệp chữ ký số <code>.sig.json</code> và tệp tài liệu gốc ở cột bên trái rồi bấm <strong>"Tiến Hành Xác Thực Chữ Ký"</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
