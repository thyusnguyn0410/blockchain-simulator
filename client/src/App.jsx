import MainLayout from "./components/MainLayout";
import Sha256Visualizer from "./modules/crypto/Sha256Visualizer";
import BlockHeaderViewer from "./modules/blockchain/BlockHeaderViewer";
import MempoolManager from "./modules/blockchain/MempoolManager";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePolling } from "./hooks/usePolling";
import "./App.css";

const statCards = [
  {
    title: "Total Transactions",
    value: "12,458",
    description: "Transactions processed",
    icon: "⇄",
    color: "cyan",
  },
  {
    title: "Active Nodes",
    value: "24",
    description: "Nodes currently online",
    icon: "◎",
    color: "green",
  },
  {
    title: "Latest Block",
    value: "#1,284",
    description: "Mined 2 minutes ago",
    icon: "#",
    color: "purple",
  },
  {
    title: "Network Hashrate",
    value: "84.6 TH/s",
    description: "Current network power",
    icon: "⚡",
    color: "orange",
  },
];

const transactions = [
  {
    hash: "0x7a91...3f20",
    from: "0xA12...91F",
    to: "0xB55...D20",
    amount: "2.45 BTC",
    status: "Confirmed",
  },
  {
    hash: "0x8b32...aa10",
    from: "0xC89...102",
    to: "0xD12...B99",
    amount: "0.82 BTC",
    status: "Confirmed",
  },
  {
    hash: "0x3c44...fa72",
    from: "0xE01...A82",
    to: "0xF90...C14",
    amount: "5.10 BTC",
    status: "Pending",
  },
  {
    hash: "0x9d81...cc04",
    from: "0xA55...BD1",
    to: "0xF33...E20",
    amount: "1.25 BTC",
    status: "Confirmed",
  },
];

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

function NetworkActivity() {
  const chartData = [42, 68, 50, 78, 55, 88, 64, 92, 72, 100, 82, 70];

  return (
    <section className="dashboard-panel activity-panel">
      <div className="panel-heading">
        <div>
          <h2>Network Activity</h2>
          <p>Transaction activity over the last 7 days</p>
        </div>

        <select className="period-select" defaultValue="7">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="chart">
        {chartData.map((height, index) => (
          <div className="chart-column" key={index}>
            <div
              className="chart-bar"
              style={{ height: `${height}%` }}
              title={`${height} transactions`}
            />
            <span>{index + 1}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function NetworkStatus({ nodeStatus, activeUrl, loading, error }) {
  // Kiểm tra trạng thái mạng dựa trên dữ liệu nodeStatus
  const isOnline = nodeStatus?.status === "online";

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
          <strong className={isOnline ? "status-success" : "status-cyan"}> // Hiển thị trạng thái mạng
            <i />
            {loading ? "Đang kiểm tra..." : isOnline ? "Đang hoạt động" : "Chưa xác định"} // Hiển thị trạng thái mạng dựa trên dữ liệu nodeStatus
          </strong>
        </div>

        <div className="status-row">
          <span>Block Time</span>
          <strong>10.2 seconds</strong>
        </div>

        <div className="status-row">
          <span>Connected Nodes</span>
          <strong>
            {nodeStatus?.peers ?? 0} kết nối // Hiển thị số lượng node kết nối dựa trên dữ liệu nodeStatus
          </strong>
        </div>

        <div className="status-row">
          <span>Node đang sử dụng</span> // Hiển thị URL node đang hoạt động
          <strong className="status-cyan">
            <i />
            {activeUrl || "Chưa kết nối"} // Hiển thị URL node đang hoạt động hoặc thông báo nếu chưa kết nối
          </strong>
        </div>

        {error && (
          <div className="status-row">
            <span>Lỗi kết nối</span>
            <strong className="status-cyan">{error.message}</strong>
          </div>
        )} // Hiển thị thông báo lỗi nếu có lỗi kết nối
      </div>
    </section>
  );
}

function RecentTransactions() {
  return (
    <section className="dashboard-panel transactions-panel">
      <div className="panel-heading">
        <div>
          <h2>Recent Transactions</h2>
          <p>Latest transactions on the network</p>
        </div>

        <button type="button" className="outline-button">
          View all
        </button>
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
            {transactions.map((transaction) => (
              <tr key={transaction.hash}>
                <td className="hash">{transaction.hash}</td>
                <td className="address">{transaction.from}</td>
                <td className="address">{transaction.to}</td>
                <td>{transaction.amount}</td>
                <td>
                  <span
                    className={`transaction-status ${
                      transaction.status === "Confirmed"
                        ? "confirmed"
                        : "pending"
                    }`}
                  >
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
  // KẾT NÔI VỚI WEBSOCKET BLOCKCHAIN
  useWebSocket();
  const {
    data: nodeStatus,
    activeUrl,
    loading,
    error,
  } = usePolling(); // Sử dụng hook usePolling để lấy trạng thái node từ các URL API

  return (
    <MainLayout>
      <div className="dashboard">
        <header className="page-header">
          <div>
            <span className="page-label">BLOCKCHAIN SIMULATOR</span>
            <h1>Blockchain Dashboard</h1>
            <p>
              Monitor your blockchain network and explore its current activity.
            </p>
          </div>

          <button type="button" className="primary-button">
            + New Simulation
          </button>
        </header>

        / SHA-256 VISUALIZER /
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

        / BLOCK HEADER VIEWER /
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
        //MEMPOOL MANAGER 
        <section className="crypto-panel-wrap" style={{ marginTop: '24px' }}>
          <div className="dashboard-panel crypto-panel">
            <div className="panel-heading">
              <div>
                <h2>Mempool Manager</h2>
                <p>Manage pending transactions before mining them into a block</p>
              </div>
            </div>

            <MempoolManager />
          </div>
        </section>
        <section className="stats-grid">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </section>

        <section className="dashboard-grid">
          <NetworkActivity />
          <NetworkStatus
            nodeStatus={nodeStatus}
            activeUrl={activeUrl}
            loading={loading}
            error={error} // Hiển thị thông tin trạng thái mạng dựa trên dữ liệu nodeStatus, activeUrl, loading và error
          />
        </section>

        <RecentTransactions />
      </div>
    </MainLayout>
  );
}

export default App;