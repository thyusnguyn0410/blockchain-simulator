import React, { useMemo, useState, useEffect } from "react";
import MainLayout from "./layouts/MainLayout";
import Sha256Visualizer from "./modules/crypto/Sha256Visualizer";
import BlockHeaderViewer from "./modules/blockchain/BlockHeaderViewer";
import MempoolManager from "./modules/blockchain/MempoolManager";
import ProofOfWorkSimulator from "./modules/blockchain/ProofOfWorkSimulator";
import MerkleTree from "./modules/crypto/MerkleTreeVisualizer.jsx";
import ChatBot from "./components/ChatBot.jsx";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePolling } from "./hooks/usePolling";
import Button from "./components/Button";
import Card from "./components/Card";
import DataTable from "./components/Table";
import "./App.css";

const translations = {
  vi: {
    controlRoom: "BLOCKCHAIN SIMULATOR / PHÒNG ĐIỀU KHIỂN",
    dashboardTitle: "Bảng điều khiển mạng lưới",
    dashboardDesc: "Theo dõi các khối, giao dịch và trạng thái các node trong mạng phân tán.",
    refreshBtn: "↻ Làm mới mô phỏng",
    totalTx: "Tổng giao dịch",
    totalTxDesc: "Đã xác nhận + hàng đợi",
    activeNodes: "Node hoạt động",
    activeNodesDesc: "Trực tuyến trong mạng",
    waitingNode: "Đang chờ node",
    latestBlock: "Khối mới nhất",
    awaitingSnap: "Đang chờ dữ liệu",
    mempool: "Mempool",
    mempoolDesc: "Giao dịch chờ khai thác",
    netActivity: "Hoạt động mạng",
    netActivityDesc: "Sự kiện được ghi nhận theo thời gian thực",
    eventsPerWindow: "Sự kiện theo chu kỳ kiểm tra",
    logsCount: "nhật ký nhận được",
    txTracked: "giao dịch đang theo dõi",
    netStatus: "Trạng thái mạng",
    netStatusDesc: "Sức khỏe kết nối toàn hệ thống",
    restApi: "REST API",
    websocket: "WebSocket",
    connectedPeers: "Peers kết nối",
    difficulty: "Độ khó (Difficulty)",
    activeNode: "Node đang kết nối",
    checking: "Đang kiểm tra…",
    online: "Trực tuyến",
    offline: "Ngoại tuyến",
    connected: "Đã kết nối",
    connecting: "Đang kết nối",
    disconnected: "Mất kết nối",
    recentTx: "Giao dịch gần đây",
    recentTxDesc: "Các giao dịch mới nhất được phát hiện trong mạng",
    shown: "hiển thị",
    colHash: "Mã băm giao dịch",
    colFrom: "Người gửi",
    colTo: "Người nhận",
    colAmount: "Số coin",
    colStatus: "Trạng thái",
    confirmed: "Đã xác nhận",
    pending: "Chờ xử lý",
    learningLab: "PHÒNG THỰC HÀNH",
    toolsTitle: "Công cụ Blockchain",
    toolsDesc: "Mô phỏng và trực quan hóa các cơ chế cốt lõi của chuỗi khối",
    shaTitle: "Trực quan hóa SHA-256",
    shaDesc: "Mã hóa băm, hiệu ứng tuyết lở (Avalanche Effect) và đào thử nghiệm",
    headerTitle: "Xem chi tiết Block Header",
    headerDesc: "Kiểm tra, xác minh và chứng minh tính toàn vẹn của chuỗi khối",
    mempoolTitle: "Quản lý Mempool",
    mempoolDesc: "Tạo giao dịch có chữ ký số ECDSA và đẩy vào khối đào",
    powTitle: "Mô phỏng Proof of Work",
    powDesc: "Khám phá độ khó khai thác và cơ chế chống tấn công Sybil",
    merkleLab: "MERKLE LAB",
    merkleTitle: "Mô phỏng luồng Cây Merkle",
    merkleDesc: "Khám phá cách giao dịch được băm và ghép thành Merkle Root duy nhất.",
    aiTitle: "🤖 Trợ lý Blockchain AI",
    aiFabTitle: "Trợ lý Blockchain AI"
  },
  en: {
    controlRoom: "BLOCKCHAIN SIMULATOR / CONTROL ROOM",
    dashboardTitle: "Network dashboard",
    dashboardDesc: "Observe blocks, transactions, and node health from one focused workspace.",
    refreshBtn: "↻ Refresh simulation",
    totalTx: "Total transactions",
    totalTxDesc: "Confirmed + pending",
    activeNodes: "Active nodes",
    activeNodesDesc: "Reporting online",
    waitingNode: "Waiting for node",
    latestBlock: "Latest block",
    awaitingSnap: "Awaiting snapshot",
    mempool: "Mempool",
    mempoolDesc: "Transactions awaiting mining",
    netActivity: "Network activity",
    netActivityDesc: "Recent events reported by the active node",
    eventsPerWindow: "Events per polling window",
    logsCount: "logs received",
    txTracked: "active transactions tracked",
    netStatus: "Network status",
    netStatusDesc: "Connection health across the simulator",
    restApi: "REST API",
    websocket: "WebSocket",
    connectedPeers: "Connected peers",
    difficulty: "Difficulty",
    activeNode: "Active node",
    checking: "Checking…",
    online: "Online",
    offline: "Offline",
    connected: "Connected",
    connecting: "Connecting",
    disconnected: "Disconnected",
    recentTx: "Recent transactions",
    recentTxDesc: "Latest transactions observed on the network",
    shown: "shown",
    colHash: "Transaction hash",
    colFrom: "From",
    colTo: "To",
    colAmount: "Amount",
    colStatus: "Status",
    confirmed: "Confirmed",
    pending: "Pending",
    learningLab: "LEARNING LAB",
    toolsTitle: "Blockchain tools",
    toolsDesc: "Interactive visualizations and blockchain learning simulations",
    shaTitle: "SHA-256 visualizer",
    shaDesc: "Hashing, avalanche effect, and proof-of-work exploration",
    headerTitle: "Block header viewer",
    headerDesc: "Inspect, verify, and safely demonstrate chain integrity",
    mempoolTitle: "Mempool manager",
    mempoolDesc: "Create signed transactions and mine them into the local chain",
    powTitle: "Proof of work simulator",
    powDesc: "Explore mining difficulty and chain reinforcement",
    merkleLab: "MERKLE LAB",
    merkleTitle: "Merkle Tree Simulator",
    merkleDesc: "Explore how transactions are hashed and grouped into a single Merkle Root.",
    aiTitle: "🤖 Blockchain AI Assistant",
    aiFabTitle: "Blockchain AI Assistant"
  }
};

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value || 0);

