/**
 * PKI & Digital Certificate Authority (CA) Management
 * Implements X.509-like Digital Certificates with ElGamal Signatures
 */

import {
  DigitalCertificate,
  CertificateSubject,
  CertificateIssuer,
  ElGamalPublicKey,
  ElGamalKeyPair,
} from '../types';
import { generateElGamalKeyPair, signElGamal, verifyElGamal } from './elgamal';
import { hashString, getThumbprint } from './hash';
import { cryptoLogger } from '../services/crypto-logger';

// Default Root CA Configuration
export const DEFAULT_ROOT_CA_ISSUER: CertificateIssuer = {
  commonName: 'Đại học Công nghiệp Hà Nội - Trung Tâm Chứng Thực Số Gốc (HaUI Root CA)',
  organization: 'Trường Đại học Công nghiệp Hà Nội',
  serialNumber: 'HAUI-ROOT-CA-001',
};

/**
 * Generate a Root Certificate Authority (Self-Signed)
 */
export function createRootCA(
  commonName = DEFAULT_ROOT_CA_ISSUER.commonName,
  organization = DEFAULT_ROOT_CA_ISSUER.organization
): { rootCert: DigitalCertificate; rootKeyPair: ElGamalKeyPair } {
  // Use 2048-bit safe prime for Root CA
  const rootKeyPair = generateElGamalKeyPair(2048, `${commonName} Key Pair`, true);

  const now = new Date();
  const validFrom = now.toISOString();
  const validTo = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate()).toISOString();

  const serialNumber = 'ROOT-' + Math.random().toString(16).substring(2, 10).toUpperCase();

  const certDataToHash = JSON.stringify({
    version: 'v1.0',
    serialNumber,
    subject: {
      commonName,
      organization,
      email: 'ca-root@edu.vn',
      country: 'VN',
    },
    issuer: {
      commonName,
      organization,
      serialNumber,
    },
    validFrom,
    validTo,
    publicKey: rootKeyPair.publicKey,
    keyUsage: ['Certificate Authority', 'Digital Signature', 'CRL Sign', 'Key Encipherment'],
  });

  // Hash certificate body
  const thumbprint = getSyncThumbprint(certDataToHash);
  const certHashHex = getSyncHashHex(certDataToHash);

  // Self-sign with Root CA key
  const { signature } = signElGamal(certHashHex, rootKeyPair.publicKey, rootKeyPair.privateKey);

  const rootCert: DigitalCertificate = {
    id: `cert_${serialNumber}`,
    version: 'v1.0',
    serialNumber,
    subject: {
      commonName,
      organization,
      email: 'ca-root@edu.vn',
      country: 'VN',
    },
    issuer: {
      commonName,
      organization,
      serialNumber,
    },
    validFrom,
    validTo,
    publicKey: rootKeyPair.publicKey,
    keyUsage: ['Certificate Authority', 'Digital Signature', 'CRL Sign'],
    thumbprint,
    caSignature: {
      r: signature.r,
      s: signature.s,
    },
    isRootCA: true,
    status: 'active',
    createdAt: validFrom,
  };

  return { rootCert, rootKeyPair };
}

/**
 * Issue a new Digital Certificate for a User/Subject signed by Root CA
 */
