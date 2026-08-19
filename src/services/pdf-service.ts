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
 * Helper to get the exact hex color from stamp color preset
 */
export function getStampInkColor(color?: string): string {
  switch (color) {
    case 'crimson':
      return '#dc2626';
    case 'emerald':
      return '#059669';
    case 'slate':
      return '#0f172a';
    case 'blue':
    default:
      return '#0044cc';
  }
}

/**
 * Generate a visual stamp image as Data URL using HTML Canvas
 * Matches exact Adobe Acrobat / Standard Personal Digital Signature:
 * - Left: Handwritten/Cursive Signature + Full Name
 * - Right: "Digitally signed by [Name] \n Date: YYYY.MM.DD \n HH:mm:ss +07'00'"
 * - Pure White Background / Transparent, NO QR
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
  const inkColor = getStampInkColor(stampConfig.color);

  // 2. Stamp Outer Border
  ctx.save();
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
  ctx.restore();

  // 3. Left Column: Handwritten Signature + Diagonal Baseline + Printed Name
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

      // Color tint the transparent signature image to match the selected stamp ink color
      const tintCanvas = document.createElement('canvas');
      tintCanvas.width = drawW;
      tintCanvas.height = drawH;
      const tCtx = tintCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(sigImg, 0, 0, drawW, drawH);
        tCtx.globalCompositeOperation = 'source-in';
        tCtx.fillStyle = inkColor;
        tCtx.fillRect(0, 0, drawW, drawH);
        ctx.drawImage(tintCanvas, sigX, sigY);
      } else {
        ctx.drawImage(sigImg, sigX, sigY, drawW, drawH);
      }
    } catch {
      drawDefaultCursiveSignature(ctx, signerName, inkColor);
    }
  } else {
    // Draw natural cursive signature with the selected ink color
    drawDefaultCursiveSignature(ctx, signerName, inkColor);
  }

  // Print Signer Full Name centered below signature
  ctx.fillStyle = '#000000';
  ctx.font = '13px Arial, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(signerName, 120, 142);

  // 4. Right Column: Adobe Standard Text Block
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
  // Always stamp on the LAST page of the document
  const targetPage = pages[pages.length - 1];

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
  const stampX = Math.max(60, Math.min(canvasWidth - stampW - 60, (stampConfig.xPercent / 100) * (canvasWidth - stampW)));
  const stampY = Math.max(160, Math.min(canvasHeight - stampH - 100, canvasHeight - ((stampConfig.yPercent / 100) * (canvasHeight - stampH)) - stampH));

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
  ctx.fillText(`Chứng thư số: ${packageData.certificate.serialNumber} | Thuật toán: ${packageData.signature.algorithm} | Hệ thống ChuKySo PKI`, 80, canvasHeight - 42);

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
 * Generate a Formal Certificate of Digital Signature (Giấy Chứng Nhận Ký Số Điện Tử) for Word, Excel, and non-PDF files.
 * Renders via high-res Canvas with official government / enterprise layout.
 */
