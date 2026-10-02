import React, { useMemo, useState } from 'react';
import { calculateSHA256 } from './SHA-256.js';

const INITIAL_TRANSACTIONS = [
  'Alice -> Bob: 2.5 coin',
  'Bob -> Carol: 1.0 coin',
  'Carol -> Dave: 0.4 coin',
  'Dave -> Alice: 0.1 coin',
  'Eve -> Alice: 3.0 coin',
];

export function buildLevels(transactions) {
  if (!transactions || transactions.length === 0) {
    return [['0'.repeat(64)]];
  }
  const levels = [transactions.map((tx) => calculateSHA256(typeof tx === 'string' ? tx : JSON.stringify(tx)))];

  while (levels.at(-1).length > 1) {
    const prev = levels.at(-1);
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left = prev[i];
      const right = prev[i + 1] || left;
      next.push(calculateSHA256(left + right));
    }
    levels.push(next);
  }
  return levels;
}

export function getMerkleRoot(transactions) {
  return buildLevels(transactions).at(-1)[0];
}

export default function MerkleTree() {
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [selectedTxIdx, setSelectedTxIdx] = useState(0);
  const [newTxDraft, setNewTxDraft] = useState('');
  
  // Trạng thái kiểm thử giả mạo giao dịch (Tamper Simulation)
  const [isTampering, setIsTampering] = useState(false);
  const [tamperedData, setTamperedData] = useState('');

  // 1. Dựng cây và Merkle Root
  const levels = useMemo(() => buildLevels(transactions), [transactions]);
  const root = levels.at(-1)[0];

  // 2. Tính Merkle Proof O(log n) cho phần tử được chọn
  const proof = useMemo(() => {
    return levels.slice(0, -1).map((level, step) => {
      const index = Math.floor(selectedTxIdx / (2 ** step));
      const siblingIndex = index ^ 1;
      return {
        hash: level[siblingIndex] || level[index],
        side: siblingIndex < index ? 'L' : 'R',
      };
    });
  }, [levels, selectedTxIdx]);

  // 3. Xác minh Proof (Kiểm tra xem khi bị sửa đổi thì Proof có fail không)
  const isProofValid = useMemo(() => {
    if (!levels[0] || !levels[0][selectedTxIdx]) return false;

    const leafToCheck = isTampering
      ? calculateSHA256(tamperedData)
      : levels[0][selectedTxIdx];

    const computedRoot = proof.reduce(
      (hash, node) => node.side === 'L'
        ? calculateSHA256(node.hash + hash)
        : calculateSHA256(hash + node.hash),
      leafToCheck,
    );

    return computedRoot === root;
  }, [proof, levels, selectedTxIdx, isTampering, tamperedData, root]);

  const handleAddTx = () => {
    if (!newTxDraft.trim()) return;
    setTransactions((prev) => [...prev, newTxDraft.trim()]);
    setSelectedTxIdx(transactions.length);
    setNewTxDraft('');
    setIsTampering(false);
  };

  const handleSelectTx = (index) => {
    setSelectedTxIdx(index);
    setTamperedData(transactions[index]);
    setIsTampering(false);
  };

  const handleToggleTamper = () => {
    if (!isTampering) {
      setTamperedData(transactions[selectedTxIdx] + ' [GIẢ MẠO 100 COIN]');
      setIsTampering(true);
    } else {
      setIsTampering(false);
    }
  };

  return (
    <div className="crypto-panel-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KHỐI 1: QUẢN LÝ GIAO DỊCH VÀ MERKLE ROOT */}
      <section className="dashboard-panel glass-card">
        <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Cây Merkle & Xác Minh SPV (Project 5)</h2>
            <p>Mỗi lá là Hash(Tx); mỗi nút cha là SHA-256(Left + Right). Nút lẻ tự động nhân bản.</p>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', background: 'rgba(6,182,212,0.2)', color: '#22d3ee' }}>
            O(log n) PROOF PATH
          </span>
        </div>

        {/* Input thêm giao dịch */}
        <div style={{ display: 'flex', gap: '10px', margin: '16px 0' }}>
          <input
            type="text"
            className="text-input"
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
            value={newTxDraft}
            onChange={(e) => setNewTxDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTx()}
            placeholder="Nhập nội dung giao dịch mới (VD: Alice -> Charlie: 5 BTC)..."
          />
          <button className="primary-button" type="button" onClick={handleAddTx} style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
            Thêm Tx
          </button>
        </div>

        {/* Hiển thị Merkle Root */}
        <div style={{ background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold' }}>MERKLE ROOT (BLOCK HEADER)</span>
          <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#a5f3fc', wordBreak: 'break-all', marginTop: '4px' }}>
            {root}
          </div>
        </div>

        {/* BẢNG LÁ GIAO DỊCH & PROOF PATH */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '18px' }}>
          {/* Cột 1: Danh sách các giao dịch (Leaves) */}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px' }}>
              DANH SÁCH LÁ GIAO DỊCH ({transactions.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {transactions.map((tx, idx) => (
                <div
                  key={`${tx}-${idx}`}
                  onClick={() => handleSelectTx(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedTxIdx === idx ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                    border: selectedTxIdx === idx ? '1px solid #38bdf8' : '1px solid #334155',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <strong style={{ color: selectedTxIdx === idx ? '#38bdf8' : '#fff' }}>TX {String(idx + 1).padStart(2, '0')}</strong>
                    <span style={{ color: '#cbd5e1' }}>{tx}</span>
                  </div>
                  <code style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {levels[0][idx] ? `${levels[0][idx].slice(0, 24)}...` : ''}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Cột 2: Merkle Proof Path & Thử nghiệm Tấn công */}
          <div style={{ background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8' }}>
                MERKLE PROOF CHO TX {selectedTxIdx + 1}
              </span>
              <button
                type="button"
                onClick={handleToggleTamper}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: 'none',
                  background: isTampering ? '#e11d48' : '#eab308',
                  color: isTampering ? '#fff' : '#000',
                }}
              >
                {isTampering ? 'Khôi phục ban đầu' : '⚠ Thử sửa Tx (Tamper)'}
              </button>
            </div>

            {isTampering && (
              <div style={{ padding: '8px 12px', background: '#3f151e', border: '1px dashed #f43f5e', borderRadius: '6px', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#fda4af' }}>Dữ liệu giao dịch bị can thiệp trái phép:</span>
                <input
                  style={{ width: '100%', marginTop: '4px', padding: '6px', background: '#1c1917', color: '#fff', border: '1px solid #f43f5e', borderRadius: '4px' }}
                  value={tamperedData}
                  onChange={(e) => setTamperedData(e.target.value)}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0' }}>
              {proof.length > 0 ? (
                proof.map((node, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: '#1e293b', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ color: '#38bdf8' }}>{node.side === 'L' ? '<- Sibling Trái' : 'Sibling Phải ->'}</span>
                    <code style={{ color: '#cbd5e1' }}>{node.hash.slice(0, 20)}...</code>
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Block chỉ có 1 giao dịch duy nhất.</p>
              )}
            </div>

            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.85rem',
              background: isProofValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isProofValid ? '#4ade80' : '#f87171',
              border: isProofValid ? '1px solid #22c55e' : '1px solid #ef4444',
            }}>
              {isProofValid
                ? '✓ Xác minh SPV thành công: Giao dịch toàn vẹn và khớp với Merkle Root!'
                : '✕ Xác minh SPV thất bại: Giao dịch đã bị can thiệp sửa đổi trái phép!'}
            </div>
          </div>
        </div>
      </section>

      {/* KHỐI 2: CẤU TRÚC PHÂN CẤP TẦNG CỦA MERKLE TREE */}
      <section className="dashboard-panel glass-card">
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#38bdf8' }}>Cấu Trúc Các Tầng Cây Merkle (Levels)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {levels.map((level, idx) => (
            <div key={idx} style={{ background: '#090d16', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: idx === levels.length - 1 ? '#4ade80' : '#94a3b8' }}>
                {idx === levels.length - 1 ? 'ROOT LEVEL' : `TẦNG ${idx} (${level.length} HASH)`}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {level.map((hash, hIdx) => (
                  <code key={hIdx} style={{ fontSize: '0.75rem', background: '#1e293b', padding: '3px 8px', borderRadius: '4px', color: '#cbd5e1' }}>
                    {hash.slice(0, 16)}...
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}