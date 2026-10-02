// Import các hàm mã hóa/băm từ các thư mục mô-đun liên quan
import { calculateSHA256 as sha256 } from "../crypto/SHA-256.js";
import { getMerkleRoot } from "../crypto/MerkleTree.js";
import { mineBlock } from "./pow.js";

// Chuỗi 64 số 0 mặc định (64 ký tự hex) dùng cho prevHash của khối Genesis
export const ZERO_HASH = '0'.repeat(64);

// 1. LỚP BLOCK (ĐẠI DIỆN CHO MỘT KHỐI)

export class Block {    
    constructor(version, prevHash, transactions, timestamp, difficulty) {
        this.version = version || 1;                    // Phiên bản của khối (mặc định là 1)
        this.prevHash = prevHash || ZERO_HASH;          // Hash của khối trước đó (nếu không có thì dùng ZERO_HASH)
        this.transactions = transactions || [];         // Mảng danh sách các giao dịch chứa trong khối
        
        this.merkleRoot = this.calculateMerkleRoot();

        // Mốc thời gian tạo khối (tính theo giây UNIX timestamp)
        this.timestamp = typeof timestamp === 'number' ? timestamp : Date.now() / 1000;
        this.difficulty = difficulty || 0;              // Độ khó Proof-of-Work của khối
        this.nonce = 0;                                 // Số ngẫu nhiên dùng để thử khi khai thác/đào khối
        this.next = null;                               // Con trỏ liên kết tới khối tiếp theo (Danh sách liên kết đơn)

        this.hash = this.calculateHash();               // Tính toán mã băm đại diện chính thức cho khối
    }

    // Tính lại Merkle Root từ transaction hiện tại
    calculateMerkleRoot() {
        return getMerkleRoot(this.transactions);
    }

    // Đồng bộ Merkle Root với transaction hiện tại
    refreshMerkleRoot() {
        this.merkleRoot = this.calculateMerkleRoot();
        return this.merkleRoot;
    }

    // Tính toán mã băm SHA-256 cho Block Header
    calculateHash() {
        const headerString = `${this.version}-${this.prevHash}-${this.merkleRoot}-${this.timestamp}-${this.difficulty}-${this.nonce}`;
        return sha256(headerString);
    }

    // Kiểm tra xem mã băm của khối hiện tại có đáp ứng tiêu chuẩn độ khó (bắt đầu bằng k số 0) hay không
    meetsDifficulty(targetDifficulty) {
        const k = targetDifficulty !== undefined ? targetDifficulty : this.difficulty;
        if (!k) return true;
        return this.hash.slice(0, k) === "0".repeat(k);
    }
}

// 2. LỚP BLOCKCHAIN (QUẢN LÝ CHUỖI KHỐI)
export class Blockchain {
    constructor(opts = {}) {
        this.head = null;                               // Khối khởi đầu chuỗi (Genesis Block)
        this.tail = null;                               // Khối mới nhất ở cuối chuỗi
        this.length = 0;                                // Độ dài/số lượng khối hiện tại trong chuỗi
        this.difficulty = opts.difficulty || 0;         // Độ khó chung áp dụng cho toàn chuỗi

        // Tự động tạo khối Genesis khởi tạo trừ khi tùy chọn autoGenesis bị tắt (false)
        if (opts.autoGenesis !== false) {
            this.addBlock(opts.genesisTx || [{ from: "System", to: "Genesis", amount: 0 }]);
        }
    }

    // Thêm một khối mới chứa các giao dịch vào cuối chuỗi
    addBlock(transactions) {
        const previousHash = this.tail ? this.tail.hash : ZERO_HASH;
        const newBlock = new Block(1, previousHash, transactions, undefined, this.difficulty);

        // Nếu chuỗi cấu hình độ khó > 0, tiến hành đào khối bằng thuật toán PoW
        if (this.difficulty > 0) {
            mineBlock(newBlock, this.difficulty);
        }

        // Cập nhật cấu trúc Danh sách liên kết đơn (Linked List)
        if (this.head) {
            this.tail.next = newBlock;
            this.tail = newBlock;
        } else {
            this.head = newBlock;
            this.tail = newBlock;
        }
        this.length++;
        return newBlock;
    }

