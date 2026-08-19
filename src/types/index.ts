/**
 * Định nghĩa các kiểu dữ liệu (Type Definitions) cho Hệ thống Ký số Văn bản ElGamal & PKI
 */

export interface ElGamalPublicKey {
  p: string; // Modulo số nguyên tố p (chuỗi thập phân hoặc hex)
  g: string; // Phần tử sinh / Căn nguyên thủy (alpha)
  y: string; // Thành phần khóa công khai (y = g^x mod p)
  bitLength: number;
}

export interface ElGamalPrivateKey {
  x: string; // Số mũ khóa bí mật (x nằm trong khoảng [2, p-2])
}

export interface ElGamalKeyPair {
  id: string;
  name: string;
  publicKey: ElGamalPublicKey;
  privateKey: ElGamalPrivateKey;
  createdAt: string;
  bitLength: number;
}

export interface ElGamalSignature {
  r: string; // Thành phần chữ ký thứ nhất: r = g^k mod p
  s: string; // Thành phần chữ ký thứ hai: s = k^-1 * (m - x*r) mod (p-1)
  algorithm: string; // VD: "ElGamal-SHA256"
  documentHash: string; // Chuỗi Hex mã băm của văn bản
  timestamp: number;
}

export interface CertificateSubject {
  commonName: string; // Họ và tên người sử dụng
  organization: string; // Trường / Viện / Tổ chức
  department?: string; // Khoa / Bộ phận
  email: string;
  studentId?: string; // Mã số sinh viên / Mã định danh
  country?: string;
}

export interface CertificateIssuer {
  commonName: string;
  organization: string;
  serialNumber: string;
}

export interface DigitalCertificate {
  id: string;
  version: string; // "v1.0"
  serialNumber: string;
  subject: CertificateSubject;
  issuer: CertificateIssuer;
  validFrom: string; // Ngày hiệu lực
  validTo: string; // Ngày hết hạn
  publicKey: ElGamalPublicKey;
  keyUsage: string[];
  thumbprint: string; // Mã băm vân tay SHA-256 của chứng thư
  caSignature: {
    r: string;
    s: string;
  };
  isRootCA: boolean;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
}

export interface VisualStampConfig {
  enabled: boolean;
  signerName: string;
  signerTitle?: string;
  organization: string;
  department?: string;
  location: string;
  signReason: string;
  dateString: string;
  validFromDate?: string;
  validToDate?: string;
  pageNumber: number;
  xPercent: number; // 0 - 100% so với chiều rộng trang PDF
  yPercent: number; // 0 - 100% so với chiều cao trang PDF
  color: 'crimson' | 'blue' | 'emerald' | 'amber' | 'slate';
  showQrCode: boolean;
  style: 'official-seal' | 'handwritten-stamp' | 'modern-badge' | 'minimal-tag';
  backgroundStyle: 'white' | 'transparent' | 'tinted';
  signatureType: 'draw' | 'upload' | 'calligraphy' | 'seal-only';
  handwrittenSignatureUrl?: string;
}

export interface SignedDocumentPackage {
  format: 'SignWCert-v1';
  fileName: string;
  fileSize: number;
  fileType: string;
  documentHash: string; // Mã băm SHA-256
  signature: ElGamalSignature;
  certificate: DigitalCertificate;
  visualStamp?: VisualStampConfig;
  signedAt: string;
  isEmbeddedPdf?: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  integrityValid: boolean;
  signatureValid: boolean;
  certificateValid: boolean;
  documentHash: string;
  fileHashCalculated: string;
  signerName: string;
  signerOrg: string;
  signedAt: string;
  certificate: DigitalCertificate;
  signature: ElGamalSignature;
  mathDetails: {
    p: string;
    g: string;
    y: string;
    r: string;
    s: string;
    m: string; // Mã băm chuyển thành số BigInt
    v1: string; // v1 = g^m mod p
    v2: string; // v2 = (y^r * r^s) mod p
    isEqual: boolean;
  };
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    detail?: string;
  }[];
  errors: string[];
  warnings: string[];
  verifiedAt: string;
}

export interface MathStepLog {
  step: number;
  title: string;
  description: string;
  formula?: string;
  variables: Record<string, string>;
  note?: string;
}

export interface EuclidStep {
  step: number;
  q: string;
  r: string;
  x: string;
  y: string;
  a: string;
  b: string;
}

export interface SigningHistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  signedAt: string;
  signerName: string;
  certificateSerial: string;
  documentHash: string;
  signatureR: string;
  signatureS: string;
  status: 'valid' | 'revoked';
}

export interface CryptoLogStep {
  stepNumber: number;
  name: string;
  description: string;
  formula?: string;
  mathExplanation?: string;
  variables: Record<string, string>;
  status: 'success' | 'warning' | 'info';
}

export interface CryptoLogEntry {
  id: string;
  timestamp: string;
  category: 'keygen' | 'sign' | 'verify' | 'encrypt' | 'decrypt' | 'pki-issue' | 'selftest';
  title: string;
  description: string;
  actor: string;
  bitLength?: number;
  durationMs: number;
  steps: CryptoLogStep[];
  rawSummary: Record<string, string>;
}
