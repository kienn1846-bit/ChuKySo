/**
 * Storage Service for Keys, Certificates, and Signing History
 * Pre-populates clean 1-User Certificate PKI setup
 */

import {
  DigitalCertificate,
  ElGamalKeyPair,
  SigningHistoryItem,
} from '../types';
import { createRootCA, issueCertificate } from '../crypto/pki';
import { generateElGamalKeyPair } from '../crypto/elgamal';

const STORAGE_KEYS = {
  ROOT_CA_CERT: 'signwcert_root_ca_cert',
  ROOT_CA_KEYPAIR: 'signwcert_root_ca_keypair',
  CERTIFICATES: 'signwcert_certificates',
  KEYPAIRS: 'signwcert_keypairs',
  SIGNING_HISTORY: 'signwcert_signing_history',
  ACTIVE_CERT_ID: 'signwcert_active_cert_id',
};

export interface AppStoreData {
  rootCACert: DigitalCertificate;
  rootCAKeyPair: ElGamalKeyPair;
  certificates: DigitalCertificate[];
  keyPairs: Record<string, ElGamalKeyPair>; // keyed by certificate ID
  signingHistory: SigningHistoryItem[];
  activeCertId: string;
}

/**
 * Initialize storage with exactly 1 User Certificate & Root CA
 */
export function initializeStorage(): AppStoreData {
  const existingRootCert = localStorage.getItem(STORAGE_KEYS.ROOT_CA_CERT);
  const existingRootKey = localStorage.getItem(STORAGE_KEYS.ROOT_CA_KEYPAIR);

  if (existingRootCert && existingRootKey) {
    const rootCACert = JSON.parse(existingRootCert);
    const rootCAKeyPair = JSON.parse(existingRootKey);
    let certificates: DigitalCertificate[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CERTIFICATES) || '[]');
    const keyPairs: Record<string, ElGamalKeyPair> = JSON.parse(localStorage.getItem(STORAGE_KEYS.KEYPAIRS) || '{}');
    const signingHistory: SigningHistoryItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SIGNING_HISTORY) || '[]');
    
    // Ensure if multiple were stored previously, keep only Root CA + 1 User Cert
    if (certificates.length > 2) {
      certificates = [certificates[0], certificates[1]];
      localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(certificates));
    }

    const activeCertId = certificates[1]?.id || certificates[0]?.id || '';
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CERT_ID, activeCertId);

    return {
      rootCACert,
      rootCAKeyPair,
      certificates,
      keyPairs,
      signingHistory,
      activeCertId,
    };
  }

  // First time initialization: Create Root CA
  const { rootCert, rootKeyPair } = createRootCA(
    'Đại Học Quốc Gia - Trung Tâm Chứng Thực Gốc (Root CA)',
    'Viện Công Nghệ Thông Tin & An Ninh Mạng'
  );

  const certificates: DigitalCertificate[] = [rootCert];
  const keyPairs: Record<string, ElGamalKeyPair> = {
    [rootCert.id]: rootKeyPair,
  };

  // Only 1 Single User Certificate: TS. Nguyễn Văn An
  const user1KeyPair = generateElGamalKeyPair(1024, 'TS. Nguyễn Văn An - Key Pair', true);
  const user1Cert = issueCertificate(
    {
      commonName: 'TS. Nguyễn Văn An',
      organization: 'Đại Học Quốc Gia',
      department: 'Khoa An Toàn Thông Tin & Mật Mã',
      email: 'an.nguyen@fit.edu.vn',
      studentId: 'GV-2018-092',
      country: 'VN',
    },
    user1KeyPair.publicKey,
    rootKeyPair,
    rootCert,
    3
  );
  certificates.push(user1Cert);
  keyPairs[user1Cert.id] = user1KeyPair;

  // Save to localStorage
  localStorage.setItem(STORAGE_KEYS.ROOT_CA_CERT, JSON.stringify(rootCert));
  localStorage.setItem(STORAGE_KEYS.ROOT_CA_KEYPAIR, JSON.stringify(rootKeyPair));
  localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(certificates));
  localStorage.setItem(STORAGE_KEYS.KEYPAIRS, JSON.stringify(keyPairs));
  localStorage.setItem(STORAGE_KEYS.SIGNING_HISTORY, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.ACTIVE_CERT_ID, user1Cert.id);

  return {
    rootCACert: rootCert,
    rootCAKeyPair: rootKeyPair,
    certificates,
    keyPairs,
    signingHistory: [],
    activeCertId: user1Cert.id,
  };
}