    // Lấy đối tượng Block tại vị trí chỉ số (index) tương ứng
    at(index) {
        let current = this.head;
        let i = 0;
        while (current) {
            if (i === index) return current;
            current = current.next;
            i++;
        }
        return null;
    }

    // Chuyển đổi danh sách liên kết các khối thành một mảng (Array) chuẩn
    toArray() {
        const out = [];
        let current = this.head;
        while (current) {
            out.push(current);
            current = current.next;
        }
        return out;
    }

    // Kiểm tra tính hợp lệ cơ bản của toàn bộ chuỗi khối
    isChainValid() {
        let current = this.head;
        while (current) {
            // Kiểm tra mã băm khối có bị chỉnh sửa không
            if (current.hash !== current.calculateHash()) return false;
            // Kiểm tra liên kết con trỏ prevHash giữa các khối
            if (current.next && current.next.prevHash !== current.hash) return false;
            current = current.next;
        }
        return true;
    }

    // Kiểm tra tính toàn vẹn chi tiết và trả về báo cáo kết quả từng khối
    validateDetailed() {
        const report = [];
        let current = this.head;
        let index = 0;
        let prev = null;

        while (current) {
            const dataOk = current.hash === current.calculateHash();
            const linkOk = prev ? current.prevHash === prev.hash : current.prevHash === ZERO_HASH;
            const powOk = current.meetsDifficulty();

            report.push({
                block: current,
                index: index,
                dataOk: dataOk,                         // Trạng thái dữ liệu Hash
                linkOk: linkOk,                         // Trạng thái liên kết chuỗi
                powOk: powOk,                           // Trạng thái đạt độ khó PoW
                valid: dataOk && linkOk && powOk        // Kết luận hợp lệ tổng thể của khối
            });

            prev = current;
            current = current.next;
            index++;
        }
        return report;
    }

    // Giả lập hành vi can thiệp/sửa đổi dữ liệu giao dịch trong một khối (Tampering)
    tamper(index, newTransactions) {
        const block = this.at(index);
        if (!block) return null;
        
        block.transactions = Array.isArray(newTransactions) ? newTransactions : [];
        // Dữ liệu transaction đổi => Merkle Root đổi.
        // Hash cũ cố ý được giữ nguyên để mô phỏng trạng thái bị giả mạo.
        block.refreshMerkleRoot();
        return block;
    }

    // Tính toán và đào lại mã băm cho các khối bắt đầu từ vị trí bị sửa đổi đến cuối chuỗi
    recomputeFrom(index) {
        const blocks = this.toArray();
        let totalAttempts = 0;

        for (let i = Math.max(0, index); i < blocks.length; i++) {
            const block = blocks[i];
            block.prevHash = i === 0 ? ZERO_HASH : blocks[i - 1].hash;
            block.refreshMerkleRoot();
            block.nonce = 0;

            if (this.difficulty > 0) {
                const res = mineBlock(block, this.difficulty);
                totalAttempts += res.attempts;
            } else {
                block.hash = block.calculateHash();
            }
        }
        return totalAttempts;
    }

    // Tạo bản sao (Clone) độc lập của toàn bộ chuỗi khối hiện tại
    clone() {
        const copy = new Blockchain({ autoGenesis: false, difficulty: this.difficulty });
        this.toArray().forEach(b => {
            const nb = new Block(b.version, b.prevHash, [...b.transactions], b.timestamp, b.difficulty);
            nb.merkleRoot = b.merkleRoot;
            nb.nonce = b.nonce;
            nb.hash = b.hash;

            if (copy.tail) {
                copy.tail.next = nb;
                copy.tail = nb;
            } else {
                copy.head = nb;
                copy.tail = nb;
            }
            copy.length++;
        });
        return copy;
    }
}
