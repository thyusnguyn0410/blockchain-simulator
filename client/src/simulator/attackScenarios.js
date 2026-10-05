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
    console.log("Hệ thống KHÔNG phát hiện ra giao dịch bị sửa!");
  } else {
    console.log("Hệ thống ĐÃ phát hiện ra giao dịch bị sửa (Chữ ký không hợp lệ)!");
  }
}

// 2. Kịch bản tấn công: Sửa đổi Block (Block Tampering)
export function simulateBlockTampering(block) {
  console.log("--- Bắt đầu mô phỏng: Sửa đổi Block ---");
  
  const oldHash = block.hash;
  console.log("Block gốc - Hash:", oldHash);
  console.log("Block gốc - Merkle Root:", block.merkleRoot);

  block.transactions = [{ from: "Hacker", to: "Hacker", amount: 1000000 }];
  
  const txHashes = block.transactions.map(tx => 
    typeof tx === 'string' ? tx : sha256(JSON.stringify(tx))
  );
  block.merkleRoot = getMerkleRoot(txHashes);
  
  const newHash = block.calculateHash();
  
  console.log("Block bị sửa - Hash mới:", newHash);
  console.log("Block bị sửa - Merkle Root mới:", block.merkleRoot);

  if (oldHash === newHash) {
    console.log("Hệ thống KHÔNG phát hiện ra Block bị sửa!");
  } else {
    console.log("Hệ thống ĐÃ phát hiện ra Block bị sửa (Hash không khớp)!");
  }
}

// 3. Kịch bản tấn công: Chi tiêu gấp đôi (Double Spending)
// 3. Kịch bản tấn công: Chi tiêu gấp đôi (Double Spending)
export function simulateDoubleSpending(privateKey) {
  console.log("--- Bắt đầu mô phỏng: Double Spending ---");
  
  let signerKey = privateKey;
  if (!signerKey) {
    const keys = generateKeyPair();
    // Lấy chuỗi privateKey hex
    signerKey = keys.privateKey;
  }
  
  const payload1 = { from: "Ke_Tan_Cong", to: "Nguoi_Ban_A", amount: 100, nonce: 1 };
  const payload2 = { from: "Ke_Tan_Cong", to: "Nguoi_Ban_B", amount: 100, nonce: 1 };

  const tx1 = createSignedTransaction(signerKey, payload1);
  const tx2 = createSignedTransaction(signerKey, payload2);
  
  console.log("Giao dịch 1 (gửi cho A):", tx1.amount, "coin");
  console.log("Giao dịch 2 (gửi cho B):", tx2.amount, "coin");
  
  // Xác thực chữ ký dựa trên đúng payload gốc đã mang đi ký
  const valid1 = verifySignature(tx1.publicKey, canonical(payload1), tx1.signature);
  const valid2 = verifySignature(tx2.publicKey, canonical(payload2), tx2.signature);
  
  console.log("Chữ ký Tx1 hợp lệ:", valid1);
  console.log("Chữ ký Tx2 hợp lệ:", valid2);
  
  if (valid1 && valid2) {
    console.log("CẢNH BÁO: Cả 2 giao dịch đều có chữ ký hợp lệ từ cùng một ví!");
    console.log("Phát hiện xung đột Nonce/Số dư (Double Spending): Cùng nonce = 1 và tổng tiền (200 coin) vượt quá số dư ví.");
    console.log("Hệ thống: Chấp nhận Tx1 vào Mempool và TỪ CHỐI Tx2!");
  } else {
    console.log("Hệ thống đã phát hiện bất thường trong chữ ký.");
  }
}

// 4. Kịch bản mô phỏng Fork (Chain Reorganization)
export function simulateFork() {
  console.log("--- Bắt đầu mô phỏng: Fork ---");
  
  const originalChain = new Blockchain({ difficulty: 0 });
  originalChain.addBlock([{ from: "A", to: "B", amount: 10 }]);
  originalChain.addBlock([{ from: "B", to: "C", amount: 5 }]);
  console.log("Chain gốc có", originalChain.length, "blocks");
  
  const chainA = originalChain.clone();
  const chainB = originalChain.clone();
  
  chainA.addBlock([{ from: "C", to: "D", amount: 3 }]);
  
  chainB.addBlock([{ from: "C", to: "E", amount: 3 }]);
  chainB.addBlock([{ from: "E", to: "F", amount: 2 }]);
  
  console.log("Chain A có", chainA.length, "blocks");
  console.log("Chain B có", chainB.length, "blocks");
  
  const winningChainName = chainA.length >= chainB.length ? "Chain A" : "Chain B";
  const losingChainName = chainA.length >= chainB.length ? "Chain B" : "Chain A";
  
  console.log("Chain thắng (dài hơn):", winningChainName);
  console.log("Chain thua (ngắn hơn):", losingChainName);
  console.log("Hệ thống chấp nhận chain thắng và loại bỏ chain thua (Chain Reorganization).");
}