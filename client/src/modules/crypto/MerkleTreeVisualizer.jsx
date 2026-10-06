import { useMemo, useState } from "react";
import { buildLevels } from "./MerkleTree.js";

const INITIAL_TRANSACTIONS = [
  "Giao dịch A",
  "Giao dịch B",
  "Giao dịch C",
  "Giao dịch D",
  "Giao dịch E",
];

// Tạo mô tả cho từng loại nút để người học hiểu dữ liệu đi từ lá lên Root.
function describeNode(node, levels) {
  if (node.level === 0) {
    return {
      badge: "NÚT LÁ",
      title: "Băm một giao dịch",
      description: "Mỗi giao dịch được chuyển thành một hash SHA-256 cố định 256-bit.",
      formula: `SHA-256("${node.transaction}")`,
    };
  }

  if (node.level === levels.length - 1) {
    return {
      badge: "GỐC MERKLE",
      title: "Dấu vân tay của cả tập dữ liệu",
      description: "Chỉ cần so sánh Root, ta có thể phát hiện bất kỳ thay đổi nào trong các giao dịch.",
      formula: "Hash cuối cùng của toàn bộ nhánh Merkle",
    };
  }

  return {
    badge: "NÚT CHA",
    title: "Ghép hai hash con",
    description: "Nút cha được tạo bằng cách nối hash trái với hash phải rồi băm lại bằng SHA-256.",
    formula: `SHA-256(${node.left.slice(0, 10)}… + ${node.right.slice(0, 10)}…)`,
  };
}

function shortHash(hash) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

// Trả về chuỗi id của node được chọn và toàn bộ các node cha trên đường lên Root.
function getPathIds(node, levels) {
  if (!node) return new Set();

  const path = new Set([node.id]);
  let level = node.level;
  let index = node.index;
  while (level < levels.length - 1) {
    index = Math.floor(index / 2);
    level += 1;
    path.add(`${level}-${index}`);
  }
  return path;
}

