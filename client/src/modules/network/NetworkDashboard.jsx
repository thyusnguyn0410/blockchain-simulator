import { useEffect, useState } from 'react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import NodeCard from './NodeCard.jsx';
import LiveLogViewer from './LiveLogViewer.jsx';
import { useWebSocket } from '../../hooks/useWebSocket.js';

const STORAGE_KEY = 'blockchain-sim:registered-nodes';
const DEFAULT_NODES = ['localhost:3001', 'localhost:3002', 'localhost:3003'];

//WS (6001, 6002, 6003)
function guessWsAddress(httpAddress) {
  const [host, port] = httpAddress.split(':');
  const p2pPort = Number(port) + 3000;
  return `ws://${host}:${p2pPort}`;
}

export default function NetworkDashboard() {
  const [nodes, setNodes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_NODES;
    } catch {
      return DEFAULT_NODES;
    }
  });
  const [newNodeAddress, setNewNodeAddress] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
  }, [nodes]);

  const addNode = () => {
    const address = newNodeAddress.trim();
    if (!address || nodes.includes(address)) return;
    setNodes((prev) => [...prev, address]);
    setNewNodeAddress('');
  };

  const removeNode = (address) => {
    const remaining = nodes.filter((node) => node !== address);
    setNodes(remaining);
    if (connectFrom === address) setConnectFrom(remaining[0] || '');
  };

  // Kết nối 2 Node
  const [connectFrom, setConnectFrom] = useState(nodes[0] || '');
  const [connectToPeer, setConnectToPeer] = useState('');
  const [connectMsg, setConnectMsg] = useState('');

  const handleConnectPeers = async () => {
    if (!connectFrom || !connectToPeer) return;
    try {
      const res = await fetch(`http://${connectFrom}/peers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peer: connectToPeer }),
      });
      const json = await res.json();
      setConnectMsg(res.ok ? `Đã yêu cầu ${connectFrom} kết nối tới ${connectToPeer}` : json.error || 'Lỗi');
    } catch (err) {
      setConnectMsg(`Không gọi được API của ${connectFrom}: ${err.message}`);
    }
  };

  // Trạm WebSocket trung gian
  const { status: wsStatus, address: wsAddress, messages, connect, disconnect, clear } = useWebSocket();
  const [wsInput, setWsInput] = useState(guessWsAddress(nodes[0] || DEFAULT_NODES[0]));

  const useDefaultServer = () => {
    const defaultAddr = guessWsAddress(nodes[0] || DEFAULT_NODES[0]);
    setWsInput(defaultAddr);
    connect(defaultAddr);
  };

  return (
    <div className="network-dashboard">
      {/* 1. Danh sách Full Node */}
      <Card
        title="Danh sách Full Node (Project 8 & 9)"
        description="Đăng ký Node theo địa chỉ IP:port — Tự động cập nhật GET /status mỗi 2 giây"
      >
        <div className="network-add-row">
          <input
            aria-label="Địa chỉ node mới"
            value={newNodeAddress}
            onChange={(e) => setNewNodeAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNode()}
            placeholder="vd: localhost:3004"
            className="network-input"
          />
          <Button onClick={addNode}>+ Thêm Node</Button>
        </div>

        {nodes.length === 0 ? (
          <p className="network-empty">Chưa có Node nào được đăng ký.</p>
        ) : (
          <div className="network-node-grid">
            {nodes.map((address) => (
              <NodeCard key={address} address={address} onRemove={removeNode} />
            ))}
          </div>
        )}
      </Card>

      {/* 2. Bắt tay P2P kết nối 2 Node */}
      <Card
        title="Kết nối 2 Node (P2P Handshake)"
        description="Yêu cầu Node A mở kết nối WebSocket tới Node B để đồng bộ Block và Consensus"
      >
        <div className="network-connect-row">
          <div className="network-field">
            <label className="network-label" htmlFor="network-connect-from">Node A (Chủ động gửi)</label>
            <select
              id="network-connect-from"
              value={connectFrom}
              onChange={(e) => setConnectFrom(e.target.value)}
              className="network-input"
            >
              {nodes.length === 0 && <option value="">Chưa có node</option>}
              {nodes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="network-field">
            <label className="network-label" htmlFor="network-peer-address">Peer Đích (ws://host:port)</label>
            <input
              id="network-peer-address"
              value={connectToPeer}
              onChange={(e) => setConnectToPeer(e.target.value)}
              placeholder="ws://localhost:6002"
              className="network-input network-mono"
            />
          </div>
          <Button onClick={handleConnectPeers} variant="outline">
            Kết nối P2P
          </Button>
        </div>
        {connectMsg && <p className="network-feedback" role="status">{connectMsg}</p>}
      </Card>

      {/* 3. Terminal WebSocket Traffic */}
      <Card
        title="Trạm Giám Sát Mạng (WebSocket Inspector)"
        description="Kết nối trực tiếp vào cổng WebSocket P2P của Node để xem lưu lượng gói tin thời gian thực"
      >
        <div className="network-ws-controls">
          <input
            aria-label="Địa chỉ WebSocket"
            value={wsInput}
            onChange={(e) => setWsInput(e.target.value)}
            placeholder="ws://localhost:6001"
            className="network-input network-mono"
          />
          <Button onClick={() => connect(wsInput)} disabled={wsStatus === 'connected'}>
            Kết nối WS
          </Button>
          <Button onClick={disconnect} variant="outline" disabled={wsStatus !== 'connected'}>
            Ngắt
          </Button>
          <Button onClick={useDefaultServer} variant="outline">
            Mặc định
          </Button>
          <span className={`network-ws-status ${wsStatus === 'connected' ? 'is-online' : 'is-offline'}`}>
            {wsStatus === 'connected' ? `Online (${wsAddress})` : 'Chưa kết nối'}
          </span>
        </div>

        <div className="network-log-header">
          <span>Gói tin P2P nhận được</span>
          <button onClick={clear} className="network-quiet-button">
            Xoá log
          </button>
        </div>

        <div className="network-packet-log" aria-live="polite">
          {messages.length === 0 && <div className="network-empty">Chưa có sự kiện nào...</div>}
          {messages.map((m, i) => (
            <div key={i} className={`network-packet-line ${toneClass(m.tone)}`}>
              <span>{new Date(m.at).toLocaleTimeString()} </span>
              {m.line}
            </div>
          ))}
        </div>
      </Card>

      {/* 4. Live Log chu trình Mempool -> Block -> PoW -> Consensus */}
      <LiveLogViewer nodes={nodes} />
    </div>
  );
}

function toneClass(tone) {
  switch (tone) {
    case 'block': return 'network-event-block';
    case 'tx': return 'network-event-tx';
    case 'error': return 'network-event-reject';
    case 'query': return 'network-event-sync';
    default: return 'network-event-other';
  }
}