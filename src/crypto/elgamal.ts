/**
 * ============================================================================
 * ĐỒ ÁN MÔN HỌC: AN TOÀN VÀ BẢO MẬT THÔNG TIN - ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI
 * MODULE HỆ MẬT ELGAMAL (KEYGEN, SIGN, VERIFY, ENCRYPT, DECRYPT)
 * ============================================================================
 */

import {
  binaryPower,
  gcd,
  modInverse,
  randomBigInt,
  generateLargePrime,
  timPTSinh,
  generateSafePrime,
  PRESET_PRIMES,
} from './bigint-utils';
import { hashToBigIntMod } from './hash';
import {
  ElGamalKeyPair,
  ElGamalPublicKey,
  ElGamalPrivateKey,
  ElGamalSignature,
  MathStepLog,
} from '../types';
import { cryptoLogger } from '../services/crypto-logger';

export interface SigningResult {
  signature: ElGamalSignature;
  logs: MathStepLog[];
  kUsed: string;
}

export interface VerificationMathResult {
  isValid: boolean;
  v1: string;
  v2: string;
  m: string;
  p: string;
  g: string;
  y: string;
  r: string;
  s: string;
  logs: MathStepLog[];
}

export interface EncryptionResult {
  ciphertext: [string, string][];
  logs: MathStepLog[];
}

export interface DecryptionResult {
  plaintext: string;
  logs: MathStepLog[];
}

/**
 * 1. THUẬT TOÁN SINH CẶP KHÓA ELGAMAL (elgamal_generate_keys)
 * - Chọn số nguyên tố lớn p
 * - Tìm phần tử sinh g trong Z_p*
 * - Chọn khóa bí mật ngẫu nhiên x trong [2, p - 2]
 * - Tính khóa công khai y = g^x mod p
 */
export function generateElGamalKeyPair(
  bitLength: 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 = 1024,
  name = 'ElGamal Key',
  usePreset = true
): ElGamalKeyPair {
  const startTime = performance.now();
  let p: bigint;
  let g: bigint;

  const presetKey = `safe-${bitLength}` as keyof typeof PRESET_PRIMES;
  const demoKey = `demo-${bitLength}` as keyof typeof PRESET_PRIMES;

  if (usePreset && (PRESET_PRIMES[presetKey] || PRESET_PRIMES[demoKey])) {
    const preset = PRESET_PRIMES[presetKey] || PRESET_PRIMES[demoKey];
    p = preset.p;
    g = preset.g;
  } else {
    if (bitLength <= 32) {
      p = generateLargePrime(bitLength);
      g = timPTSinh(p);
    } else {
      const safePrime = generateSafePrime(bitLength);
      p = safePrime.p;
      g = timPTSinh(p);
    }
  }

  // Khóa bí mật x trong khoảng [2, p - 2]
  const x = randomBigInt(2n, p - 2n);

  // Khóa công khai y = g^x mod p
  const y = binaryPower(g, x, p);

  const keyPairId = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const duration = performance.now() - startTime;

  // Ghi nhật ký thuật toán chi tiết từng bước
  cryptoLogger.addLog({
    category: 'keygen',
    title: `Sinh cặp khóa ElGamal (${bitLength}-bit)`,
    description: `Sinh khóa cho "${name}" với modulo số nguyên tố ${bitLength} bit`,
    actor: name,
    bitLength,
    durationMs: duration,
    steps: [
      {
        stepNumber: 1,
        name: 'Chọn số nguyên tố an toàn p',
        description: `Sinh số nguyên tố p = ${p.toString().substring(0, 30)}... kiểm tra qua thuật toán Miller-Rabin (check).`,
        formula: 'p \\in \\mathbb{P}',
        variables: { p: p.toString(), bitLength: bitLength.toString() },
        status: 'success',
      },
      {
        stepNumber: 2,
        name: 'Tìm phần tử sinh g (Generator)',
        description: `Tính toán phần tử sinh g trong nhóm nhân Z_p* thoả mãn điều kiện bậc với mọi ước của p-1.`,
        formula: 'g^{(p-1)/q} \\not\\equiv 1 \\pmod p',
        variables: { g: g.toString(), p: p.toString() },
        status: 'success',
      },
      {
        stepNumber: 3,
        name: 'Sinh khóa bí mật x (Private Key)',
        description: 'Chọn số ngẫu nhiên bí mật x trong khoảng [2, p-2].',
        formula: 'x \\in_R [2, p-2]',
        variables: { x: x.toString() },
        status: 'success',
      },
      {
        stepNumber: 4,
        name: 'Tính khóa công khai y (Public Key)',
        description: 'Tính lũy thừa nhị phân modulo y = g^x mod p.',
        formula: 'y = g^x \\pmod p',
        variables: { g: g.toString(), x: x.toString(), y: y.toString(), p: p.toString() },
        status: 'success',
      },
    ],
    rawSummary: {
      p: p.toString(),
      g: g.toString(),
      y: y.toString(),
      x: x.toString(),
    },
  });

  return {
    id: keyPairId,
    name,
    bitLength,
    createdAt: new Date().toISOString(),
    publicKey: {
      p: p.toString(),
      g: g.toString(),
      y: y.toString(),
      bitLength,
    },
    privateKey: {
      x: x.toString(),
    },
  };
}

