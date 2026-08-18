/**
 * Attack Simulation & Cryptanalysis Service
 * Demonstrates vulnerabilities (Reused k, Tampering, DLP brute force) for Academic Defense
 */

import { gcd, modInverse, modPow } from '../crypto/bigint-utils';
import { hashString } from '../crypto/hash';
import { signElGamal } from '../crypto/elgamal';
import { ElGamalKeyPair } from '../types';

export interface ReusedKAttackResult {
  success: boolean;
  doc1Text: string;
  doc2Text: string;
  hash1: string;
  hash2: string;
  kOriginal: string;
  r1: string;
  r2: string;
  s1: string;
  s2: string;
  m1: string;
  m2: string;
  deltaM: string;
  deltaS: string;
  recoveredK?: string;
  recoveredPrivateKeyX?: string;
  actualPrivateKeyX: string;
  isKeyMatched: boolean;
  explanationSteps: string[];
}

/**
 * Simulate Reused k Attack on ElGamal Signatures
 */
export async function simulateReusedKAttack(
  keyPair: ElGamalKeyPair,
  doc1Text: string,
  doc2Text: string
): Promise<ReusedKAttackResult> {
  const p = BigInt(keyPair.publicKey.p);
  const g = BigInt(keyPair.publicKey.g);
  const actualX = BigInt(keyPair.privateKey.x);
  const pMinus1 = p - 1n;

  // 1. Pick a fixed secret k with gcd(k, p-1) = 1
  let fixedK = 65537n;
  if (fixedK >= p - 2n) fixedK = 3n;
  while (gcd(fixedK, pMinus1) !== 1n) {
    fixedK += 2n;
  }

  // 2. Hash both documents
  const hash1 = await hashString(doc1Text);
  const hash2 = await hashString(doc2Text);

  // 3. Sign both documents using the SAME k
  const signResult1 = signElGamal(hash1, keyPair.publicKey, keyPair.privateKey, fixedK);
  const signResult2 = signElGamal(hash2, keyPair.publicKey, keyPair.privateKey, fixedK);

  const r1 = BigInt(signResult1.signature.r);
  const r2 = BigInt(signResult2.signature.r);
  const s1 = BigInt(signResult1.signature.s);
  const s2 = BigInt(signResult2.signature.s);

  // Calculate m1 and m2
  const m1 = BigInt('0x' + hash1) % pMinus1 || 1n;
  const m2 = BigInt('0x' + hash2) % pMinus1 || 1n;

  let deltaM = (m1 - m2) % pMinus1;
  if (deltaM < 0n) deltaM += pMinus1;

  let deltaS = (s1 - s2) % pMinus1;
  if (deltaS < 0n) deltaS += pMinus1;

  const explanationSteps: string[] = [];
  explanationSteps.push(`1. Kẻ tấn công quan sát thấy 2 chữ ký có cùng giá trị r: $r_1 = r_2 = ${r1.toString().slice(0, 16)}...$`);
  explanationSteps.push(`2. Do $r = g^k \\pmod p$, kẻ tấn công biết ngay người ký đã phạm sai lầm nghiêm trọng: DÙNG LẠI SỐ $k$!`);
  explanationSteps.push(`3. Thiết lập hệ phương trình:`);
  explanationSteps.push(`   • $s_1 \\equiv k^{-1}(m_1 - x \\cdot r) \\pmod{p-1}$`);
  explanationSteps.push(`   • $s_2 \\equiv k^{-1}(m_2 - x \\cdot r) \\pmod{p-1}$`);
  explanationSteps.push(`4. Trừ hai phương trình: $s_1 - s_2 \\equiv k^{-1}(m_1 - m_2) \\pmod{p-1}$`);

  let recoveredK: bigint | undefined;
  let recoveredX: bigint | undefined;
  let success = false;
  let isKeyMatched = false;

  try {
    const gcdDeltaS = gcd(deltaS, pMinus1);
    if (gcdDeltaS === 1n) {
      const deltaSInv = modInverse(deltaS, pMinus1);
      recoveredK = (deltaM * deltaSInv) % pMinus1;
      explanationSteps.push(`5. Tính được số ngẫu nhiên bí mật $k$: $k \\equiv (m_1 - m_2) \\cdot (s_1 - s_2)^{-1} \\pmod{p-1} = ${recoveredK.toString()}$`);

      // Now compute x: s1 = k^-1 * (m1 - x*r) => x * r = m1 - k*s1
      const gcdR = gcd(r1, pMinus1);
      if (gcdR === 1n) {
        const rInv = modInverse(r1, pMinus1);
        let term = (m1 - recoveredK * s1) % pMinus1;
        if (term < 0n) term += pMinus1;
        recoveredX = (rInv * term) % pMinus1;

        explanationSteps.push(`6. Khôi phục hoàn toàn khoá bí mật $x$: $x \\equiv r^{-1} \\cdot (m_1 - k \\cdot s_1) \\pmod{p-1} = ${recoveredX.toString()}$`);
        
        isKeyMatched = (recoveredX === actualX);
        success = true;
        explanationSteps.push(`7. KẾT LUẬN: Tấn công thành công 100%! Khoá bí mật $x$ bị bẻ gãy mà không cần giải bài toán Logarithm rời rạc!`);
      } else {
        explanationSteps.push(`5. Lưu ý: $\\gcd(r, p-1) = ${gcdR}$, cần giải phương trình đồng dư bậc nhất.`);
      }
    } else {
      explanationSteps.push(`5. $\\gcd(s_1 - s_2, p-1) = ${gcdDeltaS} \\neq 1$. Cần kiểm tra $d = ${gcdDeltaS}$ nghiệm.`);
    }
  } catch (err: any) {
    explanationSteps.push(`Lỗi tính toán: ${err.message}`);
  }

  return {
    success,
    doc1Text,
    doc2Text,
    hash1,
    hash2,
    kOriginal: fixedK.toString(),
    r1: r1.toString(),
    r2: r2.toString(),
    s1: s1.toString(),
    s2: s2.toString(),
    m1: m1.toString(),
    m2: m2.toString(),
    deltaM: deltaM.toString(),
    deltaS: deltaS.toString(),
    recoveredK: recoveredK?.toString(),
    recoveredPrivateKeyX: recoveredX?.toString(),
    actualPrivateKeyX: actualX.toString(),
    isKeyMatched,
    explanationSteps,
  };
}

