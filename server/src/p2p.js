/**
 * server/src/p2p.js
 * ------------------------------------------------------------------
 * P2P WebSocket server/client — xử lý broadcast & sync chain giữa các
 * Full Node (P8/P9). Viết khớp với interface của blockchain.js:
 *   - Blockchain có sẵn `mempool` bên trong (blockchain.mempool)
 *   - addBlock(newBlock) trả về true/false (đã tự validate isValidNewBlock)
 *   - replaceChain(newChain) tự validate isValidChain + so độ dài rồi mới thay
 *   - Đồng thuận: Longest Chain Rule (không có difficulty riêng từng block)
 * ------------------------------------------------------------------
 */

const { WebSocketServer, WebSocket } = require('ws');
const { isValidChain } = require('./blockchain.js');

const MessageType = {
  QUERY_LATEST_BLOCK: 'QUERY_LATEST_BLOCK',   // "Cho tôi biết block mới nhất của bạn"
  QUERY_ALL_BLOCKS: 'QUERY_ALL_BLOCKS',       // "Cho tôi xem toàn bộ chain của bạn"
  RESPONSE_BLOCKCHAIN: 'RESPONSE_BLOCKCHAIN', // Trả lời 1 trong 2 câu hỏi trên (data = mảng block)
  NEW_TRANSACTION: 'NEW_TRANSACTION',         // Dữ liệu/giao dịch mới cần lan truyền vào Mempool
};

class P2PServer {
  /**
   * @param {object} opts
   * @param {number} opts.p2pPort         Cổng WebSocket của Node này (vd 4001/4002/4003)
   * @param {import('./blockchain.js').Blockchain} opts.blockchain  Instance blockchain của Node này
   * @param {(line:string)=>void} [opts.onLog]  Callback log — server.js in ra console / lưu buffer cho LiveLogViewer
   */
  constructor({ p2pPort, blockchain, onLog }) {
    this.p2pPort = p2pPort;
    this.blockchain = blockchain;
    this.onLog = onLog || function () {};
    this.sockets = []; // tất cả kết nối đang mở, cả inbound (server) lẫn outbound (client)
  }

  /** Mở WebSocketServer để nhận kết nối từ các Node khác. */
  listen() {
    const server = new WebSocketServer({ port: this.p2pPort });
    server.on('connection', (ws) => this._initConnection(ws));
    server.on('error', (err) => this.onLog('[P2P] Server error: ' + err.message));
    this.onLog('[P2P] Listening for peer-to-peer connections on port ' + this.p2pPort);
    this.wss = server;
    return this;
  }

  /** Chủ động kết nối tới 1 peer khác (địa chỉ dạng "ws://host:port"). Dùng cho panel "Kết nối tới trạm chuyển tiếp". */
  connectToPeer(peerAddress) {
    const already = this.sockets.some((ws) => ws.__peerAddress === peerAddress);
    if (already) {
      this.onLog('[P2P] Đã kết nối sẵn với ' + peerAddress + ', bỏ qua');
      return;
    }

    const ws = new WebSocket(peerAddress);
    ws.__peerAddress = peerAddress;

    ws.on('open', () => this._initConnection(ws));
    ws.on('error', () => {
      this.onLog('[P2P] Không thể kết nối tới peer: ' + peerAddress);
      this._removeSocket(ws);
    });
  }

  /** Ngắt kết nối 1 peer cụ thể theo địa chỉ (dùng cho nút "Ngắt" trên UI). */
  disconnectPeer(peerAddress) {
    const ws = this.sockets.find((s) => s.__peerAddress === peerAddress);
    if (ws) ws.close();
  }

  // -----------------------------------------------------------------------
  // Kết nối & message routing
  // -----------------------------------------------------------------------

  _initConnection(ws) {
    this.sockets.push(ws);
    this._initMessageHandler(ws);
    this._initErrorHandler(ws);

    // Vừa bắt tay xong -> hỏi ngay block mới nhất của peer để biết ai đang dẫn đầu.
    this._write(ws, this._queryLatestMsg());
    this.onLog(
      '[P2P] Peer connected' +
        (ws.__peerAddress ? ' (' + ws.__peerAddress + ')' : ' (inbound)') +
        ' — tổng peer: ' +
        this.sockets.length
    );
  }

