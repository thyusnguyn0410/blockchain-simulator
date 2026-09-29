import { useState } from 'react';
import { calculateBlockHash } from './coreBlockchain.js';

const MAX_ATTEMPTS = 300_000;

export default function ProofOfWorkSimulator({ onMined }) {
  const [difficulty, setDifficulty] = useState(2);
  const [data, setData] = useState('Giao dịch Alice → Bob');
  const [mining, setMining] = useState(false);
  const [result, setResult] = useState(null);

  const mine = () => {
    setMining(true);
    setResult(null);
    const previousHash = '0'.repeat(64);
    const timestamp = Math.floor(Date.now() / 1000);
    const block = { version: 1, index: 1, previousHash, merkleRoot: data, timestamp, difficulty, nonce: 0 };
    const startedAt = performance.now();
    let attempts = 0;
    const iterate = () => {
      const batchEnd = Math.min(attempts + 1200, MAX_ATTEMPTS);
      while (attempts < batchEnd) {
        block.nonce = attempts;
        block.hash = calculateBlockHash(block);
        attempts += 1;
        if (block.hash.startsWith('0'.repeat(difficulty))) {
          const mined = { block: { ...block }, attempts, elapsed: performance.now() - startedAt };
          setResult(mined);
          setMining(false);
          onMined?.(mined);
          return;
        }
      }
      if (attempts >= MAX_ATTEMPTS) {
        setResult({ attempts, elapsed: performance.now() - startedAt, found: false });
        setMining(false);
        return;
      }
      window.setTimeout(iterate, 0);
    };
    window.setTimeout(iterate, 0);
  };

  return (
    <section className="glass-panel">
      <div className="panel-heading"><div><h2>Mô phỏng Proof of Work</h2><p>Nonce biến đổi header cho đến khi hash có đủ số 0 đầu.</p></div><span className="tag tag-amber">MAX 300K HASHES</span></div>
      <div className="field-row"><label className="field-label">Dữ liệu block<input className="text-input" value={data} onChange={(event) => setData(event.target.value)} /></label><label className="field-label">Độ khó<select className="text-input" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((level) => <option value={level} key={level}>{level} · {'0'.repeat(level)}</option>)}</select></label><button className="primary-button" type="button" disabled={mining} onClick={mine}>{mining ? '⛏ Đang đào…' : 'Bắt đầu Proof of Work'}</button></div>
      {mining && <div className="mining-state"><span className="spinner" /> Thử nonce… trình duyệt vẫn hoạt động bình thường.</div>}
      {result && (result.found === false ? <p className="notice notice-warn">Không tìm thấy trong giới hạn {MAX_ATTEMPTS.toLocaleString()} lần thử. Hạ độ khó để tiếp tục.</p> : <div className="pow-result"><div className="two-column"><span>Nonce <b>{result.block.nonce}</b></span><span>{result.attempts.toLocaleString()} lần · {(result.elapsed / 1000).toFixed(3)} giây · {(result.attempts / (result.elapsed / 1000 || 1)).toFixed(0)} hash/s</span></div><code className="hash-value">{result.block.hash}</code></div>)}
    </section>
  );
}
