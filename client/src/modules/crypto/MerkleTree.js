import crypto from 'crypto';
import readline from 'readline';

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

// 1. FULL NODE: Lưu Block, tính Root & Tạo Proof (Tự động tra cứu Index theo TxData)
class FullNode {
  constructor(txs) {
    this.txs = txs;
    this.merkleRoot = this.buildRoot(txs.map(sha256));
  }

  // Tối ưu thuật toán gom tầng rút gọn bằng Array.reduce
  buildRoot(layer) {
    if (!layer || layer.length === 0) return null;
    if (layer.length === 1) return layer[0];
    if (layer.length % 2 !== 0) layer.push(layer[layer.length - 1]);

    const nextLayer = layer.reduce((acc, cur, i) => 
      i % 2 === 0 ? [...acc, sha256(cur + layer[i + 1])] : acc, []);
    return this.buildRoot(nextLayer);
  }

  // CHUẨN THỰC TẾ: Nhận TxData -> Tự tìm index -> Sinh Merkle Proof
  generateProof(txData) {
    let idx = this.txs.indexOf(txData);
    if (idx === -1) return null; // Giao dịch không tồn tại trong Block

    let layer = this.txs.map(sha256);
    const proof = [];

    while (layer.length > 1) {
      if (layer.length % 2 !== 0) layer.push(layer[layer.length - 1]);
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;

      proof.push({ hash: layer[siblingIdx], isLeft: idx % 2 !== 0 });
      idx = Math.floor(idx / 2);

      layer = layer.reduce((acc, cur, i) => 
        i % 2 === 0 ? [...acc, sha256(cur + layer[i + 1])] : acc, []);
    }
    return proof;
  }
}

// 2. LIGHT CLIENT: Chỉ giữ Merkle Root & Xác minh bằng Proof
class LightClient {
  constructor(merkleRoot) { this.root = merkleRoot; }

  verify(txData, proof) {
    if (!proof) return false;
    const computedRoot = proof.reduce((hash, p) => 
      sha256(p.isLeft ? p.hash + hash : hash + p.hash), sha256(txData));
    return computedRoot === this.root;
  }
}

// 3. MÔ PHỎNG DÒNG LỆNH INTERACTIVE (CLI)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log('=== BLOCKCHAIN MERKLE TREE SIMULATION (COMPACT) ===\n');

  const input = await ask('1. Nhập danh sách giao dịch (cách nhau bởi dấu phẩy):\n> ');
  const txList = input.split(',').map(s => s.trim()).filter(Boolean);
  if (!txList.length) return rl.close();

  const fullNode = new FullNode(txList);
  const lightClient = new LightClient(fullNode.merkleRoot);

  console.log(`\n[Full Node] Block Merkle Root: ${fullNode.merkleRoot}`);
  console.log(`[Light Client] Đã đồng bộ Merkle Root thành công.`);

  while (true) {
    const searchTx = await ask('\n2. Nhập NỘI DUNG/TXID giao dịch bạn muốn xin Proof từ Full Node:\n> ');
    const proof = fullNode.generateProof(searchTx);

    if (!proof) {
      console.log(`[Full Node]: Giao dịch "${searchTx}" không tồn tại trong Block!`);
    } else {
      console.log(` [Full Node]: Đã tìm thấy & sinh Merkle Proof (${proof.length} nút hash).`);

      const testTx = await ask('3. Nhập dữ liệu giao dịch gửi đến Light Client để xác minh:\n> ');
      const isValid = lightClient.verify(testTx, proof);

      console.log(isValid 
        ? '  XÁC MINH THÀNH CÔNG (true): Giao dịch hợp lệ!' 
        : 'XÁC MINH THẤT BẠI (false): Dữ liệu sai lệch hoặc giả mạo!');
    }

    if ((await ask('\nThử tiếp? (y/n): ')).toLowerCase() !== 'y') break;
  }
  rl.close();
}

main();