  _initMessageHandler(ws) {
    ws.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch (e) {
        this.onLog('[P2P] Nhận message sai định dạng JSON, bỏ qua');
        return;
      }
      this._handleMessage(message, ws);
    });
  }

  _initErrorHandler(ws) {
    ws.on('close', () => this._removeSocket(ws));
    ws.on('error', () => this._removeSocket(ws));
  }

  _removeSocket(ws) {
    const idx = this.sockets.indexOf(ws);
    if (idx !== -1) {
      this.sockets.splice(idx, 1);
      this.onLog('[P2P] Peer disconnected — còn lại ' + this.sockets.length + ' peer');
    }
  }

  _handleMessage(message, ws) {
    switch (message.type) {
      case MessageType.QUERY_LATEST_BLOCK:
        this._write(ws, this._responseLatestMsg());
        break;

      case MessageType.QUERY_ALL_BLOCKS:
        this._write(ws, this._responseChainMsg());
        break;

      case MessageType.RESPONSE_BLOCKCHAIN:
        this._handleBlockchainResponse(message.data, ws);
        break;

      case MessageType.NEW_TRANSACTION:
        this._handleIncomingTransaction(message.data, ws);
        break;

      default:
        this.onLog('[P2P] Message type không xác định: ' + message.type);
    }
  }

  // -----------------------------------------------------------------------
  // Chain sync (P8) + Longest Chain Rule (P9/P10)
  // -----------------------------------------------------------------------

  _handleBlockchainResponse(receivedChain, ws) {
    if (!Array.isArray(receivedChain) || receivedChain.length === 0) {
      this.onLog('[P2P] Nhận chain rỗng hoặc sai định dạng, bỏ qua');
      return;
    }

    const latestReceived = receivedChain[receivedChain.length - 1];
    const latestOwn = this.blockchain.getLatestBlock();

    if (latestReceived.index <= latestOwn.index) {
      this.onLog('[P2P] Chain nhận được không dài hơn chain hiện tại — bỏ qua');
      return;
    }

    if (latestOwn.hash === latestReceived.previousHash) {
      // Trường hợp đơn giản: block mới nối thẳng được vào đuôi chain hiện tại.
      if (this.blockchain.addBlock(latestReceived)) {
        this.onLog(
          '[P2P] Đã nối thêm block #' + latestReceived.index + ' từ mạng -> height=' + this.blockchain.chain.length
        );
        this.broadcast(this._responseLatestMsg());
      } else {
        this.onLog('[P2P] Block #' + latestReceived.index + ' không hợp lệ (hash/nonce) — reject');
      }
      return;
    }

    if (receivedChain.length === 1) {
      // Peer chỉ gửi 1 block (broadcast latest) nhưng mình không nối được
      // -> có thể mình đang tụt lại phía sau -> xin toàn bộ chain của họ.
      this.onLog('[P2P] Không nối trực tiếp được, xin đồng bộ toàn bộ chain...');
      this._write(ws, this._queryAllMsg());
      return;
    }

    // Nhận được toàn bộ 1 chain dài hơn -> replaceChain() tự validate
    // (isValidChain + so độ dài) trước khi quyết định thay thế.
    const replaced = this.blockchain.replaceChain(receivedChain);
    if (replaced) {
      this.onLog('[P2P] Đồng bộ theo Longest Chain Rule -> height=' + this.blockchain.chain.length);
      this.broadcast(this._responseLatestMsg());
    } else {
      this.onLog(
        '[P2P] Chain nhận được không hợp lệ hoặc không dài hơn (valid=' +
          isValidChain(receivedChain) +
          ', length ' +
          receivedChain.length +
          ' vs ' +
          this.blockchain.chain.length +
          ') — giữ nguyên'
      );
    }
  }

  // -----------------------------------------------------------------------
  // Mempool relay — dữ liệu/giao dịch mới (P4)
  // -----------------------------------------------------------------------

  _handleIncomingTransaction(tx, fromWs) {
    if (tx === undefined || tx === null) {
      this.onLog('[P2P] Dữ liệu giao dịch rỗng, bỏ qua');
      return;
    }

    const serialized = JSON.stringify(tx);
    const isDuplicate = this.blockchain.mempool.some((t) => JSON.stringify(t) === serialized);
    if (isDuplicate) {
      this.onLog('[P2P] Giao dịch trùng lặp (replay) từ mạng, bỏ qua');
      return;
    }

    this.blockchain.addToMempool(tx);
    this.onLog('[P2P] Nhận giao dịch mới từ mạng, đã thêm vào mempool');

    // Lan truyền tiếp cho các peer khác (trừ người vừa gửi) — flooding đơn giản.
    this.broadcast(this._newTransactionMsg(tx), fromWs);
  }

  // -----------------------------------------------------------------------
  // API công khai để server.js gọi khi có sự kiện cục bộ (REST) cần lan truyền
  // -----------------------------------------------------------------------

  /** Gọi ngay sau khi server.js tự mine được 1 block mới (mineNewBlock). */
  broadcastLatestBlock() {
    this.broadcast(this._responseLatestMsg());
  }

  /** Gọi ngay sau khi server.js nhận 1 giao dịch mới qua REST (POST /transactions). */
  broadcastTransaction(tx) {
    this.broadcast(this._newTransactionMsg(tx));
  }

  getPeerCount() {
    return this.sockets.length;
  }

  // -----------------------------------------------------------------------
  // Helpers gửi/broadcast message
  // -----------------------------------------------------------------------

  broadcast(message, excludeWs) {
    this.sockets.forEach((ws) => {
      if (ws !== excludeWs) this._write(ws, message);
    });
  }

  _write(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  _queryLatestMsg() {
    return { type: MessageType.QUERY_LATEST_BLOCK };
  }

  _queryAllMsg() {
    return { type: MessageType.QUERY_ALL_BLOCKS };
  }

  _responseLatestMsg() {
    return { type: MessageType.RESPONSE_BLOCKCHAIN, data: [this.blockchain.getLatestBlock()] };
  }

  _responseChainMsg() {
    return { type: MessageType.RESPONSE_BLOCKCHAIN, data: this.blockchain.chain };
  }

  _newTransactionMsg(tx) {
    return { type: MessageType.NEW_TRANSACTION, data: tx };
  }
}

module.exports = { P2PServer, MessageType };