export const elgamal_generate_keys = generateElGamalKeyPair;

/**
 * 2. THUẬT TOÁN KÝ SỐ ELGAMAL (elgamal_sign)
 * - Băm văn bản: m = H(M) mod (p-1)
 * - Chọn ngẫu nhiên k trong [2, p-2] sao cho gcd(k, p-1) = 1
 * - Tính r = g^k mod p
 * - Tính k^-1 mod (p-1) bằng Euclid mở rộng
 * - Tính s = k^-1 * (m - x*r) mod (p-1)
 */
export function signElGamal(
  documentHashHex: string,
  publicKey: ElGamalPublicKey,
  privateKey: ElGamalPrivateKey,
  customK?: bigint
): SigningResult {
  const startTime = performance.now();
  const p = BigInt(publicKey.p);
  const g = BigInt(publicKey.g);
  const x = BigInt(privateKey.x);
  const pMinus1 = p - 1n;

  // 1. Chuyển đổi mã băm thành số nguyên lớn m mod (p-1)
  const m = hashToBigIntMod(documentHashHex, pMinus1);

  const logs: MathStepLog[] = [];
  logs.push({
    step: 1,
    title: 'Băm thông điệp & Chuyển đổi Modulo',
    description: 'Chuyển đổi mã băm SHA-256 của văn bản thành số nguyên lớn m trong trường modulo (p-1).',
    formula: 'm = H(M) \\pmod{p-1}',
    variables: {
      'Hash (SHA-256)': documentHashHex,
      'm (BigInt)': m.toString(),
      'p - 1': pMinus1.toString(),
    },
  });

  // 2. Chọn số ngẫu nhiên bí mật k thoả mãn gcd(k, p-1) = 1
  let k: bigint;
  if (customK !== undefined) {
    if (customK < 2n || customK > p - 2n) {
      throw new Error(`Số k phải nằm trong khoảng [2, p-2]`);
    }
    if (gcd(customK, pMinus1) !== 1n) {
      throw new Error(`Số k không nguyên tố cùng nhau với p-1 (gcd(k, p-1) != 1)`);
    }
    k = customK;
  } else {
    do {
      k = randomBigInt(2n, p - 2n);
    } while (gcd(k, pMinus1) !== 1n);
  }

  logs.push({
    step: 2,
    title: 'Sinh số ngẫu nhiên bí mật k',
    description: 'Chọn số ngẫu nhiên k sao cho nguyên tố cùng nhau với (p-1), tức là gcd(k, p-1) = 1.',
    formula: 'k \\in_R [2, p-2], \\quad \\gcd(k, p-1) = 1',
    variables: {
      k: k.toString(),
      'gcd(k, p-1)': gcd(k, pMinus1).toString(),
    },
    note: 'CHÚ Ý: Không bao giờ được tái sử dụng số k cho 2 văn bản khác nhau để tránh lộ khoá bí mật x.',
  });

  // 3. Tính r = g^k mod p
  const r = binaryPower(g, k, p);

  logs.push({
    step: 3,
    title: 'Tính thành phần chữ ký thứ nhất: r',
    description: 'Thực hiện lũy thừa modulo: r = g^k mod p.',
    formula: 'r = g^k \\pmod p',
    variables: {
      g: g.toString(),
      k: k.toString(),
      p: p.toString(),
      'r (Kết quả)': r.toString(),
    },
  });

  // 4. Tính k^-1 mod (p-1)
  const kInverse = modInverse(k, pMinus1);

  logs.push({
    step: 4,
    title: 'Tính nghịch đảo Modulo k⁻¹ mod (p-1)',
    description: 'Sử dụng giải thuật Euclid mở rộng (extended_gcd) để tìm số nghịch đảo k⁻¹ mod (p-1).',
    formula: 'k \\cdot k^{-1} \\equiv 1 \\pmod{p-1}',
    variables: {
      k: k.toString(),
      'k⁻¹': kInverse.toString(),
      'Kiểm tra (k * k⁻¹ mod p-1)': ((k * kInverse) % pMinus1).toString(),
    },
  });

  // 5. Tính s = k^-1 * (m - x*r) mod (p-1)
  const xr = (x * r) % pMinus1;
  let diff = (m - xr) % pMinus1;
  if (diff < 0n) {
    diff += pMinus1;
  }
  const s = (kInverse * diff) % pMinus1;

  if (s === 0n) {
    // Nếu s == 0 thì chọn lại k khác
    return signElGamal(documentHashHex, publicKey, privateKey);
  }

  logs.push({
    step: 5,
    title: 'Tính thành phần chữ ký thứ hai: s',
    description: 'Kết hợp khóa bí mật x, thành phần r, nghịch đảo k⁻¹ và giá trị băm m.',
    formula: 's = k^{-1} \\cdot (m - x \\cdot r) \\pmod{p-1}',
    variables: {
      'x (Private Key)': x.toString(),
      'x * r mod (p-1)': xr.toString(),
      'm - x*r mod (p-1)': diff.toString(),
      's (Kết quả)': s.toString(),
    },
  });

  logs.push({
    step: 6,
    title: 'Đóng gói Cặp Chữ Ký Số (r, s)',
    description: 'Chữ ký số ElGamal hoàn chỉnh cho văn bản là bộ đôi (r, s).',
    formula: '\\text{Signature} = (r, s)',
    variables: {
      r: r.toString(),
      s: s.toString(),
      Thuật_toán: 'ElGamal-SHA256',
    },
  });

  const signature: ElGamalSignature = {
    r: r.toString(),
    s: s.toString(),
    algorithm: `ElGamal-SHA256-${publicKey.bitLength || 1024}`,
    documentHash: documentHashHex,
    timestamp: Date.now(),
  };

  const duration = performance.now() - startTime;

  // Ghi nhật ký thực thi ký số vào cryptoLogger
  cryptoLogger.addLog({
    category: 'sign',
    title: `Ký số văn bản điện tử (ElGamal-${publicKey.bitLength || 1024})`,
    description: `Tạo chữ ký số (r, s) cho thông điệp có hash SHA-256: ${documentHashHex.substring(0, 16)}...`,
    actor: 'Người ký',
    bitLength: publicKey.bitLength,
    durationMs: duration,
    steps: logs.map((l) => ({
      stepNumber: l.step,
      name: l.title,
      description: l.description,
      formula: l.formula,
      variables: l.variables,
      status: 'success',
    })),
    rawSummary: {
      documentHash: documentHashHex,
      m: m.toString(),
      k: k.toString(),
      kInverse: kInverse.toString(),
      r: r.toString(),
      s: s.toString(),
    },
  });

  return {
    signature,
    logs,
    kUsed: k.toString(),
  };
}

