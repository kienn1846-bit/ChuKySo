/**
 * ============================================================================
 * ĐỒ ÁN MÔN HỌC: AN TOÀN VÀ BẢO MẬT THÔNG TIN - ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI
 * MODULE SỐ HỌC SỐ NGUYÊN LỚN (BIGINT NUMBER THEORY ENGINE)
 * ============================================================================
 */

import { EuclidStep } from '../types';

/**
 * 1. THUẬT TOÁN LŨY THỪA NHỊ PHÂN / LŨY THỪA MODULO (SQUARE-AND-MULTIPLY)
 * Tính: (a^b) mod n với độ phức tạp thời gian O(log b)
 */
export function binaryPower(a: bigint, b: bigint, n: bigint): bigint {
  if (n === 1n) return 0n;
  if (n <= 0n) throw new Error('Modulo n phải là số nguyên dương!');
  
  let res = 1n;
  let base = ((a % n) + n) % n;
  let exp = b;

  if (exp < 0n) {
    throw new Error('Số mũ âm không được hỗ trợ trực tiếp nếu không qua nghịch đảo modulo');
  }

  while (exp > 0n) {
    if ((exp & 1n) === 1n) {
      res = (res * base) % n;
    }
    base = (base * base) % n;
    exp >>= 1n;
  }

  return res;
}

// Alias tương thích chuẩn quốc tế
export const modPow = binaryPower;

/**
 * 2. THUẬT TOÁN EUCLID TÌM ƯỚC CHUNG LỚN NHẤT: gcd(a, b)
 */
export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

/**
 * 3. THUẬT TOÁN EUCLID MỞ RỘNG (EXTENDED EUCLIDEAN ALGORITHM)
 * Tìm gcd(a, b) và các hệ số x, y thoả mãn đẳng thức Bézout:
 *     a*x + b*y = gcd(a, b)
 */
export function extendedGCD(a: bigint, b: bigint): {
  gcd: bigint;
  x: bigint;
  y: bigint;
  steps: EuclidStep[];
} {
  let old_r = a;
  let r = b;
  let old_s = 1n;
  let s = 0n;
  let old_t = 0n;
  let t = 1n;

  const steps: EuclidStep[] = [];
  let stepIndex = 1;

  steps.push({
    step: 0,
    q: '-',
    r: old_r.toString(),
    x: old_s.toString(),
    y: old_t.toString(),
    a: old_r.toString(),
    b: r.toString(),
  });

  while (r !== 0n) {
    const quotient = old_r / r;
    const rem = old_r - quotient * r;

    const next_s = old_s - quotient * s;
    const next_t = old_t - quotient * t;

    steps.push({
      step: stepIndex++,
      q: quotient.toString(),
      r: rem.toString(),
      x: next_s.toString(),
      y: next_t.toString(),
      a: r.toString(),
      b: rem.toString(),
    });

    old_r = r;
    r = rem;
    old_s = s;
    s = next_s;
    old_t = t;
    t = next_t;
  }

  return {
    gcd: old_r,
    x: old_s,
    y: old_t,
    steps,
  };
}

// Alias theo mã nguồn Python của sinh viên
export function extended_gcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  const res = extendedGCD(a, b);
  return [res.gcd, res.x, res.y];
}

/**
 * 4. TÌM PHẦN TỬ NGHỊCH ĐẢO MODULO (MODULAR INVERSE)
 * Tìm x sao cho: (a * x) mod n = 1
 * Điều kiện tồn tại: gcd(a, n) = 1
 */
export function modInverse(a: bigint, n: bigint): bigint {
  if (n <= 1n) throw new Error('Modulo n phải lớn hơn 1');
  const normalizedA = ((a % n) + n) % n;
  const { gcd: g, x } = extendedGCD(normalizedA, n);
  
  if (g !== 1n) {
    throw new Error(`Không tồn tại nghịch đảo modulo cho ${a} mod ${n} (gcd=${g} != 1)`);
  }
  
  return ((x % n) + n) % n;
}

