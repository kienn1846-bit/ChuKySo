import React, { useState, useEffect, useRef } from 'react';
import {
  FileSignature,
  Upload,
  FileText,
  FileCheck,
  File as FileIcon,
  Download,
  Key,
  CheckCircle2,
  Eye,
  Sliders,
  ExternalLink,
  PenTool,
  Sparkles,
  Calendar,
  Layers,
  Palette,
  Move,
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
  createSignedDocumentCertificatePdf,
  createSignedPdfFromText,
  generateVisualStampDataUrl,
  signPdfDocument,
} from '../../services/pdf-service';
import { downloadFile } from '../../services/storage-service';
import { SignaturePadModal } from './SignaturePadModal';

interface SignDocumentViewProps {
  certificates: DigitalCertificate[];
  keyPairs: Record<string, ElGamalKeyPair>;
  activeCertId: string;
  setActiveCertId: (id: string) => void;
  onAddHistory: (item: SigningHistoryItem) => void;
  onNotify: (msg: string, type?: 'success' | 'danger' | 'info') => void;
  onGoToVerifyWithPackage?: (pkg: SignedDocumentPackage, file?: File | null, textContent?: string) => void;
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
  const [textContent, setTextContent] = useState<string>('');

  // Active certificate and key
  const activeCert = certificates.find((c) => c.id === activeCertId) || certificates[0];
  const activeKeyPair = activeCert ? keyPairs[activeCert.id] : undefined;