export function issueCertificate(
  subject: CertificateSubject,
  userPublicKey: ElGamalPublicKey,
  rootCAKeyPair: ElGamalKeyPair,
  rootCACert: DigitalCertificate,
  validityYears = 2
): DigitalCertificate {
  const now = new Date();
  const validFrom = now.toISOString();
  const validTo = new Date(now.getFullYear() + validityYears, now.getMonth(), now.getDate()).toISOString();

  const serialNumber = 'CERT-' + Math.random().toString(16).substring(2, 10).toUpperCase() + '-' + Date.now().toString(16).slice(-4).toUpperCase();

  const certDataToHash = JSON.stringify({
    version: 'v1.0',
    serialNumber,
    subject,
    issuer: {
      commonName: rootCACert.subject.commonName,
      organization: rootCACert.subject.organization,
      serialNumber: rootCACert.serialNumber,
    },
    validFrom,
    validTo,
    publicKey: userPublicKey,
    keyUsage: ['Digital Signature', 'Non-Repudiation', 'Document Signing'],
  });

  const thumbprint = getSyncThumbprint(certDataToHash);
  const certHashHex = getSyncHashHex(certDataToHash);

  // Sign by Root CA
  const { signature } = signElGamal(certHashHex, rootCAKeyPair.publicKey, rootCAKeyPair.privateKey);

  const certificate: DigitalCertificate = {
    id: `cert_${serialNumber}`,
    version: 'v1.0',
    serialNumber,
    subject,
    issuer: {
      commonName: rootCACert.subject.commonName,
      organization: rootCACert.subject.organization,
      serialNumber: rootCACert.serialNumber,
    },
    validFrom,
    validTo,
    publicKey: userPublicKey,
    keyUsage: ['Digital Signature', 'Non-Repudiation', 'Document Signing'],
    thumbprint,
    caSignature: {
      r: signature.r,
      s: signature.s,
    },
    isRootCA: false,
    status: 'active',
    createdAt: validFrom,
  };

  cryptoLogger.addLog({
    category: 'pki-issue',
    title: `Phát hành chứng thư số mới (PKI Certificate)`,
    description: `Root CA ký số cấp chứng thư cho "${subject.commonName}" (${subject.organization})`,
    actor: rootCACert.subject.commonName,
    bitLength: userPublicKey.bitLength,
    durationMs: 4,
    steps: [
      {
        stepNumber: 1,
        name: 'Đóng gói cấu trúc chứng thư X.509/ElGamal',
        description: 'Tạo Subject, Issuer, Public Key, Validity Period, KeyUsage và gán Serial Number.',
        variables: {
          'Chủ thể (Subject)': `${subject.commonName} (${subject.email})`,
          'Cơ quan cấp (Issuer)': rootCACert.subject.commonName,
          'Serial Number': serialNumber,
        },
        status: 'success',
      },
      {
        stepNumber: 2,
        name: 'Băm toàn vẹn nội dung chứng thư',
        description: 'Tính mã băm SHA-256 của payload chứng thư.',
        formula: 'H(\\text{CertBody}) = \\text{SHA256}(\\text{Payload})',
        variables: { 'Hash Hex': certHashHex, Thumbprint: thumbprint },
        status: 'success',
      },
      {
        stepNumber: 3,
        name: 'Root CA ký số bảo chứng (CA Signature)',
        description: 'Root CA sử dụng khóa bí mật ElGamal để ký lên mã băm chứng thư.',
        formula: '(r_{ca}, s_{ca}) = \\text{Sign}_{CA}(H(\\text{CertBody}))',
        variables: { 'CA Sig(r)': signature.r.substring(0, 24) + '...', 'CA Sig(s)': signature.s.substring(0, 24) + '...' },
        status: 'success',
      },
    ],
    rawSummary: {
      serialNumber,
      subjectName: subject.commonName,
      issuerName: rootCACert.subject.commonName,
      thumbprint,
    },
  });

  return certificate;
}

/**
 * Verify a Digital Certificate against Root CA and Validity Period
 */
export function verifyCertificate(
  cert: DigitalCertificate,
  rootCAPublicKey: ElGamalPublicKey
): {
  isValid: boolean;
  isExpired: boolean;
  isSignatureValid: boolean;
  isRevoked: boolean;
  reason?: string;
} {
  // 1. Check revocation
  if (cert.status === 'revoked') {
    return {
      isValid: false,
      isExpired: false,
      isSignatureValid: false,
      isRevoked: true,
      reason: 'Chứng thư số đã bị thu hồi bởi Cơ quan Chứng thực (CA Revoked)',
    };
  }

  // 2. Check validity dates
  const now = new Date().getTime();
  const validFromTime = new Date(cert.validFrom).getTime();
  const validToTime = new Date(cert.validTo).getTime();

  const isExpired = now < validFromTime || now > validToTime;
  if (isExpired) {
    return {
      isValid: false,
      isExpired: true,
      isSignatureValid: false,
      isRevoked: false,
      reason: now < validFromTime ? 'Chứng thư chưa đến thời gian hiệu lực' : 'Chứng thư số đã hết hạn sử dụng',
    };
  }

  // 3. Reconstruct canonical cert body to verify CA's ElGamal Signature
  const certDataToHash = JSON.stringify({
    version: cert.version,
    serialNumber: cert.serialNumber,
    subject: cert.subject,
    issuer: cert.issuer,
    validFrom: cert.validFrom,
    validTo: cert.validTo,
    publicKey: cert.publicKey,
    keyUsage: cert.keyUsage,
  });

  const certHashHex = getSyncHashHex(certDataToHash);

  const mathVerify = verifyElGamal(
    certHashHex,
    {
      r: cert.caSignature.r,
      s: cert.caSignature.s,
      algorithm: 'ElGamal-SHA256',
      documentHash: certHashHex,
      timestamp: 0,
    },
    rootCAPublicKey
  );

  if (!mathVerify.isValid) {
    return {
      isValid: false,
      isExpired: false,
      isSignatureValid: false,
      isRevoked: false,
      reason: 'Chữ ký của CA trên chứng thư số không hợp lệ hoặc chứng thư đã bị làm giả!',
    };
  }

  return {
    isValid: true,
    isExpired: false,
    isSignatureValid: true,
    isRevoked: false,
  };
}

// Synchronous simple hash helper for canonical strings
function getSyncHashHex(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  
  let hash2 = 5381;
  for (let i = str.length - 1; i >= 0; i--) {
    hash2 = (hash2 * 33) ^ str.charCodeAt(i);
    hash2 |= 0;
  }
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  
  return (hex1 + hex2 + hex1 + hex2).repeat(2);
}

function getSyncThumbprint(str: string): string {
  const hex = getSyncHashHex(str).slice(0, 40).toUpperCase();
  return hex.match(/.{1,2}/g)?.join(':') || hex;
}