/**
 * Save new certificate & key pair
 */
export function saveNewCertificate(
  cert: DigitalCertificate,
  keyPair: ElGamalKeyPair
): void {
  const certificates: DigitalCertificate[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CERTIFICATES) || '[]');
  const keyPairs: Record<string, ElGamalKeyPair> = JSON.parse(localStorage.getItem(STORAGE_KEYS.KEYPAIRS) || '{}');

  certificates.push(cert);
  keyPairs[cert.id] = keyPair;

  localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(certificates));
  localStorage.setItem(STORAGE_KEYS.KEYPAIRS, JSON.stringify(keyPairs));
  localStorage.setItem(STORAGE_KEYS.ACTIVE_CERT_ID, cert.id);
}

/**
 * Update certificate status (e.g. revoke)
 */
export function updateCertificateStatus(
  certId: string,
  newStatus: 'active' | 'revoked' | 'expired'
): void {
  const certificates: DigitalCertificate[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CERTIFICATES) || '[]');
  const index = certificates.findIndex((c) => c.id === certId);
  if (index !== -1) {
    certificates[index].status = newStatus;
    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(certificates));
  }
}

/**
 * Add an item to signing history
 */
export function addSigningHistory(item: SigningHistoryItem): void {
  const history: SigningHistoryItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SIGNING_HISTORY) || '[]');
  history.unshift(item); // Add to top
  // Keep max 50 records
  if (history.length > 50) history.pop();
  localStorage.setItem(STORAGE_KEYS.SIGNING_HISTORY, JSON.stringify(history));
}

/**
 * Set active certificate ID for signing
 */
export function setActiveCertificateId(certId: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_CERT_ID, certId);
}

/**
 * Triggers a browser file download for Blobs / Uint8Arrays / Strings.
 * CRITICAL: link.click() must run synchronously within the user-gesture
 * call-stack (no setTimeout/Promise wrapping), otherwise Chrome interprets
 * the blob-URL click as a navigation instead of a download.
 */
export function downloadFile(
  data: Uint8Array | Blob | string,
  fileName: string,
  mimeType = 'application/octet-stream'
): void {
  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (typeof data === 'string') {
    blob = new Blob([data], { type: mimeType });
  } else {
    // Uint8Array: copy to avoid shared-ArrayBuffer issues from pdf-lib
    const cleanCopy = new Uint8Array(data);
    blob = new Blob([cleanCopy], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.position = 'fixed';
  link.style.left = '-9999px';
  link.style.top = '-9999px';
  document.body.appendChild(link);

  // Synchronous click – stays within user-gesture context
  link.click();

  // Clean up after the browser has had time to start the download
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 10000);
}

/**
 * Export certificate as downloadable JSON file
 */
export function downloadCertificateFile(cert: DigitalCertificate): void {
  const jsonStr = JSON.stringify(cert, null, 2);
  const safeName = cert.subject.commonName.replace(/[\/\\:?*"<>|\s]+/g, '_');
  downloadFile(jsonStr, `${cert.serialNumber}_${safeName}.crt.json`, 'application/json');
}

/**
 * Export private key file
 */
export function downloadPrivateKeyFile(cert: DigitalCertificate, keyPair: ElGamalKeyPair): void {
  const keyExport = {
    type: 'ElGamal-PrivateKey-SignWCert',
    certificateSerial: cert.serialNumber,
    owner: cert.subject.commonName,
    bitLength: keyPair.bitLength,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    exportedAt: new Date().toISOString(),
    warning: 'BẢO MẬT: Không chia sẻ file khoá bí mật này cho bất kỳ ai!',
  };
  const jsonStr = JSON.stringify(keyExport, null, 2);
  downloadFile(jsonStr, `${cert.serialNumber}_private.key.json`, 'application/json');
}

/**
 * Reset all storage to factory demo state
 */
export function resetStorage(): AppStoreData {
  localStorage.removeItem(STORAGE_KEYS.ROOT_CA_CERT);
  localStorage.removeItem(STORAGE_KEYS.ROOT_CA_KEYPAIR);
  localStorage.removeItem(STORAGE_KEYS.CERTIFICATES);
  localStorage.removeItem(STORAGE_KEYS.KEYPAIRS);
  localStorage.removeItem(STORAGE_KEYS.SIGNING_HISTORY);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_CERT_ID);
  return initializeStorage();
}
