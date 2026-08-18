/**
 * Type definitions for SignWCert - ElGamal Digital Signature & PKI System
 */

export interface ElGamalPublicKey {
  p: string; // Prime modulus (as decimal or hex string)
  g: string; // Generator / Primitive root (alpha)
  y: string; // Public key component (y = g^x mod p)
  bitLength: number;
}

export interface ElGamalPrivateKey {
  x: string; // Private key exponent (x in [2, p-2])
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
  r: string; // Signature component 1: r = g^k mod p
  s: string; // Signature component 2: s = k^-1 * (m - x*r) mod (p-1)
  algorithm: string; // e.g. "ElGamal-SHA256"
  documentHash: string; // Hex string of document hash
  timestamp: number;
}

export interface CertificateSubject {
  commonName: string; // Họ và tên
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
  validFrom: string; // ISO Date string
  validTo: string; // ISO Date string
  publicKey: ElGamalPublicKey;
  keyUsage: string[];
  thumbprint: string; // SHA-256 Fingerprint of certificate body
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
  organization: string;
  location: string;
  signReason: string;
  dateString: string;
  pageNumber: number;
  xPercent: number; // 0 - 100% relative to page width
  yPercent: number; // 0 - 100% relative to page height
  color: 'emerald' | 'blue' | 'crimson' | 'amber' | 'slate';
  showQrCode: boolean;
  style: 'modern-badge' | 'official-seal' | 'minimal-tag';
}

export interface SignedDocumentPackage {
  format: 'SignWCert-v1';
  fileName: string;
  fileSize: number;
  fileType: string;
  documentHash: string; // SHA-256
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
    m: string; // Hash mapped to BigInt
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
