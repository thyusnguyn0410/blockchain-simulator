/**
 * server.js
 * ------------------------------------------------------------------
 * Điểm khởi động (entry point) của MỘT Full Node.
 * Tương thích linh hoạt:
 *   Cách 1 (Vị trí):     node server.js 3001 6001 Node-1
 *   Cách 2 (Named Flag): node server.js --http=3001 --ws=6001 --name=Node-1
 *   Cách 3 (Env var):    set HTTP_PORT=3001 && set WS_PORT=6001 && node server.js
 * ------------------------------------------------------------------
 */

const express = require('express');
const cors = require('cors');
const { Blockchain } = require('./src/blockchain');
const p2pModule = require('./src/p2p');

const {
  initP2PServer,
  connectToPeers,
  connectToPeer,
  disconnectPeer,
  broadcastLatest,
  broadcastTransaction,
  getPeers,
  getSockets,
} = p2pModule;

/** Phân tích cả tham số vị trí và tham số dạng --key=value */
function parseArgs() {
  const args = {};
  const positional = [];

  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.replace(/^--/, '').split('=');
      args[key] = value;
    } else {
      positional.push(arg);
    }
  });

  return { args, positional };
}

const { args: cli, positional } = parseArgs();

// Thứ tự ưu tiên: CLI flag (--http) > Vị trí (pos 0) > Biến môi trường > Giá trị mặc định
const HTTP_PORT = Number(cli.http || positional[0] || process.env.HTTP_PORT || 3001);
const WS_PORT = Number(cli.ws || positional[1] || process.env.WS_PORT || 6001);
const NODE_ID = cli.name || positional[2] || process.env.NODE_NAME || `Node-${HTTP_PORT}`;

// Peers: lấy từ --peers=... hoặc positional[3] hoặc process.env.PEERS
const rawPeers = cli.peers || positional[3] || process.env.PEERS || '';
const INITIAL_PEERS = rawPeers
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Mỗi node có bản sao Blockchain riêng biệt lưu trên RAM
const blockchain = new Blockchain({ difficulty: Number(process.env.DIFFICULTY) || 2 });

// Nhật ký hoạt động (in-memory ring buffer)
const logs = [];
function log(message) {
  const entry = { time: new Date().toISOString(), message };
  logs.push(entry);
  if (logs.length > 200) logs.shift();
  if (typeof p2pModule.broadcast === 'function') {
    p2pModule.broadcast({ type: p2pModule.MessageType.EVENT, event: 'log', data: entry });
  }
  // eslint-disable-next-line no-console
  console.log(`[${NODE_ID}] ${message}`);
}

// ------------------------------- REST API -------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: '128kb' }));

app.get('/', (req, res) => res.json({
  name: 'Blockchain Simulator Node',
  nodeId: NODE_ID,
  educationalOnly: true,
  endpoints: ['/status', '/blocks', '/mempool', '/logs', '/peers'],
}));

/** GET /status - Kiểm tra trạng thái node */
app.get('/status', (req, res) => {
  const latest = blockchain.getLatestBlock();
  const peersList = typeof getSockets === 'function' ? getSockets() : [];
  res.json({
    nodeId: NODE_ID,
    httpPort: HTTP_PORT,
    wsPort: WS_PORT,
    status: 'online',
    height: latest ? (latest.index !== undefined ? latest.index : latest.height) : 0,
    latestHash: latest ? latest.hash : '',
    peers: peersList.length,
    peerList: typeof getPeers === 'function' ? getPeers() : [],
    mempoolSize: blockchain.mempool ? blockchain.mempool.length : 0,
    difficulty: blockchain.difficulty,
    educationalOnly: true,
  });
});

/** GET /blocks - Danh sách block */
app.get('/blocks', (req, res) => {
  res.json(blockchain.chain);
});

/** GET /logs - Lịch sử log */
app.get('/logs', (req, res) => {
  res.json(logs.slice(-50));
});

app.get('/mempool', (req, res) => res.json(blockchain.mempool));

app.get('/peers', (req, res) => res.json(getPeers()));

