/**
 * Cryptographic Hash Functions & Digest-to-BigInt Mapping
 */

/**
 * Hash raw byte array with SHA-256 or SHA-512
 */
export async function hashBuffer(
  data: Uint8Array | ArrayBuffer,
  algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'
): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, data as BufferSource);
  const hashArray = Array.from(new Uint8Array(digest));

  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a UTF-8 string with SHA-256 or SHA-512
 */
export async function hashString(
  text: string,
  algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  return hashBuffer(data, algorithm);
}

/**
 * Hash a File with chunking for large files (Browser File object)
 */
export async function hashFile(
  file: File,
  algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256',
  onProgress?: (percent: number) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  if (onProgress) onProgress(100);
  return hashBuffer(arrayBuffer, algorithm);
}

/**
 * Map a SHA-256 Hex Hash string to a BigInt modulo (p - 1) for ElGamal Signature
 * Ensures: 1 <= m <= p - 2
 */
export function hashToBigIntMod(hashHex: string, modulusMinus1: bigint): bigint {
  if (modulusMinus1 <= 1n) {
    throw new Error('Modulus minus 1 must be > 1');
  }

  // Convert Hex string directly to BigInt
  const rawBigInt = BigInt('0x' + hashHex);
  
  // Reduce modulo (p - 1)
  let m = rawBigInt % modulusMinus1;
  
  // In the unlikely case m == 0, set m = 1 to keep in Z_{p-1}^*
  if (m === 0n) {
    m = 1n;
  }
  
  return m;
}

/**
 * Calculate SHA-256 thumbprint for Certificate display (colon-separated uppercase)
 */
export async function getThumbprint(data: string | Uint8Array): Promise<string> {
  const hex = typeof data === 'string' ? await hashString(data) : await hashBuffer(data);
  return hex.toUpperCase().match(/.{1,2}/g)?.join(':') || hex;
}
