import React, { useMemo, useState } from "react";
import MainLayout from "./layouts/MainLayout";
import Sha256Visualizer from "./modules/crypto/Sha256Visualizer";
import BlockHeaderViewer from "./modules/blockchain/BlockHeaderViewer";
import MempoolManager from "./modules/blockchain/MempoolManager";
import ProofOfWorkSimulator from "./modules/blockchain/ProofOfWorkSimulator";
import MerkleTree from "./modules/crypto/MerkleTreeVisualizer.jsx";
import EcdsaVisualizer from "./modules/crypto/EcdsaVisualizer.jsx";
import NetworkDashboard from "./modules/network/NetworkDashboard.jsx";
import AttackSimulator from "./components/AttackSimulator.jsx";
import ChatBot from "./components/ChatBot.jsx";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePolling } from "./hooks/usePolling";
import Button from "./components/Button";
import Card from "./components/Card";
import DataTable from "./components/Table";
import "./App.css";

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value || 0);

const shortHash = (value = "") =>
  value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value || "—";

const flowSteps = [
  { label: "Alice tạo ví", module: "ECDSA", icon: "01" },
  { label: "Ký giao dịch", module: "ECDSA", icon: "02" },
  { label: "Broadcast giao dịch", module: "Network", icon: "03" },
  { label: "Xác minh chữ ký", module: "ECDSA", icon: "04" },
  { label: "Đưa vào Mempool", module: "Mempool", icon: "05" },
  { label: "Tạo Merkle Root", module: "Merkle", icon: "06" },
  { label: "Đào Proof of Work", module: "Proof of Work", icon: "07" },
  { label: "Broadcast Block", module: "Network", icon: "08" },
  { label: "Đồng thuận mạng", module: "Network", icon: "09" },
  { label: "Cập nhật Blockchain", module: "Block Header", icon: "10" },
];

const getTransactions = (blocks = [], mempool = []) => {
  const confirmed = blocks.flatMap((block) =>
    (block.transactions || []).map((tx) => ({
      ...tx,
      hash: tx.txid || tx.id || `${block.hash || block.index}-${tx.from || tx.sender || "tx"}`,
      status: "Confirmed",
      block: block.index ?? block.height ?? "—",
    }))
  );

  const pending = mempool.map((tx) => ({
    ...tx,
    hash: tx.txid || tx.id || "pending",
    status: "Pending",
    block: "—",
  }));

  return [...pending, ...confirmed].slice(0, 8);
};

