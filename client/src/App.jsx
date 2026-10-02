import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import MainLayout from "./layouts/MainLayout";
import Sha256Visualizer from "./modules/crypto/Sha256Visualizer";
import BlockHeaderViewer from "./modules/blockchain/BlockHeaderViewer";
import MempoolManager from "./modules/blockchain/MempoolManager";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePolling } from "./hooks/usePolling";
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
}

export default App;