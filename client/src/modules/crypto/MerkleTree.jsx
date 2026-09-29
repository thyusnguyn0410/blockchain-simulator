import { useMemo, useState } from 'react';
import { calculateSHA256 } from './SHA-256.js';

const initialTransactions = [
  'Alice → Bob · 2.5 coin',
  'Bob → Carol · 1 coin',
  'Carol → Dave · 0.4 coin',
  'Dave → Alice · 0.1 coin',
  'Eve → Alice · 3 coin',
];

function buildLevels(transactions) {
  if (!transactions.length) return [[calculateSHA256('')]];
  const levels = [transactions.map(calculateSHA256)];
  while (levels.at(-1).length > 1) {
    const previous = levels.at(-1);
    const next = [];
    for (let index = 0; index < previous.length; index += 2) {
      next.push(calculateSHA256(previous[index] + (previous[index + 1] || previous[index])));
    }
    levels.push(next);
  }
  return levels;
}

export default function MerkleTree() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState('');
  const levels = useMemo(() => buildLevels(transactions), [transactions]);
  const proof = useMemo(() => levels.slice(0, -1).map((level, step) => {
    const index = Math.floor(selected / (2 ** step));
    const sibling = index ^ 1;
    return { hash: level[sibling] || level[index], side: sibling < index ? 'L' : 'R' };
  }), [levels, selected]);
  const proofValid = proof.reduce(
    (hash, node) => node.side === 'L' ? calculateSHA256(node.hash + hash) : calculateSHA256(hash + node.hash),
    levels[0][selected],
  ) === levels.at(-1)[0];

  const addTransaction = () => {
    if (!draft.trim()) return;
    setTransactions((current) => [...current, draft.trim()]);
    setSelected(transactions.length);
    setDraft('');
  };

  return (
    <div className="module-stack">
      <section className="glass-panel">
        <div className="panel-heading"><div><h2>Cây Merkle</h2><p>Mỗi lá là hash của giao dịch; mỗi nút cha là SHA-256(left ‖ right).</p></div><span className="tag tag-cyan">O(log n) PROOF</span></div>
        <div className="field-row"><input className="text-input" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addTransaction()} placeholder="Thêm giao dịch để cập nhật root…" /><button className="primary-button" type="button" onClick={addTransaction}>Thêm giao dịch</button></div>
        <div className="merkle-root"><span className="field-label">Merkle root</span><code>{levels.at(-1)[0]}</code></div>
        <div className="merkle-layout">
          <div className="merkle-leaves"><span className="field-label">Giao dịch · {transactions.length}</span>{transactions.map((transaction, index) => <button type="button" className={`merkle-leaf ${selected === index ? 'selected' : ''}`} onClick={() => setSelected(index)} key={`${transaction}-${index}`}><strong>TX {String(index + 1).padStart(2, '0')}</strong><span>{transaction}</span><code>{levels[0][index].slice(0, 24)}…</code></button>)}</div>
          <div className="merkle-proof"><span className="field-label">Proof path cho TX {selected + 1} · {proof.length} sibling</span>{proof.length ? proof.map((node, index) => <div className="proof-step" key={`${node.hash}-${index}`}><span>{node.side === 'L' ? '← sibling trái' : 'sibling phải →'}</span><code>{node.hash}</code></div>) : <p className="muted">Root đồng thời là leaf duy nhất.</p>}<p className={`notice ${proofValid ? 'notice-ok' : 'notice-danger'}`}>{proofValid ? '✓ Proof hợp lệ: leaf dẫn tới root.' : '✕ Proof không hợp lệ.'} Thay đổi giao dịch sẽ làm đổi root.</p></div>
        </div>
      </section>
      <section className="glass-panel">
        <div className="panel-heading"><div><h2>Các tầng Merkle</h2><p>Lá lẻ được ghép với chính nó ở tầng kế tiếp.</p></div></div>
        <div className="merkle-levels">{levels.map((level, index) => <div className="merkle-level" key={index}><span className="field-label">{index === levels.length - 1 ? 'ROOT' : `TẦNG ${index}`}</span>{level.map((hash) => <code key={hash}>{hash.slice(0, 16)}…</code>)}</div>)}</div>
      </section>
    </div>
  );
}