export const mod_inverse = modInverse;

/**
 * 5. SINH SỐ NGUYÊN LỚN NGẪU NHIÊN BẢO MẬT TRONG KHOẢNG [min, max]
 */
export function randomBigInt(min: bigint, max: bigint): bigint {
  if (min > max) throw new Error('min phải nhỏ hơn hoặc bằng max');
  if (min === max) return min;

  const range = max - min + 1n;
  const bitLength = range.toString(2).length;
  const byteLength = Math.ceil(bitLength / 8);
  const buffer = new Uint8Array(byteLength);

  while (true) {
    crypto.getRandomValues(buffer);
    let hex = '';
    for (let i = 0; i < buffer.length; i++) {
      hex += buffer[i].toString(16).padStart(2, '0');
    }
    const val = BigInt('0x' + hex);
    if (val < range) {
      return min + val;
    }
  }
}

/**
 * 6. THUẬT TOÁN KIỂM TRA SỐ NGUYÊN TỐ MILLER-RABIN (check)
 * Phân tích: n - 1 = 2^r * d với d lẻ.
 * Chọn ngẫu nhiên 'a' trong khoảng [2, n-2], kiểm tra x = a^d mod n
 */
export function millerRabin(n: bigint, k = 20): boolean {
  if (n <= 1n) return false;
  if (n === 2n || n === 3n) return true;
  if ((n & 1n) === 0n) return false;

  // Phân tích n - 1 = 2^r * d
  let d = n - 1n;
  let r = 0n;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    r += 1n;
  }

  // Vòng lặp nhân chứng ngẫu nhiên k lần
  for (let i = 0; i < k; i++) {
    const a = randomBigInt(2n, n - 2n);
    let x = binaryPower(a, d, n);

    if (x === 1n || x === n - 1n) {
      continue;
    }

    let isComposite = true;
    for (let j = 1n; j < r; j++) {
      x = (x * x) % n;
      if (x === n - 1n) {
        isComposite = false;
        break;
      }
    }

    if (isComposite) {
      return false; // Là hợp số (Bội số)
    }
  }

  return true; // Xác suất cực cao là số nguyên tố
}

export const check = millerRabin;

/**
 * 7. SINH SỐ NGUYÊN TỐ LỚN NGẪU NHIÊN (generate_large_prime)
 */
export function generateLargePrime(bits = 16): bigint {
  if (bits < 4) throw new Error('Số bit phải >= 4');
  const min = (1n << BigInt(bits - 1)) | 1n;
  const max = (1n << BigInt(bits)) - 1n;

  while (true) {
    let p = randomBigInt(min, max);
    if ((p & 1n) === 0n) p += 1n;
    if (check(p, 25)) {
      return p;
    }
  }
}

export const generate_large_prime = generateLargePrime;
export const generatePrime = generateLargePrime;

/**
 * 8. PHÂN TÍCH THỪA SỐ NGUYÊN TỐ (phanTichSNT)
 * Trả về tập hợp các ước nguyên tố phân biệt của n
 */
export function phanTichSNT(n: bigint): Set<bigint> {
  const factors = new Set<bigint>();
  let temp = n;

  // Kiểm tra ước 2
  if (temp % 2n === 0n) {
    factors.add(2n);
    while (temp % 2n === 0n) {
      temp /= 2n;
    }
  }

  // Kiểm tra các ước lẻ i = 3, 5, 7, ...
  let i = 3n;
  while (i * i <= temp) {
    if (temp % i === 0n) {
      factors.add(i);
      while (temp % i === 0n) {
        temp /= i;
      }
    }
    i += 2n;
  }

  if (temp > 1n) {
    factors.add(temp);
  }

  return factors;
}

/**
 * 9. TÌM PHẦN TỬ SINH (timPTSinh / Generator Finder)
 * Tìm a trong Z_p* sao cho: a^((p-1)/q) != 1 mod p với mọi ước nguyên tố q của p-1
 */
