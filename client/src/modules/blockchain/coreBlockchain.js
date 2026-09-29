import { calculateSHA256 as sha256 } from '../crypto/SHA-256.js';

export const ZERO_HASH = '0'.repeat(64);

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function transactionHash(tx) {
  return sha256(stableStringify(tx));
}

export function getMerkleRoot(transactions = []) {
  if (!transactions.length) return sha256('');
  let level = transactions.map((tx) => transactionHash(tx));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(sha256(level[i] + (level[i + 1] || level[i])));
    level = next;
  }
  return level[0];
}

export function getMerkleProof(transactions, leafIndex) {
  if (leafIndex < 0 || leafIndex >= transactions.length) return [];
  let index = leafIndex;
  let level = transactions.map(transactionHash);
  const proof = [];
  while (level.length > 1) {
    const siblingIndex = index ^ 1;
    proof.push({ hash: level[siblingIndex] || level[index], side: siblingIndex < index ? 'left' : 'right' });
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(sha256(level[i] + (level[i + 1] || level[i])));
    level = next;
    index = Math.floor(index / 2);
  }
  return proof;
}

export function verifyMerkleProof(transaction, proof, root) {
  return proof.reduce((hash, node) => node.side === 'left' ? sha256(node.hash + hash) : sha256(hash + node.hash), transactionHash(transaction)) === root;
}

export class Block {
  constructor(version = 1, previousHash = ZERO_HASH, transactions = [], timestamp = Math.floor(Date.now() / 1000), difficulty = 1, index = 0) {
    this.version = version;
    this.index = index;
    this.previousHash = previousHash;
    this.prevHash = previousHash;
    this.transactions = transactions;
    this.data = transactions;
    this.merkleRoot = getMerkleRoot(transactions);
    this.timestamp = timestamp;
    this.difficulty = difficulty;
    this.nonce = 0;
    this.next = null;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return sha256([this.version, this.index, this.previousHash, this.merkleRoot, this.timestamp, this.difficulty, this.nonce].join('|'));
  }

  meetsDifficulty(targetDifficulty = this.difficulty) {
    return this.hash.startsWith('0'.repeat(targetDifficulty));
  }
}

export function calculateBlockHash(block) {
  return sha256([
    block.version,
    block.index,
    block.previousHash ?? block.prevHash,
    block.merkleRoot,
    block.timestamp,
    block.difficulty,
    block.nonce,
  ].join('|'));
}

export function createGenesisBlock() {
  const block = new Block(1, ZERO_HASH, [{ info: 'Genesis Block - Educational Simulator' }], 1700000000, 1, 0);
  while (!block.meetsDifficulty()) {
    block.nonce += 1;
    block.hash = block.calculateHash();
  }
  return block;
}

export function createMinedBlock(previousBlock, transactions = [], difficulty = 1) {
  const block = new Block(1, previousBlock.hash, transactions, Math.floor(Date.now() / 1000), difficulty, previousBlock.index + 1);
  let attempts = 0;
  const prefix = '0'.repeat(difficulty);
  while (attempts < 2_000_000) {
    block.hash = block.calculateHash();
    attempts += 1;
    if (block.hash.startsWith(prefix)) break;
    block.nonce += 1;
  }
  if (!block.hash.startsWith(prefix)) throw new Error('Đã chạm giới hạn 2 triệu lần thử khi đào block.');
  return { block, attempts };
}

export function validateChain(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) return false;
  const genesis = createGenesisBlock();
  if (blocks[0].hash !== genesis.hash || calculateBlockHash(blocks[0]) !== blocks[0].hash) return false;
  return blocks.slice(1).every((block, index) => {
    const previous = blocks[index];
    return block.index === previous.index + 1
      && block.previousHash === previous.hash
      && block.merkleRoot === getMerkleRoot(block.transactions)
      && calculateBlockHash(block) === block.hash
      && block.hash.startsWith('0'.repeat(block.difficulty));
  });
}

export class Blockchain {
  constructor(options = {}) {
    this.difficulty = options.difficulty ?? 1;
    this.blocks = options.autoGenesis === false ? [] : [createGenesisBlock()];
  }

  get head() { return this.blocks[0] || null; }
  get tail() { return this.blocks[this.blocks.length - 1] || null; }
  get length() { return this.blocks.length; }
  toArray() { return this.blocks; }
  at(index) { return this.blocks[index] || null; }
  addBlock(transactions = []) {
    const previous = this.tail || createGenesisBlock();
    const { block } = createMinedBlock(previous, transactions, this.difficulty);
    if (this.tail) this.tail.next = block;
    this.blocks.push(block);
    return block;
  }
  isChainValid() { return validateChain(this.blocks); }
  validateDetailed() {
    return this.blocks.map((block, index) => ({
      block,
      index,
      dataOk: calculateBlockHash(block) === block.hash,
      linkOk: index === 0 ? block.previousHash === ZERO_HASH : block.previousHash === this.blocks[index - 1].hash,
      merkleOk: block.merkleRoot === getMerkleRoot(block.transactions),
      powOk: block.hash.startsWith('0'.repeat(block.difficulty)),
    })).map((result) => ({ ...result, valid: result.dataOk && result.linkOk && result.merkleOk && result.powOk }));
  }
  tamper(index, newTransactions) {
    const block = this.at(index);
    if (!block) return null;
    block.transactions = newTransactions;
    block.data = newTransactions;
    block.merkleRoot = getMerkleRoot(newTransactions);
    return block;
  }
  recomputeFrom(index) {
    let totalAttempts = 0;
    for (let i = Math.max(0, index); i < this.blocks.length; i += 1) {
      const block = this.blocks[i];
      block.previousHash = i === 0 ? ZERO_HASH : this.blocks[i - 1].hash;
      block.prevHash = block.previousHash;
      block.data = block.transactions;
      block.merkleRoot = getMerkleRoot(block.transactions);
      block.nonce = 0;
      let attempts = 0;
      while (attempts < 2_000_000) {
        block.hash = block.calculateHash();
        attempts += 1;
        totalAttempts += 1;
        if (block.meetsDifficulty()) break;
        block.nonce += 1;
      }
      if (!block.meetsDifficulty()) throw new Error('Đã chạm giới hạn 2 triệu lần thử.');
    }
    return totalAttempts;
  }
  clone() {
    const copy = new Blockchain({ autoGenesis: false, difficulty: this.difficulty });
    copy.blocks = this.blocks.map((block) => {
      const clone = new Block(block.version, block.previousHash, [...block.transactions], block.timestamp, block.difficulty, block.index);
      clone.merkleRoot = block.merkleRoot;
      clone.nonce = block.nonce;
      clone.hash = block.hash;
      return clone;
    });
    copy.blocks.forEach((block, index) => { block.next = copy.blocks[index + 1] || null; });
    return copy;
  }
}
