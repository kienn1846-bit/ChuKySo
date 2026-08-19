/**
 * Các hàm băm mật mã (Cryptographic Hash Functions) & Chuyển đổi mã băm sang số BigInt
 */

/**
 * Băm mảng byte dữ liệu thô bằng thuật toán SHA-256 hoặc SHA-512
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
 * Băm chuỗi ký tự UTF-8 bằng thuật toán SHA-256 hoặc SHA-512
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
 * Băm tập tin (File) theo khối dữ liệu trong môi trường trình duyệt
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
 * Chuyển đổi chuỗi băm Hex SHA-256 thành số nguyên thuộc modulo (p - 1)
 * Đảm bảo giá trị nằm trong khoảng: 1 <= m <= p - 2
 */
export function hashToBigIntMod(hashHex: string, modulusMinus1: bigint): bigint {
  // Kiểm tra: (p - 1) phải lớn hơn 1 (tức là p phải >= 3)
  if (modulusMinus1 <= 1n) {
    throw new Error('Modulo minus 1 phải lớn hơn 1');
  }

  // Chuyển đổi trực tiếp chuỗi Hex sang số nguyên BigInt
  const rawBigInt = BigInt('0x' + hashHex);

  // Rút gọn Modulo (p - 1)
  let m = rawBigInt % modulusMinus1;

  // Trường hợp hiếm m == 0, gán m = 1 để đảm bảo 1 <= m <= p-2
  if (m === 0n) {
    m = 1n;
  }

  return m;
}

/**
 * Tính dấu bản quyền/vân tay SHA-256 (Thumbprint) cho Chứng thư số (Định dạng Hex viết hoa cách bởi dấu hai chấm)
 */
export async function getThumbprint(data: string | Uint8Array): Promise<string> {
  const hex = typeof data === 'string' ? await hashString(data) : await hashBuffer(data);
  return hex.toUpperCase().match(/.{1,2}/g)?.join(':') || hex;
}
