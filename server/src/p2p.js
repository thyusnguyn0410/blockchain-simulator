const WebSocket = require('ws');

const MessageType = {
  QUERY_LATEST: 'QUERY_LATEST',
  QUERY_ALL: 'QUERY_ALL',
  RESPONSE_BLOCKCHAIN: 'RESPONSE_BLOCKCHAIN',
  HANDSHAKE: 'HANDSHAKE',
  PEER_LIST: 'PEER_LIST',
  NEW_TRANSACTION: 'NEW_TRANSACTION',
  DEMO_FAUCET: 'DEMO_FAUCET',
  EVENT: 'EVENT',
};

let sockets = [];
let peerMeta = new Map();
let context = null;

function initP2PServer({ wsPort, blockchain, nodeId, httpPort, log }) {
  context = { blockchain, nodeId, httpPort, wsPort, log };
  sockets = [];
  peerMeta = new Map();
  const server = new WebSocket.Server({ port: wsPort });
  server.on('connection', (socket) => initConnection(socket, context, false));
  log(`P2P đang lắng nghe ws://localhost:${wsPort}`);
  return server;
}

function connectToPeers(urls, blockchain, nodeId, httpPort, wsPort, log) {
  context = { blockchain, nodeId, httpPort, wsPort, log };
  urls.forEach((url) => connectToPeer(url, context));
}

function connectToPeer(url, ctx = context) {
  if (!ctx || sockets.some((socket) => socket.url === url && socket.readyState !== WebSocket.CLOSED)) return false;
  let socket;
  try {
    socket = new WebSocket(url);
  } catch (error) {
    ctx.log(`Không thể kết nối ${url}: ${error.message}`);
    return false;
  }
  socket.on('open', () => {
    ctx.log(`Đã kết nối peer ${url}`);
    initConnection(socket, ctx, true);
  });
  socket.on('error', (error) => ctx.log(`Lỗi peer ${url}: ${error.message}`));
  return true;
}

function initConnection(socket, ctx, outbound) {
  if (peerMeta.has(socket)) return;
  socket.url = socket.url || '';
  sockets.push(socket);
  peerMeta.set(socket, { nodeId: null, httpPort: null, wsPort: null, outbound });
  socket.on('message', (raw) => handleMessage(socket, raw, ctx));
  socket.on('close', () => closeConnection(socket, ctx));
  socket.on('error', () => closeConnection(socket, ctx));
  send(socket, { type: MessageType.HANDSHAKE, data: { nodeId: ctx.nodeId, httpPort: ctx.httpPort, wsPort: ctx.wsPort } });
  send(socket, { type: MessageType.PEER_LIST, data: getKnownPeerUrls() });
  send(socket, { type: MessageType.QUERY_LATEST });
  send(socket, { type: MessageType.EVENT, event: 'status', data: publicStatus(ctx) });
}

function publicStatus(ctx) {
  return {
    nodeId: ctx.nodeId,
    httpPort: ctx.httpPort,
    wsPort: ctx.wsPort,
    height: ctx.blockchain.getLatestBlock().index,
    peers: getPeers(),
    mempoolSize: ctx.blockchain.mempool.length,
  };
}

function handleMessage(socket, raw, ctx) {
  let message;
  try {
    message = JSON.parse(raw.toString());
  } catch {
    ctx.log('Bỏ qua thông điệp P2P không phải JSON.');
    return;
  }
  switch (message.type) {
    case MessageType.HANDSHAKE: {
      const meta = peerMeta.get(socket) || {};
      Object.assign(meta, message.data || {});
      peerMeta.set(socket, meta);
      ctx.log(`Bắt tay với ${meta.nodeId || 'peer chưa đặt tên'}`);
      send(socket, { type: MessageType.PEER_LIST, data: getKnownPeerUrls() });
      broadcast({ type: MessageType.EVENT, event: 'peers', data: getPeers() });
      break;
    }
    case MessageType.QUERY_LATEST:
      send(socket, { type: MessageType.RESPONSE_BLOCKCHAIN, data: [ctx.blockchain.getLatestBlock()] });
      break;
    case MessageType.QUERY_ALL:
      send(socket, { type: MessageType.RESPONSE_BLOCKCHAIN, data: ctx.blockchain.chain });
      break;
    case MessageType.RESPONSE_BLOCKCHAIN:
      handleBlockchainResponse(socket, message.data, ctx);
      break;
    case MessageType.NEW_TRANSACTION:
      try {
        const tx = ctx.blockchain.addToMempool(message.data);
        ctx.log(`Nhận giao dịch ${tx.id.slice(0, 12)} từ peer`);
        broadcast({ type: MessageType.EVENT, event: 'mempool', data: ctx.blockchain.mempool.length });
        broadcast({ type: MessageType.NEW_TRANSACTION, data: tx }, socket);
      } catch (error) {
        ctx.log(`Từ chối giao dịch peer: ${error.message}`);
      }
      break;
    case MessageType.DEMO_FAUCET:
      try {
        if (ctx.blockchain.applyDemoFunding(message.data)) {
          ctx.log(`Đồng bộ coin faucet demo cho ${message.data.address.slice(0, 10)}…`);
          broadcast({ type: MessageType.DEMO_FAUCET, data: message.data }, socket);
        }
      } catch (error) {
        ctx.log(`Từ chối cập nhật faucet peer: ${error.message}`);
      }
      break;
    case MessageType.PEER_LIST:
      // Không tự động mở kết nối từ peer-list để tránh vòng lặp kết nối.
      break;
    case MessageType.EVENT:
      // EVENT là luồng monitor một chiều; node không relay event monitor thành log mới.
      break;
    default:
      ctx.log(`Thông điệp P2P không hỗ trợ: ${String(message.type || 'unknown')}`);
  }
}

