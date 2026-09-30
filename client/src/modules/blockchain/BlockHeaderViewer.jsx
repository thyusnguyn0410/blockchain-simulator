import React, { useState } from 'react';
import { Blockchain } from './coreBlockchain.js';
import { calculateSHA256 as sha256 } from '../crypto/SHA-256.js';

export default function BlockHeaderViewer() {
  const createInitialChain = () => {
    const chain = new Blockchain({ autoGenesis: true, difficulty: 0 });
    chain.addBlock([
      { sender: "Alice", recipient: "Bob", amount: 12.5 }
    ]);

    chain.toArray().forEach(block => {
      block.originalTransactions = JSON.parse(JSON.stringify(block.transactions));
      block.originalMerkleRoot = block.merkleRoot;
    });

    return chain;
  };

  const [blockchain, setBlockchain] = useState(createInitialChain);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [, forceUpdate] = useState({});

  const [sender, setSender] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const blocks = blockchain.toArray();
  const selectedBlock = blocks[selectedIndex] || blocks[0];

  // Tìm chỉ số của Khối ĐẦU TIÊN trong chuỗi bị hỏng (First Broken Block Index)
  const getFirstBrokenIndex = () => {
    let chainIsBroken = false;
    for (let idx = 0; idx < blocks.length; idx++) {
      const block = blocks[idx];
      const isSelfHashValid = block.hash === block.calculateHash();
      const isLinkValid = idx === 0 ? true : block.prevHash === blocks[idx - 1].hash;

      if (!isSelfHashValid || !isLinkValid) {
        return idx; // Khối đầu tiên phát hiện bị sai
      }
    }
    return -1; // Chuỗi hoàn toàn hợp lệ
  };

  const firstBrokenIdx = getFirstBrokenIndex();

  const getChainValidityStatus = () => {
    if (firstBrokenIdx === -1) {
      return blocks.map(() => true);
    }
    // Tất cả các khối từ firstBrokenIdx trở đi đều bị INVALID
    return blocks.map((_, idx) => idx < firstBrokenIdx);
  };

  const validityStatusList = getChainValidityStatus();
  const selectedBlockValid = validityStatusList[selectedIndex];

  const calculatedHash = selectedBlock ? selectedBlock.calculateHash() : '';
  const txBodyHash = selectedBlock
    ? sha256(JSON.stringify(selectedBlock.transactions))
    : '';

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
    setSender('');
    setRecipient('');
    setAmount('');
  };

  const handleAddBlock = (e) => {
    e.preventDefault();
    if (!sender || !recipient || !amount) return;

    const newTx = [{ sender, recipient, amount: Number(amount) }];
    const newBlock = blockchain.addBlock(newTx);

    newBlock.originalTransactions = JSON.parse(JSON.stringify(newTx));
    newBlock.originalMerkleRoot = newBlock.merkleRoot;

    setSender('');
    setRecipient('');
    setAmount('');
    setSelectedIndex(blockchain.length - 1);
    setIsVerified(false);
    forceUpdate({});
  };

  // GIẢ MẠO DỮ LIỆU KHỐI (TAMPER)
  const handleTamperBlock = (idx) => {
    if (idx === 0) return;

    const fakeTransactions = [
      { sender: "Hacker_" + Math.floor(Math.random() * 1000), recipient: "Attacker", amount: 999999 }
    ];
    
    blockchain.tamper(idx, fakeTransactions);
    setIsVerified(false);
    forceUpdate({});
  };

  // VÁ KHỐI: BẮT BUỘC KHÔI PHỤC TỪ KHỐI ĐẦU TIÊN BỊ HỎNG
  const handleFixBlock = (targetIdx) => {
    const allBlocks = blockchain.toArray();

    for (let i = targetIdx; i < allBlocks.length; i++) {
      const b = allBlocks[i];
      if (b.originalTransactions) {
        b.transactions = JSON.parse(JSON.stringify(b.originalTransactions));
        b.merkleRoot = b.originalMerkleRoot;
      }
    }

    blockchain.recomputeFrom(targetIdx);
    
    setIsVerified(false);
    forceUpdate({});
  };

  return (
    <div style={styles.container}>
      {/* HEADER EXPLORER */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.searchIconBox}>🔍</div>
          <div>
            <h2 style={styles.title}>Blockchain Explorer</h2>
            <p style={styles.subtitle}>Duyệt khối, xem chi tiết, giả mạo/vá chuỗi và xác minh toàn bộ chuỗi.</p>
          </div>
        </div>
      </div>

      {/* ACTION ROW */}
      <div style={styles.actionRow}>
        <form onSubmit={handleAddBlock} style={styles.addBlockForm}>
          <span style={styles.formTitle}>➕ Thêm giao dịch:</span>
          <input
            placeholder="Người gửi"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            style={styles.input}
            required
          />
          <input
            placeholder="Người nhận"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="number"
            placeholder="Số lượng"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ ...styles.input, width: '90px' }}
            required
          />
          <button type="submit" style={styles.btnAdd}>
            ⛏️ Đào & Thêm khối
          </button>
        </form>

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
              const isFirstBrokenBlock = idx === firstBrokenIdx;

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
                    {block.hash.substring(0, 38)}...
                  </div>

                  <div style={styles.blockMetaInfo}>
                    <span>Nonce: {block.nonce}</span>
                    <span>Diff: {block.difficulty}</span>
                    <span>Txs: {block.transactions?.length || 0}</span>
                  </div>

                  {/* NÚT THAO TÁC CÓ BẢO VỆ CHUỖI KHỎI VÁ SAI VỊ TRÍ */}
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                    {idx === 0 ? (
                      <span style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                        🔒 Block Genesis cố định
                      </span>
                    ) : isBlockValid ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleTamperBlock(idx); }}
                        style={styles.btnTamper}
                      >
                        ⚠️ Sửa dữ liệu (Giả mạo)
                      </button>
                    ) : isFirstBrokenBlock ? (
                      /* CHỈ CHO PHÉP VÁ NẾU ĐÂY LÀ KHỐI NGUỒN PHÁT SINH LỖI */
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleFixBlock(idx); }}
                        style={styles.btnFix}
                      >
                        🔧 Vá nguồn lỗi (Khôi phục Block #{idx})
                      </button>
                    ) : (
                      /* CÁC KHỐI ĐẮNG SAU BỊ ẢNH HƯỞNG DÂY CHUYỀN */
                      <span style={{ fontSize: '11px', color: '#ef4444', fontStyle: 'italic' }}>
                        ⚠️ Cần vá từ Block #{firstBrokenIdx} trước
                      </span>
                    )}
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
              <div style={styles.valueBox}>{selectedBlock.difficulty}</div>
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
              <label style={styles.label}>Giao dịch (Body)</label>
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
                {selectedBlockValid
                  ? '✓ Hash khớp'
                  : `✖ Hash không khớp (Bị ảnh hưởng do lỗi từ Block #${firstBrokenIdx})`}
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
  addBlockForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#0b0f19',
    border: '1px solid #1e293b',
    padding: '10px 16px',
    borderRadius: '8px'
  },
  formTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#9ca3af'
  },
  input: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    color: '#e5e7eb',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none'
  },
  btnAdd: {
    backgroundColor: '#d97706',
    color: '#ffffff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer'
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
  btnTamper: {
    backgroundColor: '#991b1b',
    color: '#ffffff',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  btnFix: {
    backgroundColor: '#d97706',
    color: '#ffffff',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
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