export const elgamal_sign = signElGamal;

/**
 * 3. THUẬT TOÁN XÁC THỰC CHỮ KÝ ELGAMAL (elgamal_verify)
 * - Kiểm tra điều kiện biên: 0 < r < p và 0 < s < p-1
 * - Tính vế trái: v1 = g^m mod p
 * - Tính vế phải: v2 = (y^r * r^s) mod p
 * - Chữ ký hợp lệ nếu và chỉ nếu: v1 ≡ v2 (mod p)
 */
export function verifyElGamal(
  documentHashHex: string,
  signature: ElGamalSignature,
  publicKey: ElGamalPublicKey
): VerificationMathResult {
  const startTime = performance.now();
  const p = BigInt(publicKey.p);
  const g = BigInt(publicKey.g);
  const y = BigInt(publicKey.y);
  const r = BigInt(signature.r);
  const s = BigInt(signature.s);
  const pMinus1 = p - 1n;

  const logs: MathStepLog[] = [];

  // 1. Kiểm tra điều kiện biên
  const boundaryCheck = r > 0n && r < p && s > 0n && s < pMinus1;
  logs.push({
    step: 1,
    title: 'Kiểm tra điều kiện biên của chữ ký',
    description: 'Xác thực xem 0 < r < p và 0 < s < p-1.',
    formula: '0 < r < p \\quad \\text{và} \\quad 0 < s < p-1',
    variables: {
      r: r.toString(),
      s: s.toString(),
      p: p.toString(),
      'Điều kiện biên': boundaryCheck ? 'THOẢ MÃN (PASS)' : 'KHÔNG THOẢ MÃN (FAIL)',
    },
  });

  if (!boundaryCheck) {
    return {
      isValid: false,
      v1: '0',
      v2: '0',
      m: '0',
      p: p.toString(),
      g: g.toString(),
      y: y.toString(),
      r: r.toString(),
      s: s.toString(),
      logs,
    };
  }

  // 2. Chuyển đổi mã băm thành số nguyên m mod (p-1)
  const m = hashToBigIntMod(documentHashHex, pMinus1);
  logs.push({
    step: 2,
    title: 'Băm tài liệu cần kiểm tra & Lấy số nguyên m',
    description: 'Chuyển đổi mã băm của tài liệu cần xác thực thành số nguyên m mod (p-1).',
    formula: 'm = H(M) \\pmod{p-1}',
    variables: {
      'Hash tài liệu': documentHashHex,
      'm (BigInt)': m.toString(),
    },
  });

  // 3. Tính v1 = g^m mod p
  const v1 = binaryPower(g, m, p);
  logs.push({
    step: 3,
    title: 'Tính vế trái kiểm thử: v₁',
    description: 'Tính lũy thừa modulo: v₁ = gᵐ mod p.',
    formula: 'v_1 = g^m \\pmod p',
    variables: {
      g: g.toString(),
      m: m.toString(),
      p: p.toString(),
      'v₁ (Kết quả)': v1.toString(),
    },
  });

  // 4. Tính v2 = (y^r * r^s) mod p
  const yr = binaryPower(y, r, p);
  const rs = binaryPower(r, s, p);
  const v2 = (yr * rs) % p;

  logs.push({
    step: 4,
    title: 'Tính vế phải kiểm thử: v₂',
    description: 'Tính lũy thừa và nhân modulo: v₂ = (yʳ · rˢ) mod p.',
    formula: 'v_2 = (y^r \\cdot r^s) \\pmod p',
    variables: {
      'yʳ mod p': yr.toString(),
      'rˢ mod p': rs.toString(),
      'v₂ (Kết quả)': v2.toString(),
    },
  });

  // 5. So sánh v1 và v2
  const isEqual = v1 === v2;
  logs.push({
    step: 5,
    title: 'Đối chiếu phương trình đồng dư v₁ ≡ v₂ (mod p)',
    description: 'Nếu v₁ = v₂, chữ ký số ElGamal toán học hợp lệ và văn bản toàn vẹn 100%.',
    formula: 'v_1 \\stackrel{?}{\\equiv} v_2 \\pmod p',
    variables: {
      'v₁': v1.toString(),
      'v₂': v2.toString(),
      'Trạng thái': isEqual ? 'HỢP LỆ (VALID - KHỚP TOÁN HỌC)' : 'KHÔNG HỢP LỆ (INVALID)',
    },
    note: isEqual
      ? 'Chứng minh: v₂ = yʳ · rˢ = (gˣ)ʳ · (gᵏ)ˢ = g^(xr + ks) = g^(xr + m - xr) = gᵐ = v₁ (mod p).'
      : 'CẢNH BÁO: Vế trái không khớp vế phải! Văn bản đã bị chỉnh sửa hoặc Public Key không tương thích.',
  });

  const duration = performance.now() - startTime;

  // Ghi nhật ký xác thực vào cryptoLogger
  cryptoLogger.addLog({
    category: 'verify',
    title: `Thẩm định toán học chữ ký số ElGamal`,
    description: `Kiểm tra phương trình đồng dư v1 ≡ v2 (mod p) cho hash ${documentHashHex.substring(0, 16)}... -> ${isEqual ? 'ĐẠT (VALID)' : 'KHÔNG ĐẠT (INVALID)'}`,
    actor: 'Hệ thống thẩm định',
    bitLength: publicKey.bitLength,
    durationMs: duration,
    steps: logs.map((l) => ({
      stepNumber: l.step,
      name: l.title,
      description: l.description,
      formula: l.formula,
      variables: l.variables,
      status: isEqual ? 'success' : 'warning',
    })),
    rawSummary: {
      documentHash: documentHashHex,
      m: m.toString(),
      v1: v1.toString(),
      v2: v2.toString(),
      isEqual: isEqual ? 'true' : 'false',
    },
  });

  return {
    isValid: isEqual,
    v1: v1.toString(),
    v2: v2.toString(),
    m: m.toString(),
    p: p.toString(),
    g: g.toString(),
    y: y.toString(),
    r: r.toString(),
    s: s.toString(),
    logs,
  };
}

