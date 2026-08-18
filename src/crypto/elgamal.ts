/**
 * ElGamal Digital Signature Scheme Engine
 * Standard implementation with Step-by-Step Math Tracer
 */

import {
  modPow,
  gcd,
  modInverse,
  randomBigInt,
  generateSafePrime,
  findPrimitiveRoot,
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

/**
 * Generate a new ElGamal Key Pair
 * @param bitLength 16, 32, 64, 128, 256, 512, 1024, or 2048
 * @param name Custom key pair name
 * @param usePreset If true, uses precomputed standard safe primes for instant response
 */
export function generateElGamalKeyPair(
  bitLength: 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 = 1024,
  name = 'ElGamal Key',
  usePreset = true
): ElGamalKeyPair {
  let p: bigint;
  let g: bigint;

  const presetKey = `safe-${bitLength}` as keyof typeof PRESET_PRIMES;
  const demoKey = `demo-${bitLength}` as keyof typeof PRESET_PRIMES;

  if (usePreset && (PRESET_PRIMES[presetKey] || PRESET_PRIMES[demoKey])) {
    const preset = PRESET_PRIMES[presetKey] || PRESET_PRIMES[demoKey];
    p = preset.p;
    g = preset.g;
  } else {
    // Dynamically generate for <= 256 bits
    const safePrime = generateSafePrime(bitLength);
    p = safePrime.p;
    g = findPrimitiveRoot(p, safePrime.q);
  }

  // Private key x in [2, p - 2]
  const x = randomBigInt(2n, p - 2n);

  // Public key y = g^x mod p
  const y = modPow(g, x, p);

  const keyPairId = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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

/**
 * Sign a document hash using ElGamal Digital Signature Scheme
 */
export function signElGamal(
  documentHashHex: string,
  publicKey: ElGamalPublicKey,
  privateKey: ElGamalPrivateKey,
  customK?: bigint
): SigningResult {
  const p = BigInt(publicKey.p);
  const g = BigInt(publicKey.g);
  const x = BigInt(privateKey.x);
  const pMinus1 = p - 1n;

  // 1. Map document hash to BigInt m mod (p - 1)
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

  // 2. Choose random secret k such that gcd(k, p - 1) = 1
  let k: bigint;
  if (customK !== undefined) {
    if (customK < 2n || customK > p - 2n) {
      throw new Error(`Custom k must be in range [2, p-2]`);
    }
    if (gcd(customK, pMinus1) !== 1n) {
      throw new Error(`Custom k is not coprime with p-1 (gcd(k, p-1) != 1)`);
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

  // 3. Compute r = g^k mod p
  const r = modPow(g, k, p);

  logs.push({
    step: 3,
    title: 'Tính thành phần chữ ký thứ nhất: r',
    description: 'Thực hiện luỹ thừa modulo g mũ k mod p.',
    formula: 'r = g^k \\pmod p',
    variables: {
      g: g.toString(),
      k: k.toString(),
      p: p.toString(),
      'r (Kết quả)': r.toString(),
    },
  });

  // 4. Compute k^-1 mod (p - 1)
  const kInverse = modInverse(k, pMinus1);

  logs.push({
    step: 4,
    title: 'Tính nghịch đảo Modulo k⁻¹ mod (p-1)',
    description: 'Sử dụng giải thuật Euclid mở rộng để tìm số nghịch đảo của k trong vành Z_(p-1).',
    formula: 'k \\cdot k^{-1} \\equiv 1 \\pmod{p-1}',
    variables: {
      k: k.toString(),
      'k⁻¹': kInverse.toString(),
      'Kiểm tra (k * k⁻¹ mod p-1)': ((k * kInverse) % pMinus1).toString(),
    },
  });

  // 5. Compute s = k^-1 * (m - x*r) mod (p - 1)
  const xr = (x * r) % pMinus1;
  let diff = (m - xr) % pMinus1;
  if (diff < 0n) {
    diff += pMinus1;
  }
  const s = (kInverse * diff) % pMinus1;

  if (s === 0n) {
    // If s == 0, choose another k
    return signElGamal(documentHashHex, publicKey, privateKey);
  }

  logs.push({
    step: 5,
    title: 'Tính thành phần chữ ký thứ hai: s',
    description: 'Kết hợp khoá bí mật x, thành phần r, nghịch đảo k⁻¹ và giá trị băm m.',
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

  return {
    signature,
    logs,
    kUsed: k.toString(),
  };
}

/**
 * Verify an ElGamal Digital Signature
 */
export function verifyElGamal(
  documentHashHex: string,
  signature: ElGamalSignature,
  publicKey: ElGamalPublicKey
): VerificationMathResult {
  const p = BigInt(publicKey.p);
  const g = BigInt(publicKey.g);
  const y = BigInt(publicKey.y);
  const r = BigInt(signature.r);
  const s = BigInt(signature.s);
  const pMinus1 = p - 1n;

  const logs: MathStepLog[] = [];

  // 1. Boundary condition check: 0 < r < p and 0 < s < p-1
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

  // 2. Map document hash to m mod (p-1)
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

  // 3. Compute v1 = g^m mod p
  const v1 = modPow(g, m, p);
  logs.push({
    step: 3,
    title: 'Tính vế trái kiểm thử: v₁',
    description: 'Tính luỹ thừa modulo: v₁ = gᵐ mod p.',
    formula: 'v_1 = g^m \\pmod p',
    variables: {
      g: g.toString(),
      m: m.toString(),
      p: p.toString(),
      'v₁ (Kết quả)': v1.toString(),
    },
  });

  // 4. Compute v2 = (y^r * r^s) mod p
  const yr = modPow(y, r, p);
  const rs = modPow(r, s, p);
  const v2 = (yr * rs) % p;

  logs.push({
    step: 4,
    title: 'Tính vế phải kiểm thử: v₂',
    description: 'Tính luỹ thừa và nhân: v₂ = (yʳ · rˢ) mod p.',
    formula: 'v_2 = (y^r \\cdot r^s) \\pmod p',
    variables: {
      'yʳ mod p': yr.toString(),
      'rˢ mod p': rs.toString(),
      'v₂ (Kết quả)': v2.toString(),
    },
  });

  // 5. Compare v1 and v2
  const isEqual = v1 === v2;
  logs.push({
    step: 5,
    title: 'Đối chiếu phương trình đồng dư v₁ ≡ v₂ (mod p)',
    description: 'Nếu v₁ = v₂, chữ ký số ElGamal toán học hợp lệ và văn bản toàn vẹn.',
    formula: 'v_1 \\stackrel{?}{\\equiv} v_2 \\pmod p',
    variables: {
      'v₁': v1.toString(),
      'v₂': v2.toString(),
      'Trạng thái': isEqual ? 'HỢP LỆ (VALID - CHỮ KÝ ĐÚNG)' : 'VÔ HIỆU (INVALID - CHỮ KÝ SAI HOẶC BỊ SỬA ĐỔI)',
    },
    note: isEqual
      ? 'Toán học chứng minh: v₂ = yʳ · rˢ = (gˣ)ʳ · (gᵏ)ˢ = g^(xr + ks) = g^(xr + m - xr) = gᵐ = v₁ (mod p).'
      : 'CẢNH BÁO: Vế trái không khớp vế phải! Văn bản đã bị chỉnh sửa hoặc Public Key không tương thích với chữ ký.',
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