const shortHash = (value = "") =>
  value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value || "—";

const getTransactions = (blocks = [], mempool = [], t) => {
  const confirmed = blocks.flatMap((block) =>
    (block.transactions || []).map((tx) => ({
      ...tx,
      hash: tx.txid || tx.id || `${block.hash || block.index}-${tx.from || tx.sender || "tx"}`,
      status: t.confirmed,
      block: block.index ?? block.height ?? "—",
    }))
  );

  const pending = mempool.map((tx) => ({
    ...tx,
    hash: tx.txid || tx.id || "pending",
    status: t.pending,
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

function ActivityChart({ logs = [], transactions = [], t }) {
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
      title={t.netActivity}
      description={t.netActivityDesc}
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
          <i className="legend-dot cyan-dot" />{t.eventsPerWindow}
        </span>
        <span>
          {logs.length
            ? `${logs.length} ${t.logsCount}`
            : `${transactions.length} ${t.txTracked}`}
        </span>
      </div>
    </Card>
  );
}

function NetworkStatus({ nodeStatus, activeUrl, loading, error, connection, t }) {
  const online = nodeStatus?.status === "online" || connection === "connected";

  return (
    <Card title={t.netStatus} description={t.netStatusDesc}>
      <div className="status-list">
        <div className="status-row">
          <span>{t.restApi}</span>
          <strong className={online ? "status-success" : "status-warning"}>
            <i />{loading ? t.checking : online ? t.online : t.offline}
          </strong>
        </div>
        <div className="status-row">
          <span>{t.websocket}</span>
          <strong className={connection === "connected" ? "status-success" : "status-warning"}>
            <i />
            {connection === "connected"
              ? t.connected
              : connection === "connecting"
              ? t.connecting
              : t.disconnected}
          </strong>
        </div>
        <div className="status-row">
          <span>{t.connectedPeers}</span>
          <strong>{nodeStatus?.peers ?? 0}</strong>
        </div>
        <div className="status-row">
          <span>{t.difficulty}</span>
          <strong>{nodeStatus?.difficulty ?? 2}</strong>
        </div>
        <div className="status-row">
          <span>{t.activeNode}</span>
          <strong className="status-cyan node-url" title={activeUrl || "No active node"}>
            {activeUrl || import.meta.env.VITE_API_URL || t.connecting}
          </strong>
        </div>
        {error && <p className="inline-error">{error.message}</p>}
      </div>
    </Card>
  );
}

function TransactionsPanel({ transactions, t }) {
  const columns = [
    {
      key: "hash",
      label: t.colHash,
      render: (row) => <span className="hash">{shortHash(row.hash)}</span>,
    },
    {
      key: "from",
      label: t.colFrom,
      render: (row) => <span className="address">{shortHash(row.from || row.sender)}</span>,
    },
    {
      key: "to",
      label: t.colTo,
      render: (row) => <span className="address">{shortHash(row.to || row.recipient)}</span>,
    },
    {
      key: "amount",
      label: t.colAmount,
      render: (row) => (row.amount === undefined ? "—" : Number(row.amount).toFixed(4)),
    },
    {
      key: "status",
      label: t.colStatus,
      render: (row) => (
        <span className={`status-badge ${row.status === t.pending ? "warning" : "success"}`}>
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <Card
      title={t.recentTx}
      description={t.recentTxDesc}
      actions={<span className="panel-count">{transactions.length} {t.shown}</span>}
      className="transactions-panel"
    >
      <DataTable columns={columns} rows={transactions} />
    </Card>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [showChat, setShowChat] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("blocksim_theme") || "dark");
  const [lang, setLang] = useState(() => localStorage.getItem("blocksim_lang") || "vi");

  const t = translations[lang] || translations.vi;

  useEffect(() => {
    localStorage.setItem("blocksim_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("blocksim_lang", lang);
  }, [lang]);

  const { blocks = [], mempool = [], logs = [], connection, latestBlock } = useWebSocket();
  const { data: nodeStatus, activeUrl, loading, error, refresh, onlineNodeCount } = usePolling();

  const transactions = useMemo(() => getTransactions(blocks, mempool, t), [blocks, mempool, t]);
  const totalTransactions =
    blocks.reduce((total, block) => total + (block.transactions?.length || 0), 0) + mempool.length;

  const handleNavigate = (label) => {
    setActiveSection(label);
    const targetMap = {
      Dashboard: "dashboard-overview",
      Blockchain: "blockchain-tools",
      Transactions: "transactions",
      Mining: "pow-tool",
      "Merkle Tree": "merkle-tree-tab",
      "Network Nodes": "network-status",
    };
    const target = document.getElementById(targetMap[label] || "dashboard-overview");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNewSimulation = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    refresh();
  };

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLangToggle = () => {
    setLang((prev) => (prev === "vi" ? "en" : "vi"));
  };

  return (
    <MainLayout
      activeItem={activeSection}
      onNavigate={handleNavigate}
      connection={connection}
      theme={theme}
      onThemeToggle={handleThemeToggle}
      lang={lang}
      onLangToggle={handleLangToggle}
    >
      <div className="dashboard" id="dashboard-overview">
        <header className="page-header">
  <div>
    <span className="page-label">{t.controlRoom}</span>
    <h1>{t.dashboardTitle}</h1>
    <p>{t.dashboardDesc}</p>
  </div>
  <Button onClick={handleNewSimulation}>{t.refreshBtn}</Button>
</header>

        <section className="stats-grid" aria-label="Network metrics">
          <MetricCard
            label={t.totalTx}
            value={formatNumber(totalTransactions)}
            detail={t.totalTxDesc}
            icon="⇄"
            tone="cyan"
          />
          <MetricCard
            label={t.activeNodes}
            value={formatNumber(onlineNodeCount || (nodeStatus?.peers ? nodeStatus.peers + 1 : 1))}
            detail={nodeStatus?.status === "online" ? t.activeNodesDesc : t.waitingNode}
            icon="◎"
            tone="green"
          />
          <MetricCard
            label={t.latestBlock}
            value={`#${latestBlock?.index ?? nodeStatus?.height ?? 0}`}
            detail={latestBlock ? shortHash(latestBlock.hash) : t.awaitingSnap}
            icon="#"
            tone="purple"
          />
          <MetricCard
            label={t.mempool}
            value={formatNumber(mempool.length)}
            detail={t.mempoolDesc}
            icon="⌁"
            tone="orange"
          />
        </section>

        <section className="dashboard-grid" id="network-status">
          <ActivityChart logs={logs} transactions={transactions} t={t} />
          <NetworkStatus
            nodeStatus={nodeStatus}
            activeUrl={activeUrl}
            loading={loading}
            error={error}
            connection={connection}
            t={t}
          />
        </section>

        <section id="transactions">
          <TransactionsPanel transactions={transactions} t={t} />
        </section>

        <section id="blockchain-tools" className="tool-section">
          <div className="section-heading">
            <div>
              <span className="page-label">{t.learningLab}</span>
              <h2>{t.toolsTitle}</h2>
              <p>{t.toolsDesc}</p>
            </div>
          </div>

          <div className="tool-grid">
            <div id="sha256-tool">
              <Card
                title={t.shaTitle}
                description={t.shaDesc}
                className="tool-card"
              >
                <Sha256Visualizer />
              </Card>
            </div>

            <div id="blockheader-tool">
              <Card
                title={t.headerTitle}
                description={t.headerDesc}
                className="tool-card"
              >
                <BlockHeaderViewer />
              </Card>
            </div>

            <div id="mempool-tool">
              <Card
                title={t.mempoolTitle}
                description={t.mempoolDesc}
                className="tool-card"
              >
                <MempoolManager apiUrl={activeUrl} />
              </Card>
            </div>

            <div id="pow-tool">
              <Card
                title={t.powTitle}
                description={t.powDesc}
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
              <span className="page-label">{t.merkleLab}</span>
              <h2>{t.merkleTitle}</h2>
              <p>{t.merkleDesc}</p>
            </div>
          </div>
          <div className="dashboard-panel merkle-panel">
            <MerkleTree />
          </div>
        </section>
      </div>

      {/* ==================== CHATBOT FLOATING ==================== */}
      <button
        className="chat-fab"
        onClick={() => setShowChat((v) => !v)}
        aria-label="Mở trợ lý AI"
        title={t.aiFabTitle}
      >
        {showChat ? "✕" : "💬"}
      </button>

      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>{t.aiTitle}</span>
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
