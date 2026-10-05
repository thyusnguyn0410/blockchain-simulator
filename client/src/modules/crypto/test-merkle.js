import { getMerkleRoot, FullNode, LightClient } from './MerkleTree.js';

console.log("=== KIỂM THỬ MERKLE TREE VỚI CRYPTO-JS ===");
const txs = ["tx1", "tx2", "tx3"];
const root = getMerkleRoot(txs);
console.log("Merkle Root:", root);
console.log("✅ Kiểm thử thành công!");