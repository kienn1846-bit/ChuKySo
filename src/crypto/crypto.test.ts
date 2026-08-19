/**
 * Bộ kiểm thử đơn vị Mật mã học (Cryptographic Math Unit Tests)
 * Kiểm định Sinh khóa, Ký số, Xác thực, Các trường hợp biên và Kịch bản tấn công ElGamal
 */

import {
  modPow,
  gcd,
  extendedGCD,
  modInverse,
  millerRabin,
  PRESET_PRIMES,
} from './bigint-utils';
import {
  generateElGamalKeyPair,
  signElGamal,
  verifyElGamal,
  elgamal_encrypt,
  elgamal_decrypt,
} from './elgamal';
import { hashString } from './hash';
import { cryptoLogger } from '../services/crypto-logger';

export async function runCryptoSelfTests(): Promise<{
  allPassed: boolean;
  results: { testName: string; passed: boolean; message: string; durationMs: number }[];
}> {
  return cryptoLogger.runWithoutLogging(async () => {
    const results: { testName: string; passed: boolean; message: string; durationMs: number }[] = [];

  // Bài test 1: Lũy thừa Modulo (modPow)
  {
    const start = performance.now();
    const passed = modPow(2n, 10n, 1000n) === 24n && modPow(7n, 256n, 13n) === 9n;
    results.push({
      testName: 'Lũy thừa Modulo (modPow)',
      passed,
      message: passed ? '2^10 mod 1000 = 24 và 7^256 mod 13 = 9' : 'Thất bại tính toán modPow',
      durationMs: performance.now() - start,
    });
  }

  // Bài test 2: Euclid mở rộng & Nghịch đảo Modulo
  {
    const start = performance.now();
    const a = 17n;
    const m = 3120n;
    const inv = modInverse(a, m);
    const passed = (a * inv) % m === 1n;
    results.push({
      testName: 'Euclid mở rộng & Nghịch đảo Modulo',
      passed,
      message: passed ? `17^-1 mod 3120 = ${inv} (kiểm tra: (17 * ${inv}) mod 3120 = 1)` : 'Thất bại tìm nghịch đảo',
      durationMs: performance.now() - start,
    });
  }

  // Bài test 3: Kiểm tra Số nguyên tố Miller-Rabin
  {
    const start = performance.now();
    const is65537Prime = millerRabin(65537n, 20);
    const is65539Prime = millerRabin(65539n, 20);
    const isCompositeFalse = !millerRabin(65535n, 20);
    const passed = is65537Prime && is65539Prime && isCompositeFalse;
    results.push({
      testName: 'Kiểm tra Số nguyên tố Miller-Rabin',
      passed,
      message: passed ? 'Nhận diện chính xác số nguyên tố (65537, 65539) và hợp số (65535)' : 'Thất bại kiểm tra nguyên tố',
      durationMs: performance.now() - start,
    });
  }

  // Bài test 4: Sinh khóa, Ký số và Xác thực ElGamal 1024-bit (Ca kiểm thử dương tính)
  {
    const start = performance.now();
    const keyPair = generateElGamalKeyPair(1024, 'Test Key 1024', true);
    const sampleText = 'Văn bản kiểm thử chữ ký số ElGamal Đại Học Bách Khoa 2026';
    const docHash = await hashString(sampleText);
    
    const { signature } = signElGamal(docHash, keyPair.publicKey, keyPair.privateKey);
    const verifyResult = verifyElGamal(docHash, signature, keyPair.publicKey);

    const passed = verifyResult.isValid && verifyResult.v1 === verifyResult.v2;
    results.push({
      testName: 'Ký & Xác thực ElGamal 1024-bit (Thành công)',
      passed,
      message: passed ? `Xác thực chữ ký hợp lệ! v1 == v2 (${verifyResult.v1.slice(0, 16)}...)` : 'Thất bại xác thực 1024-bit',
      durationMs: performance.now() - start,
    });
  }

  // Bài test 5: Ca kiểm thử âm tính - Phát hiện giả mạo văn bản
  {
    const start = performance.now();
    const keyPair = generateElGamalKeyPair(1024, 'Test Key', true);
    const originalText = 'Nội dung hợp đồng gốc: Chuyển khoản 10,000,000 VND';
    const tamperedText = 'Nội dung hợp đồng giả mạo: Chuyển khoản 90,000,000 VND';
    
    const originalHash = await hashString(originalText);
    const tamperedHash = await hashString(tamperedText);

    const { signature } = signElGamal(originalHash, keyPair.publicKey, keyPair.privateKey);
    const verifyTampered = verifyElGamal(tamperedHash, signature, keyPair.publicKey);

    const passed = !verifyTampered.isValid && verifyTampered.v1 !== verifyTampered.v2;
    results.push({
      testName: 'Kiểm thử An toàn: Phát hiện chỉnh sửa văn bản',
      passed,
      message: passed ? 'Từ chối thành công văn bản bị giả mạo (v1 != v2)' : 'Thất bại phát hiện giả mạo!',
      durationMs: performance.now() - start,
    });
  }

  // Bài test 6: Mã hóa và Giải mã ElGamal
  {
    const start = performance.now();
    const keyPair = generateElGamalKeyPair(512, 'Test Encrypt Key', true);
    const secretMsg = 'HaUI Crypto 2026';

    const encRes = elgamal_encrypt(secretMsg, keyPair.publicKey);
    const decRes = elgamal_decrypt(encRes.ciphertext, keyPair.publicKey, keyPair.privateKey);

    const passed = decRes.plaintext === secretMsg;
    results.push({
      testName: 'Mã hóa & Giải mã bản rõ ElGamal (Encrypt & Decrypt)',
      passed,
      message: passed ? `Mã hóa và giải mã thành công bản rõ: "${decRes.plaintext}"` : 'Thất bại giải mã bản rõ',
      durationMs: performance.now() - start,
    });
  }

    const allPassed = results.every((r) => r.passed);
    return { allPassed, results };
  });
}
