import { useMemo, useState } from 'react';
import { calculateSHA256 } from './SHA-256.js';

// Danh sách giao dịch khởi tạo mẫu
const initialTransactions = [
  'Alice → Bob · 2.5 coin',
  'Bob → Carol · 1 coin',
  'Carol → Dave · 0.4 coin',
  'Dave → Alice · 0.1 coin',
  'Eve → Alice · 3 coin',
];

/**
 * Thuật toán dựng các tầng Merkle Tree
 * Trả về mảng 2 chiều gồm các tầng từ Leaves (tầng 0) đến Root (tầng cuối)
 */
export function buildLevels(transactions) {
  if (!transactions || transactions.length === 0) {
    return [['0'.repeat(64)]];
  }

  // Tầng lá: băm SHA-256 từng giao dịch
  const levels = [transactions.map((tx) => typeof tx === 'string' ? calculateSHA256(tx) : calculateSHA256(JSON.stringify(tx)))];

  while (levels.at(-1).length > 1) {
    const previous = levels.at(-1);
    const next = [];
    for (let index = 0; index < previous.length; index += 2) {
      // Nếu số phần tử lẻ, nhân bản chính nó (theo chuẩn Bitcoin)
      const left = previous[index];
      const right = previous[index + 1] || left;
      next.push(calculateSHA256(left + right));
    }
    levels.push(next);
  }
  return levels;
}

/**
 * Hàm tiện ích xuất ra cho coreBlockchain.js sử dụng
 */
export function getMerkleRoot(transactions) {
  const levels = buildLevels(transactions);
  return levels.at(-1)[0];
}

