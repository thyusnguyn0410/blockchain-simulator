import { useMemo, useState } from 'react';
import { calculateBlockHash, getMerkleRoot } from './coreBlockchain.js';

export default function BlockHeaderViewer({ blocks = [], onMine, mining = false }) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, blocks.length - 1));
  const selected = blocks[selectedIndex] || blocks[blocks.length - 1];
  const validation = useMemo(() => blocks.map((block, index) => {
    const previous = blocks[index - 1];
    const hashOk = calculateBlockHash(block) === block.hash;
    const linkOk = index === 0 ? block.previousHash === '0'.repeat(64) : block.previousHash === previous.hash;
    const merkleOk = getMerkleRoot(block.transactions || []) === block.merkleRoot;
    const powOk = block.hash?.startsWith('0'.repeat(block.difficulty));
    return { hashOk, linkOk, merkleOk, powOk, valid: hashOk && linkOk && merkleOk && powOk };
  }), [blocks]);
  if (!selected) return <div className="empty-state">Chưa có block nào trong chuỗi.</div>;

  return (
    <div className="module-stack">
      <div className="panel-heading"><div><h2>Chuỗi khối & block header</h2><p>Mỗi block tham chiếu hash của block trước và cam kết body bằng Merkle root.</p></div><div className="header-actions"><span className={`tag ${validation[selectedIndex]?.valid ? 'tag-green' : 'tag-red'}`}>{validation[selectedIndex]?.valid ? '✓ HỢP LỆ' : '✕ BỊ THAY ĐỔI'}</span><button className="primary-button" type="button" onClick={onMine} disabled={mining}>{mining ? 'Đang đào…' : '⛏ Đào block tiếp'}</button></div></div>
      <div className="chain-view">{blocks.map((block, index) => <button type="button" key={`${block.hash}-${index}`} onClick={() => setSelectedIndex(index)} className={`block-card ${selectedIndex === index ? 'selected' : ''} ${validation[index]?.valid ? '' : 'invalid'}`}><span className="block-index">BLOCK #{block.index}</span><code>{block.hash?.slice(0, 22)}…</code><small>{block.transactions?.length || 0} giao dịch · nonce {block.nonce}</small><span className={`tag ${validation[index]?.valid ? 'tag-green' : 'tag-red'}`}>{validation[index]?.valid ? 'VALID' : 'INVALID'}</span></button>)}</div>
      <div className="glass-inset">
        <div className="panel-heading"><div><h3>Header · Block #{selected.index}</h3><p>{new Date(selected.timestamp < 1_000_000_000_000 ? selected.timestamp * 1000 : selected.timestamp).toLocaleString()}</p></div><span className="tag tag-purple">VERSION {selected.version}</span></div>
        <div className="header-fields">
          {[['Hash hiện tại', selected.hash], ['Previous hash', selected.previousHash ?? selected.prevHash], ['Merkle root', selected.merkleRoot], ['Timestamp', selected.timestamp], ['Difficulty', selected.difficulty], ['Nonce', selected.nonce], ['Số giao dịch', selected.transactions?.length || 0]].map(([label, value]) => <div className="header-field" key={label}><span>{label}</span><code>{String(value)}</code></div>)}
        </div>
        <div className="validation-list">{[['Hash khớp nội dung', validation[selectedIndex]?.hashOk], ['Liên kết previousHash', validation[selectedIndex]?.linkOk], ['Merkle root đúng', validation[selectedIndex]?.merkleOk], ['Đạt Proof of Work', validation[selectedIndex]?.powOk]].map(([label, valid]) => <span className={valid ? 'valid-text' : 'invalid-text'} key={label}>{valid ? '✓' : '✕'} {label}</span>)}</div>
      </div>
    </div>
  );
}
