import { useMemo, useState } from 'react';
import { calculateBlockHash, getMerkleRoot } from '../blockchain/coreBlockchain.js';

export default function TamperBlockDemo({ blocks = [] }) {
  const [tampered, setTampered] = useState(false);
  const original = blocks.at(-1);
  const report = useMemo(() => {
    if (!tampered || !original) return null;
    const changed = { ...original, transactions: [...(original.transactions || []), { from: 'attacker', to: 'victim', amount: 999 }] };
    changed.merkleRoot = getMerkleRoot(changed.transactions);
    return { block: changed, hashValid: calculateBlockHash(changed) === changed.hash };
  }, [original, tampered]);
  return <section className="glass-panel"><div className="panel-heading"><div><h2>Block tampering</h2><p>Sửa body sẽ đổi Merkle root, khiến hash header cũ không còn hợp lệ.</p></div><span className="tag tag-red">TAMPER DEMO</span></div><div className="attack-actions"><button className="outline-button" type="button" onClick={() => setTampered(false)}>Chuỗi nguyên vẹn</button><button className="danger-button" type="button" onClick={() => setTampered(true)}>Sửa giao dịch block mới nhất</button></div>{original && <div className="two-column"><div className="hash-result"><span className="field-label">Merkle root gốc</span><code className="hash-value">{original.merkleRoot}</code><span className="field-label">Hash block gốc</span><code className="hash-value">{original.hash}</code></div><div className="hash-result"><span className="field-label">Merkle root sau sửa</span><code className={`hash-value ${report ? 'invalid-text' : ''}`}>{report?.block.merkleRoot || original.merkleRoot}</code><span className="field-label">Hash header tính lại</span><code className={`hash-value ${report && !report.hashValid ? 'invalid-text' : ''}`}>{report ? calculateBlockHash(report.block) : original.hash}</code></div></div>}{report && <p className="notice notice-danger">✕ Hash block không khớp. Mọi block con tham chiếu hash cũ cũng bị mất liên kết. Sửa dữ liệu mà không đào lại sẽ bị phát hiện.</p>}</section>;
}
