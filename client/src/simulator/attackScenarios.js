// attackScenarios.js
// Nơi chứa các kịch bản mô phỏng tấn công cho dự án Blockchain Simulator

import { verifySignature, canonical, generateKeyPair, createSignedTransaction } from '../modules/crypto/ECDSA.js';
import { Block, Blockchain } from '../modules/blockchain/coreBlockchain.js';
import { calculateSHA256 as sha256 } from '../modules/crypto/SHA-256.js';
import { getMerkleRoot } from '../modules/crypto/MerkleTree.js';


// 1. Kịch bản tấn công: Sửa đổi giao dịch (Transaction Tampering)
export function simulateTxTampering(transaction) {
  console.log("--- Bắt đầu mô phỏng: Sửa đổi giao dịch ---");
  const tamperedTx = { ...transaction, amount: 999999 };
  console.log("Giao dịch gốc:", transaction);
  console.log("Giao dịch bị sửa:", tamperedTx);

  const { publicKey, signature, ...body } = tamperedTx;
  const isValid = verifySignature(publicKey, canonical(body), signature);

  if (isValid) {
    console.log("🛠️ Hệ thống KHÔNG phát hiện ra giao dịch bị sửa!");
  } else {
    console.log("✅ Hệ thống ĐÃ phát hiện ra giao dịch bị sửa (Chữ ký không hợp lệ)!");
  }
}


// 2. Kịch bản tấn công: Sửa đổi Block (Block Tampering)
export function simulateBlockTampering(block) {
  console.log("--- Bắt đầu mô phỏng: Sửa đổi Block ---");
  
  const oldHash = block.hash;
  console.log("Block gốc - Hash:", oldHash);
  console.log("Block gốc - Merkle Root:", block.merkleRoot);

  // Hacker sửa dữ liệu giao dịch trong block
  block.transactions = [{ from: "Hacker", to: "Hacker", amount: 1000000 }];
  
  // Tính lại Merkle Root mới
  const txHashes = block.transactions.map(tx => 
    typeof tx === 'string' ? tx : sha256(JSON.stringify(tx))
  );
  block.merkleRoot = getMerkleRoot(txHashes);
  
  // Tính lại hash với dữ liệu mới
  const newHash = block.calculateHash();
  
  console.log("Block bị sửa - Hash mới:", newHash);
  console.log("Block bị sửa - Merkle Root mới:", block.merkleRoot);

  if (oldHash === newHash) {
    console.log("🛠️ Hệ thống KHÔNG phát hiện ra Block bị sửa!");
  } else {
    console.log("✅ Hệ thống ĐÃ phát hiện ra Block bị sửa (Hash không khớp)!");
  }
}


// 3. Kịch bản tấn công: Chi tiêu gấp đôi (Double Spending)
export function simulateDoubleSpending(privateKey) {
  console.log("--- Bắt đầu mô phỏng: Double Spending ---");
  
  if (!privateKey) {
    const keys = generateKeyPair();
    privateKey = keys.privateKey;
  }
  
  // Kẻ tấn công có 100 coin, cố gắng tiêu 100 coin 2 lần cho 2 người khác nhau
  const tx1 = createSignedTransaction(privateKey, {
    from: "Ke_Tan_Cong",
    to: "Nguoi_Ban_A",
    amount: 100,
    nonce: 1
  });
  
  const tx2 = createSignedTransaction(privateKey, {
    from: "Ke_Tan_Cong",
    to: "Nguoi_Ban_B",
    amount: 100,
    nonce: 1
  });
  
  console.log("Giao dịch 1 (gửi cho A):", tx1.amount, "coin");
  console.log("Giao dịch 2 (gửi cho B):", tx2.amount, "coin");
  
  const { publicKey: pk1, signature: sig1, ...body1 } = tx1;
  const { publicKey: pk2, signature: sig2, ...body2 } = tx2;
  
  const valid1 = verifySignature(pk1, canonical(body1), sig1);
  const valid2 = verifySignature(pk2, canonical(body2), sig2);
  
  console.log("Chữ ký Tx1 hợp lệ:", valid1);
  console.log("Chữ ký Tx2 hợp lệ:", valid2);
  console.log("⚠️ Cả 2 giao dịch đều có chữ ký hợp lệ!");
  console.log("✅ Hệ thống cần kiểm tra nonce và số dư để ngăn chặn Double Spending.");
}


// 4. Kịch bản mô phỏng Fork (Chain Reorganization)
export function simulateFork() {
  console.log("--- Bắt đầu mô phỏng: Fork ---");
  
  // Tạo blockchain gốc
  const originalChain = new Blockchain({ difficulty: 0 });
  originalChain.addBlock([{ from: "A", to: "B", amount: 10 }]);
  originalChain.addBlock([{ from: "B", to: "C", amount: 5 }]);
  console.log("Chain gốc có", originalChain.length, "blocks");
  
  // Tạo 2 nhánh fork từ cùng 1 gốc
  const chainA = originalChain.clone();
  const chainB = originalChain.clone();
  
  // Chain A chỉ thêm 1 block
  chainA.addBlock([{ from: "C", to: "D", amount: 3 }]);
  
  // Chain B thêm 2 blocks (dài hơn)
  chainB.addBlock([{ from: "C", to: "E", amount: 3 }]);
  chainB.addBlock([{ from: "E", to: "F", amount: 2 }]);
  
  console.log("Chain A có", chainA.length, "blocks");
  console.log("Chain B có", chainB.length, "blocks");
  
  // Quy tắc chọn chain: chain dài hơn sẽ thắng
  const winningChainName = chainA.length >= chainB.length ? "Chain A" : "Chain B";
  const losingChainName = chainA.length >= chainB.length ? "Chain B" : "Chain A";
  
  console.log("✅ Chain thắng (dài hơn):", winningChainName);
  console.log("🛠️ Chain thua (ngắn hơn):", losingChainName);
  console.log("Hệ thống chấp nhận chain thắng và loại bỏ chain thua (Chain Reorganization).");
}


// KHU VỰC CHẠY THỬ NGHIỆM (TEST)
// ==========================================
console.log("=== BẮT ĐẦU CHẠY THỬ NGHIỆM ===\n");

// Tạo cặp khóa và giao dịch hợp lệ
const keys = generateKeyPair();
const validTx = createSignedTransaction(keys.privateKey, {
  from: "Vi_Cua_Toi",
  to: "Vi_Cua_Ban",
  amount: 10,
  nonce: 1
});

// KỊCH BẢN 1: SỬA GIAO DỊCH
console.log("\n--- KỊCH BẢN 1 ---");
simulateTxTampering(validTx);

// KỊCH BẢN 2: SỬA BLOCK
console.log("\n--- KỊCH BẢN 2 ---");
const chain = new Blockchain({ difficulty: 0 });
chain.addBlock([validTx]);
chain.addBlock([{ from: "Vi_Cua_Ban", to: "Vi_Cua_Toi", amount: 5 }]);
const blockToTamper = chain.at(1);
simulateBlockTampering(blockToTamper);

// KỊCH BẢN 3: DOUBLE SPENDING
console.log("\n--- KỊCH BẢN 3 ---");
simulateDoubleSpending(keys.privateKey);

// KỊCH BẢN 4: FORK
console.log("\n--- KỊCH BẢN 4 ---");
simulateFork();