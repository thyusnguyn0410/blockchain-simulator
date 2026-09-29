// attackScenarios.js
// Nơi chứa các kịch bản mô phỏng tấn công cho dự án Blockchain Simulator

import { verifySignature, canonical, generateKeyPair, createSignedTransaction } from '../modules/crypto/ECDSA.js';

// 1. Kịch bản tấn công: Sửa đổi giao dịch (Transaction Tampering)
export function simulateTxTampering(transaction) {
  console.log("--- Bắt đầu mô phỏng: Sửa đổi giao dịch ---");
  
  // Tạo giao dịch bị hacker sửa đổi (tăng số tiền lên)
  const tamperedTx = { ...transaction, amount: 999999 };
  console.log("Giao dịch gốc:", transaction);
  console.log("Giao dịch bị sửa:", tamperedTx);
  
  // Tách lấy publicKey, signature và phần nội dung (body)
  const { publicKey, signature, ...body } = tamperedTx;
  
  // Gọi hàm verifySignature từ file ECDSA.js
  const isValid = verifySignature(publicKey, canonical(body), signature);
  
  // In kết quả
  if (isValid) {
    console.log(" Hệ thống KHÔNG phát hiện ra giao dịch bị sửa!");
  } else {
    console.log(" Hệ thống ĐÃ phát hiện ra giao dịch bị sửa (Chữ ký không hợp lệ)!");
  }
}

// 2. Kịch bản tấn công: Sửa đổi Block (Block Tampering)
export function simulateBlockTampering(block) {
  console.log("--- Bắt đầu mô phỏng: Sửa đổi Block ---");
  const tamperedBlock = { ...block, data: "Dữ liệu đã bị hacker thay đổi" };
  console.log("Block gốc:", block);
  console.log("Block bị sửa:", tamperedBlock);
  // TODO: Tính lại hash của block để xem có khớp không
}

// 3. Kịch bản tấn công: Chi tiêu gấp đôi (Double Spending)
export function simulateDoubleSpending() {
  console.log("--- Bắt đầu mô phỏng: Double Spending ---");
  // TODO: Viết logic gửi cùng 1 số tiền cho 2 người khác nhau
}

// 4. Kịch bản mô phỏng Fork (Chain Reorganization)
export function simulateFork() {
  console.log("--- Bắt đầu mô phỏng: Fork ---");
  // TODO: Tạo 2 chuỗi (chain) khác nhau và kiểm tra quy tắc chọn chain
}

// ==========================================
// KHU VỰC CHẠY THỬ NGHIỆM (TEST)
// ==========================================
console.log("=== BẮT ĐẦU CHẠY THỬ NGHIỆM ===");

// 1. Tạo một cặp khóa giả
const keys = generateKeyPair();

// 2. Tạo một giao dịch hợp lệ để làm mồi cho hacker
const validTx = createSignedTransaction(keys.privateKey, {
  from: "Vi_Cua_Toi",
  to: "Vi_Cua_Ban",
  amount: 10,
  nonce: 1
});

console.log("Giao dịch hợp lệ ban đầu:");
console.log(validTx);

console.log("\n--- Bắt đầu tấn công ---");

// 3. Gọi hàm mô phỏng tấn công
simulateTxTampering(validTx);