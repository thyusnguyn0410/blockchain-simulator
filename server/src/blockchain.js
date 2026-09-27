/**
 * server/src/blockchain.js
 * ---------------------------------------------------------------------------------
 * MÔ-ĐUN LÕI BLOCKCHAIN & CƠ CHẾ ĐỒNG THUẬN (BACKEND)
 * - Tương thích hoàn toàn với cấu trúc Block Header phía Client (prevHash, merkleRoot).
 * - Tích hợp xác thực chữ ký số ECDSA (secp256k1) và cây Merkle Tree SHA-256.
 * - Quản lý số dư tài khoản, phòng chống Double-Spending bằng Nonce tuần tự.
 * - Triển khai cơ chế đồng thuận Chuỗi nặng nhất (Chain Work / Cumulative Difficulty).
 * ---------------------------------------------------------------------------------
 */

const crypto = require('crypto');

// Chuỗi 64 ký tự '0' đại diện cho hash khởi thủy của Genesis Block
const ZERO_HASH = '0'.repeat(64);
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const DIFFICULTY_PREFIX = '00';

/**
 * Chuyển đổi đối tượng JavaScript thành chuỗi JSON chuẩn hóa (Deterministic JSON)
 * Sắp xếp các khóa theo bảng chữ cái để đảm bảo băm chuỗi luôn đồng nhất trên mọi máy.
 * @param {*} value - Giá trị hoặc đối tượng cần serialize
 * @returns {string} - Chuỗi JSON có thứ tự key cố định
 */
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Hàm tính toán mã băm SHA-256 tiêu chuẩn (Hex chữ thường)
 * @param {string|number|object} value - Dữ liệu đầu vào
 * @returns {string} - Chuỗi mã băm Hex 64 ký tự
 */
function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').toLowerCase();
}

/**
 * Tính toán Merkle Root từ danh sách giao dịch (Sử dụng cấu trúc cây nhị phân)
 * @param {Array} transactions - Mảng các giao dịch
 * @returns {string} - Mã băm gốc Merkle Root 64 ký tự
 */
function calculateMerkleRoot(transactions = []) {
  if (!transactions.length) return sha256('');
  
  // 1. Băm từng giao dịch lá
  let level = transactions.map((tx) => sha256(typeof tx === 'string' ? tx : stableStringify(tx)));
  
  // 2. Gom nhóm từng cặp và băm dần lên đến đỉnh cây
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      // Nếu số lượng lá lẻ, nhân đôi lá cuối cùng để ghép cặp
      next.push(sha256(level[i] + (level[i + 1] || level[i])));
    }
    level = next;
  }
  return level[0];
}

/**
 * Tính toán mã băm đại diện cho Block Header
 * Cấu trúc: version | index | prevHash | merkleRoot | timestamp | difficulty | nonce
 * @param {object} block - Đối tượng khối
 * @returns {string} - Mã băm khối
 */
function calculateHashForBlock(block) {
  return sha256([
    block.version,
    block.index,
    block.prevHash, // Khớp với trường prevHash của Client
    block.merkleRoot,
    block.timestamp,
    block.difficulty,
    block.nonce,
  ].join('|'));
}

/**
 * Tạo khối Genesis Block mặc định (Khối cội nguồn cố định)
 * @returns {object} - Genesis Block chuẩn
 */
function getGenesisBlock() {
  const block = {
    version: 1,
    index: 0,
    prevHash: ZERO_HASH,
    merkleRoot: calculateMerkleRoot([{ info: 'Genesis Block - Educational Simulator' }]),
    timestamp: 1700000000,
    difficulty: 1,
    nonce: 0,
    transactions: [{ info: 'Genesis Block - Educational Simulator' }],
  };
  
  block.hash = calculateHashForBlock(block);
  while (!block.hash.startsWith('0')) {
    block.nonce += 1;
    block.hash = calculateHashForBlock(block);
  }
  return block;
}

/**
 * Khai thác một khối mới bằng thuật toán Proof-of-Work
 * @param {number} index - Vị trí của khối trong chuỗi
 * @param {string} prevHash - Mã băm của khối liền trước
 * @param {Array} transactions - Mảng các giao dịch trong khối
 * @param {number} difficulty - Độ khó đào khối
 * @returns {object} - Khối hợp lệ sau khi đào kèm thông số số lần thử và thời gian
 */
