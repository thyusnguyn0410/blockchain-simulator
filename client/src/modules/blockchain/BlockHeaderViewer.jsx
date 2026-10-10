import { useEffect, useRef, useState } from 'react';
import { Blockchain } from './coreBlockchain.js';

const ORIGINAL_DATA = [
  { difficulty: 0, txs: [{ from: 'Genesis', to: 'Alice', amount: 50, rawText: 'Genesis Block' }] },
  { difficulty: 1, txs: [{ from: 'Nguyên', to: 'Bảo', amount: 0.27, rawText: 'Nguyên gửi 0.27 BTC cho Bảo' }] },
  { difficulty: 2, txs: [{ from: 'Bob', to: 'Charlie', amount: 5.0, rawText: 'Bob gửi 5.0 BTC cho Charlie' }] },
  { difficulty: 3, txs: [{ from: 'Charlie', to: 'David', amount: 2.5, rawText: 'Charlie gửi 2.5 BTC cho David' }] },
  { difficulty: 4, txs: [{ from: 'David', to: 'Eva', amount: 1.0, rawText: 'David gửi 1.0 BTC cho Eva' }] },
];

function createInitialChain() {
  const chain = new Blockchain({ autoGenesis: false });
  ORIGINAL_DATA.forEach((item) => {
    chain.difficulty = item.difficulty;
    chain.addBlock(item.txs);
  });
  return chain;
}

function shortenedHash(hash = '') {
  return hash.length > 16 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash || '—';
}

function Icon({ name, className = '' }) {
  const common = {
    className,
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
  };

  if (name === 'reset') {
    return <svg {...common}><path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></svg>;
  }
  if (name === 'fix') {
    return <svg {...common}><path d="m14.7 6.3 3 3" /><path d="M4 20l7.2-7.2" /><path d="M14.2 4.8a4.5 4.5 0 0 0-5.7 5.7L3 16l5 5 5.5-5.5a4.5 4.5 0 0 0 5.7-5.7l-3 3-3-3 3-3z" /></svg>;
  }
  if (name === 'copy') {
    return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>;
  }
  if (name === 'check') {
    return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  }
  if (name === 'warning') {
    return <svg {...common}><path d="M12 3 2.8 19h18.4L12 3z" /><path d="M12 9v4" /><path d="M12 16h.01" /></svg>;
  }
  if (name === 'block') {
    return <svg {...common}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="m4.3 7.6 7.7 4.3 7.7-4.3M12 12v9" /></svg>;
  }
  return <svg {...common}><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></svg>;
}

function HashText({ hash, difficulty = 0, compareHash }) {
  return (
    <code className="bhv-hash-text" title={hash || 'Không có hash'}>
      {(hash || '—').split('').map((char, index) => {
        const changed = compareHash && char !== compareHash[index];
        const isPowPrefix = index < difficulty && char === '0';
        return (
          <span key={`${index}-${char}`} className={changed ? 'bhv-hash-char-changed' : isPowPrefix ? 'bhv-hash-char-pow' : ''}>
            {char}
          </span>
        );
      })}
    </code>
  );
}

function HashField({ label, hash, id, copyHash, copiedHash, difficulty = 0, compareHash, invalid = false }) {
  const isCopied = copiedHash === id;
  const copyFailed = copiedHash === `${id}-error`;
  return (
    <div className={`bhv-hash-field ${invalid ? 'is-invalid' : ''}`}>
      <span className="bhv-label">{label}</span>
      <div className="bhv-hash-value-row">
        <HashText hash={hash} difficulty={difficulty} compareHash={compareHash} />
        <button
          type="button"
          className="bhv-copy-button"
          onClick={() => copyHash(hash, id)}
          aria-label={`Sao chép ${label}`}
          title={`Sao chép ${label}`}
        >
          <Icon name={isCopied ? 'check' : 'copy'} />
          {isCopied ? 'Đã chép' : copyFailed ? 'Lỗi sao chép' : 'Sao chép'}
        </button>
      </div>
      {invalid && <span className="bhv-hash-warning">Không khớp hash của khối trước</span>}
    </div>
  );
}

