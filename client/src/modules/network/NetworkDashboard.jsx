import { useCallback, useState } from 'react';
import Card from '../../components/Card.jsx';
import usePolling from '../../hooks/usePolling.js';
import useWebSocket from '../../hooks/useWebSocket.js';
import NodeCard from './NodeCard.jsx';
import LiveLogViewer from './LiveLogViewer.jsx';

const seedNodes = [3001, 3002, 3003].map((port, index) => ({
  nodeId: `Node-${index + 1}`,
  httpPort: port,
  wsPort: port + 3000,
  height: 0,
  peers: 0,
  mempoolSize: 0,
  status: 'offline',
}));

export default function NetworkDashboard({ onOnlineNodesChange = () => {} }) {
  const [httpUrl, setHttpUrl] = useState('http://localhost:3001');
  const [wsUrl, setWsUrl] = useState('ws://localhost:6001');
  const [nodes, setNodes] = useState(seedNodes);
  const [logs, setLogs] = useState([]);
  const [miningNode, setMiningNode] = useState(false);

  const addLog = useCallback((message) => {
    setLogs((current) => [...current, { time: new Date().toISOString(), message }].slice(-100));
  }, []);

  const refreshNodes = useCallback(async () => {
    const results = await Promise.all(seedNodes.map(async (node) => {
      try {
        const response = await fetch(`http://localhost:${node.httpPort}/status`, { signal: AbortSignal.timeout(1200) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return { ...node, ...(await response.json()), status: 'online' };
      } catch {
        return { ...node, status: 'offline' };
      }
    }));
    setNodes(results);
    onOnlineNodesChange(results.filter((node) => node.status === 'online').length);
  }, [onOnlineNodesChange]);

  const onSocketOpen = useCallback(() => addLog(`Đã kết nối WebSocket ${wsUrl}`), [addLog, wsUrl]);
  const onSocketMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'HANDSHAKE') addLog(`Bắt tay thành công với ${message.data?.nodeId || 'node'}`);
      else if (message.type === 'EVENT' && message.event === 'log') addLog(message.data?.message || 'Sự kiện node');
      else if (message.type === 'EVENT') addLog(`P2P · ${message.event}: ${JSON.stringify(message.data).slice(0, 140)}`);
      else if (message.type === 'RESPONSE_BLOCKCHAIN') addLog(`Nhận cập nhật chuỗi · ${message.data?.at(-1)?.index ?? '?'} block height`);
    } catch {
      addLog('Nhận thông điệp không đúng định dạng JSON.');
    }
  }, [addLog]);
  const onSocketError = useCallback(() => addLog('Không thể kết nối WebSocket. Kiểm tra node và cổng.'), [addLog]);
  const { status: connection, connect: connectSocket, disconnect } = useWebSocket(wsUrl, {
    onOpen: onSocketOpen,
    onMessage: onSocketMessage,
    onError: onSocketError,
  });
  const { error: pollingError, refresh: refreshNodesNow } = usePolling(refreshNodes, 5000);

  const connectNode = async () => {
    try {
      const response = await fetch(`${httpUrl.replace(/\/$/, '')}/peers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: wsUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      addLog(`Đang yêu cầu node kết nối peer ${wsUrl}`);
      await refreshNodesNow();
    } catch (error) {
      addLog(`Không thể thêm peer: ${error.message}`);
    }
  };

  const mineOnNode = async () => {
    setMiningNode(true);
    try {
      const response = await fetch(`${httpUrl.replace(/\/$/, '')}/mine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      addLog(`Node đào Block #${result.index} · nonce ${result.nonce} · ${result.attempts} lần thử`);
      await refreshNodesNow();
    } catch (error) {
      addLog(`Không thể đào block trên node: ${error.message}`);
    } finally {
      setMiningNode(false);
    }
  };

  return (
    <div className="module-stack">
      <Card>
        <div className="panel-heading"><div><h2>Kết nối mạng P2P</h2><p>Điều khiển socket dashboard và yêu cầu node nối tới peer khác.</p></div><span className={`tag ${connection === 'connected' ? 'tag-green' : connection === 'connecting' ? 'tag-amber' : 'tag-muted'}`}>{connection === 'connected' ? 'CONNECTED' : connection === 'connecting' ? 'CONNECTING' : 'DISCONNECTED'}</span></div>
        <div className="connection-grid">
          <label className="field-label">URL REST node<input className="text-input mono" value={httpUrl} onChange={(event) => setHttpUrl(event.target.value)} /></label>
          <label className="field-label">URL WebSocket<input className="text-input mono" value={wsUrl} onChange={(event) => setWsUrl(event.target.value)} /></label>
          <div className="connection-actions"><button type="button" className="primary-button" onClick={connectSocket} disabled={connection === 'connecting'}>Kết nối dashboard</button><button type="button" className="outline-button" onClick={() => { disconnect('Ngắt từ dashboard'); addLog('Đã ngắt kết nối dashboard.'); }} disabled={connection === 'disconnected'}>Ngắt kết nối</button><button type="button" className="outline-button" onClick={connectNode}>Thêm peer vào node</button><button type="button" className="outline-button" onClick={mineOnNode} disabled={miningNode}>{miningNode ? 'Đang đào…' : 'Đào mempool trên node'}</button><button type="button" className="outline-button" onClick={() => refreshNodesNow()}>Làm mới trạng thái</button></div>
        </div>
        <p className="notice notice-warn">Khởi động 3 node cục bộ bằng <code>cd server && npm install && npm run nodes</code>. Demo này không phải blockchain production.</p>
        {pollingError && <p className="notice notice-danger">Không thể cập nhật trạng thái node: {pollingError.message}</p>}
      </Card>
      <Card>
        <div className="panel-heading"><div><h2>Trạng thái node <span className="count-pill">{nodes.filter((node) => node.status === 'online').length}/3</span></h2><p>Height, số peer và kích thước mempool được đọc trực tiếp qua REST.</p></div></div>
        <div className="node-grid">{nodes.map((node) => <NodeCard key={node.nodeId} node={node} />)}</div>
      </Card>
      <LiveLogViewer logs={logs} />
    </div>
  );
}
