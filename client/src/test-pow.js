import { Block, Blockchain } from './modules/blockchain/coreBlockchain.js';
import { mineBlock, verifyProofOfWork } from './modules/blockchain/pow.js';

console.log("=== KIỂM THỬ THUẬT TOÁN PROOF OF WORK (P7) ===");

// Tạo một blockchain mẫu với độ khó bằng 3
const chain = new Blockchain({ autoGenesis: false });
chain.difficulty = 3;

// Thêm một khối mới chứa giao dịch thử nghiệm
const blockData = [{ from: "Alice", to: "Bob", amount: 25, fee: 0.01, nonce: 1 }];
const newBlock = new Block(1, '0'.repeat(64), blockData, undefined, chain.difficulty);

console.log(`Đang tiến hành đào khối với độ khó (difficulty) = ${chain.difficulty}...`);
const result = mineBlock(newBlock, chain.difficulty);

console.log("\n--- KẾT QUẢ ĐÀO KHỐI ---");
console.log(`Nonce tìm được : ${result.nonce}`);
console.log(`Hash thỏa mãn  : ${result.hash}`);
console.log(`Số lần lặp thử : ${result.attempts}`);
console.log(`Thời gian đào  : ${result.timeTakenSeconds}`);

// Kiểm chứng lại bằng chứng công việc
const isValid = verifyProofOfWork(newBlock, chain.difficulty);
console.log(`\nKiểm tra xác thực PoW: ${isValid ? "✅ HỢP LỆ" : "❌ KHÔNG HỢP LỆ"}`);