export default function BlockHeaderViewer() {
  const [blockchain, setBlockchain] = useState(createInitialChain);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedHash, setCopiedHash] = useState('');
  const blocks = blockchain.toArray();
  const selectedBlock = blocks[selectedIndex] || blocks[0];
  const validationReport = blockchain.validateDetailed();
  const selectedReport = validationReport[selectedIndex] || {};
  const recalculatedHash = selectedBlock ? selectedBlock.calculateHash() : '';
  const isHashMismatched = selectedBlock && selectedBlock.hash !== recalculatedHash;
  const chainIsValid = validationReport.every((report) => report.valid);
  const firstTamperedIndex = validationReport.findIndex((report) => !report.dataOk);
  const firstBrokenLinkIndex = validationReport.findIndex((report) => !report.linkOk);
  const firstPowFailureIndex = validationReport.findIndex((report) => !report.powOk);
  const listRef = useRef(null);
  const blockRefs = useRef([]);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;
    const selectedCard = blockRefs.current[selectedIndex];
    if (!list || !selectedCard) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const listBounds = list.getBoundingClientRect();
    const cardBounds = selectedCard.getBoundingClientRect();
    const left = list.scrollLeft
      + cardBounds.left
      - listBounds.left
      - (list.clientWidth - cardBounds.width) / 2;

    list.scrollTo({
      left: Math.max(0, left),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [selectedIndex]);

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), []);

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
        to: '',
        amount: 0,
        rawText: newStringValue,
      },
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

  const handleBlockKeyDown = (event, index) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectBlock(index);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIndex = Math.min(blocks.length - 1, Math.max(0, index + (event.key === 'ArrowRight' ? 1 : -1)));
      handleSelectBlock(nextIndex);
      blockRefs.current[nextIndex]?.focus();
    }
  };

  const copyHash = async (hash, id) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(id);
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedHash(''), 1500);
    } catch {
      setCopiedHash(`${id}-error`);
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedHash(''), 1500);
    }
  };

  return (
    <div className="bhv-container">
      <header className="bhv-header">
        <p className="bhv-subtitle">Nhập vào ô DỮ LIỆU để sửa trộm một khối, bấm Fix để khôi phục.</p>
        <button type="button" className="bhv-btn-reset" onClick={handleResetChain}>
          <Icon name="reset" />
          Reset chain
        </button>
      </header>

      <div className="bhv-grid">
        <section className="bhv-panel bhv-chain-panel" aria-labelledby="bhv-chain-title">
          <div className="bhv-panel-heading">
            <div>
              <span className="bhv-eyebrow">BLOCKCHAIN</span>
              <h3 className="bhv-panel-title" id="bhv-chain-title">Chuỗi khối ({blocks.length})</h3>
            </div>
            <span className="bhv-chain-hint">Chọn một khối để xem chi tiết</span>
          </div>

          <div className={`bhv-chain-summary ${chainIsValid ? 'is-valid' : 'is-invalid'}`} role="status" aria-live="polite">
            <Icon name={chainIsValid ? 'check' : 'warning'} />
            <span>
              {chainIsValid
                ? `Toàn bộ ${blocks.length} khối hợp lệ`
                : firstTamperedIndex >= 0
                  ? `Khối #${firstTamperedIndex} bị sửa → các khối #${firstTamperedIndex + 1}…#${blocks.length - 1} bị đứt liên kết`
                  : firstBrokenLinkIndex >= 0
                    ? `Khối #${firstBrokenLinkIndex} bị đứt liên kết với khối trước`
                    : `Proof of Work của khối #${firstPowFailureIndex} không đạt độ khó yêu cầu`}
            </span>
          </div>

          <div className="bhv-block-list" ref={listRef} role="group" aria-label="Các khối trong chuỗi">
            {blocks.map((block, idx) => {
              const isSelected = selectedIndex === idx;
              const report = validationReport[idx] || {};
              const dataTampered = report.dataOk === false;
              const linkBroken = report.linkOk === false;
              const powFailed = report.powOk === false;
              const statusLabel = dataTampered
                ? 'Dữ liệu đã bị sửa'
                : linkBroken
                  ? 'Đứt mắt xích'
                  : powFailed
                    ? 'PoW không đạt'
                    : 'Hợp lệ';
              const statusClass = dataTampered
                ? 'bhv-status-invalid'
                : linkBroken || powFailed
                  ? 'bhv-status-warning'
                  : 'bhv-status-valid';

              return (
                <div className="bhv-chain-item" key={idx}>
                  <div
                    role="button"
                    tabIndex={0}
                    ref={(element) => { blockRefs.current[idx] = element; }}
                    onClick={() => handleSelectBlock(idx)}
                    onKeyDown={(event) => handleBlockKeyDown(event, idx)}
                    className={`bhv-block-card ${isSelected ? 'bhv-block-card-selected' : ''} ${!report.valid ? 'bhv-block-card-invalid' : ''}`}
                    aria-pressed={isSelected}
                    aria-label={`${idx === 0 ? 'Genesis' : `Khối ${idx}`}: ${statusLabel}`}
                  >
                    <span className="bhv-block-card-header">
                      <span className="bhv-block-card-title-wrap">
                        <Icon name="block" className="bhv-block-card-icon" />
                        <span className="bhv-block-card-title">{idx === 0 ? 'Genesis #0' : `Khối #${idx}`}</span>
                      </span>
                      <span className={`bhv-block-card-status ${statusClass}`}>
                        <Icon name={statusClass === 'bhv-status-valid' ? 'check' : 'warning'} />
                        {statusLabel}
                      </span>
                    </span>

                    <span className="bhv-card-hash-row">
                      <span className="bhv-truncate-hash" title={block.hash}>{shortenedHash(block.hash)}</span>
                      <button
                        type="button"
                        className="bhv-copy-button"
                        aria-label={`Sao chép hash của khối ${idx}`}
                        title="Sao chép hash"
                        onClick={(event) => {
                          event.stopPropagation();
                          copyHash(block.hash, `block-${idx}`);
                        }}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            copyHash(block.hash, `block-${idx}`);
                          }
                        }}
                      >
                        <Icon name={copiedHash === `block-${idx}` ? 'check' : 'copy'} />
                        {copiedHash === `block-${idx}` ? 'Đã chép' : copiedHash === `block-${idx}-error` ? 'Lỗi' : 'Sao chép'}
                      </button>
                    </span>

                    <span className="bhv-block-meta">
                      <span className="bhv-meta-chip"><small>Nonce</small><b>{block.nonce}</b></span>
                      <span className="bhv-meta-chip bhv-meta-diff"><small>Diff</small><b>{block.difficulty}</b></span>
                      <span className="bhv-meta-chip"><small>Txs</small><b>{block.transactions?.length || 0}</b></span>
                    </span>
                  </div>
                  {idx < blocks.length - 1 && (
                    <div
                      className={`bhv-chain-link ${validationReport[idx + 1]?.linkOk ? 'bhv-chain-link-valid' : 'bhv-chain-link-invalid'}`}
                      aria-label={validationReport[idx + 1]?.linkOk ? 'Liên kết hợp lệ' : 'Đứt liên kết'}
                    >
                      <span className="bhv-link-line"><Icon name="arrow" /></span>
                      <span className="bhv-link-label">
                        {validationReport[idx + 1]?.linkOk ? 'Liên kết hợp lệ' : 'Đứt liên kết'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {selectedBlock && (
          <section className="bhv-panel bhv-detail-panel" aria-labelledby="bhv-detail-title">
            <div className="bhv-detail-header">
              <div>
                <span className="bhv-eyebrow">KHỐI ĐANG CHỌN</span>
                <h3 className="bhv-panel-title" id="bhv-detail-title">
                  {selectedIndex === 0 ? 'Genesis #0' : `Khối #${selectedIndex}`}
                </h3>
              </div>
              {selectedIndex !== 0 && (
                <button type="button" className="bhv-btn-fix" onClick={handleFixBlock}>
                  <Icon name="fix" />
                  Sửa lại (Fix)
                </button>
              )}
            </div>

            <div className="bhv-detail-grid">
              <section className="bhv-detail-group" aria-labelledby="bhv-header-group-title">
                <div className="bhv-group-heading">
                  <Icon name="block" />
                  <h4 id="bhv-header-group-title">Block Header</h4>
                </div>
                <div className="bhv-header-fields">
                  <div className="bhv-field-group">
                    <span className="bhv-label">Block Height</span>
                    <div className="bhv-value-box">{selectedIndex}</div>
                  </div>
                  <div className="bhv-field-group">
                    <span className="bhv-label">Version</span>
                    <div className="bhv-value-box">{selectedBlock.version}</div>
                  </div>
                  <div className="bhv-field-group">
                    <span className="bhv-label">Thời gian</span>
                    <div className="bhv-value-box">{new Date(selectedBlock.timestamp * 1000).toLocaleString()}</div>
                  </div>
                  <div className="bhv-field-group">
                    <span className="bhv-label">Difficulty</span>
                    <div className="bhv-value-box bhv-value-warning">{selectedBlock.difficulty}</div>
                  </div>
                  <div className="bhv-field-group">
                    <span className="bhv-label">Nonce</span>
                    <div className="bhv-value-box">{selectedBlock.nonce}</div>
                  </div>
                  <HashField
                    label="Prev Hash"
                    hash={selectedBlock.prevHash}
                    id="prev-hash"
                    copyHash={copyHash}
                    copiedHash={copiedHash}
                    invalid={selectedIndex > 0 && !selectedReport.linkOk}
                  />
                  <HashField
                    label="Merkle Root"
                    hash={selectedBlock.merkleRoot}
                    id="merkle-root"
                    copyHash={copyHash}
                    copiedHash={copiedHash}
                  />
                  <div className="bhv-hash-comparison">
                    <span className="bhv-label">Hash do block lưu</span>
                    {isHashMismatched && <span className="bhv-hash-diff-legend">Ký tự đỏ: khác biệt</span>}
                    <div className="bhv-comparison-fields">
                      <HashField
                        label="Đang lưu"
                        hash={selectedBlock.hash}
                        id="stored-hash"
                        copyHash={copyHash}
                        copiedHash={copiedHash}
                        difficulty={selectedReport.powOk ? selectedBlock.difficulty : 0}
                        compareHash={isHashMismatched ? recalculatedHash : undefined}
                      />
                      {isHashMismatched && (
                        <HashField
                          label="Tính lại từ nội dung hiện tại"
                          hash={recalculatedHash}
                          id="recalculated-hash"
                          copyHash={copyHash}
                          copiedHash={copiedHash}
                          compareHash={selectedBlock.hash}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bhv-detail-group" aria-labelledby="bhv-body-group-title">
                <div className="bhv-group-heading">
                  <span className="bhv-body-icon" aria-hidden="true">01</span>
                  <h4 id="bhv-body-group-title">Block Body</h4>
                </div>
                <div className="bhv-field-group">
                  <label className={`bhv-label ${selectedIndex === 0 ? 'bhv-label-disabled' : 'bhv-label-warning'}`} htmlFor="bhv-block-data">
                    DỮ LIỆU {selectedIndex === 0 && '(Không sửa được)'}
                  </label>
                  <input
                    id="bhv-block-data"
                    type="text"
                    disabled={selectedIndex === 0}
                    className={`bhv-input-data ${selectedIndex === 0 ? 'bhv-input-data-disabled' : ''}`}
                    value={selectedBlock.transactions[0]?.rawText || ''}
                    onChange={(event) => handleDataInputChange(event.target.value)}
                    placeholder="Nhập nội dung giao dịch..."
                  />
                  {selectedIndex !== 0 && (
                    <span className="bhv-input-hint">Sửa dữ liệu sẽ làm Merkle Root đổi, khiến hash đã lưu không còn hợp lệ.</span>
                  )}
                </div>
                <div className="bhv-field-group">
                  <span className="bhv-label">Số giao dịch</span>
                  <div className="bhv-value-box">{selectedBlock.transactions?.length || 0}</div>
                </div>
              </section>
            </div>

            <div className={`bhv-status-badge ${selectedReport.valid ? 'bhv-status-badge-valid' : 'bhv-status-badge-invalid'}`}>
              <Icon name={selectedReport.valid ? 'check' : 'warning'} />
              {selectedReport.valid
                ? 'Khối hợp lệ: dữ liệu, liên kết và Proof of Work đã xác minh.'
                : !selectedReport.dataOk
                  ? 'Dữ liệu đã bị sửa: hash hiện tại không khớp với nội dung khối.'
                  : !selectedReport.linkOk
                    ? 'Đứt mắt xích: Prev Hash không khớp hash của khối trước.'
                    : 'Proof of Work không đạt độ khó yêu cầu.'}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