function mineBlock(index, prevHash, transactions, difficulty = 2) {
  const level = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Number(difficulty) || 1));
  const block = {
    version: 1,
    index,
    prevHash, // Khớp chuẩn prevHash
    merkleRoot: calculateMerkleRoot(transactions),
    timestamp: Math.floor(Date.now() / 1000),
    difficulty: level,
    nonce: 0,
    transactions,
  };

  const prefix = '0'.repeat(level);
  const startedAt = Date.now();
  const maximumAttempts = 10_000_000;
  let attempts = 0;

  while (attempts < maximumAttempts) {
    block.hash = calculateHashForBlock(block);
    attempts += 1;
    if (block.hash.startsWith(prefix)) break;
    block.nonce += 1;
  }

  if (!block.hash.startsWith(prefix)) {
    throw new Error(`Không tìm thấy proof trong ${maximumAttempts.toLocaleString()} lần thử; hãy giảm độ khó.`);
  }

  return Object.assign(block, {
    attempts,
    timeTakenMs: Date.now() - startedAt,
  });
}

/**
 * Kiểm tra tính hợp lệ của một khối mới khi nối tiếp khối trước đó
 * @param {object} block - Khối mới
 * @param {object} previousBlock - Khối trước đó
 * @returns {boolean} - true nếu khối hoàn toàn hợp lệ
 */
function isValidNewBlock(block, previousBlock) {
  if (!block || !previousBlock || block.index !== previousBlock.index + 1) return false;
  if (block.prevHash !== previousBlock.hash) return false;
  if (!Number.isInteger(block.difficulty) || block.difficulty < MIN_DIFFICULTY || block.difficulty > MAX_DIFFICULTY) return false;
  if (!Array.isArray(block.transactions)) return false;
  if (calculateMerkleRoot(block.transactions) !== block.merkleRoot) return false;
  if (calculateHashForBlock(block) !== block.hash) return false;
  return block.hash.startsWith('0'.repeat(block.difficulty));
}

/**
 * Rút trích địa chỉ ví công khai từ Khóa công khai (Public Key Hex)
 * Địa chỉ ví là 40 ký tự đầu của chuỗi băm Public Key
 * @param {string} publicKey - Public Key dạng Hex
 * @returns {string} - Địa chỉ ví (40 ký tự Hex)
 */
function getAddress(publicKey) {
  return sha256(publicKey).slice(0, 40);
}

/**
 * Lấy định danh duy nhất (TXID) của giao dịch
 * @param {object} tx - Đối tượng giao dịch
 * @returns {string} - Mã băm đại diện giao dịch
 */
function getTransactionId(tx) {
  if (tx && tx.from && tx.to) {
    return sha256(stableStringify({
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      nonce: tx.nonce,
      publicKey: tx.publicKey,
      signature: tx.signature,
    }));
  }
  return sha256(stableStringify(tx));
}

/**
 * Xác thực chữ ký số ECDSA (secp256k1) của giao dịch
 * @param {object} tx - Giao dịch chứa chữ ký số
 * @returns {boolean} - true nếu chữ ký hợp lệ
 */
