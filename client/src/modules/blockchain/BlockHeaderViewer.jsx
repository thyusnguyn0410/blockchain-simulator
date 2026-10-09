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

  const validationReport = blockchain.validateDetailed();
  const selectedReport = validationReport[selectedIndex] || {};

  const recalculatedHash = selectedBlock ? selectedBlock.calculateHash() : '';
  const isHashMismatched = selectedBlock && selectedBlock.hash !== recalculatedHash;

  const handleSelectBlock = (idx) => {
    setSelectedIndex(idx);
  };

  const handleResetChain = () => {
    setBlockchain(createInitialChain());
    setSelectedIndex(0);
  };

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

  const handleFixBlock = () => {
    if (selectedIndex === 0) return;
    for (let i = selectedIndex; i < ORIGINAL_DATA.length; i++) {
      const block = blockchain.at(i);
      if (block) {
        block.transactions = JSON.parse(JSON.stringify(ORIGINAL_DATA[i].txs));
        block.refreshMerkleRoot();
      }
    }
    blockchain.recomputeFrom(selectedIndex);
    setBlockchain(blockchain.clone());
  };

  return (
    <div className="bhv-container">
      {/* HEADER */}
      <div className="bhv-header">
        <div className="bhv-header-left">
          <div className="bhv-search-icon">🔍</div>
          <div>
            <h2 className="bhv-title">Blockchain Explorer</h2>
            <p className="bhv-subtitle">
              Mô phỏng Blockchain với Difficulty riêng biệt. Nhập/xóa ô DỮ LIỆU để sửa trộm, bấm "Fix" để khôi phục dữ liệu ban đầu.
            </p>
          </div>
        </div>
      </div>

      {/* ACTION ROW */}
      <div className="bhv-action-row">
        <div />
        <button className="bhv-btn-reset" onClick={handleResetChain}>
          🔄 Reset chain
        </button>
      </div>

      {/* GRID CONTAINER */}
      <div className="bhv-grid">
        {/* CỘT TRÁI: DANH SÁCH KHỐI */}
        <div className="bhv-panel">
          <h3 className="bhv-panel-title">Danh sách khối ({blocks.length})</h3>

          <div className="bhv-block-list">
            {blocks.map((block, idx) => {
              const isSelected = selectedIndex === idx;
              const report = validationReport[idx] || {};

              let statusLabel = '✓ Hợp lệ';
              let statusClass = 'bhv-status-valid';

              if (!report.dataOk) {
                statusLabel = '✖ Dữ liệu đã bị sửa';
                statusClass = 'bhv-status-invalid';
              } else if (!report.linkOk) {
                statusLabel = '✖ INVALID · Đứt mắt xích';
                statusClass = 'bhv-status-invalid';
              }

              return (
                <React.Fragment key={idx}>
                <button
                  type="button"
                  onClick={() => handleSelectBlock(idx)}
                  className={`bhv-block-card ${isSelected ? 'bhv-block-card-selected' : ''} ${!report.valid ? 'bhv-block-card-invalid' : ''}`}
                  aria-pressed={isSelected}
                >
                  <div className="bhv-block-card-header">
                    <div className="bhv-block-card-title-wrap">
                      <span className="bhv-block-card-icon">📦</span>
                      <span className="bhv-block-card-title">
                        {idx === 0 ? "Khối Genesis (#0)" : `Khối #${idx}`}
                      </span>
                    </div>

                    <span className={`bhv-block-card-status ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="bhv-truncate-hash">
                    {block.hash ? `${block.hash.substring(0, 38)}...` : ''}
                  </div>

                  <div className="bhv-block-meta">
                    <span>Nonce: {block.nonce}</span>
                    <span className="bhv-meta-diff">Diff: {block.difficulty}</span>
                    <span>Txs: {block.transactions?.length || 0}</span>
                  </div>
                </button>
                {idx < blocks.length - 1 && (
                  <div className={`bhv-chain-link ${validationReport[idx + 1]?.linkOk ? 'bhv-chain-link-valid' : 'bhv-chain-link-invalid'}`} aria-label={validationReport[idx + 1]?.linkOk ? 'Liên kết khối hợp lệ' : 'INVALID: liên kết khối bị đứt'}>
                    <span aria-hidden="true">→</span>
                    <span>{validationReport[idx + 1]?.linkOk ? 'Liên kết hợp lệ' : 'INVALID'}</span>
                  </div>
                )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT KHỐI ĐANG CHỌN */}
        {selectedBlock && (
          <div className="bhv-panel">
            <div className="bhv-detail-header">
              <h3 className="bhv-panel-title">
                Chi tiết {selectedIndex === 0 ? "Khối Genesis (#0)" : `Khối #${selectedIndex}`}
              </h3>

              {selectedIndex !== 0 && (
                <button className="bhv-btn-fix" onClick={handleFixBlock}>
                  🔧 Sửa lại (Fix)
                </button>
              )}
            </div>

            <div className="bhv-field-group">
              <label className="bhv-label">Block Height</label>
              <div className="bhv-value-box">{selectedIndex}</div>
            </div>

            <div className="bhv-field-group">
              <label className={`bhv-label ${selectedIndex === 0 ? 'bhv-label-disabled' : 'bhv-label-warning'}`}>
                DỮ LIỆU {selectedIndex === 0 && '(Không sửa được)'}
              </label>
              <input
                type="text"
                disabled={selectedIndex === 0}
                className={`bhv-input-data ${selectedIndex === 0 ? 'bhv-input-data-disabled' : ''}`}
                value={selectedBlock.transactions[0]?.rawText || ''}
                onChange={(e) => handleDataInputChange(e.target.value)}
                placeholder="Nhập nội dung giao dịch..."
              />
            </div>

            <div className="bhv-field-group">
              <label className="bhv-label">THỜI GIAN</label>
              <div className="bhv-value-box">
                {new Date(selectedBlock.timestamp * 1000).toLocaleString()}
              </div>
            </div>

            <div className="bhv-field-group">
              <label className="bhv-label">PREV HASH</label>
              <div className={`bhv-value-box bhv-value-mono ${!selectedReport.linkOk ? 'bhv-value-error' : ''}`}>
                {selectedBlock.prevHash}
              </div>
            </div>

            <div className="bhv-field-group">
              <label className="bhv-label">HASH (Đang lưu)</label>
              <div className="bhv-value-box bhv-value-mono">
                {selectedBlock.hash}
              </div>
            </div>

            {isHashMismatched && (
              <div className="bhv-field-group bhv-mismatch-box">
                <label className="bhv-label bhv-label-error">HASH TÍNH LẠI</label>
                <div className="bhv-value-box bhv-value-mono bhv-value-error">
                  {recalculatedHash}
                </div>
                <div className="bhv-mismatch-note">
                  ↑ Khác với Hash đang lưu ⇒ Dữ liệu khối này đã bị sửa trộm!
                </div>
              </div>
            )}

            <div className="bhv-field-group">
              <label className="bhv-label">Merkle Root</label>
              <div className="bhv-value-box bhv-value-mono">
                {selectedBlock.merkleRoot}
              </div>
            </div>

            <div className="bhv-field-group">
              <label className="bhv-label">Difficulty (Độ khó khối)</label>
              <div className="bhv-value-box bhv-value-warning">
                {selectedBlock.difficulty}
              </div>
            </div>

            <div className="bhv-field-group">
              <label className="bhv-label">Nonce</label>
              <div className="bhv-value-box">{selectedBlock.nonce}</div>
            </div>

            <div className="bhv-field-group">
              <label className="bhv-label">Version</label>
              <div className="bhv-value-box">{selectedBlock.version}</div>
            </div>

            <div className="bhv-field-group">
              <label className="bhv-label">Số giao dịch</label>
              <div className="bhv-value-box">{selectedBlock.transactions?.length || 0}</div>
            </div>

            {/* TRẠNG THÁI */}
            <div
              className={`bhv-status-badge ${selectedReport.valid ? 'bhv-status-badge-valid' : 'bhv-status-badge-invalid'}`}
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