export async function createSignedDocumentCertificatePdf(
  packageData: SignedDocumentPackage,
  stampConfig: VisualStampConfig
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  const canvasWidth = 1190;
  const canvasHeight = 1684;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Outer decorative border
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1e3a8a';
  ctx.strokeRect(36, 36, canvasWidth - 72, canvasHeight - 72);

  // Inner border
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#93c5fd';
  ctx.strokeRect(44, 44, canvasWidth - 88, canvasHeight - 88);

  // Top National Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', canvasWidth / 2, 90);

  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Độc lập - Tự do - Hạnh phúc', canvasWidth / 2, 120);

  ctx.beginPath();
  ctx.moveTo(canvasWidth / 2 - 110, 134);
  ctx.lineTo(canvasWidth / 2 + 110, 134);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#475569';
  ctx.stroke();

  // Document Title
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText('GIẤY CHỨNG NHẬN KÝ SỐ ĐIỆN TỬ VĂN BẢN', canvasWidth / 2, 185);

  ctx.font = 'italic 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('(ELECTRONIC SIGNATURE CERTIFICATE OF COMPLETION)', canvasWidth / 2, 210);

  // Section 1: File Information Box
  let y = 250;
  ctx.textAlign = 'left';
  
  // Section 1 Header
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(80, y, canvasWidth - 160, 36);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(80, y, canvasWidth - 160, 36);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('I. THÔNG TIN TÀI LIỆU KÝ SỐ GỐC (ORIGINAL DOCUMENT)', 95, y + 24);

  // Section 1 Content
  y += 50;
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#1e293b';

  const fileExt = packageData.fileName.split('.').pop()?.toUpperCase() || 'FILE';
  const fileTypeLabel = fileExt === 'DOCX' || fileExt === 'DOC' 
    ? `Văn bản Microsoft Word (.${fileExt.toLowerCase()})`
    : fileExt === 'XLSX' || fileExt === 'XLS'
    ? `Bảng tính Microsoft Excel (.${fileExt.toLowerCase()})`
    : `${packageData.fileType || 'Tệp tin nhị phân'} (.${fileExt.toLowerCase()})`;

  ctx.fillText(`• Tên tệp tin gốc:`, 95, y);
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(packageData.fileName, 280, y);

  y += 28;
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(`• Định dạng tệp:`, 95, y);
  ctx.fillText(fileTypeLabel, 280, y);

  y += 28;
  ctx.fillText(`• Dung lượng tệp:`, 95, y);
  ctx.fillText(`${(packageData.fileSize / 1024).toFixed(1)} KB (${packageData.fileSize.toLocaleString('vi-VN')} bytes)`, 280, y);

  y += 28;
  ctx.fillText(`• Thời gian thực hiện ký:`, 95, y);
  ctx.fillText(new Date(packageData.signedAt).toLocaleString('vi-VN'), 280, y);

  y += 28;
  ctx.fillText(`• Mã băm SHA-256 tệp:`, 95, y);
  ctx.font = 'bold 13px "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText(packageData.documentHash, 280, y);

  // Section 2: Signer & Certificate Information Box
  y += 45;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(80, y, canvasWidth - 160, 36);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(80, y, canvasWidth - 160, 36);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('II. CHỦ THỂ KÝ SỐ & CHỨNG THƯ PKI (SIGNER & CERTIFICATE)', 95, y + 24);

  y += 50;
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#1e293b';

  ctx.fillText(`• Họ tên người ký:`, 95, y);
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`${packageData.certificate.subject.commonName} (${packageData.certificate.subject.email})`, 280, y);

  y += 28;
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(`• Đơn vị / Cơ quan:`, 95, y);
  ctx.fillText(`${packageData.certificate.subject.organization} ${packageData.certificate.subject.department ? `- ${packageData.certificate.subject.department}` : ''}`, 280, y);

  y += 28;
  ctx.fillText(`• Cơ quan cấp phát (CA):`, 95, y);
  ctx.fillText(packageData.certificate.issuer.commonName, 280, y);

  y += 28;
  ctx.fillText(`• Mã số chứng thư số:`, 95, y);
  ctx.font = 'bold 14px "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = '#0284c7';
  ctx.fillText(packageData.certificate.serialNumber, 280, y);

  y += 28;
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(`• Thời hạn chứng thư:`, 95, y);
  ctx.fillText(`Đến ngày ${new Date(packageData.certificate.validTo).toLocaleDateString('vi-VN')}`, 280, y);

  // Section 3: Cryptographic Signature Parameters Box
  y += 45;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(80, y, canvasWidth - 160, 36);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(80, y, canvasWidth - 160, 36);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('III. THÔNG SỐ CHỮ KÝ SỐ ELGAMAL (CRYPTOGRAPHIC SIGNATURE)', 95, y + 24);

  y += 50;
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#1e293b';

  ctx.fillText(`• Thuật toán chữ ký số:`, 95, y);
  ctx.fillText(`ElGamal-${packageData.certificate.publicKey.bitLength || 1024} bit trên trường Z_p* (Băm SHA-256)`, 280, y);

  y += 26;
  ctx.fillText(`• Chữ ký thành phần r:`, 95, y);
  ctx.font = '12px "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText(`${packageData.signature.r.slice(0, 64)}...`, 280, y);

  y += 24;
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(`• Chữ ký thành phần s:`, 95, y);
  ctx.font = '12px "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText(`${packageData.signature.s.slice(0, 64)}...`, 280, y);

  // Legal Assurance Notice Box
  y += 45;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(80, y, 480, 190);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(80, y, 480, 190);

  ctx.fillStyle = '#047857';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('✓ BẢO ĐẢM TÍNH TOÀN VẸN & GIÁ TRỊ PHÁP LÝ', 95, y + 30);

  ctx.fillStyle = '#334155';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  const noticeText = [
    '• Giấy chứng nhận này xác nhận tệp tin gốc đính kèm',
    '  đã được ký số hợp lệ và bảo toàn vẹn.',
    '• Tệp tin gốc không bị chỉnh sửa sau thời điểm ký.',
    '• Gói chữ ký số (.sig.json) đính kèm chứa trọn vẹn',
    '  chữ ký ElGamal và chứng thư số để xác thực độc lập.',
    '• Mọi thay đổi trên tệp gốc sẽ làm vô hiệu hóa chữ ký.'
  ];
  let noticeY = y + 55;
  for (const nLine of noticeText) {
    ctx.fillText(nLine, 95, noticeY);
    noticeY += 21;
  }

  // Draw Visual Stamp on the right
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
  const stampY = y + 5;

  ctx.drawImage(stampImg, stampX, stampY, stampW, stampH);

  // Bottom Footer
  ctx.beginPath();
  ctx.moveTo(80, canvasHeight - 85);
  ctx.lineTo(canvasWidth - 80, canvasHeight - 85);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '12px "JetBrains Mono", Consolas, monospace';
  ctx.fillText(`Mã băm toàn vẹn: ${packageData.documentHash}`, 80, canvasHeight - 60);

  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText(`Hệ thống Ký số Văn bản ElGamal & Quản lý Chứng thực PKI (SignWCert)`, 80, canvasHeight - 42);

  // Convert canvas to PDF
  const pagePngDataUrl = canvas.toDataURL('image/png');
  const pagePngBytes = dataUrlToBytes(pagePngDataUrl);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const embeddedPng = await pdfDoc.embedPng(pagePngBytes);

  page.drawImage(embeddedPng, {
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
  });

  try {
    pdfDoc.setTitle(`[Certificate] ${packageData.fileName}`);
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