export default function MerkleTree() {
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [builtTransactions, setBuiltTransactions] = useState(null);
  const [clickedNodeId, setClickedNodeId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [treeZoom, setTreeZoom] = useState(1);

  const isTreeBuilt = builtTransactions !== null;
  const levels = useMemo(() => buildLevels(builtTransactions || transactions), [builtTransactions, transactions]);
  const root = levels.at(-1)[0];

  // Chuyển cấu trúc mảng thành các node có đủ thông tin để vẽ và giải thích.
  const nodesByLevel = useMemo(() => levels.map((level, levelIndex) => (
    level.map((hash, index) => ({
      id: `${levelIndex}-${index}`,
      hash,
      level: levelIndex,
      index,
      transaction: levelIndex === 0 ? (builtTransactions || transactions)[index] : undefined,
      left: levelIndex > 0 ? levels[levelIndex - 1][index * 2] : undefined,
      right: levelIndex > 0 ? levels[levelIndex - 1][index * 2 + 1] || levels[levelIndex - 1][index * 2] : undefined,
    }))
  )), [levels, builtTransactions, transactions]);

  const clickedNode = nodesByLevel.flat().find((node) => node.id === clickedNodeId);
  const selectedNode = nodesByLevel.flat().find((node) => node.id === (hoveredNodeId || clickedNodeId))
    || nodesByLevel.at(-1)[0];
  const selectedDescription = describeNode(selectedNode, levels);
  const activePath = getPathIds(selectedNode, levels);

  const addTransaction = () => {
    // Tự sinh giao dịch mới để người dùng tập trung quan sát flow của cây.
    const nextLabel = transactions.length < 26
      ? String.fromCharCode(65 + transactions.length)
      : `#${transactions.length + 1}`;
    setTransactions((current) => {
      const nextTransactions = [...current, `Giao dịch ${nextLabel}`];
      if (isTreeBuilt) setBuiltTransactions(nextTransactions);
      return nextTransactions;
    });
    setClickedNodeId(null);
  };

  const removeTransaction = (index) => {
    setTransactions((current) => {
      const nextTransactions = current.filter((_, transactionIndex) => transactionIndex !== index);
      if (isTreeBuilt) setBuiltTransactions(nextTransactions);
      return nextTransactions;
    });
    setClickedNodeId(null);
    setHoveredNodeId(null);
  };

  const buildTree = () => {
    setBuiltTransactions([...transactions]);
    setClickedNodeId(null);
  };

  const changeZoom = (amount) => {
    setTreeZoom((current) => Math.min(1.35, Math.max(0.7, Number((current + amount).toFixed(2)))));
  };

  return (
    <div className="merkle-visualizer">
      <div className="merkle-intro">
        <div>
          <span className="page-label">INTERACTIVE FLOW</span>
          <h2>Trực quan hóa Cây Merkle</h2>
          <p>Di chuyển chuột hoặc nhấn vào một node để xem flow băm dữ liệu.</p>
        </div>
        <span className="status-badge success">ĐỒNG BỘ</span>
      </div>

      <div className="merkle-workspace">
        <aside className="merkle-transactions">
          <h3>Dữ liệu khối</h3>
          <p>Nhập các giao dịch đầu vào Cây Merkle</p>
          <div className="merkle-transaction-list">
            {transactions.map((transaction, index) => (
              <div
                className={`merkle-transaction ${selectedNode?.level === 0 && selectedNode.index === index ? "active" : ""}`}
                key={`${transaction}-${index}`}
              >
                <button type="button" className="merkle-transaction-main" onClick={() => setClickedNodeId(`0-${index}`)}>
                  <span>{index + 1}</span>
                  <strong>{transaction}</strong>
                </button>
                <button
                  type="button"
                  className="merkle-remove-button"
                  onClick={() => removeTransaction(index)}
                  aria-label={`Xóa giao dịch ${index + 1}`}
                  title="Xóa node lá"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="merkle-add-transaction" type="button" onClick={addTransaction}>
            <span>＋</span> Thêm giao dịch
          </button>
          {!isTreeBuilt && (
            <button className="merkle-build-button" type="button" onClick={buildTree}>
              Xây dựng Cây Merkle
            </button>
          )}
          <div className="merkle-root-summary">
            <span>MERKLE ROOT</span>
            <code>{isTreeBuilt ? shortHash(root) : "Chưa xây dựng"}</code>
          </div>
        </aside>

        {!isTreeBuilt ? (
          <section className="merkle-tree-stage merkle-tree-empty" aria-label="Sơ đồ Cây Merkle">
            <div className="merkle-empty-state">
              <span className="merkle-empty-icon">⌘</span>
              <h3>Cây Merkle chưa được xây dựng</h3>
              <p>Thêm hoặc xóa giao dịch nếu cần, sau đó nhấn nút bên dưới để bắt đầu mô phỏng flow.</p>
              <button className="merkle-build-button" type="button" onClick={buildTree}>Xây dựng Cây Merkle</button>
            </div>
          </section>
        ) : (
        <section className="merkle-tree-stage" aria-label="Sơ đồ Cây Merkle">
          <div className="merkle-tree-toolbar">
            <span><i className="merkle-live-dot" /> Flow đang sẵn sàng · Nhấn node để kiểm tra</span>
            <span className="merkle-tree-tools">
              <button type="button" onClick={() => changeZoom(-0.1)} aria-label="Thu nhỏ cây Merkle" title="Thu nhỏ">−</button>
              <strong>{Math.round(treeZoom * 100)}%</strong>
              <button type="button" onClick={() => changeZoom(0.1)} aria-label="Phóng to cây Merkle" title="Phóng to">＋</button>
              <button type="button" onClick={() => setTreeZoom(1)} aria-label="Đưa kích thước cây về mặc định" title="Kích thước mặc định">↻</button>
              <span>{transactions.length} giao dịch · {levels.length} tầng</span>
            </span>
          </div>
          <div className="merkle-levels" style={{ transform: `scale(${treeZoom})`, transformOrigin: "top center" }}>
            {[...nodesByLevel].reverse().map((level, rowIndex) => {
              const levelNumber = levels.length - rowIndex - 1;
              return (
                <div className="merkle-level" key={levelNumber}>
                  <span className="merkle-level-label">
                    {levelNumber === levels.length - 1 ? "GỐC MERKLE" : levelNumber === 0 ? "NÚT LÁ" : `TẦNG ${levelNumber}`}
                  </span>
                  <div className="merkle-level-nodes">
                    {level.map((node) => (
                      <button
                        className={`merkle-node level-${node.level} ${clickedNode?.id === node.id ? "selected" : ""} ${activePath.has(node.id) ? "is-path" : ""}`}
                        key={node.id}
                        type="button"
                        onClick={() => setClickedNodeId(node.id)}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        aria-label={`${describeNode(node, levels).badge}: ${node.hash}`}
                      >
                        <strong>{node.level === levels.length - 1 ? "GỐC MERKLE" : shortHash(node.hash)}</strong>
                        <small>{node.level === 0 ? `TX ${node.index + 1}` : node.level === levels.length - 1 ? "ROOT" : "SHA-256 (L + R)"}</small>
                        {node.level > 0 && <i className={`merkle-node-connector ${activePath.has(node.id) ? "is-path" : ""}`} aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}

        <aside className="merkle-node-details">
          {isTreeBuilt ? (
            <>
              <span className="merkle-detail-badge">{selectedDescription.badge}</span>
              <h3>{selectedDescription.title}</h3>
              <p>{selectedDescription.description}</p>
              <div className="merkle-formula">
                <span>FLOW TÍNH TOÁN</span>
                <code>{selectedDescription.formula}</code>
              </div>
              <div className="merkle-selected-hash">
                <span>HASH NODE ĐANG CHỌN</span>
                <code>{selectedNode.hash}</code>
              </div>
              <div className="merkle-path-summary">
                <span>ĐƯỜNG XÁC MINH ĐANG CHỌN</span>
                <div className="merkle-path-steps">
                  {[...activePath].reverse().map((nodeId, index) => (
                    <span key={nodeId} className="merkle-path-step">
                      {index > 0 && <b>↓</b>}
                      <code>{nodeId === selectedNode.id ? "NODE ĐANG CHỌN" : nodeId === `${levels.length - 1}-0` ? "ROOT" : `CHA ${nodeId}`}</code>
                    </span>
                  ))}
                </div>
              </div>
              {selectedNode.level > 0 && selectedNode.level < levels.length && (
                <div className="merkle-children">
                  <span>ĐẦU VÀO</span>
                  <div><code>TRÁI: {shortHash(selectedNode.left)}</code><code>PHẢI: {shortHash(selectedNode.right)}</code></div>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="merkle-detail-badge">CHỜ XÂY DỰNG</span>
              <h3>Sẵn sàng mô phỏng</h3>
              <p>Merkle Root và các node sẽ xuất hiện sau khi bạn bấm “Xây dựng Cây Merkle”.</p>
            </>
          )}
        </aside>
      </div>
      {clickedNode && (
        <div className="merkle-detail-overlay" role="presentation" onClick={() => setClickedNodeId(null)}>
          <section className="merkle-detail-modal" role="dialog" aria-modal="true" aria-labelledby="merkle-modal-title" onClick={(event) => event.stopPropagation()}>
            <button className="merkle-modal-close" type="button" onClick={() => setClickedNodeId(null)} aria-label="Đóng chi tiết node">×</button>
            <span className="merkle-detail-badge">{describeNode(clickedNode, levels).badge}</span>
            <span className="merkle-modal-caption">BẢN ĐỒ FLOW MERKLE</span>
            <h3 id="merkle-modal-title">{describeNode(clickedNode, levels).title}</h3>
            <code className="merkle-modal-hash">{clickedNode.hash}</code>
            {clickedNode.level > 0 && clickedNode.level < levels.length && (
              <div className="merkle-modal-process">
                <span className="merkle-modal-section-title">QUÁ TRÌNH GHÉP HASH</span>
                <div className="merkle-modal-inputs">
                  <code>TRÁI<br />{shortHash(clickedNode.left)}</code>
                  <b>＋</b>
                  <code>PHẢI<br />{shortHash(clickedNode.right)}</code>
                </div>
                <span className="merkle-modal-arrow">↓</span>
                <div className="merkle-modal-sha">🔒 SHA-256<br /><small>Hash(Trái + Phải)</small></div>
                <span className="merkle-modal-arrow">↓</span>
                <div className="merkle-modal-result">{shortHash(clickedNode.hash)}</div>
              </div>
            )}
            <div className="merkle-modal-explanation">
              <strong>CÁCH TÍNH</strong>
              <p>{describeNode(clickedNode, levels).description}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