export const elgamal_verify = verifyElGamal;

/**
 * 4. THUẬT TOÁN MÃ HÓA ELGAMAL (elgamal_encrypt)
 * Mã hóa từng ký tự thông điệp:
 * - c1 = g^k mod p
 * - c2 = (M * y^k) mod p
 */
export function elgamalEncrypt(
  plaintext: string,
  publicKey: ElGamalPublicKey
): EncryptionResult {
  const startTime = performance.now();
  const p = BigInt(publicKey.p);
  const g = BigInt(publicKey.g);
  const y = BigInt(publicKey.y);

  const ciphertext: [string, string][] = [];
  const logs: MathStepLog[] = [];

  for (let i = 0; i < plaintext.length; i++) {
    const char = plaintext[i];
    const M = BigInt(char.charCodeAt(0));
    if (M >= p) {
      throw new Error(`Ký tự '${char}' (${M}) lớn hơn hoặc bằng p (${p})!`);
    }

    // Sinh khóa tạm thời k ngẫu nhiên trong [2, p-2]
    const k = randomBigInt(2n, p - 2n);
    // c1 = g^k mod p
    const c1 = binaryPower(g, k, p);
    // c2 = (M * y^k) mod p
    const yk = binaryPower(y, k, p);
    const c2 = (M * yk) % p;

    ciphertext.push([c1.toString(), c2.toString()]);

    if (i < 5) {
      logs.push({
        step: i + 1,
        title: `Mã hóa ký tự '${char}' (M = ${M})`,
        description: `Tính c₁ = gᵏ mod p và c₂ = (M · yᵏ) mod p với k = ${k.toString().substring(0, 10)}...`,
        formula: 'c_1 = g^k \\pmod p, \\quad c_2 = (M \\cdot y^k) \\pmod p',
        variables: {
          'Ký tự': char,
          'M (ASCII)': M.toString(),
          c1: c1.toString(),
          c2: c2.toString(),
        },
      });
    }
  }

  const duration = performance.now() - startTime;

  cryptoLogger.addLog({
    category: 'encrypt',
    title: `Mã hóa thông điệp ElGamal ("${plaintext.substring(0, 15)}...")`,
    description: `Mã hóa ${plaintext.length} ký tự thành chuỗi các cặp bản mã (c1, c2)`,
    actor: 'Hệ thống mã hóa',
    bitLength: publicKey.bitLength,
    durationMs: duration,
    steps: logs.map((l) => ({
      stepNumber: l.step,
      name: l.title,
      description: l.description,
      formula: l.formula,
      variables: l.variables,
      status: 'success',
    })),
    rawSummary: {
      plaintextLength: plaintext.length.toString(),
      pairsCount: ciphertext.length.toString(),
    },
  });

  return { ciphertext, logs };
}

