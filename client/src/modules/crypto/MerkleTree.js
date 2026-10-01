import CryptoJS from 'crypto-js';

/**
 * Hàm băm SHA-256 sử dụng thư viện crypto-js 
 */
export const sha256 = (data) => {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
};

/**
 * Xây dựng các tầng Merkle Tree từ danh sách giao dịch
 * Quy tắc: Nếu số nút lẻ ở một tầng, nhân bản nút cuối cùng (theo chuẩn Bitcoin)
 */
export function buildLevels(transactions) {
  if (!transactions || transactions.length === 0) {
    return [['0'.repeat(64)]];
  }

  // Tầng 0 (Lá): Băm từng giao dịch
  const levels = [transactions.map(sha256)];

  while (levels.at(-1).length > 1) {
    const previous = levels.at(-1);
    const next = [];

    for (let i = 0; i < previous.length; i += 2) {
      const left = previous[i];
      const right = previous[i + 1] || left; // Nhân bản nếu lẻ
      next.push(sha256(left + right));
    }
    levels.push(next);
  }

  return levels;
}

/**
 * Tính Merkle Root đại diện cho toàn bộ block
 */
export function getMerkleRoot(transactions) {
  const levels = buildLevels(transactions);
  return levels.at(-1)[0];
}

/**
 * Sinh Merkle Proof cho một giao dịch theo chỉ số index (Độ phức tạp O(log n))
 * Trả về mảng các sibling node kèm vị trí (L hoặc R)
 */
export function getMerkleProof(transactions, targetIndex) {
  if (targetIndex < 0 || targetIndex >= transactions.length) return null;

  const levels = buildLevels(transactions);
  let currentIndex = targetIndex;
  const proof = [];

  // Duyệt từ tầng lá lên sát đỉnh Root
  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex++) {
    const currentLevel = levels[levelIndex];
    const isEven = currentIndex % 2 === 0;
    const siblingIndex = isEven ? currentIndex + 1 : currentIndex - 1;

    // Lấy hash của sibling (nếu nút cuối lẻ thì lấy chính nó)
    const siblingHash = currentLevel[siblingIndex] || currentLevel[currentIndex];

    proof.push({
      hash: siblingHash,
      side: isEven ? 'R' : 'L', // Sibling nằm bên phải hay bên trái
    });

    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

/**
 * Xác minh giao dịch có nằm trong Merkle Root hay không (Dành cho SPV / Light Client)
 */
export function verifyMerkleProof(transaction, proof, expectedRoot) {
  if (!proof || !expectedRoot) return false;

  let currentHash = sha256(transaction);

  for (const step of proof) {
    if (step.side === 'L') {
      currentHash = sha256(step.hash + currentHash);
    } else {
      currentHash = sha256(currentHash + step.hash);
    }
  }

  return currentHash === expectedRoot;
}

/**
 * Lớp FullNode mô phỏng node đầy đủ
 */
export class FullNode {
  constructor(transactions = []) {
    this.transactions = [...transactions];
  }

  getRoot() {
    return getMerkleRoot(this.transactions);
  }

  getProof(tx) {
    const idx = this.transactions.indexOf(tx);
    return idx !== -1 ? getMerkleProof(this.transactions, idx) : null;
  }
}

/**
 * Lớp LightClient mô phỏng ví nhẹ (SPV) chỉ lưu Root
 */
export class LightClient {
  constructor(merkleRoot) {
    this.merkleRoot = merkleRoot;
  }

  verify(tx, proof) {
    return verifyMerkleProof(tx, proof, this.merkleRoot);
  }
}