export default function MerkleTree() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState('');
  
  // State phục vụ kịch bản kiểm thử giả mạo (Tamper Test)
  const [tamperedData, setTamperedData] = useState('');
  const [isTampering, setIsTampering] = useState(false);

  // Tính toán các tầng của cây Merkle từ danh sách giao dịch
  const levels = useMemo(() => buildLevels(transactions), [transactions]);
  const root = levels.at(-1)[0];

  // Tính Merkle Proof (đường dẫn kiểm chứng O(log n)) cho lá đang chọn
  const proof = useMemo(() => {
    return levels.slice(0, -1).map((level, step) => {
      const index = Math.floor(selected / (2 ** step));
      const sibling = index ^ 1; // Toán tử bitwise tìm chỉ số nút anh em
      return { 
        hash: level[sibling] || level[index], 
        side: sibling < index ? 'L' : 'R' 
      };
    });
  }, [levels, selected]);

  // Xác minh tính hợp lệ của Proof (hỗ trợ kiểm thử khi bị can thiệp)
  const proofValid = useMemo(() => {
    if (!levels[0] || !levels[0][selected]) return false;
    
    // Nếu đang bật chế độ sửa đổi, lá kiểm tra sẽ dùng dữ liệu giả mạo
    const leafToCheck = isTampering 
      ? calculateSHA256(tamperedData) 
      : levels[0][selected];

    const computedRoot = proof.reduce(
      (hash, node) => node.side === 'L' 
        ? calculateSHA256(node.hash + hash) 
        : calculateSHA256(hash + node.hash),
      leafToCheck,
    );

    return computedRoot === root;
  }, [proof, levels, selected, isTampering, tamperedData, root]);

  const addTransaction = () => {
    if (!draft.trim()) return;
    setTransactions((current) => [...current, draft.trim()]);
    setSelected(transactions.length);
    setDraft('');
    setIsTampering(false);
  };

  const handleSelectTx = (index) => {
    setSelected(index);
    setTamperedData(transactions[index]);
    setIsTampering(false);
  };

  const toggleTamper = () => {
    if (!isTampering) {
      setTamperedData(transactions[selected] + ' (ĐÃ BỊ SỬA)');
      setIsTampering(true);
    } else {
      setIsTampering(false);
    }
  };

  return (
    <div className="module-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      {/* KHUNG ĐIỀU KHIỂN & MERKLE ROOT */}
      <section className="glass-panel" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#38bdf8' }}>Cây Merkle & SPV Verification</h2>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
              Mỗi lá là SHA-256(Tx); mỗi nút cha là SHA-256(left + right). Tự động nhân bản nút khi số lá lẻ.
            </p>
          </div>
          <span style={{ background: '#0284c7', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
            O(log n) PROOF
          </span>
        </div>

        {/* Input thêm Tx */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input 
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#fff' }}
            value={draft} 
            onChange={(e) => setDraft(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && addTransaction()} 
            placeholder="Nhập nội dung giao dịch mới (VD: Alice chuyển Bob 5 coin)..." 
          />
          <button 
            style={{ padding: '10px 18px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            type="button" 
            onClick={addTransaction}
          >
            Thêm giao dịch
          </button>
        </div>

        {/* Hiển thị Root */}
        <div style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase' }}>Merkle Root (Header)</span>
          <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', wordBreak: 'break-all', color: '#a5f3fc', marginTop: '4px' }}>
            {root}
          </div>
        </div>

        {/* BỐ CỤC: DANH SÁCH LÁ & MERKLE PROOF */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          {/* Cột trái: Danh sách các giao dịch (Leaves) */}
          <div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 'bold' }}>
              DANH SÁCH GIAO DỊCH ({transactions.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {transactions.map((tx, idx) => (
                <div 
                  key={`${tx}-${idx}`}
                  onClick={() => handleSelectTx(idx)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selected === idx ? '#1e3a5f' : '#0f172a',
                    border: selected === idx ? '1px solid #38bdf8' : '1px solid #334155',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <strong>TX {String(idx + 1).padStart(2, '0')}</strong>
                    <span style={{ color: '#cbd5e1' }}>{tx}</span>
                  </div>
                  <code style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {levels[0][idx] ? levels[0][idx].slice(0, 28) + '...' : ''}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Cột phải: Proof Path & Công cụ giả lập tấn công (Tamper) */}
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 'bold' }}>
                PROOF PATH CHO TX {selected + 1} ({proof.length} nút sibling)
              </span>
              <button 
                type="button"
                onClick={toggleTamper}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: isTampering ? '#e11d48' : '#eab308',
                  color: isTampering ? '#fff' : '#000',
                  fontWeight: 'bold'
                }}
              >
                {isTampering ? 'Khôi phục dữ liệu gốc' : '⚠ Thử sửa đổi dữ liệu (Tamper)'}
              </button>
            </div>

            {/* Dữ liệu kiểm tra (nếu có giả mạo) */}
            {isTampering && (
              <div style={{ margin: '12px 0', padding: '10px', background: '#3f151e', border: '1px dashed #f43f5e', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: '#fda4af' }}>Nội dung giả mạo đang kiểm thử:</span>
                <input 
                  style={{ width: '100%', marginTop: '4px', padding: '6px', background: '#1c1917', color: '#fff', border: '1px solid #f43f5e', borderRadius: '4px' }}
                  value={tamperedData}
                  onChange={(e) => setTamperedData(e.target.value)}
                />
              </div>
            )}

            {/* Danh sách các nút Hash trong Proof Path */}
            <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {proof.length > 0 ? (
                proof.map((node, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: '#1e293b', padding: '8px', borderRadius: '6px' }}>
                    <span style={{ color: '#38bdf8' }}>{node.side === 'L' ? '← Sibling Trái' : 'Sibling Phải →'}</span>
                    <code style={{ color: '#cbd5e1' }}>{node.hash.slice(0, 24)}...</code>
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Block chỉ có 1 giao dịch duy nhất (Root đồng thời là Leaf).</p>
              )}
            </div>

            {/* Thông báo kết quả xác minh SPV */}
            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.85rem',
              background: proofValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: proofValid ? '#4ade80' : '#f87171',
              border: proofValid ? '1px solid #22c55e' : '1px solid #ef4444'
            }}>
              {proofValid 
                ? '✓ Xác minh SPV thành công: Giao dịch tồn tại nguyên vẹn trong Merkle Root.' 
                : '✕ Xác minh SPV thất bại: Dữ liệu giao dịch đã bị chỉnh sửa hoặc Proof không hợp lệ!'}
            </div>
          </div>
        </div>
      </section>

      {/* HIỂN THỊ CẤU TRÚC TẦNG CỦA CÂY MERKLE */}
      <section className="glass-panel" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#38bdf8' }}>Cấu trúc các tầng Merkle (Tree Levels)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {levels.map((level, idx) => (
            <div key={idx} style={{ background: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: idx === levels.length - 1 ? '#4ade80' : '#94a3b8' }}>
                {idx === levels.length - 1 ? 'ROOT LEVEL' : `TẦNG ${idx} (${level.length} NÚT)`}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {level.map((hash, hIdx) => (
                  <code key={hIdx} style={{ fontSize: '0.75rem', background: '#1e293b', padding: '4px 8px', borderRadius: '4px', color: '#cbd5e1' }}>
                    {hash.slice(0, 16)}…
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
