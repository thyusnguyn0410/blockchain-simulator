import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo, useState } from "react";
import MainLayout from "./layouts/MainLayout";
import Sha256Visualizer from "./modules/crypto/Sha256Visualizer";
import BlockHeaderViewer from "./modules/blockchain/BlockHeaderViewer";
import MempoolManager from "./modules/blockchain/MempoolManager";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePolling } from "./hooks/usePolling";
import Button from "./components/Button";
import Card from "./components/Card";
import DataTable from "./components/Table";
import ProofOfWorkSimulator from "./modules/blockchain/ProofOfWorkSimulator";
import "./App.css";

function StatCard({ title, value, description, icon, color }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-title">{title}</span>
        <span className={`stat-icon ${color}`}>{icon}</span>
      </div>
      <div className="stat-card-value">{value}</div>
      <p className="stat-description">{description}</p>
    </article>
  );
}

function NetworkActivity({ blocks }) {
  // Chỉ lấy 12 block gần nhất để biểu đồ dễ nhìn và không làm nặng giao diện.
  const chartData = blocks.slice(-12).map((block) => ({
    block: `#${block.index}`,
    transactions: block.transactions?.length || 0,
  }));

  return (
    <section className="dashboard-panel activity-panel">
      <div className="panel-heading">
        <div>
          <h2>Network Activity</h2>
          <p>Transaction activity over the last 7 days</p>
        </div>
      </div>
      <div className="recharts-wrapper">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
            <XAxis dataKey="block" stroke="#94a3b8" />
            <YAxis allowDecimals={false} stroke="#94a3b8" />
            <Tooltip />
            <Bar dataKey="transactions" name="Giao dịch" fill="#22d3ee" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function NetworkStatus({ nodeStatus, activeUrl, loading, error, connection, mempoolSize }) {
  // Kiểm tra trạng thái mạng dựa trên dữ liệu nodeStatus
  const isOnline = nodeStatus?.status === "online" && connection === "connected";

  return (
    <section className="dashboard-panel">
      <div className="panel-heading">
        <div>
          <h2>Network Status</h2>
          <p>Current system status</p>
        </div>
      </div>
      <div className="status-list">
        <div className="status-row">
          <span>Network Health</span>
           {/* Hiển thị trạng thái mạng*/}
          <strong className={isOnline ? "status-success" : "status-cyan"}> 
            <i />
            {loading ? "Đang kiểm tra..." : isOnline ? "Đang hoạt động" : "Mất kết nối"}
          </strong>
        </div>
        <div className="status-row">
          <span>Block Time</span>
          <strong>10.2 seconds</strong>
        </div>
        <div className="status-row">
          <span>Connected Nodes</span>
          <strong>
            {nodeStatus?.peers ?? 0} kết nối
          </strong>
        </div>
        <div className="status-row"><span>Mempool</span><strong>{mempoolSize} giao dịch</strong></div>
        <div className="status-row">
           {/*Hiển thị URL node đang hoạt động*/}
          <span>Active Node</span> 
          <strong className="status-cyan">
            <i />
            {activeUrl || "Chưa kết nối"} {/* Hiển thị URL node đang hoạt động hoặc thông báo nếu chưa kết nối*/}
          </strong>
        </div>

        {error && (
          <div className="status-row">
            <span>Lỗi kết nối</span>
            <strong className="status-cyan">{error.message}</strong>
          </div>
        )}{/*  Hiển thị thông báo lỗi nếu có lỗi kết nối*/}
      </div>
    </section>
  );
}

function RecentTransactions({ blocks, mempool }) {
  // Transaction trong mempool chưa được mine nên có trạng thái Pending.
  const pendingTransactions = mempool
    .filter((transaction) => (
      transaction?.from &&
      transaction?.to &&
      (transaction.id || transaction.txid)
    ))
    .map((transaction) => ({
      ...transaction,
      status: "Pending",
    }));
  // Transaction đã nằm trong block được xem là Confirmed.
  const confirmedTransactions = blocks
    .flatMap((block) => block.transactions || [])
    // Bỏ Genesis, Faucet và các dữ liệu hệ thống vì không phải giao dịch người dùng.
    .filter((transaction) => (
      transaction?.from &&
      transaction?.to &&
      transaction?.amount !== undefined &&
      (transaction.id || transaction.txid) &&
      !transaction.type?.includes("FAUCET") &&
      transaction.type !== "Coinbase"
    ))
    .map((transaction) => ({ ...transaction, status: "Confirmed" }));
  // Đặt Pending trước để giao dịch mới luôn nằm ở đầu bảng.
  const transactions = [...pendingTransactions, ...confirmedTransactions]
    .slice(0, 6);
  return (
    <section className="dashboard-panel transactions-panel">
      <div className="panel-heading">
        <div>
          <h2>Recent Transactions</h2>
          <p>Latest transactions on the network</p>
        </div>
        <button type="button" className="outline-button">View all</button>
      </div>
      <div className="table-wrapper">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Transaction Hash</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Bảng cập nhật real-time: Pending ở mempool, Confirmed ở trong block. */}
            {transactions.map((transaction, index) => (
              <tr key={transaction.id || transaction.txid || index}>
                <td className="hash">
                  {(transaction.id || transaction.txid).slice(0, 14)}
                </td>
                <td className="address">{transaction.from.slice(0, 14)}</td>
                <td className="address">{transaction.to.slice(0, 14)}</td>
                <td>{transaction.amount}</td>
                <td>
                  <span className={`transaction-status ${transaction.status.toLowerCase()}`}>
                    {transaction.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function App() {
  const {
    data: nodeStatus,
    activeUrl,
    loading,
    error,
    onlineNodeCount,
  } = usePolling(); // Sử dụng hook usePolling để lấy trạng thái node từ các URL API
  // Dùng cùng node với REST polling để tránh gửi transaction tới node này
  // nhưng lại nghe block mới ở một node khác đang bị lỗi.
  const activeWsUrl = activeUrl
    ? activeUrl.replace(/^http/, "ws").replace(/:(\d+)$/, (_, port) => `:${Number(port) + 3000}`)
    : undefined;
  const realtime = useWebSocket(activeWsUrl);
  // REST polling bổ sung node status; WebSocket là nguồn dữ liệu chính cho chain.
  const blocks = realtime.blocks;
  const liveStatus = nodeStatus || {
    height: realtime.latestBlock?.index || 0,
    peers: realtime.peers.length,
    status: "online",
  };
  // Tính lại các số liệu trên thẻ mỗi khi state real-time thay đổi.
  const totalTransactions = blocks.reduce(
    (total, block) => total + (block.transactions?.length || 0),
    0,
  );
  const statCards = [
    { title: "Mempool", value: realtime.mempool.length, description: "Giao dịch đang chờ đào", icon: "⇄", color: "cyan" },
    { title: "Active Nodes", value: onlineNodeCount || 0, description: "Node đang online", icon: "◎", color: "green" },
    { title: "Block Height", value: `#${liveStatus.height ?? 0}`, description: "Chiều cao chain hiện tại", icon: "#", color: "purple" },
    { title: "Transactions", value: totalTransactions, description: "Giao dịch đã nhận", icon: "⚡", color: "orange" },
  ];

  return (
    <MainLayout>
      <div className="dashboard">
        <header className="page-header">
          <div>
            <span className="page-label">BLOCKCHAIN SIMULATOR</span>
            <h1>Blockchain Dashboard</h1>
            <p>Monitor your blockchain network and explore its current activity.</p>
          </div>
          <span className={`connection-badge ${realtime.connection}`}>
            ● {realtime.connection === "connected" ? "WebSocket đang kết nối" : "Đang kết nối lại"}
          </span>
        </header>

        {/* SHA-256 VISUALIZER */}
        <section className="crypto-panel-wrap">
          <div className="dashboard-panel crypto-panel">
            <div className="panel-heading">
              <div>
                <h2>SHA-256 Visualizer</h2>
                <p>Visualize the cryptographic hashing process</p>
              </div>
            </div>

            <Sha256Visualizer />
          </div>
        </section>

        {/* BLOCK HEADER VIEWER */}
        <section className="crypto-panel-wrap" style={{ marginTop: '24px' }}>
          <div className="dashboard-panel crypto-panel">
            <div className="panel-heading">
              <div>
                <h2>Block Header Viewer</h2>
                <p>Inspect block metadata, hash links, and Merkle tree root</p>
              </div>
            </div>

            <BlockHeaderViewer />
          </div>
        </section>
         {/*MEMPOOL MANAGER */}
        <section className="crypto-panel-wrap" style={{ marginTop: '24px' }}>
          <div className="dashboard-panel crypto-panel">
            <div className="panel-heading">
              <div>
                <h2>Mempool Manager</h2>
                <p>Manage pending transactions before mining them into a block</p>
              </div>
            </div>

            {/* Truyền node đang hoạt động để transaction dùng đúng backend có thể kết nối. */}
            <MempoolManager apiUrl={activeUrl} />
          </div>
        </section>
        {/* PROOF OF WORK SIMULATOR */}
        <section className="crypto-panel-wrap" style={{ marginTop: '24px' }}>
          <div className="dashboard-panel crypto-panel">
            <div className="panel-heading">
              <div>
                <h2>Proof of Work Simulator</h2>
                <p>Simulate mining blocks and difficulty adjustment in Proof of Work consensus</p>
              </div>
            </div>

            <ProofOfWorkSimulator />
          </div>
        </section>
        <section className="stats-grid">
          {statCards.map((card) => <StatCard key={card.title} {...card} />)}
        </section>
        <section className="dashboard-grid">
          <NetworkActivity blocks={blocks} />
          <NetworkStatus
            nodeStatus={{ ...liveStatus, peers: onlineNodeCount || liveStatus.peers }}
            activeUrl={activeUrl}
            loading={loading}
            error={error}
            connection={realtime.connection}
            mempoolSize={realtime.mempool.length}
          />
        </section>
        <RecentTransactions blocks={blocks} mempool={realtime.mempool} />
      </div>
    </MainLayout>
  );
const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value || 0);
const shortHash = (value = "") => value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value || "—";
const getTransactions = (blocks, mempool) => {
  const confirmed = blocks.flatMap((block) => (block.transactions || []).map((tx) => ({
    ...tx,
    hash: tx.txid || tx.id || `${block.hash || block.index}-${tx.from || tx.sender || "tx"}`,
    status: "Confirmed",
    block: block.index ?? block.height ?? "—",
  })));
  const pending = mempool.map((tx) => ({ ...tx, hash: tx.txid || tx.id || "pending", status: "Pending", block: "—" }));
  return [...pending, ...confirmed].slice(0, 8);
};

function MetricCard({ label, value, detail, icon, tone = "cyan" }) {
  return <article className={`metric-card ${tone}`}>
    <div className="metric-card-heading"><span>{label}</span><span className="metric-icon" aria-hidden="true">{icon}</span></div>
    <strong>{value}</strong>
    <small>{detail}</small>
  </article>;
}

function ActivityChart({ logs }) {
  const bars = useMemo(() => {
    const recent = logs.slice(-12);
    if (!recent.length) return [28, 45, 34, 60, 42, 72, 55, 68, 48, 76, 58, 82];
    return recent.map((entry, index) => Math.min(100, 30 + ((entry.message?.length || index * 11) % 68)));
  }, [logs]);
  return <Card title="Network activity" description="Recent events reported by the active node" className="activity-card">
    <div className="chart" aria-label="Recent network activity chart">
      {bars.map((height, index) => <div className="chart-column" key={`${height}-${index}`}><div className="chart-bar" style={{ height: `${height}%` }} /><span>{index + 1}</span></div>)}
    </div>
    <div className="chart-legend"><span><i className="legend-dot cyan-dot" />Events per polling window</span><span>{logs.length ? `${logs.length} logs received` : "Waiting for live logs"}</span></div>
  </Card>;
}

function NetworkStatus({ nodeStatus, activeUrl, loading, error, connection }) {
  const online = nodeStatus?.status === "online";
  return <Card title="Network status" description="Connection health across the simulator">
    <div className="status-list">
      <div className="status-row"><span>REST API</span><strong className={online ? "status-success" : "status-warning"}><i />{loading ? "Checking…" : online ? "Online" : "Offline"}</strong></div>
      <div className="status-row"><span>WebSocket</span><strong className={connection === "connected" ? "status-success" : "status-warning"}><i />{connection === "connected" ? "Connected" : connection === "connecting" ? "Connecting" : "Disconnected"}</strong></div>
      <div className="status-row"><span>Connected peers</span><strong>{nodeStatus?.peers ?? 0}</strong></div>
      <div className="status-row"><span>Difficulty</span><strong>{nodeStatus?.difficulty ?? "—"}</strong></div>
      <div className="status-row"><span>Active node</span><strong className="status-cyan node-url" title={activeUrl || "No active node"}>{activeUrl || "No active node"}</strong></div>
      {error && <p className="inline-error">{error.message}</p>}
    </div>
  </Card>;
}

function TransactionsPanel({ transactions }) {
  const columns = [
    { key: "hash", label: "Transaction hash", render: (row) => <span className="hash">{shortHash(row.hash)}</span> },
    { key: "from", label: "From", render: (row) => <span className="address">{shortHash(row.from || row.sender)}</span> },
    { key: "to", label: "To", render: (row) => <span className="address">{shortHash(row.to || row.recipient)}</span> },
    { key: "amount", label: "Amount", render: (row) => row.amount === undefined ? "—" : Number(row.amount).toFixed(4) },
    { key: "status", label: "Status", render: (row) => <span className={`status-badge ${row.status === "Pending" ? "warning" : "success"}`}>{row.status}</span> },
  ];
  return <Card title="Recent transactions" description="Latest transactions observed on the network" actions={<span className="panel-count">{transactions.length} shown</span>} className="transactions-panel">
    <DataTable columns={columns} rows={transactions} />
  </Card>;
}

function App() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const { blocks, mempool, logs, connection, latestBlock } = useWebSocket();
  const { data: nodeStatus, activeUrl, loading, error, refresh } = usePolling();
  const transactions = useMemo(() => getTransactions(blocks, mempool), [blocks, mempool]);
  const totalTransactions = blocks.reduce((total, block) => total + (block.transactions?.length || 0), 0) + mempool.length;

  const handleNavigate = (label) => {
    setActiveSection(label);
    const target = document.getElementById(label === "Dashboard" ? "dashboard-overview" : label === "Blockchain" ? "blockchain-tools" : label === "Transactions" ? "transactions" : "network-status");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNewSimulation = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    refresh();
  };

  return <MainLayout activeItem={activeSection} onNavigate={handleNavigate} connection={connection}>
    <div className="dashboard" id="dashboard-overview">
      <header className="page-header">
        <div><span className="page-label">BLOCKCHAIN SIMULATOR / CONTROL ROOM</span><h1>Network dashboard</h1><p>Observe blocks, transactions, and node health from one focused workspace.</p></div>
        <Button onClick={handleNewSimulation}>↻ Refresh simulation</Button>
      </header>

      <section className="stats-grid" aria-label="Network metrics">
        <MetricCard label="Total transactions" value={formatNumber(totalTransactions)} detail="Confirmed + pending" icon="⇄" tone="cyan" />
        <MetricCard label="Active nodes" value={formatNumber(nodeStatus?.peers ? nodeStatus.peers + 1 : 1)} detail={nodeStatus?.status === "online" ? "Reporting online" : "Waiting for node"} icon="◎" tone="green" />
        <MetricCard label="Latest block" value={`#${latestBlock?.index ?? nodeStatus?.height ?? 0}`} detail={latestBlock ? shortHash(latestBlock.hash) : "Awaiting snapshot"} icon="#" tone="purple" />
        <MetricCard label="Mempool" value={formatNumber(mempool.length)} detail="Transactions awaiting mining" icon="⌁" tone="orange" />
      </section>

      <section className="dashboard-grid" id="network-status">
        <ActivityChart logs={logs} />
        <NetworkStatus nodeStatus={nodeStatus} activeUrl={activeUrl} loading={loading} error={error} connection={connection} />
      </section>

      <section id="transactions"><TransactionsPanel transactions={transactions} /></section>

      <section id="blockchain-tools" className="tool-section">
        <div className="section-heading">
          <div>
            <span className="page-label">LEARNING LAB</span>
            <h2>Blockchain tools</h2>
            <p>Interactive visualizations and blockchain learning simulations</p>
          </div>
        </div>

        <div className="tool-grid">
          <Card title="SHA-256 visualizer" description="Hashing, avalanche effect, and proof-of-work exploration" className="tool-card"><Sha256Visualizer /></Card>
          <Card title="Block header viewer" description="Inspect, verify, and safely demonstrate chain integrity" className="tool-card"><BlockHeaderViewer /></Card>
          <Card title="Mempool manager" description="Create signed transactions and mine them into the local chain" className="tool-card"><MempoolManager /></Card>
          <Card title="Proof of work simulator" description="Explore mining difficulty and chain reinforcement" className="tool-card"><ProofOfWorkSimulator /></Card>
        </div>
      </section>
    </div>
  </MainLayout>;
}

export default App;
