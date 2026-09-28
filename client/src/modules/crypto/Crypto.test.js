import crypto from 'crypto';

// 1. MÔ-ĐUN CRYPTO (SHA-256, ECDSA, MERKLE)

//SHA-256
const sha256 = (data) => crypto.createHash('sha256').update(String(data)).digest('hex');

// ECDSA (Elliptic Curve Digital Signature Algorithm)
const generateKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKey, privateKey };
};

const signData = (privateKey, data) => {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  return sign.sign(privateKey, 'hex');
};

const verifySignature = (publicKey, data, signature) => {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature, 'hex');
  } catch (err) {
    return false;
  }
};

// MERKLE TREE
class MerkleTree {
  constructor(transactions = []) {
    this.transactions = transactions;
    this.leaves = transactions.map(sha256);
    this.root = this.buildRoot(this.leaves);
  }

  buildRoot(layer) {
    if (!layer || layer.length === 0) return '';
    if (layer.length === 1) return layer[0];

    const nextLayer = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] || left;
      nextLayer.push(sha256(left + right));
    }
    return this.buildRoot(nextLayer);
  }
}

// 2. UNIT TESTS CHO CRYPTO MODULE

describe('Unit Tests - Module Crypto (SHA-256, ECDSA & Merkle Tree)', () => {

  // TEST GROUP 1: SHA-256 HASHING
  describe('SHA-256 Hash Function', () => {
    test('Nên trả về chuỗi Hex độ dài 64 ký tự', () => {
      const hash = sha256('Hello Blockchain');
      expect(hash).toHaveLength(64);
    });

    test('Tính chất Deterministic: Cùng input phải ra cùng output hash', () => {
      const hash1 = sha256('data_123');
      const hash2 = sha256('data_123');
      expect(hash1).toEqual(hash2);
    });

    test('Tính chất Avalanche Effect: Sửa nhẹ dữ liệu đầu vào làm thay đổi hoàn toàn hash', () => {
      const hashOriginal = sha256('Transfer 100 Coin');
      const hashModified = sha256('Transfer 100 coin'); // chỉ đổi chữ C thường
      expect(hashOriginal).not.toEqual(hashModified);
    });
  });

  // TEST GROUP 2: ECDSA DIGITAL SIGNATURE
  describe('ECDSA Key Pair & Signature Verification', () => {
    let keyPair;
    const message = 'Transaction payload: Alice -> Bob (10 BTC)';

    beforeEach(() => {
      keyPair = generateKeyPair();
    });

    test('Tạo cặp khóa Public Key và Private Key hợp lệ (PEM Format)', () => {
      expect(keyPair.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(keyPair.privateKey).toContain('BEGIN PRIVATE KEY');
    });

    test('Xác minh THÀNH CÔNG chữ ký được ký bởi đúng Private Key', () => {
      const signature = signData(keyPair.privateKey, message);
      const isValid = verifySignature(keyPair.publicKey, message, signature);
      expect(isValid).toBe(true);
    });

    test('Xác minh THẤT BẠI khi tin nhắn bị chỉnh sửa dữ liệu (Tampered Message)', () => {
      const signature = signData(keyPair.privateKey, message);
      const tamperedMessage = 'Transaction payload: Alice -> Bob (1000 BTC)';
      const isValid = verifySignature(keyPair.publicKey, tamperedMessage, signature);
      expect(isValid).toBe(false);
    });

    test('Xác minh THẤT BẠI khi kiểm tra bằng Public Key của người khác', () => {
      const signature = signData(keyPair.privateKey, message);
      const otherKeyPair = generateKeyPair();
      const isValid = verifySignature(otherKeyPair.publicKey, message, signature);
      expect(isValid).toBe(false);
    });
  });

  // TEST GROUP 3: MERKLE TREE
  describe('Merkle Tree Integration', () => {
    test('Tính toán Merkle Root chính xác từ danh sách giao dịch', () => {
      const txs = ['tx1', 'tx2', 'tx3', 'tx4'];
      const tree = new MerkleTree(txs);
      expect(tree.root).toBeDefined();
      expect(tree.root).toHaveLength(64);
    });

    test('Xử lý được danh sách giao dịch có số lượng LẺ', () => {
      const oddTxs = ['tx1', 'tx2', 'tx3'];
      const tree = new MerkleTree(oddTxs);
      expect(tree.root).toHaveLength(64);
    });
  });
});