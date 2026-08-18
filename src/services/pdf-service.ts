/**
 * PDF Service using pdf-lib & HTML5 Canvas
 * Handles PDF signing, visual stamp rendering, metadata embedding, and Audit Report generation
 * Fully supports Unicode Vietnamese text without WinAnsi encoding errors.
 */

import { PDFDocument } from 'pdf-lib';
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
/**
 * Helper to draw a natural blue cursive handwritten signature if none is drawn/uploaded
 */
function drawDefaultCursiveSignature(
  ctx: CanvasRenderingContext2D,
  name: string,
  color = '#0044cc'
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Smooth elegant cursive loops matching the reference image
  ctx.beginPath();
  ctx.moveTo(85, 95);
  ctx.bezierCurveTo(75, 45, 90, 20, 105, 32);
  ctx.bezierCurveTo(120, 48, 98, 92, 90, 102);
  ctx.bezierCurveTo(95, 60, 115, 48, 125, 68);
  ctx.bezierCurveTo(135, 88, 115, 105, 130, 98);
  ctx.bezierCurveTo(140, 78, 155, 38, 150, 68);
  ctx.bezierCurveTo(145, 92, 160, 102, 172, 78);
  ctx.bezierCurveTo(182, 62, 168, 100, 192, 88);
  ctx.stroke();

  // Draw natural flourish loop
  ctx.beginPath();
  ctx.arc(115, 55, 24, 0.2 * Math.PI, 1.8 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

/**
 * Format date/time matching authentic Adobe Digital Signature:
 * Date: YYYY.MM.DD
 * HH:mm:ss +07'00'
 */
function formatAdobeDate(dateString?: string): { dateStr: string; timeStr: string } {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return {
    dateStr: `${year}.${month}.${day}`,
    timeStr: `${hours}:${minutes}:${seconds} +07'00'`,
  };
}

/**
 * Generate a visual stamp image as Data URL using HTML Canvas
 * Matches exact Adobe Acrobat / Standard Personal Digital Signature:
 * - Left: Blue Handwritten Signature + Diagonal Stroke + Full Name (Nguyễn Văn A)
 * - Right: "Digitally signed by Nguyễn Văn A \n Date: YYYY.MM.DD \n HH:mm:ss +07'00'"
 * - Pure White Background / Transparent, NO QR, NO Reason
 */
export async function generateVisualStampDataUrl(
  stampConfig: VisualStampConfig,
  certificate: DigitalCertificate,
  signature: ElGamalSignature
): Promise<string> {
  const canvas = document.createElement('canvas');
  // High resolution standard 2x canvas for razor-sharp rendering on PDF
  const width = 480;
  const height = 155;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // 1. Background Fill: Clean pure white by default
  if (stampConfig.backgroundStyle === 'transparent') {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  const signerName = stampConfig.signerName || certificate.subject.commonName || 'Nguyễn Văn A';
  const inkColor = stampConfig.color === 'crimson' ? '#dc2626' : '#0044cc';

  // 2. Left Column: Handwritten Signature + Diagonal Baseline + Printed Name
  const hasHandwritten = !!stampConfig.handwrittenSignatureUrl;

  if (hasHandwritten && stampConfig.handwrittenSignatureUrl) {
    try {
      const sigImg = new Image();
      sigImg.src = stampConfig.handwrittenSignatureUrl;
      await new Promise((resolve, reject) => {
        sigImg.onload = resolve;
        sigImg.onerror = reject;
      });

      const maxSigW = 150;
      const maxSigH = 80;
      let drawW = sigImg.width;
      let drawH = sigImg.height;
      if (drawW > maxSigW || drawH > maxSigH) {
        const ratio = Math.min(maxSigW / drawW, maxSigH / drawH);
        drawW = drawW * ratio;
        drawH = drawH * ratio;
      }
      const sigX = 35 + (maxSigW - drawW) / 2;
      const sigY = 12 + (maxSigH - drawH) / 2;
      ctx.drawImage(sigImg, sigX, sigY, drawW, drawH);
    } catch {
      drawDefaultCursiveSignature(ctx, signerName, inkColor);
    }
  } else {
    // Draw natural default blue cursive signature
    drawDefaultCursiveSignature(ctx, signerName, inkColor);
  }

  // Draw Diagonal Underline Slash Stroke underneath signature
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(25, 135);
  ctx.lineTo(215, 60);
  ctx.stroke();

  // Print Signer Full Name centered below the slash line
  ctx.fillStyle = '#000000';
  ctx.font = '13px Arial, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(signerName, 120, 142);

  // 3. Right Column: Adobe Standard Text Block
  const { dateStr, timeStr } = formatAdobeDate(stampConfig.dateString);
  const rightX = 232;
  let textY = 32;
  const lineHeight = 28;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#000000';
  ctx.font = '500 20px Arial, "Segoe UI", Roboto, sans-serif';

  // Line 1: Digitally signed
  ctx.fillText('Digitally signed', rightX, textY);
  textY += lineHeight;

  // Line 2: by [Name]
  ctx.fillText(`by ${signerName}`, rightX, textY);
  textY += lineHeight;

  // Line 3: Date: YYYY.MM.DD
  ctx.fillText(`Date: ${dateStr}`, rightX, textY);
  textY += lineHeight;

  // Line 4: HH:mm:ss +07'00'
  ctx.fillText(`${timeStr}`, rightX, textY);

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
