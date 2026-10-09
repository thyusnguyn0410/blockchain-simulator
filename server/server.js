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
const http = require('http');

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

// Thứ tự ưu tiên: Biến môi trường PORT (của Render) > CLI flag (--http) > Vị trí > Default
const HTTP_PORT = Number(process.env.PORT || cli.http || positional[0] || process.env.HTTP_PORT || 3001);
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

// ============ CACHE CHO CHATBOT ============
const chatCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 phút

// ============ HÀM GỌI AI VỚI FALLBACK ============
async function callAI(prompt) {
  const errors = [];

  // 1. Thử Groq trước (nhanh nhất, ~0.5-2s)
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 800,
        }),
      });
      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        log('🤖 AI trả lời qua Groq');
        return data.choices[0].message.content;
      }
      errors.push(`Groq: ${data.error?.message || res.status}`);
    } catch (e) {
      errors.push(`Groq: ${e.message}`);
    }
  } else {
    errors.push('Groq: chưa cấu hình GROQ_API_KEY');
  }

  // 2. Fallback: Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        log('🤖 AI trả lời qua Gemini');
        return data.candidates[0].content.parts[0].text;
      }
      errors.push(`Gemini: ${data.error?.message || res.status}`);
    } catch (e) {
      errors.push(`Gemini: ${e.message}`);
    }
  } else {
    errors.push('Gemini: chưa cấu hình GEMINI_API_KEY');
  }

  throw new Error(`Tất cả AI đều thất bại: ${errors.join(' | ')}`);
}

// ------------------------------- REST API -------------------------------
const app = express();

// Cho phép CORS toàn diện cho client web
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '128kb' }));

// ============ ENDPOINT /api/chat ============
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Thiếu trường "message".' });
    }

    const userMsg = message.trim();

    // Cache: câu hỏi + context giống hệt → trả ngay
    const cacheKey = `${userMsg}|h${context?.height || 0}|m${context?.mempoolSize || 0}`;
    const cached = chatCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      log(`⚡ Cache hit: "${userMsg.slice(0, 30)}..."`);
      return res.json({ reply: cached.reply, cached: true });
    }

    const systemInstruction = `Bạn là trợ lý Blockchain thông minh của dự án 
Blockchain Simulator. Trả lời ngắn gọn (dưới 150 từ), dễ hiểu bằng tiếng Việt.
Khi được hỏi về dữ liệu blockchain hiện tại, hãy dùng context được cung cấp.

QUY TẮC ĐỊNH DẠNG:
- KHÔNG dùng cú pháp LaTeX (không viết $\\rightarrow$, $\\Rightarrow$, $x^2$...).
- Dùng ký tự Unicode thay thế: → ⇒ × ≈ ≤ ≥
- Dùng markdown đơn giản: **bold**, *italic*, danh sách - hoặc 1. 2. 3.
- KHÔNG dùng bảng markdown phức tạp.`;

    const prompt = `${systemInstruction}

Context hiện tại:
- Số block: ${context?.height || 0}
- Mempool: ${context?.mempoolSize || 0} giao dịch
- Difficulty: ${context?.difficulty || 2}
- Node: ${context?.nodeId || 'unknown'}

Câu hỏi: ${userMsg}`;

    // Gọi AI với fallback Groq → Gemini
    const reply = await callAI(prompt);

    // Lưu cache
    chatCache.set(cacheKey, { reply, ts: Date.now() });
    if (chatCache.size > 100) {
      // Xóa entry cũ nhất khi cache đầy
      chatCache.delete(chatCache.keys().next().value);
    }

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(503).json({
      error: 'AI đang quá tải. Vui lòng thử lại sau 5 giây.',
      detail: error.message,
    });
  }
});

app.get('/', (req, res) => res.json({
  name: 'Blockchain Simulator Node',
  nodeId: NODE_ID,
  educationalOnly: true,
  endpoints: ['/status', '/blocks', '/mempool', '/logs', '/peers', '/api/chat'],
}));

/** GET /status - Kiểm tra trạng thái node */
app.get(['/status', '/api/status'], (req, res) => {
  const latest = blockchain.getLatestBlock();
  const peersList = typeof getSockets === 'function' ? getSockets() : [];
  const chainValid = blockchain.isChainValid();
  const mempoolCount = blockchain.mempool ? blockchain.mempool.length : 0;
  res.json({
    nodeId: NODE_ID,
    httpPort: HTTP_PORT,
    wsPort: WS_PORT,
    status: 'online',
    height: blockchain.chain.length,
    isValid: chainValid,
    chainValid,
    isChainValid: chainValid,
    latestHash: latest ? latest.hash : '',
    peers: peersList.length,
    peerList: typeof getPeers === 'function' ? getPeers() : [],
    mempoolCount,
    mempoolSize: mempoolCount,
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
    // Gửi state mới cho Dashboard ngay sau khi đào xong block.
    p2pModule.broadcastEvent('state', {
      blocks: blockchain.chain,
      mempool: blockchain.mempool,
      difficulty: blockchain.difficulty,
    });
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
    // Gửi lại toàn bộ mempool để giao diện luôn hiển thị đúng số transaction đang chờ.
    p2pModule.broadcastEvent('mempool', blockchain.mempool);
    return res.status(201).json({ transaction: tx, mempoolSize: blockchain.mempool.length });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Tạo HTTP Server bọc Express
const server = http.createServer(app);

// Gắn P2P WebSocket chạy chung server HTTP
if (typeof initP2PServer === 'function') {
  try {
    initP2PServer({
      server,
      wsPort: WS_PORT,
      blockchain,
      nodeId: NODE_ID,
      httpPort: HTTP_PORT,
      log,
      getSnapshot: () => ({
        nodeId: NODE_ID,
        httpPort: HTTP_PORT,
        wsPort: WS_PORT,
        status: 'online',
        blocks: blockchain.chain,
        mempool: blockchain.mempool,
        logs: logs.slice(-50),
        peers: getPeers(),
        difficulty: blockchain.difficulty,
      }),
    });
  } catch (err) {
    // Trường hợp dự phòng nếu initP2PServer nhận httpServer trực tiếp
    initP2PServer(server, blockchain);
  }
}

server.listen(HTTP_PORT, '0.0.0.0', () => {
  log(`🚀 Server đã sẵn sàng tại port ${HTTP_PORT} (0.0.0.0)`);
});

if (INITIAL_PEERS.length > 0 && typeof connectToPeers === 'function') {
  log(`🔗 Đang kết nối tới peers: ${INITIAL_PEERS.join(', ')}`);
  connectToPeers(INITIAL_PEERS, blockchain, NODE_ID, HTTP_PORT, WS_PORT, log);
}

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  log(`HTTP error: ${err.message}`);
  return res.status(400).json({ error: 'Yêu cầu JSON không hợp lệ.' });
});