function verifyTransactionSignature(tx) {
  if (!tx.publicKey || !tx.signature || !/^[0-9a-f]+$/i.test(tx.publicKey)) return false;
  try {
    // Chuyển SEC1 raw public key của elliptic thành định dạng SPKI DER tương thích Node.js crypto
    const key = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('3056301006072a8648ce3d020106052b8104000a034200', 'hex'),
        Buffer.from(tx.publicKey, 'hex'),
      ]),
      format: 'der',
      type: 'spki',
    });
    const payload = stableStringify({
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      nonce: tx.nonce,
    });
    return crypto.verify('sha256', Buffer.from(payload), key, Buffer.from(tx.signature, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Kiểm tra tính hợp lệ của toàn bộ sổ cái (Ledger): số dư ví, nonce tuần tự, chống double-spending
 * @param {Array} chain - Toàn bộ chuỗi khối
 * @returns {boolean} - true nếu mọi giao dịch trên sổ cái hợp lệ
 */
function hasValidLedger(chain) {
  const balances = new Map();
  const nonces = new Map();
  const seenTransactions = new Set();
  const seenFunding = new Set();

  for (const block of chain) {
    for (const tx of block.transactions || []) {
      if (tx && typeof tx.info === 'string' && !tx.from) continue;
      
      // Xử lý nạp tiền qua Faucet
      if (tx?.type === 'FAUCET') {
        if (!/^[0-9a-f]{40}$/i.test(tx.address || '') || !Number.isFinite(tx.amount) || tx.amount <= 0 || tx.amount > 1000) return false;
        if (typeof tx.fundingId !== 'string' || seenFunding.has(tx.fundingId)) return false;
        seenFunding.add(tx.fundingId);
        balances.set(tx.address, (balances.get(tx.address) || 0) + tx.amount);
        continue;
      }

      // Xử lý chuyển tiền thông thường
      if (!tx || !/^[0-9a-f]{40}$/i.test(tx.from \vert{}\vert{} '') \vert{}\vert{} !/^[0-9a-f]{40}$/i.test(tx.to || '')) return false;
      if (!Number.isFinite(tx.amount) || tx.amount <= 0 || !Number.isSafeInteger(tx.nonce) || tx.nonce < 0) return false;
      if (getAddress(tx.publicKey || '') !== tx.from || !verifyTransactionSignature(tx)) return false;
      
      const id = getTransactionId(tx);
      if (seenTransactions.has(id) || tx.nonce !== (nonces.get(tx.from) || 0)) return false;
      if ((balances.get(tx.from) || 0) < tx.amount) return false;

      seenTransactions.add(id);
      nonces.set(tx.from, tx.nonce + 1);
      balances.set(tx.from, (balances.get(tx.from) || 0) - tx.amount);
      balances.set(tx.to, (balances.get(tx.to) || 0) + tx.amount);
    }
  }
  return true;
}

/**
 * Kiểm tra tính hợp lệ của toàn bộ chuỗi khối (Cấu trúc hash và sổ cái)
 * @param {Array} chain - Mảng chuỗi khối
 * @returns {boolean}
 */
function isValidChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) return false;
  if (stableStringify(chain[0]) !== stableStringify(getGenesisBlock())) return false;
  if (!chain.slice(1).every((block, index) => isValidNewBlock(block, chain[index]))) return false;
  return hasValidLedger(chain);
}

/**
 * Tính tổng công sức đào khối tích lũy (Cumulative Chain Work)
 * Dùng làm thước đo cho quy tắc đồng thuận chuỗi nặng nhất (Proof of Work Consensus)
 * @param {Array} chain - Chuỗi khối
 * @returns {number} - Tổng điểm công sức
 */
function chainWork(chain) {
  return chain.reduce((work, block) => work + (16 ** Math.min(block.difficulty || 1, MAX_DIFFICULTY)), 0);
}

/**
 * LỚP BLOCKCHAIN QUẢN LÝ SỔ CÁI VÀ GIAO TIẾP VỚI CẢ CLIENT VÀ MẠNG P2P
 */
class Blockchain {
  constructor(options = {}) {
    const requestedDifficulty = Number(options.difficulty);
    this.difficulty = Number.isInteger(requestedDifficulty) && requestedDifficulty >= MIN_DIFFICULTY && requestedDifficulty <= MAX_DIFFICULTY
      ? requestedDifficulty
      : 2;
    this.chain = [getGenesisBlock()];
    this.mempool = [];
    this.faucetBalances = new Map();
    this.pendingFaucets = [];
    this.seenFundingIds = new Set();
  }

  /**
   * Lấy khối mới nhất hiện tại ở cuối chuỗi
   * Cung cấp getter .tail để tương thích với code Client
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }
  get tail() {
    return this.getLatestBlock();
  }
  get length() {
    return this.chain.length;
  }

  /**
   * Chuyển đổi danh sách khối thành dạng mảng chuẩn (Khớp với phương thức Client)
   */
  toArray() {
    return [...this.chain];
  }

  /**
   * Lấy khối tại vị trí chỉ định
   * @param {number} index
   */
  at(index) {
    return this.chain[index] || null;
  }