app.post('/peers', (req, res) => {
  const url = req.body?.url;
  if (typeof url !== 'string' || !/^wss?:\/\/[^ ]+$/i.test(url)) {
    return res.status(400).json({ error: 'Cần URL peer ws:// hoặc wss:// hợp lệ.' });
  }
  const connected = connectToPeer(url);
  if (!connected) return res.status(409).json({ error: 'Peer đã kết nối hoặc không thể bắt đầu kết nối.' });
  log(`Đang kết nối peer ${url}`);
  return res.status(202).json({ status: 'connecting', url });
});

app.delete('/peers', (req, res) => {
  const url = req.body?.url || req.query.url;
  if (typeof url !== 'string' || !disconnectPeer(url)) {
    return res.status(404).json({ error: 'Không tìm thấy kết nối peer.' });
  }
  return res.json({ status: 'disconnecting', url });
});

app.post('/faucet', (req, res) => {
  try {
    const balance = blockchain.fundDemoAddress(req.body?.address, Number(req.body?.amount) || 100);
    log(`Faucet mô phỏng cấp coin cho ${req.body.address.slice(0, 10)}…`);
    return res.json({ address: req.body.address, balance });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

/** POST /mine - Tạo/đào block mới */
app.post('/mine', (req, res) => {
  try {
    if (req.body && Object.hasOwn(req.body, 'difficulty')) {
      const requested = Number(req.body.difficulty);
      if (!Number.isInteger(requested) || requested < 1 || requested > 5) {
        return res.status(400).json({ error: 'Độ khó phải là số nguyên từ 1 đến 5.' });
      }
    }
    const requestedDifficulty = Number(req.body?.difficulty);
    if (Number.isInteger(requestedDifficulty) && requestedDifficulty >= 1 && requestedDifficulty <= 5) {
      blockchain.difficulty = requestedDifficulty;
    }
    const customData = req.body?.data ? [{ info: String(req.body.data).slice(0, 500) }] : null;
    const newBlock = blockchain.mineNewBlock(customData);
    if (!newBlock) {
      return res.status(400).json({ error: 'Không thể đào block mới.' });
    }
    log(`Đào xong Block #${newBlock.index} trong ${newBlock.timeTakenMs} ms (${newBlock.attempts} lần thử)`);
    broadcastLatest(blockchain);
    return res.json(newBlock);
  } catch (error) {
    log(`Lỗi đào block: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
});

/** POST /transaction - Thêm giao dịch vào mempool */
app.post('/transaction', (req, res) => {
  try {
    const tx = blockchain.addToMempool(req.body);
    log(`Giao dịch ${tx.id.slice(0, 12)} đã vào mempool (${blockchain.mempool.length})`);
    broadcastTransaction(tx);
    p2pModule.broadcast({ type: p2pModule.MessageType.EVENT, event: 'mempool', data: blockchain.mempool.length });
    return res.status(201).json({ transaction: tx, mempoolSize: blockchain.mempool.length });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Khởi chạy HTTP REST API
app.listen(HTTP_PORT, () => {
  log(`🚀 REST API của "${NODE_ID}" đang chạy tại http://localhost:${HTTP_PORT}`);
});

// ------------------------------ Lớp P2P ---------------------------------
// Khởi chạy WebSocket Server với WS_PORT chính xác của Node này
if (typeof initP2PServer === 'function') {
  try {
    initP2PServer({ wsPort: WS_PORT, blockchain, nodeId: NODE_ID, httpPort: HTTP_PORT, log });
  } catch (err) {
    // Dự phòng nếu initP2PServer nhận kiểu tham số cũ: initP2PServer(wsPort)
    initP2PServer(WS_PORT, blockchain);
  }
}

if (INITIAL_PEERS.length > 0 && typeof connectToPeers === 'function') {
  log(`🔗 Đang kết nối tới peers: ${INITIAL_PEERS.join(', ')}`);
  connectToPeers(INITIAL_PEERS, blockchain, NODE_ID, HTTP_PORT, WS_PORT, log);
}

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  log(`HTTP error: ${err.message}`);
  return res.status(400).json({ error: 'Yêu cầu JSON không hợp lệ.' });
});
