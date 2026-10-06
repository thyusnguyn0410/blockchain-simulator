import React, { useMemo, useState, useRef, useEffect } from "react";
import { calculateSHA256 } from "./SHA-256.js";

const INITIAL_TRANSACTIONS = [
  "Alice -> Bob: 2.5 coin",
  "Bob -> Carol: 1.0 coin",
  "Carol -> Dave: 0.4 coin",
  "Dave -> Alice: 0.1 coin",
  "Eve -> Alice: 3.0 coin",
];

export function buildLevels(transactions) {
  if (!transactions || transactions.length === 0) {
    return [["0".repeat(64)]];
  }
  const levels = [
    transactions.map((tx) =>
      calculateSHA256(typeof tx === "string" ? tx : JSON.stringify(tx))
    ),
  ];

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

function shortHash(hash = "") {
  if (!hash) return "—";
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function describeNode(node, levels) {
  if (node.level === 0) {
    return {
      badge: "NÚT LÁ",
      title: "Băm một giao dịch đơn lẻ",
      description: "Giao dịch đầu vào được chuyển thành một hash SHA-256 256-bit duy nhất.",
      formula: `SHA-256("${node.transaction}")`,
    };
  }

  if (node.level === levels.length - 1) {
    return {
      badge: "GỐC MERKLE (ROOT)",
      title: "Dấu vân tay mã hóa của toàn bộ khối",
      description: "Chỉ cần so khớp Merkle Root trong Block Header, ta chứng minh được tính toàn vẹn của mọi giao dịch trong khối.",
      formula: "Hash gốc cuối cùng được ghi vào Block Header",
    };
  }

  return {
    badge: "NÚT CHA TRUNG GIAN",
    title: "Ghép cặp hai hash con (Left + Right)",
    description: "Nút cha được tạo bằng cách nối chuỗi hash trái với hash phải rồi băm lại bằng SHA-256.",
    formula: `SHA-256(${shortHash(node.left)} + ${shortHash(node.right)})`,
  };
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
  const [builtTransactions, setBuiltTransactions] = useState(INITIAL_TRANSACTIONS);
  const [activeDetailId, setActiveDetailId] = useState(null);
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

  const handleNodeEnter = (nodeId) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setActiveDetailId(nodeId);
  };

  const handleNodeLeave = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setActiveDetailId(null);
    }, 300);
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
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const addTransaction = () => {
    const nextIdx = transactions.length + 1;
    const newTx = `User_${nextIdx} -> User_${nextIdx + 1}: ${(Math.random() * 5 + 0.1).toFixed(2)} coin`;
    setTransactions((prev) => {
      const next = [...prev, newTx];
      if (isTreeBuilt) setBuiltTransactions(next);
      return next;
    });
    setActiveDetailId(null);
  };

  const removeTransaction = (index) => {
    setTransactions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (isTreeBuilt) setBuiltTransactions(next);
      return next;
    });
    setActiveDetailId(null);
  };

  const buildTree = () => {
    setBuiltTransactions([...transactions]);
    setActiveDetailId(null);
  };

  const changeZoom = (amount) => {
    setTreeZoom((cur) => Math.min(1.35, Math.max(0.7, Number((cur + amount).toFixed(2)))));
  };

  return (
    <div className="merkle-visualizer">
      {/* HEADER SECTION */}
      <div className="merkle-intro">
        <div>
          <span className="page-label">INTERACTIVE CRYPTO LAB</span>
          <h2>Trực quan hóa Cây Merkle</h2>
          <p>Rê chuột hoặc nhấp vào một node trên cây để khám phá dòng băm và đường dẫn chứng minh (Proof Path).</p>
        </div>
        <span className="status-badge success">ĐỒNG BỘ MẠNG</span>
      </div>

      <div className="merkle-workspace">
        {/* CỘT 1: DANH SÁCH GIAO DỊCH */}
        <aside className="merkle-transactions">
          <h3>Dữ liệu khối</h3>
          <p>Danh sách các giao dịch đầu vào tạo nên Merkle Tree</p>
          <div className="merkle-transaction-list">
            {transactions.map((tx, idx) => (
              <div
                className={`merkle-transaction ${
                  detailNode?.level === 0 && detailNode.index === idx ? "active" : ""
                }`}
                key={`${tx}-${idx}`}
              >
                <button
                  type="button"
                  className="merkle-transaction-main"
                  onClick={() => handleNodeEnter(`0-${idx}`)}
                >
                  <span>{idx + 1}</span>
                  <strong>{tx}</strong>
                </button>
                <button
                  type="button"
                  className="merkle-remove-button"
                  onClick={() => removeTransaction(idx)}
                  aria-label={`Xóa giao dịch ${idx + 1}`}
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
            <span>MERKLE ROOT (BLOCK HEADER)</span>
            <code>{isTreeBuilt ? shortHash(root) : "Chưa xây dựng"}</code>
          </div>
        </aside>

        {/* CỘT 2: SÂN KHẤU CÂY MERKLE TOÀN CẢNH */}
        {!isTreeBuilt ? (
          <section className="merkle-tree-stage merkle-tree-empty" aria-label="Sơ đồ Cây Merkle">
            <div className="merkle-empty-state">
              <span className="merkle-empty-icon">⌘</span>
              <h3>Cây Merkle chưa được xây dựng</h3>
              <p>Thêm hoặc xóa bớt các giao dịch ở cột trái, sau đó nhấn nút bên dưới để tính toán toàn bộ cây.</p>
              <button className="merkle-build-button" type="button" onClick={buildTree}>
                Xây dựng Cây Merkle
              </button>
            </div>
          </section>
        ) : (
          <section className="merkle-tree-stage" aria-label="Sơ đồ Cây Merkle">
            <div className="merkle-tree-toolbar">
              <span>
                <i className="merkle-live-dot" /> Di chuột lên node để xem chi tiết mã băm
              </span>
              <span className="merkle-tree-tools">
                <button type="button" onClick={() => changeZoom(-0.1)} title="Thu nhỏ">−</button>
                <strong>{Math.round(treeZoom * 100)}%</strong>
                <button type="button" onClick={() => changeZoom(0.1)} title="Phóng to">＋</button>
                <button type="button" onClick={() => setTreeZoom(1)} title="Khôi phục">↻</button>
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
                        ? "GỐC MERKLE (ROOT)"
                        : levelNumber === 0
                        ? "NÚT LÁ (LEAF TRANSACTIONS)"
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
                            {node.level === levels.length - 1 ? "MERKLE ROOT" : shortHash(node.hash)}
                          </strong>
                          <small>
                            {node.level === 0
                              ? `TX ${node.index + 1}`
                              : node.level === levels.length - 1
                              ? "BLOCK HEADER"
                              : "SHA-256 (L + R)"}
                          </small>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* BẢNG FLOATING DETAILS — CHỈ HIỂN THỊ KHI HOVER / CLICK NODE */}
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
              <span>MÃ BĂM (SHA-256):</span>
              <code>{detailNode.hash}</code>
            </div>

            <div className="merkle-path-summary">
              <span>ĐƯỜNG XÁC MINH (PROOF PATH):</span>
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
                <span>HAI NHÁNH ĐẦU VÀO:</span>
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
