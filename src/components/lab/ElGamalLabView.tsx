import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  Table,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import {
  modPow,
  gcd,
  extendedGCD,
  modInverse,
  PRESET_PRIMES,
} from '../../crypto/bigint-utils';
import { hashString, hashToBigIntMod } from '../../crypto/hash';
import { generateElGamalKeyPair, signElGamal, verifyElGamal } from '../../crypto/elgamal';
import { simulateReusedKAttack, ReusedKAttackResult, DLP_COMPLEXITY_DATA } from '../../services/attack-sim-service';
import { EuclidStep, MathStepLog } from '../../types';
import { MathView, MathText } from '../common/MathView';

export const ElGamalLabView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'stepByStep' | 'euclid' | 'reusedK' | 'dlp'>('stepByStep');

  // Step-by-step state
  const [keyPreset, setKeyPreset] = useState<'demo-16' | 'demo-32' | 'safe-64' | 'safe-128' | 'safe-512' | 'safe-1024'>('demo-16');
  const [customText, setCustomText] = useState('Báo cáo Bài tập lớn Mật mã học 2026');
  const [stepLogs, setStepLogs] = useState<MathStepLog[]>([]);
  const [verifyLogs, setVerifyLogs] = useState<MathStepLog[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);

  // Euclid visualizer state
  const [euclidA, setEuclidA] = useState('17');
  const [euclidM, setEuclidM] = useState('65538');
  const [euclidSteps, setEuclidSteps] = useState<EuclidStep[]>([]);
  const [euclidResult, setEuclidResult] = useState<{ gcd: string; inverse?: string } | null>(null);

  // Attack simulator state
  const [attackDoc1, setAttackDoc1] = useState('Văn bản 1: Quyết định khen thưởng');
  const [attackDoc2, setAttackDoc2] = useState('Văn bản 2: Bổ nhiệm cán bộ');
  const [attackResult, setAttackResult] = useState<ReusedKAttackResult | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);

  // Run initial calculations
  useEffect(() => {
    runStepByStepDemo();
    runEuclidDemo();
  }, [keyPreset]);

  // Step-by-step Demo execution
  const runStepByStepDemo = async () => {
    const bitLen = keyPreset === 'demo-16' ? 16 : keyPreset === 'demo-32' ? 32 : keyPreset === 'safe-64' ? 64 : keyPreset === 'safe-128' ? 128 : keyPreset === 'safe-512' ? 512 : 1024;
    const keyPair = generateElGamalKeyPair(bitLen as any, 'Lab Key', true);
    
    const docHash = await hashString(customText);
    const signResult = signElGamal(docHash, keyPair.publicKey, keyPair.privateKey);
    const vResult = verifyElGamal(docHash, signResult.signature, keyPair.publicKey);

    setStepLogs(signResult.logs);
    setVerifyLogs(vResult.logs);
    setIsCalculated(true);
  };

  // Euclid visualizer execution
  const runEuclidDemo = () => {
    try {
      const a = BigInt(euclidA);
      const m = BigInt(euclidM);
      const { gcd: g, steps, x } = extendedGCD(a, m);
      let inv: string | undefined;
      if (g === 1n) {
        inv = (((x % m) + m) % m).toString();
      }
      setEuclidSteps(steps);
      setEuclidResult({ gcd: g.toString(), inverse: inv });
    } catch {
      // Ignore input parse errors
    }
  };

  // Reused k Attack execution
  const handleRunReusedKAttack = async () => {
    setIsAttacking(true);
    try {
      const demoKeyPair = generateElGamalKeyPair(16, 'Lab Attack Key', true);
      const res = await simulateReusedKAttack(demoKeyPair, attackDoc1, attackDoc2);
      setAttackResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAttacking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FlaskConical size={24} color="var(--accent-cyan)" />
          <span>Phòng Thí Nghiệm Toán Học & Mật Mã ElGamal (Interactive Lab)</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Công cụ trực quan hoá từng bước thuật toán, tính toán số nguyên lớn BigInt, giải thuật Euclid mở rộng và thử nghiệm kịch bản tấn công.
        </p>
      </div>

      {/* Sub-tabs switch */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button
          className={`btn ${activeSubTab === 'stepByStep' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('stepByStep')}
        >
          <Layers size={16} /> 1. Minh Hoạ Từng Bước (Step-by-Step)
        </button>
        <button
          className={`btn ${activeSubTab === 'euclid' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('euclid')}
        >
          <Table size={16} /> 2. Bảng Tính Euclid Mở Rộng
        </button>
        <button
          className={`btn ${activeSubTab === 'reusedK' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('reusedK')}
        >
          <ShieldAlert size={16} /> 3. Mô Phỏng Tấn Công Lộ Số k (Reused k Attack)
        </button>
        <button
          className={`btn ${activeSubTab === 'dlp' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('dlp')}
        >
          <Cpu size={16} /> 4. Phân Tích Độ Phức Tạp Logarithm Rời Rạc
        </button>
      </div>

      {/* SUB-TAB 1: STEP BY STEP MATH VISUALIZER */}
      {activeSubTab === 'stepByStep' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls Bar */}
          <div className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label className="form-label" style={{ margin: 0 }}>Cỡ khoá thử nghiệm:</label>
                <select
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={keyPreset}
                  onChange={(e) => setKeyPreset(e.target.value as any)}
                >
                  <option value="demo-16">16-bit (p = 65,539 - Rất dễ quan sát số học)</option>
                  <option value="demo-32">32-bit (p ≈ 4.29 × 10⁹)</option>
                  <option value="safe-64">64-bit (p ≈ 1.84 × 10¹⁹)</option>
                  <option value="safe-128">128-bit (p ≈ 3.4 × 10³⁸)</option>
                  <option value="safe-512">512-bit (p ≈ 1.3 × 10¹⁵⁴)</option>
                  <option value="safe-1024">1024-bit (Chuẩn BTL Đại Học)</option>
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
                  <Play size={15} /> Tính toán
                </button>
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="grid-2">
            {/* Signing Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} /> Giai Đoạn 1: Quá Trình Ký Số (Signing Steps)
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
                <CheckCircle2 size={18} /> Giai Đoạn 2: Quá Trình Xác Thực (Verification Steps)
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
                        <code style={{ color: '#10b981' }}>{v}</code>
                      </div>
                    ))}
                  </div>

                  {log.note && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 8px', borderRadius: '4px' }}>
                      {log.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EUCLID VISUALIZER */}
      {activeSubTab === 'euclid' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Table size={18} color="var(--accent-cyan)" />
                <span>Bảng Tính Giải Thuật Euclid Mở Rộng (Tìm Nghịch Đảo Modulo)</span>
              </h3>
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              <MathText text="Trong lược đồ ElGamal, ta cần tìm nghịch đảo $k^{-1} \pmod{p-1}$ để tính $s = k^{-1}(m - x \cdot r) \pmod{p-1}$. Giải thuật Euclid mở rộng tìm các hệ số $x, y$ sao cho $a \cdot x + m \cdot y = \gcd(a, m)$." />
            </div>

            <div className="grid-2" style={{ gap: '14px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Số cần tìm nghịch đảo (a):</label>
                <input
                  type="text"
                  className="form-input"
                  value={euclidA}
                  onChange={(e) => setEuclidA(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Modulo (m = p - 1):</label>
                <input
                  type="text"
                  className="form-input"
                  value={euclidM}
                  onChange={(e) => setEuclidM(e.target.value)}
                />
              </div>
            </div>

            <button className="btn btn-primary" onClick={runEuclidDemo} style={{ marginBottom: '20px' }}>
              <Play size={15} /> Tính Bảng Bước Euclid
            </button>

            {euclidResult && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}>
                <div><strong>Ước chung lớn nhất <MathView math="\gcd(a, m)" />:</strong> <code style={{ color: 'var(--accent-cyan)' }}>{euclidResult.gcd}</code></div>
                {euclidResult.inverse ? (
                  <div style={{ marginTop: '4px', color: 'var(--status-success)' }}>
                    <strong>Nghịch đảo modulo <MathView math="a^{-1} \pmod m" />:</strong> <code>{euclidResult.inverse}</code> (Do <MathView math="\gcd = 1" />)
                  </div>
                ) : (
                  <div style={{ marginTop: '4px', color: 'var(--status-danger)' }}>
                    Không tồn tại nghịch đảo modulo vì <MathView math="\gcd(a, m) \neq 1" />!
                  </div>
                )}
              </div>
            )}

            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Bước (i)</th>
                    <th>Thương (q)</th>
                    <th>Số dư (r)</th>
                    <th>Hệ số x (s_i)</th>
                    <th>Hệ số y (t_i)</th>
                    <th>Phương trình</th>
                  </tr>
                </thead>
                <tbody>
                  {euclidSteps.map((s) => (
                    <tr key={s.step}>
                      <td><strong>{s.step}</strong></td>
                      <td><code>{s.q}</code></td>
                      <td><code>{s.r}</code></td>
                      <td><code>{s.x}</code></td>
                      <td><code>{s.y}</code></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {s.a} = {s.q} × {s.b} + {s.r}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: REUSED K ATTACK SIMULATION */}
      {activeSubTab === 'reusedK' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: 'var(--status-danger)' }}>
                <ShieldAlert size={20} />
                <span>Mô Phỏng Lỗ Hổng Tái Sử Dụng Số Ngẫu Nhiên k (Reused Nonce Attack)</span>
              </h3>
              <span className="badge badge-danger">Lỗ hổng kinh điển</span>
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '16px' }}>
              <MathText text="Trong chữ ký số ElGamal, nếu người ký vô tình sử dụng cùng một số bí mật $k$ để ký 2 văn bản khác nhau, kẻ tấn công có thể **khôi phục hoàn toàn khoá bí mật $x$** chỉ bằng vài phép tính cộng trừ nhân chia modulo đơn giản mà **không cần giải bài toán Logarithm rời rạc**!" />
            </div>

            <div className="grid-2" style={{ gap: '14px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nội dung văn bản thứ nhất (m₁):</label>
                <input
                  type="text"
                  className="form-input"
                  value={attackDoc1}
                  onChange={(e) => setAttackDoc1(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nội dung văn bản thứ hai (m₂):</label>
                <input
                  type="text"
                  className="form-input"
                  value={attackDoc2}
                  onChange={(e) => setAttackDoc2(e.target.value)}
                />
              </div>
            </div>

            <button
              className="btn btn-danger btn-lg"
              onClick={handleRunReusedKAttack}
              disabled={isAttacking}
            >
              <Play size={16} />
              <span>{isAttacking ? 'Đang Thực Thi Tấn Công Giải Mã...' : 'Thực Thi Tấn Công Bẻ Khoá (Exploit Attack)'}</span>
            </button>

            {attackResult && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '18px',
                  borderRadius: '10px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ color: 'var(--status-danger)', fontWeight: 800, fontSize: '1.05rem' }}>
                    Kết Quả Tấn Công Thực Nghiệm:
                  </h4>
                  <span className={`badge ${attackResult.isKeyMatched ? 'badge-danger' : 'badge-warning'}`}>
                    {attackResult.isKeyMatched ? 'CRITICAL: KHOÁ BỊ LỘ 100%' : 'Chưa khôi phục'}
                  </span>
                </div>

                <div className="grid-2" style={{ gap: '10px', fontSize: '0.84rem' }}>
                  <div>
                    <strong>Khoá bí mật thực tế x:</strong>
                    <div className="code-block" style={{ marginTop: '2px', padding: '6px', color: '#10b981' }}>
                      {attackResult.actualPrivateKeyX}
                    </div>
                  </div>
                  <div>
                    <strong>Khoá bí mật kẻ tấn công khôi phục được x_recovered:</strong>
                    <div className="code-block" style={{ marginTop: '2px', padding: '6px', color: '#ef4444' }}>
                      {attackResult.recoveredPrivateKeyX || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Steps of attack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                  <strong>Các bước giải mã đại số của kẻ tấn công:</strong>
                  {attackResult.explanationSteps.map((step, idx) => (
                    <div key={idx} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                      <MathText text={step} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DLP COMPLEXITY BENCHMARKS */}
      {activeSubTab === 'dlp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Cpu size={18} color="var(--accent-indigo)" />
                <span>Phân Tích Độ Phức Tạp Bài Toán Logarithm Rời Rạc (DLP)</span>
              </h3>
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '16px' }}>
              Độ an toàn của hệ mật ElGamal phụ thuộc hoàn toàn vào độ khó của bài toán Logarithm rời rạc trên vành hữu hạn <MathView math="\mathbb{Z}_p^*" />:
              {' '}Cho trước <MathView math="p, g" />, <MathView math="y = g^x \pmod p" />, tìm số mũ bí mật <MathView math="x" />.
            </div>

            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Cỡ Khoá (Bit)</th>
                    <th>Kích Thước Modulus (p)</th>
                    <th>Vét Cạn (Brute Force)</th>
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
                      <td>
                        <span className={`badge badge-${row.badgeColor}`}>
                          {row.securityStatus}
                        </span>
                      </td>
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