function handleBlockchainResponse(socket, received, ctx) {
  if (!Array.isArray(received) || received.length === 0) return;
  const latest = received[received.length - 1];
  if (received.length === 1) {
    const held = ctx.blockchain.getLatestBlock();
    if (latest.index === held.index && latest.hash === held.hash) return;
    if (latest.index > held.index && ctx.blockchain.addBlock(latest)) {
      ctx.log(`Chấp nhận block #${latest.index}`);
      broadcastLatest(ctx.blockchain);
      broadcast({ type: MessageType.EVENT, event: 'chain', data: ctx.blockchain.chain });
      return;
    }
    send(socket, { type: MessageType.QUERY_ALL });
    return;
  }
  if (ctx.blockchain.replaceChain(received)) {
    ctx.log(`Đồng thuận: áp dụng chuỗi có work cao hơn (height ${latest.index})`);
    broadcastLatest(ctx.blockchain);
  } else {
    ctx.log('Từ chối chuỗi peer không hợp lệ hoặc có cumulative work thấp hơn.');
  }
  broadcast({ type: MessageType.EVENT, event: 'chain', data: ctx.blockchain.chain });
}

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(message, except = null) {
  sockets.forEach((socket) => {
    if (socket !== except) send(socket, message);
  });
}

function broadcastLatest(blockchain) {
  if (!context) return;
  broadcast({ type: MessageType.RESPONSE_BLOCKCHAIN, data: [blockchain.getLatestBlock()] });
  broadcast({ type: MessageType.EVENT, event: 'chain', data: blockchain.chain });
}

function broadcastTransaction(tx) {
  broadcast({ type: MessageType.NEW_TRANSACTION, data: tx });
}

function broadcastDemoFaucet(funding) {
  broadcast({ type: MessageType.DEMO_FAUCET, data: funding });
}

function closeConnection(socket, ctx = context) {
  if (!peerMeta.has(socket)) return;
  const peer = peerMeta.get(socket);
  peerMeta.delete(socket);
  sockets = sockets.filter((item) => item !== socket);
  if (ctx) ctx.log(`Peer ${peer.nodeId || socket.url || 'không rõ'} đã ngắt kết nối`);
  broadcast({ type: MessageType.EVENT, event: 'peers', data: getPeers() });
}

function disconnectPeer(url) {
  const socket = sockets.find((item) => item.url === url);
  if (!socket) return false;
  socket.close(1000, 'Disconnected by node operator');
  return true;
}

function getPeers() {
  return Array.from(peerMeta.entries()).filter(([, meta]) => meta.nodeId).map(([socket, meta]) => ({
    nodeId: meta.nodeId || socket.url || 'Peer',
    httpPort: meta.httpPort,
    wsPort: meta.wsPort,
    url: socket.url,
    status: socket.readyState === WebSocket.OPEN ? 'connected' : 'connecting',
  }));
}

function getKnownPeerUrls() {
  return getPeers().map((peer) => peer.url || (peer.wsPort ? `ws://localhost:${peer.wsPort}` : '')).filter(Boolean);
}

function getSockets() {
  return sockets;
}

module.exports = {
  MessageType,
  initP2PServer,
  connectToPeers,
  connectToPeer,
  disconnectPeer,
  broadcast,
  broadcastLatest,
  broadcastTransaction,
  broadcastDemoFaucet,
  getPeers,
  getKnownPeerUrls,
  getSockets,
};