  const [stampConfig, setStampConfig] = useState<VisualStampConfig>({
    enabled: true,
    signerName: activeCert ? activeCert.subject.commonName : 'Nguyễn Văn A',
    signerTitle: 'Giảng viên / Cán bộ',
    organization: activeCert ? activeCert.subject.organization : 'Đại học Công nghiệp Hà Nội',
    department: 'Khoa Công nghệ Thông tin',
    location: 'Hà Nội',
    signReason: '',
    dateString: new Date().toLocaleString('vi-VN'),
    validFromDate: activeCert ? new Date(activeCert.validFrom).toLocaleDateString('vi-VN') : '18/08/2026',
    validToDate: activeCert ? new Date(activeCert.validTo).toLocaleDateString('vi-VN') : '18/08/2029',
    pageNumber: 1,
    xPercent: 65,
    yPercent: 12,
    color: 'blue',
    showQrCode: false,
    style: 'handwritten-stamp',
    backgroundStyle: 'white',
    signatureType: 'draw',
  });

  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [stampPreviewUrl, setStampPreviewUrl] = useState<string>('');
  const [isSigning, setIsSigning] = useState(false);
  const [signedResult, setSignedResult] = useState<{
    packageData: SignedDocumentPackage;
    signedPdfBlobUrl?: string;
    signedPdfBytes?: Uint8Array;
    stampDataUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewPageRef = useRef<HTMLDivElement>(null);
  const [isDraggingStamp, setIsDraggingStamp] = useState(false);

  // Drag and drop handler for visual stamp position
  const handlePositionDrag = (clientX: number, clientY: number) => {
    if (!previewPageRef.current) return;
    const rect = previewPageRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const newX = Math.round(relX * 80);
    const newY = Math.round((1 - relY) * 85);

    setStampConfig((prev) => ({
      ...prev,
      xPercent: Math.max(5, Math.min(75, newX)),
      yPercent: Math.max(5, Math.min(85, newY)),
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingStamp(true);
    handlePositionDrag(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingStamp) {
        handlePositionDrag(e.clientX, e.clientY);
      }
    };
    const handleMouseUp = () => {
      if (isDraggingStamp) {
        setIsDraggingStamp(false);
      }
    };

    if (isDraggingStamp) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingStamp]);

  // Synchronize signer name with active cert if empty
  useEffect(() => {
    if (activeCert) {
      setStampConfig((prev) => ({
        ...prev,
        signerName: activeCert.subject.commonName,
        organization: activeCert.subject.organization,
        department: activeCert.subject.department || 'Khoa Công nghệ Thông tin',
        validFromDate: new Date(activeCert.validFrom).toLocaleDateString('vi-VN'),
        validToDate: new Date(activeCert.validTo).toLocaleDateString('vi-VN'),
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
      // 2. If user signed Text directly, generate a formal signed PDF document with stamp
      else if (signMode === 'text') {
        signedPdfBytes = await createSignedPdfFromText(textContent, packageData, stampConfig);
        const blob = new Blob([new Uint8Array(signedPdfBytes)], { type: 'application/pdf' });
        signedPdfBlobUrl = URL.createObjectURL(blob);
      }
      // 3. If user signed Word / Excel / any other file: generate a formal Giấy Chứng Nhận Ký Số Điện Tử (PDF)
      else {
        signedPdfBytes = await createSignedDocumentCertificatePdf(packageData, stampConfig);
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
          <span>Ký số văn bản điện tử & đóng dấu con dấu</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Tạo chữ ký số ElGamal và tự động đóng con dấu điện tử vào tệp văn bản PDF.
        </p>
      </div>

      <div className="grid-2">
        {/* Left Column: Certificate Selection & Document Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Certificate Selection Card */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '8px', paddingBottom: '6px' }}>
              <h3 className="card-title" style={{ fontSize: '1rem' }}>
                <Key size={16} color="var(--accent-cyan)" />
                <span>1. Chứng thư số & khóa ký hiện tại</span>
              </h3>
              {activeCert && (
                <span className={`badge ${activeCert.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                  {activeCert.status === 'active' ? 'Đang hoạt động' : 'Đã bị thu hồi'}
                </span>
              )}
            </div>

            {activeCert && (
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '4px 12px',
                }}
              >
                <div><span style={{ color: 'var(--text-muted)' }}>Người ký:</span> <strong>{activeCert.subject.commonName}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Đơn vị:</span> {activeCert.subject.organization}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Cơ quan cấp:</span> {activeCert.issuer.commonName}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Thuật toán:</span> ElGamal-{activeCert.publicKey.bitLength || 1024}b</div>
              </div>
            )}
          </div>

          {/* Document Type Selection & Upload Card */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '8px', paddingBottom: '6px' }}>
              <h3 className="card-title" style={{ fontSize: '1rem' }}>
                <FileText size={16} color="var(--accent-cyan)" />
                <span>2. Chọn tài liệu / văn bản cần ký</span>
              </h3>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <button
                className={`btn btn-sm ${signMode === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSignMode('pdf')}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                <FileCheck size={13} /> Tệp PDF (Đóng dấu)
              </button>
              <button
                className={`btn btn-sm ${signMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSignMode('text')}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                <FileText size={13} /> Văn bản
              </button>
              <button
                className={`btn btn-sm ${signMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSignMode('file')}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                <FileIcon size={13} /> Tệp tin bất kỳ (Word/File)
              </button>
            </div>

            {/* Text Mode */}
            {signMode === 'text' && (
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <textarea
                  className="form-textarea"
                  rows={8}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Nhập nội dung văn bản, hợp đồng, biên bản cần ký..."
                  style={{ minHeight: '200px', fontSize: '0.88rem', padding: '10px 14px', lineHeight: '1.5' }}
                />
              </div>
            )}

            {/* File & PDF Mode Upload Dropzone */}
            {signMode !== 'text' && (
              <div className="form-group" style={{ marginBottom: '10px' }}>
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
                  style={{ padding: '36px 16px' }}
                >
                  <Upload className="dropzone-icon" style={{ width: '40px', height: '40px', marginBottom: '8px' }} />
                  {selectedFile ? (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                        Dung lượng: {(selectedFile.size / 1024).toFixed(1)} KB | Bấm để đổi tệp
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                        Kéo thả tệp vào đây hoặc bấm để chọn tệp
                      </div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '4px' }}>
                        {signMode === 'pdf' ? 'Hỗ trợ PDF (đóng dấu tự động)' : 'Hỗ trợ Word (.docx), Excel, ZIP...'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Execute Sign Button */}
            <div>
              <button
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  fontSize: '1rem',
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                  boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
                }}
                onClick={handleExecuteSign}
                disabled={isSigning || (signMode === 'text' ? !textContent.trim() : !selectedFile)}
              >
                <FileSignature size={20} />
                <span>{isSigning ? 'Đang tính toán & đóng dấu ký số...' : 'Thực hiện ký số & đóng dấu văn bản'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Stamp Customizer OR Live Signed Result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* If signedResult is available, show the interactive Result Workspace; Otherwise show Stamp Studio */}
          {signedResult ? (
            <div
              className="card"
              style={{
                border: '1px solid var(--status-success-border)',
                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08), var(--bg-card))',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              <div className="card-header" style={{ marginBottom: '10px', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} color="var(--status-success)" />
                  <h3 className="card-title" style={{ fontSize: '1.05rem', color: 'var(--status-success)' }}>
                    Văn bản đã được ký số & đóng dấu thành công!
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setIsSigModalOpen(true)}
                    title="Chỉnh sửa mẫu dấu"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <PenTool size={13} /> Sửa dấu
                  </button>
                </div>
              </div>

              {/* Action Buttons Bar at the Top */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {signedResult.signedPdfBytes && (
                  <button className="btn btn-primary btn-sm" onClick={handleDownloadSignedPdf}>
                    <Download size={14} />
                    <span>
                      {signMode === 'pdf'
                        ? 'Tải File PDF Đã Ký'
                        : signMode === 'text'
                        ? 'Tải Văn Bản PDF Đã Ký'
                        : 'Tải Giấy Chứng Nhận (PDF)'}
                    </span>
                  </button>
                )}

                <button className="btn btn-secondary btn-sm" onClick={handleDownloadPackageJson}>
                  <Download size={14} />
                  <span>Tải .sig.json</span>
                </button>

                {signedResult.signedPdfBlobUrl && (
                  <a
                    href={signedResult.signedPdfBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} />
                    <span>Mở tab mới</span>
                  </a>
                )}

                {onGoToVerifyWithPackage && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      onGoToVerifyWithPackage(
                        signedResult.packageData,
                        selectedFile,
                        signMode === 'text' ? textContent : undefined
                      )
                    }
                  >
                    <Eye size={14} />
                    <span>Xác thực ngay</span>
                  </button>
                )}
              </div>

              {/* PDF Live Embedded Viewer Preview - Expanded to fill available height */}
              {signedResult.signedPdfBlobUrl ? (
                <div
                  style={{
                    flex: 1,
                    minHeight: '460px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-subtle)',
                    background: '#1e293b',
                    marginBottom: '10px',
                  }}
                >
                  <iframe
                    src={signedResult.signedPdfBlobUrl}
                    title="Signed PDF Preview"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              ) : signedResult.stampDataUrl ? (
                <div
                  style={{
                    background: 'var(--bg-input)',
                    padding: '20px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid var(--status-success-border)',
                    marginBottom: '10px',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={signedResult.stampDataUrl}
                    alt="Con dấu đã đóng"
                    style={{ maxHeight: '240px', width: 'auto', borderRadius: '4px' }}
                  />
                </div>
              ) : null}

              {/* Compact Meta Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                <div style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Mã băm SHA-256:</div>
                  <code style={{ color: '#38bdf8', fontSize: '0.76rem' }}>
                    {signedResult.packageData.documentHash.slice(0, 32)}...
                  </code>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Chữ ký ElGamal (r, s):</div>
                  <code style={{ color: '#a5b4fc', fontSize: '0.76rem' }}>
                    r: {signedResult.packageData.signature.r.slice(0, 14)}... | s: {signedResult.packageData.signature.s.slice(0, 14)}...
                  </code>
                </div>
              </div>
            </div>
          ) : (
            /* Stamp Settings Card */
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ marginBottom: '10px', paddingBottom: '8px' }}>
                <h3 className="card-title" style={{ fontSize: '1.05rem' }}>
                  <Sliders size={17} color="var(--accent-cyan)" />
                  <span>Mẫu chữ ký số & con dấu điện tử</span>
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '10px 14px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                    boxShadow: '0 3px 12px rgba(6, 182, 212, 0.25)',
                  }}
                  onClick={() => setIsSigModalOpen(true)}
                >
                  <PenTool size={16} />
                  <span>Vẽ / Tải ảnh chữ ký tay & tùy chỉnh con dấu</span>
                </button>

                {/* Quick Settings Grid */}
                <div className="grid-2" style={{ gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Màu mực con dấu:</label>
                    <select
                      className="form-select"
                      style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                      value={stampConfig.color}
                      onChange={(e) => setStampConfig({ ...stampConfig, color: e.target.value as any })}
                    >
                      <option value="blue">Xanh chuẩn chữ ký số (Corporate Blue)</option>
                      <option value="crimson">Đỏ công vụ (Chuẩn văn bản)</option>
                      <option value="emerald">Xanh lục bảo mật</option>
                      <option value="slate">Đen than</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Kiểu nền con dấu:</label>
                    <select
                      className="form-select"
                      style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                      value={stampConfig.backgroundStyle || 'white'}
                      onChange={(e) => setStampConfig({ ...stampConfig, backgroundStyle: e.target.value as any })}
                    >
                      <option value="white">Nền trắng chuẩn văn bản</option>
                      <option value="transparent">Nền trong suốt</option>
                      <option value="tinted">Nền màu nhạt</option>
                    </select>
                  </div>
                </div>

                {/* Quick Presets for Position */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Move size={13} color="var(--accent-cyan)" />
                      <span>Vị trí đóng dấu trên trang cuối:</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      X: {stampConfig.xPercent}% | Y: {stampConfig.yPercent}%
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    <button
                      type="button"
                      className={`btn btn-xs ${stampConfig.xPercent === 65 && stampConfig.yPercent === 12 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.72rem', padding: '4px 6px' }}
                      onClick={() => setStampConfig({ ...stampConfig, xPercent: 65, yPercent: 12 })}
                    >
                      Phải dưới (Chuẩn)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs ${stampConfig.xPercent === 10 && stampConfig.yPercent === 12 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.72rem', padding: '4px 6px' }}
                      onClick={() => setStampConfig({ ...stampConfig, xPercent: 10, yPercent: 12 })}
                    >
                      Trái dưới
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs ${stampConfig.xPercent === 35 && stampConfig.yPercent === 50 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.72rem', padding: '4px 6px' }}
                      onClick={() => setStampConfig({ ...stampConfig, xPercent: 35, yPercent: 50 })}
                    >
                      Chính giữa
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs ${stampConfig.xPercent === 65 && stampConfig.yPercent === 75 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.72rem', padding: '4px 6px' }}
                      onClick={() => setStampConfig({ ...stampConfig, xPercent: 65, yPercent: 75 })}
                    >
                      Phải trên
                    </button>
                  </div>
                </div>

                {/* Interactive Drag & Drop Stamp Canvas */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600 }}>
                      Đặt con dấu:
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Giữ chuột để kéo thả vị trí
                    </span>
                  </div>

                  <div
                    ref={previewPageRef}
                    onMouseDown={handleMouseDown}
                    style={{
                      position: 'relative',
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '2px dashed var(--border-subtle)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      flex: 1,
                      minHeight: '220px',
                      overflow: 'hidden',
                      cursor: isDraggingStamp ? 'grabbing' : 'grab',
                      userSelect: 'none',
                      padding: '12px 16px',
                    }}
                  >
                    {/* Simulated Text Lines of Document */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.35, pointerEvents: 'none' }}>
                      <div style={{ width: '60%', height: '8px', background: '#94a3b8', borderRadius: '4px', margin: '0 auto 6px' }} />
                      <div style={{ width: '45%', height: '6px', background: '#cbd5e1', borderRadius: '3px', margin: '0 auto 12px' }} />
                      <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px' }} />
                      <div style={{ width: '92%', height: '5px', background: '#e2e8f0', borderRadius: '3px' }} />
                      <div style={{ width: '96%', height: '5px', background: '#e2e8f0', borderRadius: '3px' }} />
                      <div style={{ width: '85%', height: '5px', background: '#e2e8f0', borderRadius: '3px' }} />
                      <div style={{ width: '90%', height: '5px', background: '#e2e8f0', borderRadius: '3px' }} />
                      <div style={{ width: '70%', height: '5px', background: '#e2e8f0', borderRadius: '3px' }} />
                    </div>

                    {/* Draggable Stamp Badge */}
                    {stampPreviewUrl && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${stampConfig.xPercent}%`,
                          top: `${Math.max(10, Math.min(78, 100 - stampConfig.yPercent - 22))}%`,
                          transform: 'scale(0.85)',
                          transformOrigin: 'top left',
                          border: isDraggingStamp ? '2px solid #06b6d4' : '1.5px solid #38bdf8',
                          borderRadius: '6px',
                          boxShadow: isDraggingStamp ? '0 8px 24px rgba(6, 182, 212, 0.4)' : '0 2px 10px rgba(0,0,0,0.15)',
                          background: stampConfig.backgroundStyle === 'transparent' ? 'rgba(255,255,255,0.85)' : '#ffffff',
                          padding: '2px',
                          pointerEvents: 'none',
                          transition: isDraggingStamp ? 'none' : 'box-shadow 0.2s ease',
                        }}
                      >
                        <img
                          src={stampPreviewUrl}
                          alt="Con dấu"
                          style={{ maxHeight: '72px', width: 'auto', display: 'block' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Signature Studio Modal */}
          <SignaturePadModal
            isOpen={isSigModalOpen}
            onClose={() => setIsSigModalOpen(false)}
            stampConfig={stampConfig}
            setStampConfig={setStampConfig}
            activeCert={activeCert}
            onNotify={onNotify}
          />
        </div>
      </div>
    </div>
  );
};
