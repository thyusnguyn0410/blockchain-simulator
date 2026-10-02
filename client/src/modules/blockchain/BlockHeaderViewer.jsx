import React, { useState } from 'react';
import { Blockchain } from './coreBlockchain.js';

// DỮ LIỆU BAN ĐẦU CHUẨN CỦA CÁC KHỐI
const ORIGINAL_DATA = [
  { difficulty: 0, txs: [{ from: "Genesis", to: "Alice", amount: 50, rawText: "Genesis Block" }] },
  { difficulty: 1, txs: [{ from: "Nguyên", to: "Bảo", amount: 0.27, rawText: "Nguyên gửi 0.27 BTC cho Bảo" }] },
  { difficulty: 2, txs: [{ from: "Bob", to: "Charlie", amount: 5.0, rawText: "Bob gửi 5.0 BTC cho Charlie" }] },
  { difficulty: 3, txs: [{ from: "Charlie", to: "David", amount: 2.5, rawText: "Charlie gửi 2.5 BTC cho David" }] },
  { difficulty: 4, txs: [{ from: "David", to: "Eva", amount: 1.0, rawText: "David gửi 1.0 BTC cho Eva" }] }
];

export default function BlockHeaderViewer() {
  // Khởi tạo chuỗi khối từ ORIGINAL_DATA
  const createInitialChain = () => {
    const chain = new Blockchain({ autoGenesis: false });

    ORIGINAL_DATA.forEach((item) => {
      chain.difficulty = item.difficulty;
      chain.addBlock(item.txs);
    });

    return chain;
  };

  const [blockchain, setBlockchain] = useState(createInitialChain);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const blocks = blockchain.toArray();
  const selectedBlock = blocks[selectedIndex] || blocks[0];

  // Báo cáo tính hợp lệ chi tiết của từng khối trong chuỗi
  const validationReport = blockchain.validateDetailed();
  const selectedReport = validationReport[selectedIndex] || {};

  // Tính lại Hash thực tế của khối đang chọn
  const recalculatedHash = selectedBlock ? selectedBlock.calculateHash() : '';
  const isHashMismatched = selectedBlock && selectedBlock.hash !== recalculatedHash;

  const handleSelectBlock = (idx) => {
    setSelectedIndex(idx);
  };

  const handleResetChain = () => {
    setBlockchain(createInitialChain());
    setSelectedIndex(0);
  };

  // SỬA TRỘM: Kích hoạt tự động khi sửa/xóa dữ liệu trong ô input
  const handleDataInputChange = (newStringValue) => {
    if (!selectedBlock || selectedIndex === 0) return;

    const updatedTxs = [
      {
        from: newStringValue,
        to: "",
        amount: 0,
        rawText: newStringValue
      }
    ];

    blockchain.tamper(selectedIndex, updatedTxs);
    setBlockchain(blockchain.clone());
  };

  // FIX LẠI: Khôi phục về dữ liệu ban đầu và đào/tính lại Hash chuẩn
  const handleFixBlock = () => {
    if (selectedIndex === 0) return;
    for (let i = selectedIndex; i < ORIGINAL_DATA.length; i++) {
      const block = blockchain.at(i);
      if (block) {
      block.transactions = JSON.parse(JSON.stringify(ORIGINAL_DATA[i].txs));
      block.refreshMerkleRoot();
    }
  }
    // 3. Đào lại/Tính lại Hash cho khối này và các khối phía sau
    blockchain.recomputeFrom(selectedIndex);

    // 4. Cập nhật lại giao diện
    setBlockchain(blockchain.clone());
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.searchIconBox}>🔍</div>
          <div>
            <h2 style={styles.title}>Blockchain Explorer</h2>
            <p style={styles.subtitle}>
              Mô phỏng Blockchain với Difficulty riêng biệt. Nhập/xóa ô DỮ LIỆU để sửa trộm, bấm "Fix" để khôi phục dữ liệu ban đầu.
            </p>
          </div>
        </div>
      </div>

      {/* ACTION ROW */}
      <div style={styles.actionRow}>
        <div></div>
        <button style={styles.btnReset} onClick={handleResetChain}>
          🔄 
        </button>
      </div>

      {/* GRID CONTAINER */}
      <div style={styles.grid}>
        
        {/* CỘT TRÁI: DANH SÁCH KHỐI */}
        <div style={styles.cardPanel}>
          <h3 style={styles.panelTitle}>Danh sách khối ({blocks.length})</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {blocks.map((block, idx) => {
              const isSelected = selectedIndex === idx;
              const report = validationReport[idx] || {};

              let statusLabel = '✓ Hợp lệ';
              let statusColor = '#10b981';

              if (!report.dataOk) {
                statusLabel = '✖ Dữ liệu đã bị sửa';
                statusColor = '#ef4444';
              } else if (!report.linkOk) {
                statusLabel = '✖ Đứt mắt xích';
                statusColor = '#f59e0b';
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectBlock(idx)}
                  style={{
                    ...styles.blockCard,
                    borderColor: isSelected ? '#3b82f6' : (report.valid ? '#1e293b' : statusColor),
                    backgroundColor: isSelected ? '#121927' : '#0b1120'
                  }}
                >
                  <div style={styles.blockCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#3b82f6' }}>📦</span>
                      <span style={styles.blockCardTitle}>
                        {idx === 0 ? "Khối Genesis (#0)" : `Khối #${idx}`}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: statusColor
                    }}>
                      {statusLabel}
                    </span>
                  </div>

                  <div style={styles.truncateHash}>
                    {block.hash ? `${block.hash.substring(0, 38)}...` : ''}
                  </div>

                  <div style={styles.blockMetaInfo}>
                    <span>Nonce: {block.nonce}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Diff: {block.difficulty}</span>
                    <span>Txs: {block.transactions?.length || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT KHỐI ĐANG CHỌN */}
        {selectedBlock && (
          <div style={styles.cardPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ ...styles.panelTitle, margin: 0 }}>
                Chi tiết {selectedIndex === 0 ? "Khối Genesis (#0)" : `Khối #${selectedIndex}`}
              </h3>
              
              {/* NÚT FIX KHÔI PHỤC DỮ LIỆU BAN ĐẦU */}
              {selectedIndex !== 0 && (
                <button style={styles.btnFixBtn} onClick={handleFixBlock}>
                  🔧 Sửa lại (Fix)
                </button>
              )}
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Block Height</label>
              <div style={styles.valueBox}>{selectedIndex}</div>
            </div>

            {/* DÒNG DỮ LIỆU: TỰ ĐỘNG SỬA TRỘM KHI NHẬP/XÓA */}
            <div style={styles.fieldGroup}>
              <label style={{ ...styles.label, color: selectedIndex === 0 ? '#9ca3af' : '#f59e0b', fontWeight: 'bold' }}>
                DỮ LIỆU {selectedIndex === 0 && "(Cố định - Không thể sửa)"}
              </label>
              <input
                type="text"
                disabled={selectedIndex === 0}
                style={{
                  ...styles.inputTextData,
                  backgroundColor: selectedIndex === 0 ? '#1f2937' : '#111827',
                  borderColor: selectedIndex === 0 ? '#374151' : '#d97706',
                  cursor: selectedIndex === 0 ? 'not-allowed' : 'text',
                  color: selectedIndex === 0 ? '#9ca3af' : '#ffffff'
                }}
                value={selectedBlock.transactions[0]?.rawText || ''}
                onChange={(e) => handleDataInputChange(e.target.value)}
                placeholder="Nhập nội dung giao dịch..."
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>THỜI GIAN</label>
              <div style={styles.valueBox}>
                {new Date(selectedBlock.timestamp * 1000).toLocaleString()}
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>PREV HASH</label>
              <div style={{
                ...styles.valueBox,
                fontFamily: 'monospace',
                color: selectedReport.linkOk ? '#e5e7eb' : '#ef4444',
                borderColor: selectedReport.linkOk ? '#1f2937' : '#ef4444'
              }}>
                {selectedBlock.prevHash}
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>HASH (Đang lưu)</label>
              <div style={{ ...styles.valueBox, fontFamily: 'monospace' }}>
                {selectedBlock.hash}
              </div>
            </div>

            {/* HIỂN THỊ CẢNH BÁO NẾU HASH BỊ LỆCH */}
            {isHashMismatched && (
              <div style={{ ...styles.fieldGroup, border: '1px solid #ef4444', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                <label style={{ ...styles.label, color: '#f87171', fontWeight: 'bold' }}>
                  HASH TÍNH LẠI
                </label>
                <div style={{ ...styles.valueBox, fontFamily: 'monospace', color: '#f87171', borderColor: '#ef4444' }}>
                  {recalculatedHash}
                </div>
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', fontWeight: 'bold' }}>
                  ↑ Khác với Hash đang lưu ⇒ Dữ liệu khối này đã bị sửa trộm!
                </div>
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Merkle Root</label>
              <div style={{ ...styles.valueBox, fontFamily: 'monospace' }}>
                {selectedBlock.merkleRoot}
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Difficulty (Độ khó khối)</label>
              <div style={{ ...styles.valueBox, color: '#f59e0b', fontWeight: 'bold' }}>
                {selectedBlock.difficulty}
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Nonce</label>
              <div style={styles.valueBox}>{selectedBlock.nonce}</div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Version</label>
              <div style={styles.valueBox}>{selectedBlock.version}</div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Số giao dịch</label>
              <div style={styles.valueBox}>{selectedBlock.transactions?.length || 0}</div>
            </div>

            {/* TRẠNG THÁI HIỂN THỊ */}
            <div
              style={{
                ...styles.statusBadge,
                backgroundColor: selectedReport.valid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                color: selectedReport.valid ? '#10b981' : '#ef4444',
                borderColor: selectedReport.valid ? '#047857' : '#b91c1c'
              }}
            >
              {selectedReport.valid
                ? '✓ Hợp lệ'
                : !selectedReport.dataOk
                  ? '✖ Dữ liệu đã bị sửa'
                  : '✖ Đứt mắt xích (Hash khối trước không khớp PrevHash)'}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// STYLES
const styles = {
  container: {
    backgroundColor: '#030712',
    color: '#f3f4f6',
    minHeight: '100vh',
    padding: '32px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    marginBottom: '20px'
  },
  searchIconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff'
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#9ca3af'
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap'
  },
  btnReset: {
    backgroundColor: '#374151',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer'
  },
  btnFixBtn: {
    backgroundColor: '#1e3a8a',
    color: '#93c5fd',
    border: '1px solid #3b82f6',
    padding: '6px 14px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '24px'
  },
  cardPanel: {
    backgroundColor: '#0b0f19',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '20px'
  },
  panelTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#f3f4f6'
  },
  blockCard: {
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  blockCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  blockCardTitle: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#f9fafb'
  },
  truncateHash: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#9ca3af',
    margin: '8px 0'
  },
  blockMetaInfo: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: '#6b7280'
  },
  fieldGroup: {
    marginBottom: '12px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '4px'
  },
  valueBox: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#e5e7eb',
    wordBreak: 'break-all'
  },
  inputTextData: {
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none'
  },
  statusBadge: {
    marginTop: '16px',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid'
  }
};