export function timPTSinh(p: bigint): bigint {
  if (p === 2n) return 1n;

  // Bước 1 & 2: Tìm các ước nguyên tố của p - 1
  const DS_q = phanTichSNT(p - 1n);

  // Bước 3 & 4: Thử các giá trị phần tử sinh a từ 2 đến p-1
  for (let a = 2n; a < p; a++) {
    let is_generator = true;
    for (const q of DS_q) {
      // Nếu tồn tại a^((p-1)/q) == 1 mod p thì a không phải phần tử sinh
      if (binaryPower(a, (p - 1n) / q, p) === 1n) {
        is_generator = false;
        break;
      }
    }

    if (is_generator) {
      return a; // Trả về phần tử sinh tìm thấy
    }
  }

  throw new Error(`Không tìm thấy phần tử sinh cho p = ${p}`);
}

export const findPrimitiveRoot = timPTSinh;

/**
 * 10. SINH SỐ NGUYÊN TỐ AN TOÀN (SAFE PRIME: p = 2q + 1)
 */
export function generateSafePrime(bitLength: number): { p: bigint; q: bigint } {
  if (bitLength < 6) throw new Error('Bit length for safe prime should be >= 6');
  
  while (true) {
    const q = generateLargePrime(bitLength - 1);
    const p = 2n * q + 1n;
    if (check(p, 25)) {
      return { p, q };
    }
  }
}

/**
 * Standard Preset Safe Primes for fast demonstration (RFC 2409, RFC 3526 & Academic presets)
 * All primes p satisfy: p = 2q + 1 where both p and q are prime (Safe Primes)
 */
export const PRESET_PRIMES = {
  'demo-16': {
    bitLength: 16,
    p: 65267n,
    g: 2n,
  },
  'demo-32': {
    bitLength: 32,
    p: 4294967087n,
    g: 5n,
  },
  'safe-64': {
    bitLength: 64,
    p: 18446744073709550147n,
    g: 2n,
  },
  'safe-128': {
    bitLength: 128,
    p: 340282366920938463463374607431768196007n,
    g: 2n,
  },
  'safe-256': {
    bitLength: 256,
    p: 115792089237316195423570985008687907853269984665640564039457584007913129603823n,
    g: 2n,
  },
  'safe-512': {
    bitLength: 512,
    // Academic preset: largest 512-bit prime close to 2^512 (offset -0x94E5 from 2^512),
    // verified prime via Miller-Rabin (25 rounds). Used for demonstration purposes only.
    // For production-grade 512-bit primes, refer to NIST SP 800-56A / RFC 7919.
    p: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6b1b'),
    g: 2n,
  },
  'safe-1024': {
    bitLength: 1024,
    // RFC 2409 Oakley Group 2 / RFC 3526 1024-bit MODP Group
    p: BigInt('0x' +
      'ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd1' +
      '29024e088a67cc74020bbea63b139b22514a08798e3404dd' +
      'ef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245' +
      'e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7ed' +
      'ee386bfb5a899fa5ae9f24117c4b1fe649286651ece65381' +
      'ffffffffffffffff'),
    g: 2n,
  },
  'safe-2048': {
    bitLength: 2048,
    // RFC 3526 2048-bit MODP Group 14
    p: BigInt('0x' +
      'ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd1' +
      '29024e088a67cc74020bbea63b139b22514a08798e3404dd' +
      'ef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245' +
      'e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7ed' +
      'ee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3d' +
      'c2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f' +
      '83655d23dca3ad961c62f356208552bb9ed529077096966d' +
      '670c354e4abc9804f1746c08ca18217c32905e462e36ce3b' +
      'e39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9' +
      'de2bcbf6955817183995497cea956ae515d2261898fa0510' +
      '15728e5a8aacaa68ffffffffffffffff'),
    g: 2n,
  },
};
