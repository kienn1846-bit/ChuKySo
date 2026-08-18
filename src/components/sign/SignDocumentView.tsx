import React, { useState, useEffect, useRef } from 'react';
import {
  FileSignature,
  Upload,
  FileText,
  FileCheck,
  Download,
  Key,
  CheckCircle2,
  Eye,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import {
  DigitalCertificate,
  ElGamalKeyPair,
  SignedDocumentPackage,
  SigningHistoryItem,
  VisualStampConfig,
} from '../../types';
import { hashFile, hashString } from '../../crypto/hash';
import { signElGamal } from '../../crypto/elgamal';
import {
  generateVisualStampDataUrl,
  signPdfDocument,
  createSignedPdfFromText,
} from '../../services/pdf-service';
import { downloadFile } from '../../services/storage-service';

interface SignDocumentViewProps {
  certificates: DigitalCertificate[];
  keyPairs: Record<string, ElGamalKeyPair>;
  activeCertId: string;
  setActiveCertId: (id: string) => void;
  onAddHistory: (item: SigningHistoryItem) => void;
  onNotify: (msg: string, type?: 'success' | 'danger' | 'info') => void;
  onGoToVerifyWithPackage?: (pkg: SignedDocumentPackage, file?: File | null) => void;
}

export const SignDocumentView: React.FC<SignDocumentViewProps> = ({
  certificates,
  keyPairs,
  activeCertId,
  setActiveCertId,
  onAddHistory,
  onNotify,
  onGoToVerifyWithPackage,
}) => {
  const [signMode, setSignMode] = useState<'pdf' | 'file' | 'text'>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState<string>(
    'CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nGIẤY XÁC NHẬN HOÀN THÀNH BÀI TẬP LỚN MÔN AN TOÀN THÔNG TIN\nKính gửi: Hội đồng Chấm thi Khoa Công nghệ Thông tin\nSinh viên thực hiện đã hoàn thành toàn bộ chương trình thực nghiệm hệ mật ElGamal và đóng dấu điện tử xác thực văn bản.'
  );

  const [stampConfig, setStampConfig] = useState<VisualStampConfig>({
    enabled: true,
    signerName: '',
    organization: '',
    location: 'Hà Nội',
    signReason: 'Xác nhận tính toàn vẹn và phê duyệt nội dung',
    dateString: new Date().toLocaleString('vi-VN'),
    pageNumber: 1,
    xPercent: 65,
    yPercent: 12,
    color: 'emerald',
    showQrCode: true,
    style: 'modern-badge',
  });

  const [stampPreviewUrl, setStampPreviewUrl] = useState<string>('');
  const [isSigning, setIsSigning] = useState(false);
  const [signedResult, setSignedResult] = useState<{
    packageData: SignedDocumentPackage;
    signedPdfBlobUrl?: string;
    signedPdfBytes?: Uint8Array;
    stampDataUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active certificate and key
  const activeCert = certificates.find((c) => c.id === activeCertId) || certificates[0];
  const activeKeyPair = activeCert ? keyPairs[activeCert.id] : undefined;

  // Synchronize signer name with active cert if empty
  useEffect(() => {
    if (activeCert) {
      setStampConfig((prev) => ({
        ...prev,
        signerName: activeCert.subject.commonName,
        organization: activeCert.subject.organization,
      }));
    }
  }, [activeCertId, activeCert]);

  // Update stamp preview
  useEffect(() => {
    if (activeCert && activeKeyPair) {
      const dummySig = {
        r: '123456789012345678901234567890',
        s: '987654321098765432109876543210',
        algorithm: 'ElGamal-SHA256',
        documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        timestamp: Date.now(),
      };
      generateVisualStampDataUrl(stampConfig, activeCert, dummySig)
        .then(setStampPreviewUrl)
        .catch(console.error);
    }
  }, [stampConfig, activeCert, activeKeyPair]);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSignedResult(null);
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setSignMode('pdf');
      } else {
        setSignMode('file');
      }
    }
  };

  // Perform Sign Action
  const handleExecuteSign = async () => {
    if (!activeCert || !activeKeyPair) {
      onNotify('Vui lòng chọn hoặc cấu hình một Chứng thư số để ký!', 'danger');
      return;
    }

    if (activeCert.status === 'revoked') {
      onNotify('CẢNH BÁO: Chứng thư số này đã bị thu hồi (Revoked)! Không thể ký.', 'danger');
      return;
    }

    setIsSigning(true);

    try {
      let docHash = '';
      let fileName = '';
      let fileSize = 0;
      let fileType = '';
      let pdfBytes: ArrayBuffer | null = null;

      if (signMode === 'text') {
        docHash = await hashString(textContent);
        fileName = 'van_ban_dien_tu.pdf';
        fileSize = new Blob([textContent]).size;
        fileType = 'text/plain';
      } else {
        if (!selectedFile) {
          onNotify('Vui lòng chọn tài liệu cần ký!', 'danger');
          setIsSigning(false);
          return;
        }
        fileName = selectedFile.name;
        fileSize = selectedFile.size;
        fileType = selectedFile.type || 'application/octet-stream';
        docHash = await hashFile(selectedFile);

        if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
          pdfBytes = await selectedFile.arrayBuffer();
        }
      }

      // Compute ElGamal Signature
      const { signature } = signElGamal(docHash, activeKeyPair.publicKey, activeKeyPair.privateKey);

      // Package Data
      const packageData: SignedDocumentPackage = {
        format: 'SignWCert-v1',
        fileName,
        fileSize,
        fileType,
        documentHash: docHash,
        signature,
        certificate: activeCert,
        visualStamp: stampConfig.enabled ? stampConfig : undefined,
        signedAt: new Date().toISOString(),
        isEmbeddedPdf: true,
      };

      let signedPdfBlobUrl: string | undefined;
      let signedPdfBytes: Uint8Array | undefined;

      // 1. If user uploaded a PDF, stamp the seal on the existing PDF
      if (pdfBytes) {
        signedPdfBytes = await signPdfDocument(pdfBytes, packageData, stampConfig);
        const blob = new Blob([new Uint8Array(signedPdfBytes)], { type: 'application/pdf' });
        signedPdfBlobUrl = URL.createObjectURL(blob);
      }
      // 2. If user signed Text or other file, generate a formal signed PDF document with stamp
      else {
        const textToRender = signMode === 'text'
          ? textContent
          : `TÀI LIỆU KÝ SỐ: ${fileName}\n\nLoại tệp: ${fileType}\nDung lượng: ${(fileSize / 1024).toFixed(1)} KB\n\nMã băm toàn vẹn SHA-256:\n${docHash}\n\nChữ ký ElGamal:\nr = ${signature.r}\ns = ${signature.s}`;
        
        signedPdfBytes = await createSignedPdfFromText(textToRender, packageData, stampConfig);
        const blob = new Blob([new Uint8Array(signedPdfBytes)], { type: 'application/pdf' });
        signedPdfBlobUrl = URL.createObjectURL(blob);
      }

      // Generate the exact visual stamp image for display
      const stampDataUrl = await generateVisualStampDataUrl(
        stampConfig,
        activeCert,
        signature
      );

      setSignedResult({
        packageData,
        signedPdfBlobUrl,
        signedPdfBytes,
        stampDataUrl,
      });

      // Add to signing history
      const historyItem: SigningHistoryItem = {
        id: `sign_${Date.now()}`,
        fileName,
        fileSize,
        fileType,
        signedAt: packageData.signedAt,
        signerName: activeCert.subject.commonName,
        certificateSerial: activeCert.serialNumber,
        documentHash: docHash,
        signatureR: signature.r,
        signatureS: signature.s,
        status: 'valid',
      };
      onAddHistory(historyItem);

      onNotify(`Ký số và đóng dấu điện tử thành công cho "${fileName}"!`, 'success');
    } catch (err: any) {
      console.error(err);
      onNotify(`Lỗi trong quá trình ký số: ${err.message}`, 'danger');
    } finally {
      setIsSigning(false);
    }
  };

  // Download Signed PDF
  const handleDownloadSignedPdf = () => {
    if (!signedResult?.signedPdfBytes || !signedResult?.packageData) return;
    const safeName = signedResult.packageData.fileName
      .replace(/[\/\\:?*"<>|\s]+/g, '_')
      .replace(/\.pdf$/i, '');
    downloadFile(signedResult.signedPdfBytes, `[SIGNED]_${safeName}.pdf`, 'application/pdf');
    onNotify('Đang tải xuống tệp PDF đã ký số & đóng dấu...', 'success');
  };

  // Download Signature Package JSON
  const handleDownloadPackageJson = () => {
    if (!signedResult?.packageData) return;
    const jsonStr = JSON.stringify(signedResult.packageData, null, 2);
    const safeName = signedResult.packageData.fileName.replace(/[\/\\:?*"<>|\s]+/g, '_');
    downloadFile(jsonStr, `${safeName}.sig.json`, 'application/json');
    onNotify('Đang tải xuống gói chữ ký số .sig.json...', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Title */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileSignature size={24} color="var(--accent-cyan)" />
          <span>Ký Số Văn Bản Điện Tử & Đóng Dấu Chữ Ký (ElGamal Digital Signing Studio)</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Tạo chữ ký số ElGamal và tự động đóng con dấu điện tử (Visual Stamp + QR Code) vào file văn bản PDF.
        </p>
      </div>

      <div className="grid-2">
        {/* Left Column: Certificate Selection & Document Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Certificate Selection Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Key size={18} color="var(--accent-cyan)" />
                <span>1. Chứng Thư Số & Khoá Ký Hiện Tại</span>
              </h3>
              {activeCert && (
                <span className={`badge ${activeCert.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                  {activeCert.status === 'active' ? 'Đang hoạt động' : 'Đã bị thu hồi'}
                </span>
              )}
            </div>

            {activeCert && (
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '14px',
                  borderRadius: '10px',
                  fontSize: '0.86rem',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div><strong>Người ký:</strong> {activeCert.subject.commonName} ({activeCert.subject.email})</div>
                <div><strong>Đơn vị:</strong> {activeCert.subject.organization} {activeCert.subject.department ? `- ${activeCert.subject.department}` : ''}</div>
                <div><strong>Cơ quan cấp (CA):</strong> {activeCert.issuer.commonName}</div>
                <div><strong>Thời hạn:</strong> Đến {new Date(activeCert.validTo).toLocaleDateString('vi-VN')}</div>
                <div><strong>Serial:</strong> <code style={{ color: 'var(--accent-cyan)' }}>{activeCert.serialNumber}</code></div>
                <div><strong>Thuật toán:</strong> ElGamal-{activeCert.publicKey.bitLength || 1024} bit (SHA-256)</div>
              </div>
            )}
          </div>

          {/* Document Type Selection & Upload Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FileText size={18} color="var(--accent-blue)" />
                <span>2. Chọn Tài Liệu / Văn Bản Cần Ký</span>
              </h3>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                className={`btn btn-sm ${signMode === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSignMode('pdf')}
              >
                <FileCheck size={14} /> File PDF (Đóng dấu vào trang)
              </button>
              <button
                className={`btn btn-sm ${signMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSignMode('text')}
              >
                <FileText size={14} /> Soạn Văn Bản (Xuất PDF có dấu)
              </button>
              <button
                className={`btn btn-sm ${signMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSignMode('file')}
              >
                <Upload size={14} /> File Bất Kỳ
              </button>
            </div>

            {signMode === 'text' ? (
              <div className="form-group">
                <label className="form-label">Nội dung văn bản cần ký:</label>
                <textarea
                  className="form-textarea"
                  rows={7}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Nhập nội dung văn bản cần ký..."
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Hệ thống sẽ tự động tạo file PDF chính thức và đóng con dấu chữ ký số điện tử vào góc văn bản.
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept={signMode === 'pdf' ? '.pdf' : '*'}
                />
                <div
                  className="dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="dropzone-icon" />
                  {selectedFile ? (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
                        Dung lượng: {(selectedFile.size / 1024).toFixed(1)} KB | Loại: {selectedFile.type || 'Binary'}
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        <span className="badge badge-cyan">Click để chọn file khác</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        Kéo thả file vào đây hoặc bấm để duyệt file
                      </div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: '6px' }}>
                        {signMode === 'pdf' ? 'Hỗ trợ định dạng PDF (sẽ đóng dấu vào trang chỉ định)' : 'Hỗ trợ mọi định dạng tệp tin'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Execute Sign Button */}
            <div style={{ marginTop: '20px' }}>
              <button
                className="btn btn-success btn-lg"
                style={{ width: '100%' }}
                onClick={handleExecuteSign}
                disabled={isSigning || (!selectedFile && signMode !== 'text')}
              >
                <FileSignature size={20} />
                <span>{isSigning ? 'Đang Tính Toán & Đóng Dấu Ký Số...' : 'Thực Hiện Ký Số & Đóng Dấu Văn Bản'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Stamp Customizer & Live Result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Visual Stamp Settings */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Sliders size={18} color="var(--status-success)" />
                <span>Tuỳ Chỉnh Con Dấu Chữ Ký Số (Visual e-Seal)</span>
              </h3>
              <span className="badge badge-success">Con Dấu Điện Tử</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="grid-2" style={{ gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Màu con dấu:</label>
                  <select
                    className="form-select"
                    style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                    value={stampConfig.color}
                    onChange={(e) => setStampConfig({ ...stampConfig, color: e.target.value as any })}
                  >
                    <option value="emerald">Xanh lục (Emerald Trust - Chuẩn)</option>
                    <option value="blue">Xanh lam (Corporate Blue)</option>
                    <option value="crimson">Đỏ truyền thống (Official Red)</option>
                    <option value="amber">Vàng cam (Amber)</option>
                    <option value="slate">Xám đen (Dark Slate)</option>
                  </select>
                </div>

                {signMode === 'pdf' && (
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Trang đóng dấu:</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                      min={1}
                      value={stampConfig.pageNumber}
                      onChange={(e) => setStampConfig({ ...stampConfig, pageNumber: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Lý do ký:</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                  value={stampConfig.signReason}
                  onChange={(e) => setStampConfig({ ...stampConfig, signReason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <input
                    type="checkbox"
                    checked={stampConfig.showQrCode}
                    onChange={(e) => setStampConfig({ ...stampConfig, showQrCode: e.target.checked })}
                  />
                  <span>Đính kèm mã QR tra cứu tính toàn vẹn</span>
                </label>
              </div>

              {/* Stamp Preview Card */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Xem trước mẫu con dấu điện tử sẽ đóng vào văn bản:
                </div>
                {stampPreviewUrl && (
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      padding: '10px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <img
                      src={stampPreviewUrl}
                      alt="Visual Stamp Preview"
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Signed Output Result Card */}
          {signedResult && (
            <div
              className="card"
              style={{
                border: '1px solid var(--status-success-border)',
                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08), var(--bg-card))',
              }}
            >
              <div className="card-header">
                <h3 className="card-title" style={{ color: 'var(--status-success)' }}>
                  <CheckCircle2 size={20} />
                  <span>Văn Bản Đã Được Ký Số & Đóng Dấu Thành Công!</span>
                </h3>
                <span className="badge badge-success">Đã Đóng Dấu PDF</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
                {/* Visual Stamp Image Confirmation */}
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                    Con dấu ký số đã được khắc và đóng vào file:
                  </div>
                  {signedResult.stampDataUrl && (
                    <div
                      style={{
                        background: 'var(--bg-input)',
                        padding: '10px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid var(--status-success-border)',
                      }}
                    >
                      <img
                        src={signedResult.stampDataUrl}
                        alt="Con dấu đã đóng"
                        style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                      />
                    </div>
                  )}
                </div>

                {/* PDF Live Embedded Viewer Preview */}
                {signedResult.signedPdfBlobUrl && (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      Xem trước tệp PDF đã đóng dấu (Live Document Preview):
                    </div>
                    <div
                      style={{
                        height: '240px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)',
                        background: '#1e293b',
                      }}
                    >
                      <iframe
                        src={signedResult.signedPdfBlobUrl}
                        title="Signed PDF Preview"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <strong>Tên tệp tin:</strong> {signedResult.packageData.fileName}
                </div>
                <div>
                  <strong>Mã băm SHA-256:</strong>
                  <div className="code-block" style={{ marginTop: '4px', padding: '8px', fontSize: '0.78rem' }}>
                    {signedResult.packageData.documentHash}
                  </div>
                </div>

                <div>
                  <strong>Chữ ký ElGamal (r, s):</strong>
                  <div className="code-block" style={{ marginTop: '4px', padding: '8px', fontSize: '0.78rem', color: '#a5b4fc' }}>
                    r = {signedResult.packageData.signature.r.slice(0, 32)}...
                    <br />
                    s = {signedResult.packageData.signature.s.slice(0, 32)}...
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                  {signedResult.signedPdfBytes && (
                    <button className="btn btn-primary" onClick={handleDownloadSignedPdf}>
                      <Download size={16} />
                      <span>Tải File PDF Đã Đóng Dấu</span>
                    </button>
                  )}

                  {signedResult.signedPdfBlobUrl && (
                    <a
                      href={signedResult.signedPdfBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ textDecoration: 'none' }}
                    >
                      <ExternalLink size={16} />
                      <span>Mở PDF Trong Tab Mới</span>
                    </a>
                  )}

                  <button className="btn btn-outline" onClick={handleDownloadPackageJson}>
                    <Download size={16} />
                    <span>Tải Gói Chữ Ký (.sig.json)</span>
                  </button>

                  {onGoToVerifyWithPackage && (
                    <button
                      className="btn btn-outline"
                      onClick={() =>
                        onGoToVerifyWithPackage(signedResult.packageData, selectedFile)
                      }
                    >
                      <Eye size={16} />
                      <span>Xác thực ngay</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
