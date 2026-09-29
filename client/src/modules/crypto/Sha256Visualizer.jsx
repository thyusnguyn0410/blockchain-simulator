import { useMemo, useState } from 'react';
import { calculateSHA256, checkAvalancheEffect, formatHashFormatted } from './SHA-256.js';

function HashResult({ label, hash }) {
  return (
    <div className="hash-result">
      <span className="field-label">{label}</span>
      <code className="hash-value">{formatHashFormatted(hash)}</code>
    </div>
  );
}

export default function Sha256Visualizer() {
  const [input, setInput] = useState('Xin chào Blockchain');
  const [left, setLeft] = useState('Blockchain');
  const [right, setRight] = useState('blockchain');
  const [powInput, setPowInput] = useState('Block #1 data');
  const [difficulty, setDifficulty] = useState(2);
  const [pow, setPow] = useState(null);
  const [mining, setMining] = useState(false);
  const hash = useMemo(() => calculateSHA256(input), [input]);
  const avalanche = useMemo(() => checkAvalancheEffect(left, right), [left, right]);

  const mine = () => {
    setMining(true);
    setPow(null);
    let nonce = 0;
    const attemptsLimit = 250_000;
    const prefix = '0'.repeat(difficulty);
    const startedAt = performance.now();
    const iterate = () => {
      const batchEnd = Math.min(nonce + 1_000, attemptsLimit);
      while (nonce < batchEnd) {
        const hash = calculateSHA256(`${powInput}${nonce}`);
        nonce += 1;
        if (hash.startsWith(prefix)) {
          setPow({ nonce: nonce - 1, hash, attempts: nonce, timeTakenSeconds: `${((performance.now() - startedAt) / 1000).toFixed(3)}s` });
          setMining(false);
          return;
        }
      }
      if (nonce >= attemptsLimit) {
        setPow({ found: false, attempts: attemptsLimit, timeTakenSeconds: `${((performance.now() - startedAt) / 1000).toFixed(3)}s` });
        setMining(false);
        return;
      }
      window.setTimeout(iterate, 0);
    };
    window.setTimeout(iterate, 0);
  };

  return (
    <div className="module-stack">
      <section className="glass-panel">
        <div className="panel-heading"><div><h2>Băm SHA-256 trực tiếp</h2><p>SHA-256 chuẩn, đầu ra luôn là 256 bit / 64 ký tự hex.</p></div><span className="tag tag-cyan">REALTIME</span></div>
        <label className="field-label" htmlFor="sha-input">Văn bản đầu vào</label>
        <textarea id="sha-input" className="text-input" rows="3" value={input} onChange={(event) => setInput(event.target.value)} />
        <HashResult label="SHA-256" hash={hash} />
      </section>

      <section className="glass-panel">
        <div className="panel-heading"><div><h2>Hiệu ứng thác đổ</h2><p>Thay đổi một ký tự có thể làm thay đổi gần một nửa số bit.</p></div><strong className="metric-highlight">{avalanche.differentBits}<small>/256 bit</small></strong></div>
        <div className="two-column">
          <label className="field-label">Đầu vào A<input className="text-input" value={left} onChange={(event) => setLeft(event.target.value)} /></label>
          <label className="field-label">Đầu vào B<input className="text-input" value={right} onChange={(event) => setRight(event.target.value)} /></label>
        </div>
        <div className="two-column hash-columns"><HashResult label={`Hash A · ${avalanche.percentageChange} bit khác`} hash={avalanche.hash1} /><HashResult label="Hash B" hash={avalanche.hash2} /></div>
      </section>

      <section className="glass-panel">
        <div className="panel-heading"><div><h2>Đào thử Proof of Work</h2><p>Giới hạn 250.000 lần thử để demo không làm treo trình duyệt.</p></div><span className="tag tag-amber">NONCE</span></div>
        <div className="pow-controls">
          <label className="field-label">Dữ liệu block<input className="text-input" value={powInput} onChange={(event) => setPowInput(event.target.value)} /></label>
          <label className="field-label">Độ khó<select className="text-input" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option value={value} key={value}>{value} số 0 đầu</option>)}</select></label>
          <button className="primary-button" type="button" disabled={mining} onClick={mine}>{mining ? 'Đang đào…' : '⛏ Bắt đầu đào'}</button>
        </div>
        {pow && (pow.found === false ? <p className="notice notice-warn">Chưa tìm thấy trong {pow.attempts.toLocaleString()} lần thử ({pow.timeTakenSeconds}). Thử lại với độ khó thấp hơn.</p> : <div className="pow-result"><span>Nonce <b>{pow.nonce}</b></span><span>{pow.attempts.toLocaleString()} lần · {pow.timeTakenSeconds}</span><HashResult label="Hash đạt mục tiêu" hash={pow.hash} /></div>)}
      </section>
    </div>
  );
}