function MetricCard({ label, value, detail, icon, tone = "cyan" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-card-heading">
        <span>{label}</span>
        <span className="metric-icon" aria-hidden="true">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ActivityChart({ logs = [], transactions = [] }) {
  const bars = useMemo(() => {
    if (logs.length > 0) {
      const recent = logs.slice(-12);
      return recent.map((entry, index) =>
        Math.min(100, Math.max(25, 25 + ((entry.message?.length || (index + 1) * 13) % 70)))
      );
    }

    const txCount = transactions.length;
    return Array.from({ length: 12 }, (_, index) => {
      if (index === 11) {
        return Math.min(100, Math.max(20, txCount * 15));
      }
      return Math.min(95, Math.max(15, (index * 7 + txCount * 9) % 85));
    });
  }, [logs, transactions]);

  return (
    <Card
      title="Network activity"
      description="Recent events reported by the active node"
      className="activity-card"
    >
      <div className="chart" aria-label="Recent network activity chart">
        {bars.map((height, index) => (
          <div className="chart-column" key={`activity-bar-${index}`}>
            <div className="chart-bar" style={{ height: `${height}%` }} />
            <span>{index + 1}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-dot cyan-dot" />Events per polling window
        </span>
        <span>
          {logs.length
            ? `${logs.length} logs received`
            : `${transactions.length} active transactions tracked`}
        </span>
      </div>
    </Card>
  );
}

function NetworkStatus({ nodeStatus, activeUrl, loading, error, connection }) {
  const online = nodeStatus?.status === "online" || connection === "connected";

  return (
    <Card title="Network status" description="Connection health across the simulator">
      <div className="status-list">
        <div className="status-row">
          <span>REST API</span>
          <strong className={online ? "status-success" : "status-warning"}>
            <i />{loading ? "Checking…" : online ? "Online" : "Offline"}
          </strong>
        </div>
        <div className="status-row">
          <span>WebSocket</span>
          <strong className={connection === "connected" ? "status-success" : "status-warning"}>
            <i />
            {connection === "connected"
              ? "Connected"
              : connection === "connecting"
              ? "Connecting"
              : "Disconnected"}
          </strong>
        </div>
        <div className="status-row">
          <span>Connected peers</span>
          <strong>{nodeStatus?.peers ?? 0}</strong>
        </div>
        <div className="status-row">
          <span>Difficulty</span>
          <strong>{nodeStatus?.difficulty ?? 2}</strong>
        </div>
        <div className="status-row">
          <span>Active node</span>
          <strong className="status-cyan node-url" title={activeUrl || "No active node"}>
            {activeUrl || import.meta.env.VITE_API_URL || "Connecting..."}
          </strong>
        </div>
        {error && <p className="inline-error">{error.message}</p>}
      </div>
    </Card>
  );
}

function TransactionsPanel({ transactions }) {
  const columns = [
    {
      key: "hash",
      label: "Transaction hash",
      render: (row) => <span className="hash">{shortHash(row.hash)}</span>,
    },
    {
      key: "from",
      label: "From",
      render: (row) => <span className="address">{shortHash(row.from || row.sender)}</span>,
    },
    {
      key: "to",
      label: "To",
      render: (row) => <span className="address">{shortHash(row.to || row.recipient)}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => (row.amount === undefined ? "—" : Number(row.amount).toFixed(4)),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`status-badge ${row.status === "Pending" ? "warning" : "success"}`}>
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <Card
      title="Recent transactions"
      description="Latest transactions observed on the network"
      actions={<span className="panel-count">{transactions.length} shown</span>}
      className="transactions-panel"
    >
      <DataTable columns={columns} rows={transactions} />
    </Card>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState("Tổng quan");
  const [showChat, setShowChat] = useState(false);

  const { blocks = [], mempool = [], logs = [], connection, latestBlock } = useWebSocket();
  const { data: nodeStatus, activeUrl, loading, error, refresh, onlineNodeCount } = usePolling();

  const transactions = useMemo(() => getTransactions(blocks, mempool), [blocks, mempool]);
  const totalTransactions =
    blocks.reduce((total, block) => total + (block.transactions?.length || 0), 0) + mempool.length;

  const handleNavigate = (label) => {
    setActiveSection(label);
    const targetMap = {
      "Tổng quan": "dashboard-overview",
      "SHA-256": "sha256-tool",
      ECDSA: "ecdsa-tool",
      Merkle: "merkle-tree-tab",
      "Block Header": "blockheader-tool",
      Mempool: "mempool-tool",
      "Proof of Work": "pow-tool",
      Dashboard: "network-dashboard",
      Network: "network-dashboard",
      "Attack Simulator": "attack-simulator",
    };
    const target = document.getElementById(targetMap[label] || "dashboard-overview");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNewSimulation = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    refresh();
  };

  return (
    <MainLayout
      activeItem={activeSection}
      onNavigate={handleNavigate}
      connection={connection}
    >
      <div className="dashboard" id="dashboard-overview">
        <header className="page-header">
          <div>
            <span className="page-label">BLOCKCHAIN SIMULATOR / LEARNING PATH</span>
            <h1>Tổng quan Blockchain</h1>
            <p>Theo dõi luồng giao dịch từ ví Alice đến khi các node thống nhất block mới.</p>
          </div>
          <Button onClick={handleNewSimulation} aria-label="Làm mới trạng thái mô phỏng">
            ↻ Làm mới mô phỏng
          </Button>
        </header>

        <section className="overview-flow" aria-labelledby="overview-flow-title">
          <div className="overview-flow-heading">
            <div>
              <span className="page-label">10 BƯỚC END-TO-END</span>
              <h2 id="overview-flow-title">Từ giao dịch đến đồng thuận</h2>
            </div>
            <p>Bấm vào một bước để mở công cụ minh họa tương ứng.</p>
          </div>
          <ol className="flow-steps">
            {flowSteps.map((step) => (
              <li key={step.icon}>
                <button
                  type="button"
                  className="flow-step"
                  onClick={() => handleNavigate(step.module)}
                  aria-label={`Bước ${step.icon}: ${step.label}. Mở module ${step.module}`}
                >
                  <span className="flow-step-number">{step.icon}</span>
                  <strong>{step.label}</strong>
                  <span className="flow-step-module">{step.module}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="stats-grid" aria-label="Network metrics">
          <MetricCard
            label="Total transactions"
            value={formatNumber(totalTransactions)}
            detail="Confirmed + pending"
            icon="⇄"
            tone="cyan"
          />
          <MetricCard
            label="Active nodes"
            value={formatNumber(onlineNodeCount || (nodeStatus?.peers ? nodeStatus.peers + 1 : 1))}
            detail={nodeStatus?.status === "online" ? "Reporting online" : "Waiting for node"}
            icon="◎"
            tone="green"
          />
          <MetricCard
            label="Latest block"
            value={`#${latestBlock?.index ?? nodeStatus?.height ?? 0}`}
            detail={latestBlock ? shortHash(latestBlock.hash) : "Awaiting snapshot"}
            icon="#"
            tone="purple"
          />
          <MetricCard
            label="Mempool"
            value={formatNumber(mempool.length)}
            detail="Transactions awaiting mining"
            icon="⌁"
            tone="orange"
          />
        </section>

        <section className="dashboard-grid" id="network-status">
          <ActivityChart logs={logs} transactions={transactions} />
          <NetworkStatus
            nodeStatus={nodeStatus}
            activeUrl={activeUrl}
            loading={loading}
            error={error}
            connection={connection}
          />
        </section>

        <section id="transactions">
          <TransactionsPanel transactions={transactions} />
        </section>

        <section id="blockchain-tools" className="tool-section">
          <div className="section-heading">
            <div>
              <span className="page-label">LEARNING LAB</span>
              <h2>Blockchain tools</h2>
              <p>Interactive visualizations and blockchain learning simulations</p>
            </div>
          </div>

          <div className="tool-grid">
            <div id="sha256-tool">
              <Card
                title="SHA-256 visualizer"
                description="Hashing, avalanche effect, and proof-of-work exploration"
                className="tool-card"
              >
                <Sha256Visualizer />
              </Card>
            </div>

            <div id="blockheader-tool">
              <Card
                title="Trình xem Block Header"
                description="Kiểm tra, xác minh và minh họa tính toàn vẹn của chuỗi"
                className="tool-card"
              >
                <BlockHeaderViewer />
              </Card>
            </div>

            <div id="mempool-tool">
              <Card
                title="Mempool manager"
                description="Create signed transactions and mine them into the local chain"
                className="tool-card"
              >
                <MempoolManager apiUrl={activeUrl} />
              </Card>
            </div>

            <div id="pow-tool">
              <Card
                title="Proof of work simulator"
                description="Explore mining difficulty and chain reinforcement"
                className="tool-card"
              >
                <ProofOfWorkSimulator />
              </Card>
            </div>
          </div>
        </section>

        <section id="merkle-tree-tab" className="tool-section merkle-tab-section">
          <div className="section-heading">
            <div>
              <span className="page-label">MERKLE LAB</span>
              <h2>Mô phỏng flow Cây Merkle</h2>
              <p>Khám phá cách giao dịch được băm và ghép thành Merkle Root.</p>
            </div>
          </div>
          <div className="dashboard-panel merkle-panel">
            <MerkleTree />
          </div>
        </section>

        <section id="ecdsa-tool" className="tool-section">
          <div className="section-heading">
            <div>
              <span className="page-label">CRYPTOGRAPHY</span>
              <h2>Chữ ký số ECDSA</h2>
              <p>Tạo cặp khóa, ký thông điệp và xác minh dữ liệu có toàn vẹn hay không.</p>
            </div>
          </div>
          <Card className="module-card">
            <EcdsaVisualizer />
          </Card>
        </section>

        <section id="network-dashboard" className="tool-section">
          <div className="section-heading">
            <div>
              <span className="page-label">NETWORK</span>
              <h2>Dashboard mạng</h2>
              <p>Theo dõi node, kết nối P2P, lưu lượng WebSocket và log đồng thuận.</p>
            </div>
          </div>
          <NetworkDashboard />
        </section>

        <section id="attack-simulator" className="tool-section">
          <div className="section-heading">
            <div>
              <span className="page-label">SECURITY LAB</span>
              <h2>Attack Simulator</h2>
              <p>Chạy các tình huống tấn công mẫu và quan sát cơ chế phát hiện của blockchain.</p>
            </div>
          </div>
          <AttackSimulator />
        </section>
      </div>

      {/* ==================== CHATBOT FLOATING ==================== */}
      <button
        className="chat-fab"
        onClick={() => setShowChat((v) => !v)}
        aria-label="Mở trợ lý AI"
        title="Trợ lý Blockchain AI"
      >
        {showChat ? "✕" : "💬"}
      </button>

      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>🤖 Trợ lý Blockchain AI</span>
            <button
              className="chat-close"
              onClick={() => setShowChat(false)}
              aria-label="Đóng chat"
            >
              ✕
            </button>
          </div>
          <ChatBot nodeStatus={nodeStatus} />
        </div>
      )}
      {/* ========================================================== */}
    </MainLayout>
  );
}

export default App;