  /**
   * Kiểm tra tính toàn vẹn của chuỗi (Hỗ trợ alias isChainValid của Client)
   */
  isChainValid() {
    return isValidChain(this.chain);
  }

  /**
   * Lấy số dư khả dụng của một địa chỉ ví
   * @param {string} address - Địa chỉ ví 40 ký tự hex
   */
  getBalance(address) {
    const confirmed = this.chain.flatMap((block) => block.transactions || []).reduce((balance, tx) => {
      if (tx.type === 'FAUCET' && tx.address === address) balance += Number(tx.amount) || 0;
      if (tx.from === address) balance -= Number(tx.amount) || 0;
      if (tx.to === address) balance += Number(tx.amount) || 0;
      return balance;
    }, 0);

    const pending = this.mempool.reduce((balance, tx) => {
      if (tx.from === address) balance -= Number(tx.amount) || 0;
      return balance;
    }, confirmed + (this.faucetBalances.get(address) || 0));

    return pending;
  }

  /**
   * Nạp coin thử nghiệm vào địa chỉ ví qua Faucet
   */
  applyDemoFunding({ address, amount, fundingId }) {
    if (!/^[0-9a-f]{40}$/i.test(address) || !Number.isFinite(amount) || amount <= 0 || amount > 1000) {
      throw new Error('Địa chỉ hoặc số tiền faucet không hợp lệ (tối đa 1,000 coin).');
    }
    const confirmed = this.chain.some((block) => block.transactions.some((tx) => tx.fundingId === fundingId));
    if (typeof fundingId !== 'string' || !fundingId || this.seenFundingIds.has(fundingId) || confirmed) return false;
    this.seenFundingIds.add(fundingId);
    this.faucetBalances.set(address, (this.faucetBalances.get(address) || 0) + amount);
    this.pendingFaucets.push({ type: 'FAUCET', address, amount, fundingId });
    return true;
  }

  createDemoFunding(address, amount = 100) {
    const funding = { address, amount, fundingId: crypto.randomUUID() };
    this.applyDemoFunding(funding);
    return { ...funding, balance: this.getBalance(address) };
  }

  fundDemoAddress(address, amount = 100) {
    return this.createDemoFunding(address, amount).balance;
  }

  /**
   * Kiểm tra tính hợp lệ của một giao dịch trước khi đưa vào Mempool
   */
  validateTransaction(tx) {
    if (!tx || !/^[0-9a-f]{40}$/i.test(tx.from \vert{}\vert{} '') \vert{}\vert{} !/^[0-9a-f]{40}$/i.test(tx.to || '')) {
      return { valid: false, error: 'Địa chỉ người gửi/nhận phải có 40 ký tự hex.' };
    }
    if (!Number.isFinite(tx.amount) || tx.amount <= 0 || tx.amount > 1_000_000) {
      return { valid: false, error: 'Số tiền phải lớn hơn 0 và không vượt quá 1,000,000.' };
    }
    if (!Number.isSafeInteger(tx.nonce) || tx.nonce < 0) {
      return { valid: false, error: 'Nonce giao dịch phải là số nguyên không âm.' };
    }
    if (getAddress(tx.publicKey || '') !== tx.from || !verifyTransactionSignature(tx)) {
      return { valid: false, error: 'Chữ ký ECDSA không hợp lệ hoặc không khớp địa chỉ ví.' };
    }
    const id = getTransactionId(tx);
    const allTransactions = this.chain.flatMap((block) => block.transactions || []).concat(this.mempool);
    if (allTransactions.some((item) => getTransactionId(item) === id)) {
      return { valid: false, error: 'Giao dịch trùng lặp.' };
    }
    const expectedNonce = allTransactions.filter((item) => item.from === tx.from).length;
    if (tx.nonce !== expectedNonce) return { valid: false, error: `Nonce không hợp lệ; cần ${expectedNonce}.` };
    if (this.getBalance(tx.from) < tx.amount) return { valid: false, error: 'Số dư tài khoản không đủ.' };
    return { valid: true };
  }