/**
 * DLP Complexity Comparison Table Data
 */
export const DLP_COMPLEXITY_DATA = [
  {
    bitLength: 16,
    modulusSize: '16-bit (p ≈ 65,537)',
    bruteForceTime: '< 0.001 giây',
    babyStepGiantStep: '< 0.001 giây (256 phép tính)',
    pollardRho: '< 0.001 giây',
    indexCalculus: '< 0.001 giây',
    securityStatus: 'Bị bẻ gãy tức thì (Chỉ dùng học tập)',
    badgeColor: 'crimson',
  },
  {
    bitLength: 64,
    modulusSize: '64-bit (p ≈ 1.8 × 10¹⁹)',
    bruteForceTime: '~ 580 năm',
    babyStepGiantStep: '~ 4 giây (2³² phép tính)',
    pollardRho: '~ 4 giây',
    indexCalculus: '< 1 giây',
    securityStatus: 'Không an toàn trên máy tính cá nhân',
    badgeColor: 'crimson',
  },
  {
    bitLength: 512,
    modulusSize: '512-bit (p ≈ 1.3 × 10¹⁵⁴)',
    bruteForceTime: '> 10¹³⁵ năm',
    babyStepGiantStep: '> 10⁶³ năm',
    pollardRho: '> 10⁶³ năm',
    indexCalculus: '~ Vài giờ (Cụm máy chủ)',
    securityStatus: 'Đã lỗi thời (Không khuyến nghị)',
    badgeColor: 'amber',
  },
  {
    bitLength: 1024,
    modulusSize: '1024-bit (p ≈ 1.8 × 10³⁰⁸)',
    bruteForceTime: '> 10²⁹⁰ năm',
    babyStepGiantStep: '> 10¹⁴⁰ năm',
    pollardRho: '> 10¹⁴⁰ năm',
    indexCalculus: '~ Vài năm (Siêu máy tính quốc gia)',
    securityStatus: 'Mức an toàn tiêu chuẩn đồ án/BTL',
    badgeColor: 'blue',
  },
  {
    bitLength: 2048,
    modulusSize: '2048-bit (p ≈ 3.2 × 10⁶¹⁶)',
    bruteForceTime: 'Vượt quá tuổi vũ trụ',
    babyStepGiantStep: 'Vượt quá tuổi vũ trụ',
    pollardRho: 'Vượt quá tuổi vũ trụ',
    indexCalculus: '> 10¹⁵ năm (An toàn tuyệt đối hiện nay)',
    securityStatus: 'Chuẩn thương mại quốc tế (NIST Recommended)',
    badgeColor: 'emerald',
  },
];