export const elgamal_encrypt = elgamalEncrypt;

/**
 * 5. THUẬT TOÁN GIẢI MÃ ELGAMAL (elgamal_decrypt)
 * Giải mã từng cặp (c1, c2):
 * - s = c1^x mod p (Bí mật chia sẻ)
 * - s^-1 = mod_inverse(s, p)
 * - M = (c2 * s^-1) mod p
 */
export function elgamalDecrypt(
  ciphertext: [string, string][],
  publicKey: ElGamalPublicKey,
  privateKey: ElGamalPrivateKey
): DecryptionResult {
  const startTime = performance.now();
  const p = BigInt(publicKey.p);
  const x = BigInt(privateKey.x);

  let plaintext = '';
  const logs: MathStepLog[] = [];

  for (let i = 0; i < ciphertext.length; i++) {
    const [c1Str, c2Str] = ciphertext[i];
    const c1 = BigInt(c1Str);
    const c2 = BigInt(c2Str);

    // Tính bí mật chia sẻ s = c1^x mod p
    const s = binaryPower(c1, x, p);
    // Tính s^-1 mod p
    const sInv = modInverse(s, p);
    // Khôi phục bản rõ M = (c2 * s^-1) mod p
    const M = (c2 * sInv) % p;
    const char = String.fromCharCode(Number(M));
    plaintext += char;

    if (i < 5) {
      logs.push({
        step: i + 1,
        title: `Giải mã cặp (${c1Str.substring(0, 8)}..., ${c2Str.substring(0, 8)}...)`,
        description: `Tính s = c₁ˣ mod p, s⁻¹ mod p và khôi phục M = c₂ · s⁻¹ mod p -> ký tự '${char}'`,
        formula: 's = c_1^x \\pmod p, \\quad M = (c_2 \\cdot s^{-1}) \\pmod p',
        variables: {
          's (Bí mật chia sẻ)': s.toString(),
          's⁻¹': sInv.toString(),
          'M (ASCII)': M.toString(),
          'Ký tự khôi phục': char,
        },
      });
    }
  }

  const duration = performance.now() - startTime;

  cryptoLogger.addLog({
    category: 'decrypt',
    title: `Giải mã thông điệp ElGamal ("${plaintext.substring(0, 15)}...")`,
    description: `Giải mã thành công ${ciphertext.length} khối dữ liệu ra bản rõ`,
    actor: 'Hệ thống giải mã',
    bitLength: publicKey.bitLength,
    durationMs: duration,
    steps: logs.map((l) => ({
      stepNumber: l.step,
      name: l.title,
      description: l.description,
      formula: l.formula,
      variables: l.variables,
      status: 'success',
    })),
    rawSummary: {
      decryptedText: plaintext,
      blocksCount: ciphertext.length.toString(),
    },
  });

  return { plaintext, logs };
}

export const elgamal_decrypt = elgamalDecrypt;

