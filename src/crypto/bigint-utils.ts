/**
 * BigInt Number Theory & Cryptographic Primitives for ElGamal Cryptosystem
 * Developed for University Capstone / Academic Project
 */

import { EuclidStep } from '../types';

/**
 * Fast Modular Exponentiation: (base^exponent) mod modulus
 * Time Complexity: O(log exponent)
 */
export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus === 1n) return 0n;
  if (modulus <= 0n) throw new Error('Modulus must be positive');
  
  let result = 1n;
  let b = ((base % modulus) + modulus) % modulus;
  let exp = exponent;

  if (exp < 0n) {
    throw new Error('Negative exponent not supported directly in modPow without inverse');
  }

  while (exp > 0n) {
    if ((exp & 1n) === 1n) {
      result = (result * b) % modulus;
    }
    b = (b * b) % modulus;
    exp >>= 1n;
  }

  return result;
}

/**
 * Greatest Common Divisor (Euclidean Algorithm)
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
 * Extended Euclidean Algorithm
 * Returns { gcd, x, y, steps } such that: a*x + b*y = gcd(a, b)
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

/**
 * Modular Inverse: computes x such that (a * x) % m = 1
 * Throws error if gcd(a, m) !== 1 (inverse does not exist)
 */
export function modInverse(a: bigint, m: bigint): bigint {
  if (m <= 1n) throw new Error('Modulus must be > 1');
  const normalizedA = ((a % m) + m) % m;
  const { gcd: g, x } = extendedGCD(normalizedA, m);
  
  if (g !== 1n) {
    throw new Error(`Inverse does not exist for ${a} mod ${m} (gcd=${g} != 1)`);
  }
  
  return ((x % m) + m) % m;
}

/**
 * Cryptographically Secure Random BigInt in range [min, max]
 */
export function randomBigInt(min: bigint, max: bigint): bigint {
  if (min > max) throw new Error('min must be <= max');
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
 * Miller-Rabin Primality Test
 * Probability of false positive is at most (1/4)^rounds
 */
export function millerRabin(n: bigint, rounds = 20): boolean {
  if (n <= 1n) return false;
  if (n <= 3n) return true;
  if ((n & 1n) === 0n) return false;

  // Write n - 1 = 2^s * d with d odd
  let d = n - 1n;
  let s = 0n;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s += 1n;
  }

  // Witness loop
  for (let i = 0; i < rounds; i++) {
    const a = randomBigInt(2n, n - 2n);
    let x = modPow(a, d, n);

    if (x === 1n || x === n - 1n) {
      continue;
    }

    let composite = true;
    for (let r = 1n; r < s; r++) {
      x = (x * x) % n;
      if (x === n - 1n) {
        composite = false;
        break;
      }
    }

    if (composite) {
      return false; // Definitely composite
    }
  }

  return true; // Probably prime
}

/**
 * Generate a random prime number with given bit length
 */
export function generatePrime(bitLength: number, rounds = 25): bigint {
  if (bitLength < 4) throw new Error('Bit length must be at least 4');
  
  const min = (1n << BigInt(bitLength - 1)) | 1n; // Set highest and lowest bit
  const max = (1n << BigInt(bitLength)) - 1n;

  while (true) {
    let candidate = randomBigInt(min, max);
    if ((candidate & 1n) === 0n) {
      candidate += 1n;
    }
    if (millerRabin(candidate, rounds)) {
      return candidate;
    }
  }
}

/**
 * Generate a Safe Prime: p = 2*q + 1, where both p and q are primes.
 * Safe primes are strongly recommended in ElGamal to prevent Pohlig-Hellman attack.
 */
export function generateSafePrime(bitLength: number): { p: bigint; q: bigint } {
  if (bitLength < 6) throw new Error('Bit length for safe prime should be >= 6');
  
  while (true) {
    // Generate prime q of length bitLength - 1
    const q = generatePrime(bitLength - 1, 20);
    const p = 2n * q + 1n;
    if (millerRabin(p, 25)) {
      return { p, q };
    }
  }
}

/**
 * Find a Primitive Root (Generator) alpha in Z_p* for a Safe Prime p = 2q + 1
 * A number g is a primitive root mod p if:
 * 1. g^2 mod p != 1
 * 2. g^q mod p != 1
 */
export function findPrimitiveRoot(p: bigint, q?: bigint): bigint {
  const pMinus1 = p - 1n;
  const primeFactor = q ? q : pMinus1 / 2n;

  for (let g = 2n; g < p - 1n; g++) {
    // Check order conditions
    if (modPow(g, 2n, p) !== 1n && modPow(g, primeFactor, p) !== 1n) {
      return g;
    }
  }
  
  throw new Error('Primitive root not found for given modulus');
}

/**
 * Standard Preset Safe Primes for fast demonstration (RFC 3526 & Academic presets)
 */
export const PRESET_PRIMES = {
  'demo-16': {
    bitLength: 16,
    p: 65539n, // Safe prime: 2 * 32769 + 1 (or 65537 Fermat)
    g: 2n,
  },
  'demo-32': {
    bitLength: 32,
    p: 4294967311n,
    g: 3n,
  },
  'safe-64': {
    bitLength: 64,
    p: 18446744073709551557n,
    g: 2n,
  },
  'safe-128': {
    bitLength: 128,
    p: 340282366920938463463374607431768211297n,
    g: 5n,
  },
  'safe-256': {
    bitLength: 256,
    p: 115792089237316195423570985008687907853269984665640564039457584007913129639747n,
    g: 2n,
  },
  'safe-512': {
    bitLength: 512,
    p: BigInt('0xd67de440cbbbdc1936d693d34afd0ad50c84d239a45f520bb8c0050ddfaf0d3faf40332d7e476fe2a1885b5d15c7e1279a0ebf4cb57e84949214cd70caa2891f'),
    g: 2n,
  },
  'safe-1024': {
    bitLength: 1024,
    p: BigInt('0xeeaf0ab9adb38dd69c33f80aafa8fc5eedf02571dd9c054457b391f2184eb550' +
      '43ce3a10c2e50013bef0e272acca8f0d2ee94943f023acaaaab5151569ec1551' +
      '79132b3f3abf590988905aab35f6dd2070e5eaf02bde43ee7a263f338ec30c2b' +
      'cfa9e399e822920f1a3e7054041935bece3bfecb24d0c9d0044dec5173a9e008'),
    g: 2n,
  },
  'safe-2048': {
    bitLength: 2048,
    p: BigInt('0x' +
      'ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74' +
      '020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f1437' +
      '4fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7ed' +
      'ee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf05' +
      '98da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb' +
      '9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3b' +
      'e39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf695581718' +
      '3995497cea956ae515d2261898fa051015728e5a8aacaa68ffffffffffffffff'),
    g: 2n,
  },
};
