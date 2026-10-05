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
    setNodes((prev) => prev.filter((n) => n !== address));
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Danh sách Full Node */}
      <Card
        title="Danh sách Full Node (Project 8 & 9)"
        description="Đăng ký Node theo địa chỉ IP:port — Tự động cập nhật GET /status mỗi 2 giây"
      >
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input
            value={newNodeAddress}
            onChange={(e) => setNewNodeAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNode()}
            placeholder="vd: localhost:3004"
            style={{ flex: 1, padding: '8px 12px', background: '#090d16', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontFamily: 'monospace' }}
          />
          <Button onClick={addNode}>+ Thêm Node</Button>
        </div>

        {nodes.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Chưa có Node nào được đăng ký.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Node A (Chủ động gửi)</label>
            <select
              value={connectFrom}
              onChange={(e) => setConnectFrom(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#090d16', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
            >
              {nodes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Peer Đích (ws://host:port)</label>
            <input
              value={connectToPeer}
              onChange={(e) => setConnectToPeer(e.target.value)}
              placeholder="ws://localhost:6002"
              style={{ width: '100%', padding: '8px', background: '#090d16', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontFamily: 'monospace' }}
            />
          </div>
          <Button onClick={handleConnectPeers} variant="outline">
            Kết nối P2P
          </Button>
        </div>
        {connectMsg && <p style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '10px' }}>{connectMsg}</p>}
      </Card>

      {/* 3. Terminal WebSocket Traffic */}
      <Card
        title="Trạm Giám Sát Mạng (WebSocket Inspector)"
        description="Kết nối trực tiếp vào cổng WebSocket P2P của Node để xem lưu lượng gói tin thời gian thực"
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
          <input
            value={wsInput}
            onChange={(e) => setWsInput(e.target.value)}
            placeholder="ws://localhost:6001"
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', background: '#090d16', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontFamily: 'monospace' }}
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
          <span style={{ 
            fontSize: '0.75rem', 
            padding: '4px 10px', 
            borderRadius: '6px', 
            background: wsStatus === 'connected' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: wsStatus === 'connected' ? '#4ade80' : '#f87171',
            fontWeight: 'bold'
          }}>
            {wsStatus === 'connected' ? `Online (${wsAddress})` : 'Chưa kết nối'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Gói tin P2P nhận được</span>
          <button onClick={clear} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem' }}>
            Xoá log
          </button>
        </div>

        <div style={{ height: '180px', overflowY: 'auto', background: '#090d16', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {messages.length === 0 && <div style={{ color: '#64748b' }}>Chưa có sự kiện nào...</div>}
          {messages.map((m, i) => (
            <div key={i} className={toneClass(m.tone)} style={{ marginBottom: '4px' }}>
              <span style={{ color: '#475569' }}>{new Date(m.at).toLocaleTimeString()} </span>
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
    case 'block': return 'text-emerald-400';
    case 'tx': return 'text-amber-400';
    case 'error': return 'text-red-400';
    case 'query': return 'text-indigo-300';
    default: return 'text-slate-300';
  }
}