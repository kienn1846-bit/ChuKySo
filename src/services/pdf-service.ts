/**
 * PDF Service using pdf-lib & HTML5 Canvas
 * Handles PDF signing, visual stamp rendering, metadata embedding, and Audit Report generation
 * Fully supports Unicode Vietnamese text without WinAnsi encoding errors.
 */

import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import {
  DigitalCertificate,
  ElGamalSignature,
  SignedDocumentPackage,
  VerificationResult,
  VisualStampConfig,
} from '../types';

/**
 * Generate a visual stamp image as Data URL using HTML Canvas
 */
export async function generateVisualStampDataUrl(
  stampConfig: VisualStampConfig,
  certificate: DigitalCertificate,
  signature: ElGamalSignature
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 460;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Color schemes
  const colors = {
    emerald: { border: '#059669', bg: '#ecfdf5', text: '#065f46', accent: '#10b981' },
    blue: { border: '#2563eb', bg: '#eff6ff', text: '#1e40af', accent: '#3b82f6' },
    crimson: { border: '#dc2626', bg: '#fef2f2', text: '#991b1b', accent: '#ef4444' },
    amber: { border: '#d97706', bg: '#fffbeb', text: '#92400e', accent: '#f59e0b' },
    slate: { border: '#475569', bg: '#f8fafc', text: '#1e293b', accent: '#64748b' },
  };

  const scheme = colors[stampConfig.color] || colors.emerald;

  // Background
  ctx.fillStyle = scheme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border & Inner Border
  ctx.lineWidth = 3;
  ctx.strokeStyle = scheme.border;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  ctx.lineWidth = 1;
  ctx.strokeStyle = scheme.accent;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  // Header Title
  ctx.fillStyle = scheme.border;
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('✓ CHỨNG NHẬN KÝ SỐ ĐIỆN TỬ (ELGAMAL)', 18, 30);

  // Signer Name
  ctx.fillStyle = scheme.text;
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText(`Người ký: ${stampConfig.signerName || certificate.subject.commonName}`, 18, 56);

  // Organization & Unit
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText(`Đơn vị: ${stampConfig.organization || certificate.subject.organization}`, 18, 76);

  // Reason
  if (stampConfig.signReason) {
    ctx.fillText(`Lý do: ${stampConfig.signReason}`, 18, 96);
  } else {
    ctx.fillText(`Lý do: Xác nhận tính toàn vẹn văn bản`, 18, 96);
  }

  // Date & Serial
  ctx.font = '11px "JetBrains Mono", Consolas, monospace';
  ctx.fillText(`Thời gian: ${stampConfig.dateString || new Date().toLocaleString('vi-VN')}`, 18, 118);
  ctx.fillText(`Chứng thư: ${certificate.serialNumber}`, 18, 136);

  // Thumbprint abbreviated
  const shortThumb = certificate.thumbprint.slice(0, 23) + '...';
  ctx.fillText(`Fingerprint: ${shortThumb}`, 18, 154);

  // Signature R snippet
  const shortR = signature.r.slice(0, 16) + '...';
  ctx.fillText(`Sig(r): ${shortR}`, 18, 170);

  // QR Code on right side
  if (stampConfig.showQrCode) {
    const qrData = JSON.stringify({
      sig: 'ElGamal-SignWCert',
      serial: certificate.serialNumber,
      signer: certificate.subject.commonName,
      hash: signature.documentHash.slice(0, 16),
      signedAt: stampConfig.dateString,
    });

    try {
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        margin: 1,
        width: 130,
        color: { dark: scheme.border, light: '#ffffff' },
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        qrImg.onload = resolve;
      });

      ctx.drawImage(qrImg, 320, 24, 126, 126);
    } catch {
      // Ignore QR errors
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Convert base64 dataUrl to Uint8Array bytes
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Wrap text lines for canvas rendering
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const resultLines: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (para.trim() === '') {
      resultLines.push('');
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        resultLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines;
}

/**
 * Sign an existing PDF file by embedding visual stamp onto the specified page and attaching metadata
 */
export async function signPdfDocument(
  pdfBytes: ArrayBuffer,
  packageData: SignedDocumentPackage,
  stampConfig?: VisualStampConfig
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const targetPageIndex = stampConfig && stampConfig.pageNumber <= pages.length ? stampConfig.pageNumber - 1 : pages.length - 1;
  const targetPage = pages[targetPageIndex];

  if (stampConfig && stampConfig.enabled) {
    // Generate stamp png
    const stampDataUrl = await generateVisualStampDataUrl(
      stampConfig,
      packageData.certificate,
      packageData.signature
    );

    const imageBytes = dataUrlToBytes(stampDataUrl);
    const stampImage = await pdfDoc.embedPng(imageBytes);

    const stampWidth = 240;
    const stampHeight = 95;

    const { width, height } = targetPage.getSize();
    
    // Position calculated from percent (xPercent, yPercent from bottom-left)
    const xPos = (stampConfig.xPercent / 100) * (width - stampWidth);
    const yPos = (stampConfig.yPercent / 100) * (height - stampHeight);

    targetPage.drawImage(stampImage, {
      x: Math.max(10, Math.min(width - stampWidth - 10, xPos)),
      y: Math.max(10, Math.min(height - stampHeight - 10, yPos)),
      width: stampWidth,
      height: stampHeight,
    });
  }

  // Embed Custom Metadata inside PDF
  try {
    pdfDoc.setTitle(`[Signed] ${packageData.fileName}`);
    pdfDoc.setAuthor(packageData.certificate.subject.commonName);
    pdfDoc.setSubject(`Digitally Signed with ElGamal Algorithm (${packageData.signature.algorithm})`);
    pdfDoc.setKeywords([
      'SignWCert-v1',
      `CertSerial:${packageData.certificate.serialNumber}`,
      `DocHash:${packageData.documentHash}`,
      `SigR:${packageData.signature.r}`,
      `SigS:${packageData.signature.s}`,
    ]);
  } catch {
    // Ignore metadata setting issues if any
  }

  return pdfDoc.save();
}

/**
 * Create a new Signed PDF Document from Text with Visual Stamp embedded
 * Renders via high-res Canvas for 100% full Unicode Vietnamese support without WinAnsi errors.
 */
export async function createSignedPdfFromText(
  textContent: string,
  packageData: SignedDocumentPackage,
  stampConfig: VisualStampConfig
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  // High-res A4 dimensions (2x scale)
  const canvasWidth = 1190;
  const canvasHeight = 1684;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Decorative border
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(30, 30, canvasWidth - 60, canvasHeight - 60);

  // Top National Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', canvasWidth / 2, 90);

  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Độc lập - Tự do - Hạnh phúc', canvasWidth / 2, 124);

  // Underline
  ctx.beginPath();
  ctx.moveTo(canvasWidth / 2 - 120, 138);
  ctx.lineTo(canvasWidth / 2 + 120, 138);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#475569';
  ctx.stroke();

  // Document Title
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#0284c7';
  ctx.fillText('VĂN BẢN ĐIỆN TỬ ĐÃ KÝ SỐ (ELGAMAL DIGITAL SIGNATURE)', canvasWidth / 2, 190);

  // Title separator
  ctx.beginPath();
  ctx.moveTo(80, 212);
  ctx.lineTo(canvasWidth - 80, 212);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  // Body Text Content
  ctx.textAlign = 'left';
  ctx.font = '19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#1e293b';

  const maxTextWidth = canvasWidth - 160;
  const wrappedLines = wrapText(ctx, textContent, maxTextWidth);

  let currentY = 255;
  const lineHeight = 30;
  const maxContentY = canvasHeight - 380; // Reserve space for visual stamp & footer

  for (const line of wrappedLines) {
    if (currentY > maxContentY) {
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillText('... (Nội dung tiếp theo được lưu trữ trong tệp gốc) ...', 80, currentY);
      break;
    }
    ctx.fillText(line, 80, currentY);
    currentY += lineHeight;
  }

  // Draw Visual Stamp on Canvas
  const stampDataUrl = await generateVisualStampDataUrl(
    stampConfig,
    packageData.certificate,
    packageData.signature
  );

  const stampImg = new Image();
  stampImg.src = stampDataUrl;
  await new Promise((resolve) => {
    stampImg.onload = resolve;
  });

  const stampW = 460;
  const stampH = 180;
  const stampX = canvasWidth - stampW - 80;
  const stampY = canvasHeight - stampH - 120;

  ctx.drawImage(stampImg, stampX, stampY, stampW, stampH);

  // Footer separator & details
  ctx.beginPath();
  ctx.moveTo(80, canvasHeight - 85);
  ctx.lineTo(canvasWidth - 80, canvasHeight - 85);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '13px "JetBrains Mono", Consolas, monospace';
  ctx.fillText(`Mã băm SHA-256: ${packageData.documentHash}`, 80, canvasHeight - 60);

  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText(`Chứng thư số: ${packageData.certificate.serialNumber} | Thuật toán: ${packageData.signature.algorithm} | Hệ thống SignWCert PKI`, 80, canvasHeight - 42);

  // Convert canvas to PNG and embed in PDF
  const pagePngDataUrl = canvas.toDataURL('image/png');
  const pagePngBytes = dataUrlToBytes(pagePngDataUrl);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
  const embeddedPng = await pdfDoc.embedPng(pagePngBytes);

  page.drawImage(embeddedPng, {
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
  });

  try {
    pdfDoc.setTitle(`[Signed] ${packageData.fileName}`);
    pdfDoc.setAuthor(packageData.certificate.subject.commonName);
  } catch {
    // Ignore
  }

  return pdfDoc.save();
}

/**
 * Generate an Official Audit Verification Report as PDF
 * Renders via high-res Canvas to ensure full Vietnamese Unicode text rendering without WinAnsi errors.
 */
export async function generateVerificationReportPdf(
  result: VerificationResult,
  fileName: string
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  const canvasWidth = 1190;
  const canvasHeight = 1684;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  const isOk = result.isValid;
  const headerTheme = isOk ? '#059669' : '#dc2626';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Outer border
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(30, 30, canvasWidth - 60, canvasHeight - 60);

  // Top Header Banner
  ctx.fillStyle = headerTheme;
  ctx.fillRect(60, 60, canvasWidth - 120, 110);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('BIÊN BẢN KIỂM TRA VÀ XÁC THỰC CHỮ KÝ SỐ ELGAMAL', canvasWidth / 2, 110);

  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('TRƯỜNG ĐẠI HỌC - BỘ MÔN AN TOÀN THÔNG TIN & MẬT MÃ HỌC', canvasWidth / 2, 142);

  // Verdict Box
  let y = 200;
  ctx.fillStyle = isOk ? '#ecfdf5' : '#fef2f2';
  ctx.fillRect(60, y, canvasWidth - 120, 95);

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = headerTheme;
  ctx.strokeRect(60, y, canvasWidth - 120, 95);

  ctx.textAlign = 'left';
  ctx.fillStyle = headerTheme;
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText(
    `KẾT QUẢ TỔNG QUÁT: ${isOk ? 'CHỮ KÝ HỢP LỆ (VALID)' : 'CHỮ KÝ KHÔNG HỢP LỆ (INVALID)'}`,
    90,
    y + 40
  );

  ctx.fillStyle = '#475569';
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText(`Thời gian xác thực: ${new Date(result.verifiedAt).toLocaleString('vi-VN')}`, 90, y + 72);

  y += 135;

  // Section 1: Document Info & Integrity
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('1. THÔNG TIN TÀI LIỆU VÀ TÍNH TOÀN VẸN (INTEGRITY)', 60, y);
  y += 32;

  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Tên tệp tin: ${fileName}`, 80, y);
  y += 28;

  ctx.font = '14px "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Mã băm SHA-256 (Gốc trong chữ ký): ${result.documentHash.slice(0, 48)}...`, 80, y);
  y += 26;
  ctx.fillText(`Mã băm SHA-256 (Tính toán thực tế): ${result.fileHashCalculated.slice(0, 48)}...`, 80, y);
  y += 28;

  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = result.integrityValid ? '#059669' : '#dc2626';
  ctx.fillText(
    `Trạng thái tính toàn vẹn: ${result.integrityValid ? '✓ KHỚP - Tài liệu nguyên bản, không bị sửa đổi' : '✗ CẢNH BÁO - Tài liệu đã bị sửa đổi / Mã băm không khớp!'}`,
    80,
    y
  );

  y += 50;

  // Section 2: Mathematical Verification
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('2. XÁC THỰC TOÁN HỌC HỆ MẬT ELGAMAL (MATHEMATICAL VERIFICATION)', 60, y);
  y += 32;

  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Thuật toán: ${result.signature.algorithm || 'ElGamal-SHA256'}`, 80, y);
  y += 26;

  ctx.font = '14px "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Thành phần r: ${result.mathDetails.r.slice(0, 42)}...`, 80, y);
  y += 24;
  ctx.fillText(`Thành phần s: ${result.mathDetails.s.slice(0, 42)}...`, 80, y);
  y += 24;
  ctx.fillText(`Vế trái v₁ = gᵐ mod p: ${result.mathDetails.v1.slice(0, 38)}...`, 80, y);
  y += 24;
  ctx.fillText(`Vế phải v₂ = (yʳ · rˢ) mod p: ${result.mathDetails.v2.slice(0, 38)}...`, 80, y);
  y += 28;

  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = result.mathDetails.isEqual ? '#059669' : '#dc2626';
  ctx.fillText(
    `Kết luận số học: ${result.mathDetails.isEqual ? '✓ ĐỒNG DƯ v₁ ≡ v₂ (mod p) - Chữ ký toán học hợp lệ' : '✗ v₁ ≢ v₂ (mod p) - Chữ ký toán học không hợp lệ'}`,
    80,
    y
  );

  y += 50;

  // Section 3: Certificate Details
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('3. THÔNG TIN CHỨNG THƯ SỐ & NGƯỜI KÝ (DIGITAL CERTIFICATE)', 60, y);
  y += 32;

  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Chủ thể (Subject): ${result.certificate.subject.commonName} (${result.certificate.subject.email})`, 80, y);
  y += 26;
  ctx.fillText(`Đơn vị (Organization): ${result.certificate.subject.organization}`, 80, y);
  y += 26;
  ctx.fillText(`Số Serial: ${result.certificate.serialNumber}`, 80, y);
  y += 26;
  ctx.fillText(`Cơ quan phát hành (Issuer): ${result.certificate.issuer.commonName}`, 80, y);
  y += 26;
  ctx.fillText(`Thời hạn: Từ ${new Date(result.certificate.validFrom).toLocaleDateString('vi-VN')} đến ${new Date(result.certificate.validTo).toLocaleDateString('vi-VN')}`, 80, y);
  y += 26;

  ctx.font = '14px "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Thumbprint (SHA-256): ${result.certificate.thumbprint}`, 80, y);
  y += 28;

  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = result.certificateValid ? '#059669' : '#dc2626';
  ctx.fillText(
    `Trạng thái chứng thư: ${result.certificateValid ? '✓ HỢP LỆ - Được ký bởi Root CA tin cậy, còn hạn sử dụng' : '✗ KHÔNG TIN CẬY - Chứng thư đã hết hạn hoặc bị thu hồi'}`,
    80,
    y
  );

  // Bottom Signature Block
  const signBoxY = canvasHeight - 210;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('GIẢNG VIÊN / HỘI ĐỒNG CHẤM THI', canvasWidth - 250, signBoxY);

  ctx.font = 'italic 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('(Ký và ghi rõ họ tên)', canvasWidth - 250, signBoxY + 24);

  // Footer Note
  ctx.textAlign = 'left';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Hệ thống SignWCert v1.0 - Bộ Giải pháp Chữ ký số ElGamal & PKI Certificate', 60, canvasHeight - 50);

  // Convert canvas to PNG and embed in PDF
  const reportPngDataUrl = canvas.toDataURL('image/png');
  const reportPngBytes = dataUrlToBytes(reportPngDataUrl);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const embeddedPng = await pdfDoc.embedPng(reportPngBytes);

  page.drawImage(embeddedPng, {
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
  });

  return pdfDoc.save();
}
