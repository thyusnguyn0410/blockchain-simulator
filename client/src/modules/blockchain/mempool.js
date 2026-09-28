import { verifySignature as verifyECDSASignature, isValidPublicKey } from '../Crypto/ECDSA.js';
import { calculateSHA256 as sha256 } from '../Crypto/SHA-256.js';

export class Mempool {
    constructor(getBalanceCallback) {
        this.transactions = [];
        this.usedNonces = new Set();
        this.getBalance = getBalanceCallback;
    }

    // Kiểm tra format của transaction
    verifyFormat(tx) {
        if (!tx || typeof tx !== 'object') return false;

        return (
            typeof tx.sender === 'string' &&
            tx.sender.trim() !== '' &&

            typeof tx.recipient === 'string' &&
            tx.recipient.trim() !== '' &&

            typeof tx.amount === 'number' &&
            Number.isFinite(tx.amount) &&
            tx.amount > 0 &&

            Number.isInteger(tx.nonce) &&
            tx.nonce >= 0 &&

            typeof tx.signature === 'string' &&
            tx.signature.trim() !== '' &&

            typeof tx.publicKey === 'string' &&
            isValidPublicKey(tx.publicKey)
        );
    }

    // Tạo hash cố định cho transaction
    getTransactionHash(tx) {
        const rawData =
            `${tx.sender}:${tx.recipient}:${tx.amount}:${tx.nonce}`;

        return sha256(rawData);
    }

    // Kiểm tra chữ ký ECDSA
    verifySignature(tx) {
        const txHash = this.getTransactionHash(tx);

        try {
            return verifyECDSASignature(
                tx.publicKey,
                txHash,
                tx.signature
            );
        } catch (err) {
            console.error(
                'Lỗi xác thực chữ ký ECDSA:',
                err
            );

            return false;
        }
    }

    // Kiểm tra số dư
    verifyBalance(tx) {
        if (!this.getBalance) {
            return false;
        }

        let currentBalance = this.getBalance(tx.sender);

        if (
            typeof currentBalance !== 'number' ||
            !Number.isFinite(currentBalance)
        ) {
            return false;
        }

        // Trừ số tiền của các transaction
        // đang chờ trong Mempool
        for (const pending of this.transactions) {
            if (pending.sender === tx.sender) {
                currentBalance -= pending.amount;
            }
        }

        return currentBalance >= tx.amount;
    }

    // Kiểm tra Replay Attack
    isReplay(tx) {
        const identifier =
            `${tx.sender}-${tx.nonce}`;

        return this.usedNonces.has(identifier);
    }

    // Thêm transaction vào Mempool
    addTransaction(tx) {

        // Coinbase/System không được phép
        // đưa trực tiếp vào Mempool
        if (
            tx?.type === 'Coinbase' ||
            tx?.sender === 'System'
        ) {
            throw new Error(
                'Coinbase/System transaction không được phép đưa trực tiếp vào Mempool.'
            );
        }

        // 1. Kiểm tra format
        if (!this.verifyFormat(tx)) {
            throw new Error(
                'Giao dịch sai định dạng hoặc PublicKey không hợp lệ.'
            );
        }

        // 2. Kiểm tra chữ ký
        if (!this.verifySignature(tx)) {
            throw new Error(
                'Chữ ký mật mã không hợp lệ! ' +
                'Giao dịch có thể đã bị can thiệp.'
            );
        }

        // 3. Kiểm tra Replay
        if (this.isReplay(tx)) {
            throw new Error(
                'Phát hiện tấn công phát lại (Replay Attack): ' +
                'Nonce đã được sử dụng.'
            );
        }

        // 4. Kiểm tra số dư
        if (!this.verifyBalance(tx)) {
            throw new Error(
                'Số dư tài khoản không đủ để thực hiện giao dịch.'
            );
        }

        // 5. Transaction hợp lệ
        // → đưa vào Mempool
        this.transactions.push(tx);

        this.usedNonces.add(
            `${tx.sender}-${tx.nonce}`
        );

        return true;
    }

    // Lấy transaction để Miner đóng gói
    // Không xóa khỏi Mempool
    getTransactions(limit = 10) {
        return this.transactions.slice(0, limit);
    }

    // Xóa transaction sau khi Block được ACCEPT
    removeTransactions(transactions) {
        const transactionHashes = new Set(
            transactions.map(
                (tx) => this.getTransactionHash(tx)
            )
        );

        this.transactions = this.transactions.filter(
            (tx) =>
                !transactionHashes.has(
                    this.getTransactionHash(tx)
                )
        );

        // Cập nhật lại danh sách nonce
        this.usedNonces = new Set(
            this.transactions.map(
                (tx) =>
                    `${tx.sender}-${tx.nonce}`
            )
        );
    }
}