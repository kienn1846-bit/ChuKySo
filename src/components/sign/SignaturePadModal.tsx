import React, { useRef, useState, useEffect } from 'react';
import {
  PenTool,
  Upload,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Palette,
  Eye,
  Sliders,
  Calendar,
  Building2,
  User,
  Shield,
  Trash2,
} from 'lucide-react';
import { VisualStampConfig, DigitalCertificate } from '../../types';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  stampConfig: VisualStampConfig;
  setStampConfig: React.Dispatch<React.SetStateAction<VisualStampConfig>>;
  activeCert: DigitalCertificate;
  onNotify: (msg: string, type?: 'success' | 'danger' | 'info') => void;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  stampConfig,
  setStampConfig,
  activeCert,
  onNotify,
}) => {
  const [tab, setTab] = useState<'draw' | 'upload' | 'config'>('draw');
  const [penColor, setPenColor] = useState<'#1d4ed8' | '#dc2626' | '#0f172a'>('#1d4ed8');
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [selectedSignatureUrl, setSelectedSignatureUrl] = useState<string | undefined>(
    stampConfig.handwrittenSignatureUrl
  );

  // Form fields for stamp validation
  const [signerName, setSignerName] = useState(stampConfig.signerName || activeCert.subject.commonName);
  const [signerTitle, setSignerTitle] = useState(stampConfig.signerTitle || 'Giảng viên / Cán bộ');
  const [organization, setOrganization] = useState(stampConfig.organization || activeCert.subject.organization);
  const [signReason, setSignReason] = useState(stampConfig.signReason || 'Xác nhận và phê duyệt văn bản điện tử');
  const [location, setLocation] = useState(stampConfig.location || 'Hà Nội');
  const [validFromDate, setValidFromDate] = useState(
    stampConfig.validFromDate || new Date(activeCert.validFrom).toLocaleDateString('vi-VN')
  );
  const [validToDate, setValidToDate] = useState(
    stampConfig.validToDate || new Date(activeCert.validTo).toLocaleDateString('vi-VN')
  );
  const [backgroundStyle, setBackgroundStyle] = useState<'white' | 'transparent' | 'tinted'>(
    stampConfig.backgroundStyle || 'white'
  );
  const [stampColor, setStampColor] = useState(stampConfig.color || 'blue');
  const [showQrCode, setShowQrCode] = useState(stampConfig.showQrCode === true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Canvas
  useEffect(() => {
    if (isOpen && tab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;

        // If an existing drawn signature is in stampConfig, load it
        if (stampConfig.handwrittenSignatureUrl && !hasDrawn) {
          const img = new Image();
          img.src = stampConfig.handwrittenSignatureUrl;
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, (canvas.width - img.width) / 2, (canvas.height - img.height) / 2);
            setHasDrawn(true);
          };
        }
      }
    }
  }, [isOpen, tab, penColor, penWidth]);

  if (!isOpen) return null;

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Handle signature file upload
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          // Process image to make white background transparent
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const d = imgData.data;
              // Remove pure white/light backgrounds
              for (let i = 0; i < d.length; i += 4) {
                const r = d[i], g = d[i + 1], b = d[i + 2];
                // If brightness is high (near white), make transparent
                if (r > 210 && g > 210 && b > 210) {
                  d[i + 3] = 0; // Transparent
                }
              }
              ctx.putImageData(imgData, 0, 0);
              const cleanDataUrl = canvas.toDataURL('image/png');
              setSelectedSignatureUrl(cleanDataUrl);
              onNotify('Đã tải và xử lý nền ảnh chữ ký thành công!', 'success');
            }
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Save Drawn Signature
  const handleSaveDrawn = () => {
    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      const url = canvas.toDataURL('image/png');
      setSelectedSignatureUrl(url);
      onNotify('Đã lưu nét chữ ký vừa vẽ!', 'success');
    }
  };

  // Apply changes to stampConfig and close
  const handleApply = () => {
    let finalSignatureUrl = selectedSignatureUrl;

    if (tab === 'draw' && canvasRef.current && hasDrawn) {
      finalSignatureUrl = canvasRef.current.toDataURL('image/png');
    }

    setStampConfig((prev) => ({
      ...prev,
      signerName,
      signerTitle,
      organization,
      signReason,
      location,
      validFromDate,
      validToDate,
      backgroundStyle,
      color: stampColor as any,
      showQrCode,
      handwrittenSignatureUrl: finalSignatureUrl,
    }));

    onNotify('Đã lưu cấu hình mẫu con dấu chữ ký số điện tử!', 'success');
    onClose();
  };

  const handleRemoveSignature = () => {
    setSelectedSignatureUrl(undefined);
    clearCanvas();
    onNotify('Đã gỡ bỏ chữ ký tay khỏi mẫu con dấu', 'info');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '780px', width: '95%' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(37, 99, 235, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
            >
              <PenTool size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Thiết kế chữ ký & con dấu điện tử
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Tạo chữ ký tay, chọn nền trắng/trong suốt và xác lập thông tin chứng thực chuẩn văn bản
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Studio Navigation Tabs */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
          <button
            className={`btn btn-sm ${tab === 'draw' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('draw')}
          >
            <PenTool size={14} />
            <span>1. Vẽ chữ ký tay</span>
          </button>
          <button
            className={`btn btn-sm ${tab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('upload')}
          >
            <Upload size={14} />
            <span>2. Tải ảnh chữ ký</span>
          </button>
          <button
            className={`btn btn-sm ${tab === 'config' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('config')}
          >
            <Sliders size={14} />
            <span>3. Thông tin & hiệu lực</span>
          </button>
        </div>

        {/* Tab 1: Draw Signature Pad */}
        {tab === 'draw' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Ký trực tiếp bằng chuột hoặc màn hình cảm ứng:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Pen color selector */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#1d4ed8',
                      border: penColor === '#1d4ed8' ? '2px solid white' : 'none',
                      boxShadow: penColor === '#1d4ed8' ? '0 0 0 2px #1d4ed8' : 'none',
                      cursor: 'pointer',
                    }}
                    title="Mực Xanh Ký Tên (Chuẩn)"
                    onClick={() => setPenColor('#1d4ed8')}
                  />
                  <button
                    type="button"
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#dc2626',
                      border: penColor === '#dc2626' ? '2px solid white' : 'none',
                      boxShadow: penColor === '#dc2626' ? '0 0 0 2px #dc2626' : 'none',
                      cursor: 'pointer',
                    }}
                    title="Mực Đỏ Công Vụ"
                    onClick={() => setPenColor('#dc2626')}
                  />
                  <button
                    type="button"
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#0f172a',
                      border: penColor === '#0f172a' ? '2px solid white' : 'none',
                      boxShadow: penColor === '#0f172a' ? '0 0 0 2px #0f172a' : 'none',
                      cursor: 'pointer',
                    }}
                    title="Mực Đen"
                    onClick={() => setPenColor('#0f172a')}
                  />
                </div>

                {/* Clear canvas */}
                <button className="btn btn-sm btn-secondary" onClick={clearCanvas}>
                  <RotateCcw size={14} /> Xóa nét
                </button>
              </div>
            </div>

            {/* Drawing Canvas Area */}
            <div
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: '10px',
                background: '#ffffff',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.05)',
              }}
            >
              <canvas
                ref={canvasRef}
                width={700}
                height={220}
                style={{ width: '100%', height: '220px', display: 'block', cursor: 'crosshair', touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                  }}
                >
                  <PenTool size={28} style={{ opacity: 0.5, marginBottom: '4px' }} />
                  <div>Vẽ chữ ký của bạn tại đây...</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              💡 Nét ký sẽ tự động được làm mịn và tích hợp sắc nét vào con dấu điện tử nền trắng.
            </div>
          </div>
        )}

        {/* Tab 2: Upload Signature Image */}
        {tab === 'upload' && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleUploadImage}
            />
            <div
              className="dropzone"
              style={{ padding: '36px 20px', textAlign: 'center', cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="dropzone-icon" />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                Bấm để chọn hoặc kéo thả ảnh chữ ký viết tay
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '6px' }}>
                Hỗ trợ định dạng PNG, JPG. Hệ thống tự động khử nền trắng để chữ ký trong suốt sắc nét.
              </div>
            </div>

            {stampConfig.handwrittenSignatureUrl && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px' }}>
                  Ảnh chữ ký hiện tại:
                </div>
                <img
                  src={stampConfig.handwrittenSignatureUrl}
                  alt="Signature"
                  style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain' }}
                />
                <div style={{ marginTop: '10px' }}>
                  <button className="btn btn-sm btn-secondary" onClick={handleRemoveSignature}>
                    <Trash2 size={14} /> Gỡ bỏ ảnh này
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Form Fields & Legal Validation Info */}
        {tab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">
                  <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Họ tên người ký:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Chức danh / Vị trí:</label>
                <input
                  type="text"
                  className="form-input"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="Ví dụ: Giảng viên / Cán bộ..."
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">
                  <Building2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Cơ quan / Đơn vị công tác:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Địa điểm ký:</label>
                <input
                  type="text"
                  className="form-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Hiệu lực từ (Validate From):
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={validFromDate}
                  onChange={(e) => setValidFromDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Hiệu lực đến (Validate To):
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={validToDate}
                  onChange={(e) => setValidToDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lý do ký:</label>
              <input
                type="text"
                className="form-input"
                value={signReason}
                onChange={(e) => setSignReason(e.target.value)}
              />
            </div>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">
                  <Palette size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Màu sắc viền & thông tin con dấu:
                </label>
                <select
                  className="form-select"
                  value={stampColor}
                  onChange={(e) => setStampColor(e.target.value as any)}
                >
                  <option value="blue">Xanh chuẩn CKS (Corporate Blue - Viettel/VNPT)</option>
                  <option value="crimson">Đỏ công vụ (Official Red - Chuẩn văn bản nhà nước)</option>
                  <option value="emerald">Xanh lục bảo mật (Emerald Trust)</option>
                  <option value="slate">Đen than (Dark Slate)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Kiểu nền con dấu:</label>
                <select
                  className="form-select"
                  value={backgroundStyle}
                  onChange={(e) => setBackgroundStyle(e.target.value as any)}
                >
                  <option value="white">Nền trắng tinh chuẩn văn bản (White)</option>
                  <option value="transparent">Nền trong suốt (Transparent)</option>
                  <option value="tinted">Nền màu nhẹ (Light Tinted)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="show-qr-check"
                checked={showQrCode}
                onChange={(e) => setShowQrCode(e.target.checked)}
              />
              <label htmlFor="show-qr-check" style={{ fontSize: '0.84rem', cursor: 'pointer' }}>
                Đính kèm mã QR tra cứu tính toàn vẹn chữ ký số trên con dấu
              </label>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="modal-footer" style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button className="btn btn-primary" onClick={handleApply}>
            <Check size={16} />
            <span>Áp Dụng Vào Mẫu Con Dấu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
