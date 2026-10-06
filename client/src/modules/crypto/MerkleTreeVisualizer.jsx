import { useMemo, useState, useRef, useEffect } from "react";
import { buildLevels } from "./MerkleTree.js";

const INITIAL_TRANSACTIONS = [
  "Giao dịch A",
  "Giao dịch B",
  "Giao dịch C",
  "Giao dịch D",
  "Giao dịch E",
];

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
  const [activeDetailId, setActiveDetailId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [treeZoom, setTreeZoom] = useState(1);
  const hideTimerRef = useRef(null);

  const isTreeBuilt = builtTransactions !== null;
  const levels = useMemo(
    () => buildLevels(builtTransactions || transactions),
    [builtTransactions, transactions]
  );
  const root = levels.at(-1)[0];

  const nodesByLevel = useMemo(
    () =>
      levels.map((level, levelIndex) =>
        level.map((hash, index) => ({
          id: `${levelIndex}-${index}`,
          hash,
          level: levelIndex,
          index,
          transaction: levelIndex === 0 ? (builtTransactions || transactions)[index] : undefined,
          left: levelIndex > 0 ? levels[levelIndex - 1][index * 2] : undefined,
          right:
            levelIndex > 0
              ? levels[levelIndex - 1][index * 2 + 1] || levels[levelIndex - 1][index * 2]
              : undefined,
        }))
      ),
    [levels, builtTransactions, transactions]
  );

  const detailNode = nodesByLevel.flat().find((node) => node.id === activeDetailId);
  const activePath = detailNode ? getPathIds(detailNode, levels) : new Set();

  // ===== HOVER HANDLERS với delay =====
  const handleNodeEnter = (nodeId) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setHoveredNodeId(nodeId);
    setActiveDetailId(nodeId);
  };

  const handleNodeLeave = () => {
    setHoveredNodeId(null);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setActiveDetailId(null);
    }, 250);
  };

  const handlePanelEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handlePanelLeave = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setActiveDetailId(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // ===== ACTIONS =====
  const addTransaction = () => {
    const nextLabel =
      transactions.length < 26
        ? String.fromCharCode(65 + transactions.length)
        : `#${transactions.length + 1}`;
    setTransactions((current) => {
      const nextTransactions = [...current, `Giao dịch ${nextLabel}`];
      if (isTreeBuilt) setBuiltTransactions(nextTransactions);
      return nextTransactions;
    });
    setActiveDetailId(null);
  };

  const removeTransaction = (index) => {
    setTransactions((current) => {
      const nextTransactions = current.filter((_, i) => i !== index);
      if (isTreeBuilt) setBuiltTransactions(nextTransactions);
      return nextTransactions;
    });
    setActiveDetailId(null);
    setHoveredNodeId(null);
  };

  const buildTree = () => {
    setBuiltTransactions([...transactions]);
    setActiveDetailId(null);
  };

  const changeZoom = (amount) => {
    setTreeZoom((current) =>
      Math.min(1.35, Math.max(0.7, Number((current + amount).toFixed(2))))
    );
  };

  return (
    <div className="merkle-visualizer">
      <div className="merkle-intro">
        <div>
          <span className="page-label">INTERACTIVE FLOW</span>
          <h2>Trực quan hóa Cây Merkle</h2>
          <p>Di chuyển chuột lên một node để xem flow băm dữ liệu.</p>
        </div>
        <span className="status-badge success">ĐỒNG BỘ</span>
      </div>

      <div className="merkle-workspace">
        {/* CỘT TRÁI: GIAO DỊCH */}
        <aside className="merkle-transactions">
          <h3>Dữ liệu khối</h3>
          <p>Nhập các giao dịch đầu vào Cây Merkle</p>
          <div className="merkle-transaction-list">
            {transactions.map((transaction, index) => (
              <div
                className={`merkle-transaction ${
                  detailNode?.level === 0 && detailNode.index === index ? "active" : ""
                }`}
                key={`${transaction}-${index}`}
              >
                <button
                  type="button"
                  className="merkle-transaction-main"
                  onClick={() => handleNodeEnter(`0-${index}`)}
                >
                  <span>{index + 1}</span>
                  <strong>{transaction}</strong>
                </button>
                <button
                  type="button"
                  className="merkle-remove-button"
                  onClick={() => removeTransaction(index)}
                  aria-label={`Xóa giao dịch ${index + 1}`}
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

        {/* CỘT PHẢI: CÂY MERKLE — CHIẾM TOÀN BỘ PHẦN CÒN LẠI */}
        {!isTreeBuilt ? (
          <section className="merkle-tree-stage merkle-tree-empty" aria-label="Sơ đồ Cây Merkle">
            <div className="merkle-empty-state">
              <span className="merkle-empty-icon">⌘</span>
              <h3>Cây Merkle chưa được xây dựng</h3>
              <p>Thêm hoặc xóa giao dịch nếu cần, sau đó nhấn nút bên dưới để bắt đầu mô phỏng flow.</p>
              <button className="merkle-build-button" type="button" onClick={buildTree}>
                Xây dựng Cây Merkle
              </button>
            </div>
          </section>
        ) : (
          <section className="merkle-tree-stage" aria-label="Sơ đồ Cây Merkle">
            <div className="merkle-tree-toolbar">
              <span>
                <i className="merkle-live-dot" /> Flow đang sẵn sàng · Hover node để xem chi tiết
              </span>
              <span className="merkle-tree-tools">
                <button type="button" onClick={() => changeZoom(-0.1)} title="Thu nhỏ">−</button>
                <strong>{Math.round(treeZoom * 100)}%</strong>
                <button type="button" onClick={() => changeZoom(0.1)} title="Phóng to">＋</button>
                <button type="button" onClick={() => setTreeZoom(1)} title="Mặc định">↻</button>
                <span>
                  {transactions.length} giao dịch · {levels.length} tầng
                </span>
              </span>
            </div>

            <div
              className="merkle-levels"
              style={{ transform: `scale(${treeZoom})`, transformOrigin: "top center" }}
            >
              {[...nodesByLevel].reverse().map((level, rowIndex) => {
                const levelNumber = levels.length - rowIndex - 1;
                return (
                  <div className="merkle-level" key={levelNumber}>
                    <span className="merkle-level-label">
                      {levelNumber === levels.length - 1
                        ? "GỐC MERKLE"
                        : levelNumber === 0
                        ? "NÚT LÁ"
                        : `TẦNG ${levelNumber}`}
                    </span>
                    <div className="merkle-level-nodes">
                      {level.map((node) => (
                        <button
                          className={`merkle-node level-${node.level} ${
                            activeDetailId === node.id ? "selected" : ""
                          } ${activePath.has(node.id) ? "is-path" : ""}`}
                          key={node.id}
                          type="button"
                          onMouseEnter={() => handleNodeEnter(node.id)}
                          onMouseLeave={handleNodeLeave}
                          onClick={() => handleNodeEnter(node.id)}
                          aria-label={`${describeNode(node, levels).badge}: ${node.hash}`}
                        >
                          <strong>
                            {node.level === levels.length - 1 ? "GỐC MERKLE" : shortHash(node.hash)}
                          </strong>
                          <small>
                            {node.level === 0
                              ? `TX ${node.index + 1}`
                              : node.level === levels.length - 1
                              ? "ROOT"
                              : "SHA-256 (L + R)"}
                          </small>
                          {node.level > 0 && (
                            <i
                              className={`merkle-node-connector ${
                                activePath.has(node.id) ? "is-path" : ""
                              }`}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* PANEL FLOATING — CHỈ HIỆN KHI HOVER/CLICK NODE */}
        {detailNode && isTreeBuilt && (
          <aside
            className="merkle-node-details-floating"
            onMouseEnter={handlePanelEnter}
            onMouseLeave={handlePanelLeave}
          >
            <button
              className="merkle-detail-close"
              type="button"
              onClick={() => setActiveDetailId(null)}
              aria-label="Đóng chi tiết node"
            >
              ×
            </button>

            <span className="merkle-detail-badge">
              {describeNode(detailNode, levels).badge}
            </span>
            <h3>{describeNode(detailNode, levels).title}</h3>
            <p>{describeNode(detailNode, levels).description}</p>

            <div className="merkle-formula">
              <span>FLOW TÍNH TOÁN</span>
              <code>{describeNode(detailNode, levels).formula}</code>
            </div>

            <div className="merkle-selected-hash">
              <span>HASH NODE ĐANG CHỌN</span>
              <code>{detailNode.hash}</code>
            </div>

            <div className="merkle-path-summary">
              <span>ĐƯỜNG XÁC MINH</span>
              <div className="merkle-path-steps">
                {[...activePath].reverse().map((nodeId, index) => (
                  <span key={nodeId} className="merkle-path-step">
                    {index > 0 && <b>↓</b>}
                    <code>
                      {nodeId === detailNode.id
                        ? "NODE ĐANG CHỌN"
                        : nodeId === `${levels.length - 1}-0`
                        ? "ROOT"
                        : `CHA ${nodeId}`}
                    </code>
                  </span>
                ))}
              </div>
            </div>

            {detailNode.level > 0 && detailNode.level < levels.length && (
              <div className="merkle-children">
                <span>ĐẦU VÀO</span>
                <div>
                  <code>TRÁI: {shortHash(detailNode.left)}</code>
                  <code>PHẢI: {shortHash(detailNode.right)}</code>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
