import React, { useState } from 'react';
import { Blockchain } from './coreBlockchain.js';

export default function BlockHeaderViewer() {
  // Khởi tạo sẵn 5 khối có độ khó khác nhau (Diff 0, 1, 2, 3, 4)
  const createInitialChain = () => {
    const chain = new Blockchain({ autoGenesis: false });

    const blocksData = [
      { difficulty: 0, txs: [{ from: "Genesis", to: "Alice", amount: 50, fee: 0, nonce: 0 }] },
      { difficulty: 1, txs: [{ from: "Alice", to: "Bob", amount: 12.5, fee: 0.001, nonce: 1 }] },
      { difficulty: 2, txs: [{ from: "Bob", to: "Charlie", amount: 5.0, fee: 0.002, nonce: 2 }] },
      { difficulty: 3, txs: [{ from: "Charlie", to: "David", amount: 2.5, fee: 0.003, nonce: 3 }] },
      { difficulty: 4, txs: [{ from: "David", to: "Eva", amount: 1.0, fee: 0.005, nonce: 4 }] }
    ];

    blocksData.forEach((item) => {
      chain.difficulty = item.difficulty;
      chain.addBlock(item.txs);
    });

    return chain;
  };

  const [blockchain, setBlockchain] = useState(createInitialChain);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const blocks = blockchain.toArray();
  const selectedBlock = blocks[selectedIndex] || blocks[0];

  const validationReport = blockchain.validateDetailed();
  const validityStatusList = blocks.map((_, idx) =>
    validationReport[idx]?.valid ?? false
  );
  const selectedBlockValid = validationReport[selectedIndex]?.valid ?? false;

  const txBodyHash = selectedBlock?.merkleRoot || '';

  const handleSelectBlock = (idx) => {
    setSelectedIndex(idx);
    setIsVerified(false);
  };

  const handleVerifyChain = () => {
    setIsVerified(true);
  };

  const handleResetChain = () => {
    setBlockchain(createInitialChain());
    setSelectedIndex(0);
    setIsVerified(false);
  };

  return (
    <div style={styles.container}>
      {/* HEADER EXPLORER */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.searchIconBox}>🔍</div>
          <div>
            <h2 style={styles.title}>Blockchain Explorer</h2>
            <p style={styles.subtitle}>Duyệt xem chi tiết Block Header và thông số 5 khối có độ khó khác nhau.</p>
          </div>
        </div>
      </div>

      {/* ACTION ROW */}
      <div style={styles.actionRow}>
        <div></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={styles.btnReset} onClick={handleResetChain}>
            🔄 Đặt lại (Reset)
          </button>

          <button style={styles.btnVerify} onClick={handleVerifyChain}>
            🛡️ Xác minh chuỗi
          </button>
        </div>
      </div>

      {/* GRID CONTAINER */}
      <div style={styles.grid}>
        
        {/* CỘT TRÁI: DANH SÁCH KHỐI */}
        <div style={styles.cardPanel}>
          <h3 style={styles.panelTitle}>Danh sách khối ({blocks.length})</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {blocks.map((block, idx) => {
              const isSelected = selectedIndex === idx;
              const isBlockValid = validityStatusList[idx];

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectBlock(idx)}
                  style={{
                    ...styles.blockCard,
                    borderColor: isSelected ? '#d97706' : isVerified ? (isBlockValid ? '#1e293b' : '#ef4444') : '#1e293b',
                    backgroundColor: isSelected ? '#121927' : '#0b1120'
                  }}
                >
                  <div style={styles.blockCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#d97706' }}>📦</span>
                      <span style={styles.blockCardTitle}>Block #{idx}</span>
                    </div>

                    {isVerified && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: isBlockValid ? '#10b981' : '#ef4444'
                      }}>
                        {isBlockValid ? '✓ VALID' : '✖ INVALID'}
                      </span>
                    )}
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

        {/* CỘT PHẢI: CHI TIẾT BLOCK */}
        {selectedBlock && (
          <div style={styles.cardPanel}>
            <h3 style={styles.panelTitle}>Chi tiết Block #{selectedIndex}</h3>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Block Height</label>
              <div style={styles.valueBox}>{selectedIndex}</div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Hash (Lưu trữ)</label>
              <div style={{ ...styles.valueBox, fontFamily: 'monospace' }}>
                {selectedBlock.hash}
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Previous Hash</label>
              <div style={{ ...styles.valueBox, fontFamily: 'monospace' }}>
                {selectedBlock.prevHash}
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Merkle Root</label>
              <div style={{ ...styles.valueBox, fontFamily: 'monospace' }}>
                {selectedBlock.merkleRoot}
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Timestamp</label>
              <div style={styles.valueBox}>
                {new Date(selectedBlock.timestamp * 1000).toLocaleString()}
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Difficulty</label>
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

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Metadata</label>
              <div style={styles.valueBox}>
                {selectedIndex === 0 ? "Genesis Block" : `Node ${selectedIndex}`}
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Merkle Root (Transaction Body)</label>
              <div style={{ ...styles.valueBox, fontFamily: 'monospace', fontSize: '12px' }}>
                {txBodyHash}
              </div>
            </div>

            {/* BÁO CÁO XÁC MINH */}
            {isVerified && (
              <div
                style={{
                  ...styles.statusBadge,
                  backgroundColor: selectedBlockValid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  color: selectedBlockValid ? '#10b981' : '#ef4444',
                  borderColor: selectedBlockValid ? '#047857' : '#b91c1c'
                }}
              >
                {selectedBlockValid ? '✓ Hash và liên kết hợp lệ' : '✖ Khối không hợp lệ'}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

// STYLES DARK THEME
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
  btnVerify: {
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '13px',
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
  statusBadge: {
    marginTop: '16px',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid'
  }
};