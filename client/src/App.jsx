import { useMemo, useState } from "react";
import MainLayout from "./layouts/MainLayout";
import Sha256Visualizer from "./modules/crypto/Sha256Visualizer";
import BlockHeaderViewer from "./modules/blockchain/BlockHeaderViewer";
import MempoolManager from "./modules/blockchain/MempoolManager";
import ProofOfWorkSimulator from "./modules/blockchain/ProofOfWorkSimulator";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePolling } from "./hooks/usePolling";
<<<<<<< HEAD

import Button from "./components/Button";
import Card from "./components/Card";
import DataTable from "./components/Table";
=======
import Button from "./components/Button";
import Card from "./components/Card";
import DataTable from "./components/Table";
import ProofOfWorkSimulator from "./modules/blockchain/ProofOfWorkSimulator";
>>>>>>> 944b893d4ee94343dfb4870ce1b6bf8b04b323a0
import "./App.css";

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

function ActivityChart({ logs }) {
  const bars = useMemo(() => {
    const recent = logs.slice(-12);
    if (!recent.length) return [28, 45, 34, 60, 42, 72, 55, 68, 48, 76, 58, 82];
    return recent.map((entry, index) => Math.min(100, 30 + ((entry.message?.length || index * 11) % 68)));
  }, [logs]);

  return (
    <Card title="Network activity" description="Recent events reported by the active node" className="activity-card">
      <div className="chart" aria-label="Recent network activity chart">
        {bars.map((height, index) => (
          <div className="chart-column" key={`${height}-${index}`}>
            <div className="chart-bar" style={{ height: `${height}%` }} />
            <span>{index + 1}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span><i className="legend-dot cyan-dot" />Events per polling window</span>
        <span>{logs.length ? `${logs.length} logs received` : "Waiting for live logs"}</span>
      </div>
    </Card>
  );
}

function NetworkStatus({ nodeStatus, activeUrl, loading, error, connection }) {
  const online = nodeStatus?.status === "online";
<<<<<<< HEAD
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
            <i />{connection === "connected" ? "Connected" : connection}
          </strong>
        </div>
        <div className="status-row"><span>Connected peers</span><strong>{nodeStatus?.peers ?? 0}</strong></div>
        <div className="status-row"><span>Difficulty</span><strong>{nodeStatus?.difficulty ?? "—"}</strong></div>
        <div className="status-row">
          <span>Active node</span>
          <strong className="status-cyan node-url" title={activeUrl || "No active node"}>
            {activeUrl || "No active node"}
          </strong>
        </div>
        {error && <p className="inline-error">{error.message}</p>}
      </div>
    </Card>
  );
=======
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
>>>>>>> 944b893d4ee94343dfb4870ce1b6bf8b04b323a0
}

function TransactionsPanel({ transactions }) {
  const columns = [
    { key: "hash", label: "Transaction hash", render: (row) => <span className="hash">{shortHash(row.hash)}</span> },
    { key: "from", label: "From", render: (row) => <span className="address">{shortHash(row.from || row.sender)}</span> },
    { key: "to", label: "To", render: (row) => <span className="address">{shortHash(row.to || row.recipient)}</span> },
    { key: "amount", label: "Amount", render: (row) => (row.amount === undefined ? "—" : Number(row.amount).toFixed(4)) },
    { key: "status", label: "Status", render: (row) => <span className={`status-badge ${row.status === "Pending" ? "warning" : "success"}`}>{row.status}</span> },
  ];
<<<<<<< HEAD

  return (
    <Card
      title="Recent transactions"
      description="Latest transactions observed on the network"
      actions={<span className="panel-count">{transactions.length} shown</span>}
      className="transactions-panel"
    >
      <DataTable columns={columns} rows={transactions} emptyMessage="No transactions have been reported yet." />
    </Card>
  );
=======
  return <Card title="Recent transactions" description="Latest transactions observed on the network" actions={<span className="panel-count">{transactions.length} shown</span>} className="transactions-panel">
    <DataTable columns={columns} rows={transactions} />
  </Card>;
>>>>>>> 944b893d4ee94343dfb4870ce1b6bf8b04b323a0
}

function App() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const { blocks, mempool, logs, connection, latestBlock } = useWebSocket();
  const { data: nodeStatus, activeUrl, loading, error, refresh } = usePolling();

  const transactions = useMemo(() => getTransactions(blocks, mempool), [blocks, mempool]);
  const totalTransactions = blocks.reduce((total, block) => total + (block.transactions?.length || 0), 0) + mempool.length;

  const handleNavigate = (label) => {
    setActiveSection(label);
    const target = document.getElementById(
      label === "Dashboard"
        ? "dashboard-overview"
        : label === "Blockchain"
        ? "blockchain-tools"
        : label === "Transactions"
        ? "transactions"
        : "network-status"
    );
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
<<<<<<< HEAD
=======

  const handleNewSimulation = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    refresh();
  };
>>>>>>> 944b893d4ee94343dfb4870ce1b6bf8b04b323a0

  const handleNewSimulation = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    refresh();
  };

  return (
    <MainLayout activeItem={activeSection} onNavigate={handleNavigate} connection={connection}>
      <div className="dashboard" id="dashboard-overview">
        <header className="page-header">
          <div>
            <span className="page-label">BLOCKCHAIN SIMULATOR / CONTROL ROOM</span>
            <h1>Network dashboard</h1>
            <p>Observe blocks, transactions, and node health from one focused workspace.</p>
          </div>
          <Button onClick={handleNewSimulation}>↻ Refresh simulation</Button>
        </header>

<<<<<<< HEAD
        <section className="stats-grid" aria-label="Network metrics">
          <MetricCard label="Total transactions" value={formatNumber(totalTransactions)} detail="Confirmed + pending" icon="⇄" tone="cyan" />
          <MetricCard
            label="Active nodes"
            value={formatNumber(nodeStatus?.peers ? nodeStatus.peers + 1 : 1)}
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
          <MetricCard label="Mempool" value={formatNumber(mempool.length)} detail="Transactions awaiting mining" icon="⌁" tone="orange" />
        </section>

        <section className="dashboard-grid" id="network-status">
          <ActivityChart logs={logs} />
          <NetworkStatus nodeStatus={nodeStatus} activeUrl={activeUrl} loading={loading} error={error} connection={connection} />
        </section>

        <section id="transactions">
          <TransactionsPanel transactions={transactions} />
        </section>

        {/* BLOCK HEADER VIEWER */}
        <section className="crypto-panel-wrap" style={{ marginTop: "24px" }} id="blockchain-tools">
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

        {/* MEMPOOL MANAGER */}
        <section className="crypto-panel-wrap" style={{ marginTop: "24px" }}>
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

        {/* PROOF OF WORK SIMULATOR */}
        <section className="crypto-panel-wrap" style={{ marginTop: "24px" }}>
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
      </div>
    </MainLayout>
  );
=======
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
>>>>>>> 944b893d4ee94343dfb4870ce1b6bf8b04b323a0
}

export default App;