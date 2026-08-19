import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  Layers,
  CheckCircle2,
  Cpu,
  AlertCircle,
} from 'lucide-react';
import {
  modPow,
  gcd,
  extendedGCD,
  modInverse,
  millerRabin,
} from '../../crypto/bigint-utils';
import { hashString } from '../../crypto/hash';
import { generateElGamalKeyPair, signElGamal, verifyElGamal } from '../../crypto/elgamal';
import { simulateReusedKAttack, ReusedKAttackResult, DLP_COMPLEXITY_DATA } from '../../services/attack-sim-service';
import { EuclidStep, MathStepLog } from '../../types';
import { MathView } from '../common/MathView';

interface ModPowTraceStep {
  step: number;
  bitIndex: number;
  bitValue: number;
  squareOperation: string;
  multiplyOperation?: string;
  accumResult: string;
}

interface PrimitiveRootFactorStep {
  factor: string;
  exponent: string;
  result: string;
  isPassed: boolean;
}

export const ElGamalLabView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'euclid' | 'modPow' | 'primitiveRoot' | 'stepByStep' | 'proof'>('euclid');

  // ==========================================
  // TAB 1: EUCLID MỞ RỘNG STATE
  // ==========================================
  const [euclidA, setEuclidA] = useState('127');
  const [euclidB, setEuclidB] = useState('466');
  const [euclidSteps, setEuclidSteps] = useState<EuclidStep[]>([]);
  const [euclidResult, setEuclidResult] = useState<{
    gcd: string;
    x: string;
    y: string;
    inverse?: string;
  } | null>(null);

  // ==========================================
  // TAB 2: LŨY THỪA MODULO STATE
  // ==========================================
  const [powBase, setPowBase] = useState('5');
  const [powExp, setPowExp] = useState('127');
  const [powMod, setPowMod] = useState('65267');
  const [powTrace, setPowTrace] = useState<ModPowTraceStep[]>([]);
  const [powBinaryExp, setPowBinaryExp] = useState('');
  const [powResult, setPowResult] = useState<string | null>(null);

  // ==========================================
  // TAB 3: PHẦN TỬ SINH STATE
  // ==========================================
  const [primP, setPrimP] = useState('23');
  const [primG, setPrimG] = useState('5');
  const [primFactors, setPrimFactors] = useState<PrimitiveRootFactorStep[]>([]);
  const [primResult, setPrimResult] = useState<{
    isPrimitive: boolean;
    order: string;
    message: string;
  } | null>(null);

  // ==========================================
  // TAB 4: CHỨNG MINH TOÁN HỌC & CUSTOM PARAMS STATE
  // ==========================================
  const [customP, setCustomP] = useState('23');
  const [customG, setCustomG] = useState('5');
  const [customX, setCustomX] = useState('6');
  const [customK, setCustomK] = useState('7');
  const [customM, setCustomM] = useState('14');
  const [customR, setCustomR] = useState('');
  const [customS, setCustomS] = useState('');

  const [customValidation, setCustomValidation] = useState<{
    isValid: boolean;
    summaryMessage: string;
    checks: { title: string; passed: boolean; message: string; details?: string }[];
    computedValues?: Record<string, string>;
  } | null>(null);

  const [keyPreset, setKeyPreset] = useState<'demo-16' | 'demo-32' | 'safe-64' | 'safe-128' | 'safe-512' | 'safe-1024'>('demo-16');
  const [customText, setCustomText] = useState('Báo cáo Bài tập lớn Mật mã học 2026');
  const [stepLogs, setStepLogs] = useState<MathStepLog[]>([]);
  const [verifyLogs, setVerifyLogs] = useState<MathStepLog[]>([]);

  const [attackDoc1, setAttackDoc1] = useState('Văn bản 1: Quyết định khen thưởng');
  const [attackDoc2, setAttackDoc2] = useState('Văn bản 2: Bổ nhiệm cán bộ');
  const [attackResult, setAttackResult] = useState<ReusedKAttackResult | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);

  // Initial runs
  useEffect(() => {
    runEuclidCalc('127', '466');
    runModPowCalc('5', '127', '65267');
    runPrimitiveRootCalc('23', '5');
    handleValidateCustomParams('23', '5', '6', '7', '14', '', '');
    runStepByStepDemo();
  }, []);

  // ------------------------------------------
  // TAB 1: EUCLID MỞ RỘNG EXECUTION
  // ------------------------------------------
  const runEuclidCalc = (strA = euclidA, strB = euclidB) => {
    try {
      const a = BigInt(strA.trim());
      const b = BigInt(strB.trim());

      const res = extendedGCD(a, b);
      setEuclidSteps(res.steps);

      let invStr: string | undefined;
      if (res.gcd === 1n) {
        let inv = res.x % b;
        if (inv < 0n) inv += b;
        invStr = inv.toString();
      }

      setEuclidResult({
        gcd: res.gcd.toString(),
        x: res.x.toString(),
        y: res.y.toString(),
        inverse: invStr,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------------------------------
  // TAB 2: LŨY THỪA MODULO (SQUARE-AND-MULTIPLY) EXECUTION
  // ------------------------------------------
  const runModPowCalc = (strBase = powBase, strExp = powExp, strMod = powMod) => {
    try {
      const base = BigInt(strBase.trim());
      const exp = BigInt(strExp.trim());
      const n = BigInt(strMod.trim());

      if (n <= 0n) return;

      const bin = exp.toString(2);
      setPowBinaryExp(bin);

      const trace: ModPowTraceStep[] = [];
      let accum = 1n;
      const baseMod = ((base % n) + n) % n;

      for (let i = 0; i < bin.length; i++) {
        const bitVal = Number(bin[i]);
        const prevAccum = accum;

        // Square
        const sqVal = (prevAccum * prevAccum) % n;
        let finalVal = sqVal;
        let multOp: string | undefined;

        if (bitVal === 1) {
          finalVal = (sqVal * baseMod) % n;
          multOp = `(${sqVal} × ${baseMod}) mod ${n} = ${finalVal}`;
        }

        accum = finalVal;

        trace.push({
          step: i + 1,
          bitIndex: bin.length - 1 - i,
          bitValue: bitVal,
          squareOperation: `${prevAccum}² mod ${n} = ${sqVal}`,
          multiplyOperation: multOp,
          accumResult: accum.toString(),
        });
      }

      setPowTrace(trace);
      setPowResult(accum.toString());
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------------------------------
  // TAB 3: PHẦN TỬ SINH EXECUTION
  // ------------------------------------------
  const runPrimitiveRootCalc = (strP = primP, strG = primG) => {
    try {
      const p = BigInt(strP.trim());
      const g = BigInt(strG.trim());

      if (p <= 2n || g <= 1n || g >= p) {
        setPrimResult({
          isPrimitive: false,
          order: 'Không hợp lệ',
          message: 'Lỗi: Điều kiện 1 < g < p và p > 2 không thỏa mãn.',
        });
        setPrimFactors([]);
        return;
      }

      const isPPrime = millerRabin(p, 20);
      if (!isPPrime) {
        setPrimResult({
          isPrimitive: false,
          order: 'Không xác định',
          message: `Lỗi: p = ${p} không phải là số nguyên tố!`,
        });
        setPrimFactors([]);
        return;
      }

      // Factor p - 1
      const pMinus1 = p - 1n;
      const primeFactors: bigint[] = [];
      let temp = pMinus1;

      for (let d = 2n; d * d <= temp; d++) {
        if (temp % d === 0n) {
          primeFactors.push(d);
          while (temp % d === 0n) temp /= d;
        }
      }
      if (temp > 1n) {
        primeFactors.push(temp);
      }

      const factorTrace: PrimitiveRootFactorStep[] = [];
      let isPrimitive = true;

      for (const q of primeFactors) {
        const exponent = pMinus1 / q;
        const res = modPow(g, exponent, p);
        const passed = res !== 1n;

        if (!passed) {
          isPrimitive = false;
        }

        factorTrace.push({
          factor: q.toString(),
          exponent: exponent.toString(),
          result: res.toString(),
          isPassed: passed,
        });
      }

      setPrimFactors(factorTrace);
      setPrimResult({
        isPrimitive,
        order: isPrimitive ? `${pMinus1} (Cấp tối đa = p - 1)` : `< ${pMinus1} (Không đạt cấp tối đa)`,
        message: isPrimitive
          ? `g = ${g} LÀ PHẦN TỬ SINH CỦA Z_${p}* (Tạo ra toàn bộ ${pMinus1} phần tử khác 0)`
          : `g = ${g} KHÔNG PHẢI PHẦN TỬ SINH CỦA Z_${p}* (Do sinh ra nhóm con nhỏ hơn)`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------------------------------
  // TAB 4: CUSTOM PARAMS VALIDATOR
  // ------------------------------------------
  const handleValidateCustomParams = async (
    strP = customP,
    strG = customG,
    strX = customX,
    strK = customK,
    strM = customM,
    strR = customR,
    strS = customS
  ) => {
    const checks: { title: string; passed: boolean; message: string; details?: string }[] = [];
    let allValid = true;

    let p: bigint, g: bigint, x: bigint, k: bigint, m: bigint;

    try { p = BigInt(strP.trim()); } catch { setCustomValidation({ isValid: false, summaryMessage: 'Định dạng P không hợp lệ', checks: [] }); return; }
    try { g = BigInt(strG.trim()); } catch { setCustomValidation({ isValid: false, summaryMessage: 'Định dạng G không hợp lệ', checks: [] }); return; }
    try { x = BigInt(strX.trim()); } catch { setCustomValidation({ isValid: false, summaryMessage: 'Định dạng X không hợp lệ', checks: [] }); return; }
    try { k = BigInt(strK.trim()); } catch { setCustomValidation({ isValid: false, summaryMessage: 'Định dạng K không hợp lệ', checks: [] }); return; }
    try {
      if (/^\d+$/.test(strM.trim())) { m = BigInt(strM.trim()); }
      else { const hashHex = await hashString(strM); m = BigInt('0x' + hashHex) % (p > 1n ? p - 1n : 1n); }
    } catch { m = 1n; }

    // Check 1: p prime
    const isPPrime = millerRabin(p, 20);
    if (!isPPrime) {
      allValid = false;
      checks.push({ title: '1. Kiểm tra tính nguyên tố của p', passed: false, message: `Lý do thất bại: p = ${p} KHÔNG phải là số nguyên tố!`, details: 'ElGamal bắt buộc thực thi trên trường Z_p* với p là số nguyên tố.' });
    } else {
      checks.push({ title: '1. Kiểm tra tính nguyên tố của p', passed: true, message: `p = ${p} là số nguyên tố hợp lệ.` });
    }

    // Check 2: 1 < g < p
    if (g <= 1n || g >= p) {
      allValid = false;
      checks.push({ title: '2. Kiểm tra phần tử sinh g', passed: false, message: `Lý do thất bại: g = ${g} không thỏa mãn 1 < g < p!` });
    } else {
      checks.push({ title: '2. Kiểm tra phần tử sinh g', passed: true, message: `g = ${g} thỏa mãn 1 < g < p.` });
    }

    // Check 3: 1 < x < p - 1
    if (x <= 1n || (p > 2n && x >= p - 1n)) {
      allValid = false;
      checks.push({ title: '3. Kiểm tra khóa bí mật x', passed: false, message: `Lý do thất bại: x = ${x} không thỏa mãn 1 < x < p-1!` });
    } else {
      const y = modPow(g, x, p);
      checks.push({ title: '3. Khóa bí mật x & Khóa công khai y', passed: true, message: `x = ${x} hợp lệ. Tính được y = g^x mod p = ${y}.` });
    }

    // Check 4: gcd(k, p-1) = 1
    const pMinus1 = p > 1n ? p - 1n : 1n;
    if (k <= 1n || k >= pMinus1) {
      allValid = false;
      checks.push({ title: '4. Giới hạn số k', passed: false, message: `Lý do thất bại: k = ${k} nằm ngoài khoảng (1, p-1)!` });
    } else {
      const gVal = gcd(k, pMinus1);
      if (gVal !== 1n) {
        allValid = false;
        checks.push({ title: '4. Điều kiện nguyên tố cùng nhau gcd(k, p-1) = 1', passed: false, message: `Lý do thất bại: gcd(${k}, ${pMinus1}) = ${gVal} ≠ 1!`, details: 'Không tồn tại nghịch đảo k⁻¹ mod (p-1), chữ ký số thất bại!' });
      } else {
        const kInv = modInverse(k, pMinus1);
        checks.push({ title: '4. Điều kiện gcd(k, p-1) = 1', passed: true, message: `gcd(${k}, ${pMinus1}) = 1. k⁻¹ mod (p-1) = ${kInv}.` });
      }
    }

    let computedR = 0n, computedS = 0n, yVal = 0n;
    if (allValid) {
      yVal = modPow(g, x, p);
      computedR = modPow(g, k, p);
      const kInv = modInverse(k, pMinus1);
      let u = (m - x * computedR) % pMinus1;
      if (u < 0n) u += pMinus1;
      computedS = (kInv * u) % pMinus1;

      checks.push({ title: '5. Tính cặp chữ ký số (r, s)', passed: true, message: `r = ${computedR}, s = ${computedS}.` });
    }

    setCustomValidation({
      isValid: allValid,
      summaryMessage: allValid ? 'TRẠNG THÁI: HỢP LỆ (PASS) - Đủ điều kiện toán học ElGamal!' : 'TRẠNG THÁI: KHÔNG HỢP LỆ (FAIL) - Đã phát hiện lỗi bên dưới!',
      checks,
      computedValues: allValid ? { p: p.toString(), g: g.toString(), x: x.toString(), y: yVal.toString(), k: k.toString(), m: m.toString(), r: computedR.toString(), s: computedS.toString() } : undefined,
    });
  };

  const runStepByStepDemo = async () => {
    const bitLen = keyPreset === 'demo-16' ? 16 : keyPreset === 'demo-32' ? 32 : keyPreset === 'safe-64' ? 64 : keyPreset === 'safe-128' ? 128 : keyPreset === 'safe-512' ? 512 : 1024;
    const keyPair = generateElGamalKeyPair(bitLen as any, 'Lab Key', true);
    const docHash = await hashString(customText);
    const signResult = signElGamal(docHash, keyPair.publicKey, keyPair.privateKey);
    const vResult = verifyElGamal(docHash, signResult.signature, keyPair.publicKey);

    setStepLogs(signResult.logs);
    setVerifyLogs(vResult.logs);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Card matching user reference */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '20px 24px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <FlaskConical size={24} color="var(--accent-cyan)" />
            <span>Phòng Lab Toán Học Số Học Modulo (Math Sandbox)</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px', margin: 0 }}>
            Công cụ tính tay, mô phỏng thuật toán Euclid mở rộng, lũy thừa nhị phân và kiểm tra phần tử sinh.
          </p>
        </div>

        {/* Tab switch buttons */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-input)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <button
            className={`btn btn-sm ${activeTab === 'euclid' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('euclid')}
          >
            Euclid Mở Rộng
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'modPow' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('modPow')}
          >
            Lũy Thừa Modulo
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'primitiveRoot' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('primitiveRoot')}
          >
            Phần Tử Sinh
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'stepByStep' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('stepByStep')}
          >
            Minh Họa Từng Bước Ký
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'proof' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('proof')}
          >
            Chứng Minh Toán Học
          </button>
        </div>
      </div>

      {/* TAB 1: EUCLID MỞ RỘNG */}
      {activeTab === 'euclid' && (
        <div className="grid-2" style={{ gap: '20px', gridTemplateColumns: '380px 1fr' }}>
          {/* Left Form */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              TÍNH NGHỊCH ĐẢO MODULO k⁻¹ MOD (p - 1)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
              Thuật toán Euclid mở rộng giải phương trình nghiệm nguyên: <span style={{ color: 'var(--accent-cyan)' }}>a · x + b · y = gcd(a, b)</span>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.84rem' }}>Số a (khóa tạm k):</label>
                <input
                  type="text"
                  className="form-input"
                  value={euclidA}
                  onChange={(e) => setEuclidA(e.target.value)}
                  placeholder="VD: 127"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.84rem' }}>Số b (modulo p - 1):</label>
                <input
                  type="text"
                  className="form-input"
                  value={euclidB}
                  onChange={(e) => setEuclidB(e.target.value)}
                  placeholder="VD: 466"
                />
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '6px', justifyContent: 'center' }}
                onClick={() => runEuclidCalc()}
              >
                Chạy Thuật Toán Euclid Mở Rộng
              </button>
            </div>
          </div>

          {/* Right Matrix Card matching dark style in mockup */}
          <div
            className="card"
            style={{
              background: '#090d16',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5px' }}>
              BẢNG VẾT TỪNG BƯỚC
            </div>

            {euclidResult && (
              <div className="grid-2" style={{ gap: '12px' }}>
                <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>GCD(A, B):</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                    {euclidResult.gcd}
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>HỆ SỐ BÉZOUT (X, Y):</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
                    x = {euclidResult.x}, y = {euclidResult.y}
                  </div>
                </div>
              </div>
            )}

            <div className="table-responsive">
              <table className="table-custom" style={{ fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th>Bước</th>
                    <th>q</th>
                    <th>r</th>
                    <th>x (s)</th>
                    <th>y (t)</th>
                  </tr>
                </thead>
                <tbody>
                  {euclidSteps.map((step) => (
                    <tr key={step.step}>
                      <td><code style={{ color: '#94a3b8' }}>{step.step}</code></td>
                      <td><code>{step.q}</code></td>
                      <td><strong style={{ color: '#38bdf8' }}>{step.r}</strong></td>
                      <td><span style={{ color: '#10b981' }}>{step.x}</span></td>
                      <td><span style={{ color: '#f59e0b' }}>{step.y}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LŨY THỪA MODULO */}
      {activeTab === 'modPow' && (
        <div className="grid-2" style={{ gap: '20px', gridTemplateColumns: '380px 1fr' }}>
          {/* Left Form */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              TÍNH LŨY THỪA MODULO a^b MOD n
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
              Giải thuật Bình phương và Nhân (Square-and-Multiply) tính nhanh lũy thừa modulo với độ phức tạp O(log b).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.84rem' }}>Cơ số a:</label>
                <input
                  type="text"
                  className="form-input"
                  value={powBase}
                  onChange={(e) => setPowBase(e.target.value)}
                  placeholder="VD: 5"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.84rem' }}>Số mũ b:</label>
                <input
                  type="text"
                  className="form-input"
                  value={powExp}
                  onChange={(e) => setPowExp(e.target.value)}
                  placeholder="VD: 127"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.84rem' }}>Modulo n:</label>
                <input
                  type="text"
                  className="form-input"
                  value={powMod}
                  onChange={(e) => setPowMod(e.target.value)}
                  placeholder="VD: 65267"
                />
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '6px', justifyContent: 'center' }}
                onClick={() => runModPowCalc()}
              >
                Tính Lũy Thừa Modulo
              </button>
            </div>
          </div>

          {/* Right Matrix Card */}
          <div
            className="card"
            style={{
              background: '#090d16',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5px' }}>
              BẢNG VẾT BÌNH PHƯƠNG VÀ NHÂN
            </div>

            {powResult && (
              <div className="grid-2" style={{ gap: '12px' }}>
                <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>KẾT QUẢ {powBase}^{powExp} MOD {powMod}:</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                    {powResult}
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>SỐ MŨ BẰNG MÃ NHỊ PHÂN:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    {powBinaryExp}₂
                  </div>
                </div>
              </div>
            )}

            <div className="table-responsive">
              <table className="table-custom" style={{ fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th>Bước</th>
                    <th>Bit nhị phân</th>
                    <th>Phép Bình phương (Square)</th>
                    <th>Phép Nhân (Multiply)</th>
                    <th>Tích lũy d</th>
                  </tr>
                </thead>
                <tbody>
                  {powTrace.map((row) => (
                    <tr key={row.step}>
                      <td><code style={{ color: '#94a3b8' }}>{row.step}</code></td>
                      <td>
                        <span className={`badge ${row.bitValue === 1 ? 'badge-cyan' : 'badge-indigo'}`}>
                          {row.bitValue}
                        </span>
                      </td>
                      <td><code style={{ color: '#38bdf8' }}>{row.squareOperation}</code></td>
                      <td>
                        {row.multiplyOperation ? (
                          <code style={{ color: '#10b981' }}>{row.multiplyOperation}</code>
                        ) : (
                          <span style={{ color: '#64748b' }}>-</span>
                        )}
                      </td>
                      <td><strong style={{ color: '#f59e0b' }}>{row.accumResult}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PHẦN TỬ SINH */}
      {activeTab === 'primitiveRoot' && (
        <div className="grid-2" style={{ gap: '20px', gridTemplateColumns: '380px 1fr' }}>
          {/* Left Form */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              KIỂM TRA PHẦN TỬ SINH g TRONG TRƯỜNG Z_p*
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
              Thẩm định xem g có phải phần tử sinh của nhóm xích Z_p* bằng cách thử mọi ước nguyên tố q của (p-1).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.84rem' }}>Modulo p (Số nguyên tố):</label>
                <input
                  type="text"
                  className="form-input"
                  value={primP}
                  onChange={(e) => setPrimP(e.target.value)}
                  placeholder="VD: 23"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.84rem' }}>Phần tử sinh g (1 &lt; g &lt; p):</label>
                <input
                  type="text"
                  className="form-input"
                  value={primG}
                  onChange={(e) => setPrimG(e.target.value)}
                  placeholder="VD: 5"
                />
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '6px', justifyContent: 'center' }}
                onClick={() => runPrimitiveRootCalc()}
              >
                Kiểm Tra Phần Tử Sinh g
              </button>
            </div>
          </div>

          {/* Right Matrix Card */}
          <div
            className="card"
            style={{
              background: '#090d16',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5px' }}>
              BẢNG CẤP PHẦN TỬ
            </div>

            {primResult && (
              <div className="grid-2" style={{ gap: '12px' }}>
                <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>KẾT QUẢ THẨM ĐỊNH:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: primResult.isPrimitive ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                    {primResult.message}
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>CẤP CỦA PHẦN TỬ (ORDER):</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
                    {primResult.order}
                  </div>
                </div>
              </div>
            )}

            <div className="table-responsive">
              <table className="table-custom" style={{ fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th>Ước nguyên tố q của (p-1)</th>
                    <th>Số mũ e = (p-1)/q</th>
                    <th>Biểu thức g^e mod p</th>
                    <th>Điều kiện (≠ 1 mod p)</th>
                  </tr>
                </thead>
                <tbody>
                  {primFactors.map((row, idx) => (
                    <tr key={idx}>
                      <td><code style={{ color: '#38bdf8' }}>q = {row.factor}</code></td>
                      <td><code>e = {row.exponent}</code></td>
                      <td><strong style={{ color: '#f59e0b' }}>{primG}^{row.exponent} mod {primP} = {row.result}</strong></td>
                      <td>
                        {row.isPassed ? (
                          <span className="badge badge-success">✓ ĐẠT ({row.result} ≠ 1)</span>
                        ) : (
                          <span className="badge badge-danger">✗ KHÔNG ĐẠT ({row.result} = 1)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MINH HỌA TỪNG BƯỚC KÝ */}
      {activeTab === 'stepByStep' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls Bar */}
          <div className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label className="form-label" style={{ margin: 0 }}>Cỡ khóa thử nghiệm:</label>
                <select
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={keyPreset}
                  onChange={(e) => setKeyPreset(e.target.value as any)}
                >
                  <option value="demo-16">16-bit (p = 65,267)</option>
                  <option value="demo-32">32-bit (p ≈ 4.29 × 10⁹)</option>
                  <option value="safe-64">64-bit (p ≈ 1.84 × 10¹⁹)</option>
                  <option value="safe-128">128-bit (p ≈ 3.4 × 10³⁸)</option>
                  <option value="safe-512">512-bit (p ≈ 9.7 × 10¹⁵³)</option>
                  <option value="safe-1024">1024-bit (p ≈ 1.8 × 10³⁰⁸)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '480px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập thông điệp demo..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                />
                <button className="btn btn-primary" onClick={runStepByStepDemo}>
                  <Play size={15} /> Tính toán từng bước
                </button>
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="grid-2" style={{ gap: '20px' }}>
            {/* Signing Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} /> Giai đoạn 1: Quá trình ký số ElGamal
              </h3>

              {stepLogs.map((log) => (
                <div key={log.step} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      Bước {log.step}: {log.title}
                    </strong>
                    <span className="badge badge-cyan">Ký số</span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {log.description}
                  </div>

                  {log.formula && (
                    <div className="math-formula" style={{ fontSize: '0.86rem', padding: '8px 12px' }}>
                      <MathView math={log.formula} display />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '6px' }}>
                    {Object.entries(log.variables).map(([k, v]) => (
                      <div key={k} style={{ wordBreak: 'break-all' }}>
                        <span style={{ color: 'var(--text-dim)' }}>{k}: </span>
                        <code style={{ color: '#38bdf8' }}>{v}</code>
                      </div>
                    ))}
                  </div>

                  {log.note && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--status-warning)', fontStyle: 'italic' }}>
                      {log.note}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Verification Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> Giai đoạn 2: Quá trình xác thực chữ ký ElGamal
              </h3>

              {verifyLogs.map((log) => (
                <div key={log.step} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      Bước {log.step}: {log.title}
                    </strong>
                    <span className="badge badge-success">Xác thực</span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {log.description}
                  </div>

                  {log.formula && (
                    <div className="math-formula" style={{ fontSize: '0.86rem', padding: '8px 12px' }}>
                      <MathView math={log.formula} display />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '6px' }}>
                    {Object.entries(log.variables).map(([k, v]) => (
                      <div key={k} style={{ wordBreak: 'break-all' }}>
                        <span style={{ color: 'var(--text-dim)' }}>{k}: </span>
                        <code style={{ color: '#38bdf8' }}>{v}</code>
                      </div>
                    ))}
                  </div>

                  {log.note && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--status-warning)', fontStyle: 'italic' }}>
                      {log.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CHỨNG MINH TOÁN HỌC & CUSTOM PARAMETER TESTER */}
      {activeTab === 'proof' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Custom Parameter Tester Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <span>Thử nghiệm & Thẩm định Tham số Toán học Tùy chỉnh (Custom Input Validator)</span>
              </h3>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setCustomP('23'); setCustomG('5'); setCustomX('6'); setCustomK('7'); setCustomM('14'); setCustomR(''); setCustomS('');
                    handleValidateCustomParams('23', '5', '6', '7', '14', '', '');
                  }}
                >
                  Mẫu HỢP LỆ (p=23)
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setCustomP('24'); setCustomG('5'); setCustomX('6'); setCustomK('7'); setCustomM('14'); setCustomR(''); setCustomS('');
                    handleValidateCustomParams('24', '5', '6', '7', '14', '', '');
                  }}
                >
                  Thử p hợp số (p=24)
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setCustomP('23'); setCustomG('5'); setCustomX('6'); setCustomK('6'); setCustomM('14'); setCustomR(''); setCustomS('');
                    handleValidateCustomParams('23', '5', '6', '6', '14', '', '');
                  }}
                >
                  Thử gcd(k, p-1) ≠ 1
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div className="grid-3" style={{ gap: '12px' }}>
                <div>
                  <label className="form-label">Modulo p (Số nguyên tố):</label>
                  <input type="text" className="form-input" value={customP} onChange={(e) => setCustomP(e.target.value)} placeholder="23" />
                </div>
                <div>
                  <label className="form-label">Phần tử sinh g (1 &lt; g &lt; p):</label>
                  <input type="text" className="form-input" value={customG} onChange={(e) => setCustomG(e.target.value)} placeholder="5" />
                </div>
                <div>
                  <label className="form-label">Khóa bí mật x (1 &lt; x &lt; p-1):</label>
                  <input type="text" className="form-input" value={customX} onChange={(e) => setCustomX(e.target.value)} placeholder="6" />
                </div>
              </div>

              <div className="grid-3" style={{ gap: '12px' }}>
                <div>
                  <label className="form-label">Số ngẫu nhiên k (gcd(k, p-1)=1):</label>
                  <input type="text" className="form-input" value={customK} onChange={(e) => setCustomK(e.target.value)} placeholder="7" />
                </div>
                <div>
                  <label className="form-label">Thông điệp m (Số/Văn bản):</label>
                  <input type="text" className="form-input" value={customM} onChange={(e) => setCustomM(e.target.value)} placeholder="14" />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleValidateCustomParams()}>
                    <Play size={16} /> Kiểm tra & Thẩm định
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Result Report */}
          {customValidation && (
            <div className="card" style={{ borderLeft: `4px solid ${customValidation.isValid ? 'var(--status-success)' : 'var(--status-danger)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {customValidation.summaryMessage}
                </h3>
                <span className={`badge ${customValidation.isValid ? 'badge-success' : 'badge-danger'}`}>
                  {customValidation.isValid ? 'PASS' : 'FAIL'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {customValidation.checks.map((chk, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '6px', fontSize: '0.84rem' }}>
                    <div style={{ fontWeight: 600, color: chk.passed ? 'var(--status-success)' : 'var(--status-danger)' }}>
                      {chk.passed ? '✓' : '✗'} {chk.title}: {chk.message}
                    </div>
                    {chk.details && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                        {chk.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stepper Timeline Visualizer */}
          <div className="grid-2" style={{ gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} /> Giai đoạn 1: Quá trình ký số ElGamal
              </h3>

              {stepLogs.map((log) => (
                <div key={log.step} className="card" style={{ padding: '14px' }}>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Bước {log.step}: {log.title}</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0' }}>{log.description}</div>
                  {log.formula && <div className="math-formula" style={{ fontSize: '0.84rem', padding: '6px 10px' }}><MathView math={log.formula} display /></div>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> Giai đoạn 2: Quá trình xác thực chữ ký
              </h3>

              {verifyLogs.map((log) => (
                <div key={log.step} className="card" style={{ padding: '14px' }}>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Bước {log.step}: {log.title}</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0' }}>{log.description}</div>
                  {log.formula && <div className="math-formula" style={{ fontSize: '0.84rem', padding: '6px 10px' }}><MathView math={log.formula} display /></div>}
                </div>
              ))}
            </div>
          </div>

          {/* DLP Complexity Table */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
              <Cpu size={18} style={{ display: 'inline', marginRight: '6px' }} />
              Độ phức tạp bài toán Logarithm Rời Rạc (DLP)
            </h3>
            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Cỡ Khoá</th>
                    <th>Modulus (p)</th>
                    <th>Vét Cạn</th>
                    <th>Baby-Step Giant-Step O(√p)</th>
                    <th>Index Calculus (NFS)</th>
                    <th>Đánh Giá An Toàn</th>
                  </tr>
                </thead>
                <tbody>
                  {DLP_COMPLEXITY_DATA.map((row) => (
                    <tr key={row.bitLength}>
                      <td><strong>{row.bitLength}-bit</strong></td>
                      <td><code>{row.modulusSize}</code></td>
                      <td>{row.bruteForceTime}</td>
                      <td>{row.babyStepGiantStep}</td>
                      <td>{row.indexCalculus}</td>
                      <td><span className={`badge badge-${row.badgeColor}`}>{row.securityStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