  /**
   * Thêm giao dịch hợp lệ vào Mempool chờ đào
   */
  addToMempool(tx) {
    const result = this.validateTransaction(tx);
    if (!result.valid) throw new Error(result.error);
    this.mempool.push({ ...tx, id: getTransactionId(tx), receivedAt: tx.receivedAt || Date.now() });
    return this.mempool[this.mempool.length - 1];
  }

  /**
   * Đào một khối mới và tự động gắn vào chuỗi
   * @param {Array} [customData] - Dữ liệu giao dịch tùy chọn (nếu không có sẽ lấy từ Mempool)
   */
  mineNewBlock(customData) {
    const transactions = [...this.pendingFaucets, ...(customData?.length ? customData : this.mempool)];
    if (!transactions.length) transactions.push({ info: `Educational block #${this.getLatestBlock().index + 1}` });
    
    const block = mineBlock(this.getLatestBlock().index + 1, this.getLatestBlock().hash, transactions, this.difficulty);
    if (!this.addBlock(block)) return null;

    const minedIds = new Set(transactions.map(getTransactionId));
    this.mempool = this.mempool.filter((tx) => !minedIds.has(getTransactionId(tx)));
    return block;
  }

  /**
   * Gắn khối vào chuỗi nếu khối hợp lệ
   */
  addBlock(block) {
    if (!isValidNewBlock(block, this.getLatestBlock())) return false;
    if (!isValidChain([...this.chain, block])) return false;
    
    this.chain.push(block);
    
    // Xóa các giao dịch đã được đóng gói khỏi Mempool
    const included = new Set((block.transactions || []).map(getTransactionId));
    this.mempool = this.mempool.filter((tx) => !included.has(getTransactionId(tx)));

    // Xóa các faucet đã được xác nhận
    const includedFunding = new Set((block.transactions || []).filter((tx) => tx.type === 'FAUCET').map((tx) => tx.fundingId));
    this.pendingFaucets = this.pendingFaucets.filter((tx) => !includedFunding.has(tx.fundingId));
    for (const tx of block.transactions || []) {
      if (tx.type !== 'FAUCET') continue;
      const balance = (this.faucetBalances.get(tx.address) || 0) - tx.amount;
      if (balance > 0) this.faucetBalances.set(tx.address, balance);
      else this.faucetBalances.delete(tx.address);
    }
    return true;
  }

  /**
   * Cơ chế đồng thuận: Thay thế chuỗi hiện tại bằng chuỗi ứng viên nếu hợp lệ và có Chain Work cao hơn
   * @param {Array} candidate - Chuỗi khối nhận được từ mạng P2P
   */
  replaceChain(candidate) {
    if (!isValidChain(candidate) || chainWork(candidate) <= chainWork(this.chain)) return false;
    
    this.chain = candidate;
    const confirmedFunding = new Set(candidate.flatMap((block) => block.transactions || []).filter((tx) => tx.type === 'FAUCET').map((tx) => tx.fundingId));
    const pendingFunding = this.pendingFaucets.filter((tx) => confirmedFunding.has(tx.fundingId));
    this.pendingFaucets = this.pendingFaucets.filter((tx) => !confirmedFunding.has(tx.fundingId));
    
    pendingFunding.forEach((tx) => {
      const balance = (this.faucetBalances.get(tx.address) || 0) - tx.amount;
      if (balance > 0) this.faucetBalances.set(tx.address, balance);
      else this.faucetBalances.delete(tx.address);
    });
    
    confirmedFunding.forEach((id) => this.seenFundingIds.add(id));
    
    // Đưa lại các giao dịch chưa được đào vào Mempool của chuỗi mới
    const pending = this.mempool;
    this.mempool = [];
    pending.forEach((tx) => {
      try {
        this.addToMempool(tx);
      } catch {
        // Loại bỏ giao dịch không còn tương thích với sổ cái mới
      }
    });
    return true;
  }
}

module.exports = {
  Blockchain,
  ZERO_HASH,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
  DIFFICULTY_PREFIX,
  sha256,
  stableStringify,
  calculateMerkleRoot,
  calculateHashForBlock,
  getTransactionId,
  getAddress,
  verifyTransactionSignature,
  hasValidLedger,
  getGenesisBlock,
  mineBlock,
  isValidChain,
  isValidNewBlock,
  chainWork,
};
