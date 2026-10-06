# Blockchain Simulator

**Môn học:** Chuỗi khối  
**Giảng viên:** TS. Nguyễn Hoài Đức

---

## 📖 Mục lục

**PHẦN A — HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY**
1. [Giới thiệu dự án](#1-giới-thiệu-dự-án)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Hướng dẫn cài đặt và chạy](#3-hướng-dẫn-cài-đặt-và-chạy)
4. [Cấu trúc thư mục](#4-cấu-trúc-thư-mục)

**PHẦN B — BÁO CÁO KỸ THUẬT**

5. [Kiến trúc hệ thống](#5-kiến-trúc-hệ-thống)

6. [Giải thích thiết kế](#6-giải-thích-thiết-kế)

7. [Kịch bản tấn công](#7-kịch-bản-tấn-công)

8. [Kết quả kiểm thử](#8-kết-quả-kiểm-thử)

9. [Câu hỏi thảo luận](#9-câu-hỏi-thảo-luận)

10. [Thành viên nhóm](#10-thành-viên-nhóm)

11. [Giới hạn đã biết](#11-giới-hạn-đã-biết-known-limitations)

---

# PHẦN A — HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY

## 1. Giới thiệu dự án

**Blockchain Simulator** là chương trình mô phỏng hoạt động cơ bản của blockchain:
- Tạo Block, tính Hash, Proof-of-Work.
- Giao dịch có chữ ký số ECDSA (secp256k1).
- Cây Merkle Tree tổng hợp giao dịch.
- Giao diện web trực quan hóa dữ liệu.
- 4 kịch bản tấn công mô phỏng bảo mật.

**Công nghệ:** React 19 + Vite, Node.js + WebSocket, crypto-js, elliptic, Vitest.
### 1.1. Demo trực tuyến

- 🌐 **Live Web App:** [https://blockchain-simulator-five.vercel.app](https://blockchain-simulator-five.vercel.app)
- 🖥️ **Backend Node:** [https://blockchain-sim-hub.onrender.com](https://blockchain-sim-hub.onrender.com)

## 2. Yêu cầu hệ thống

- Node.js >= 20
- npm >= 10
- Git >= 2.40

## 3. Hướng dẫn cài đặt và chạy

### 3.1. Clone dự án

```bash
git clone https://github.com/thyusnguyn0410/blockchain-simulator.git
cd blockchain-simulator
```

### 3.2. Cài đặt thư viện

```bash
cd client
npm install
cd ../server
npm install
```

### 3.3. Chạy giao diện web

```bash
cd client
npm run dev
```

Mở trình duyệt: http://localhost:5173

### 3.4. Chạy Unit Test

```bash
cd client
npx vitest run
```

### 3.5. Chạy kịch bản tấn công

```bash
cd client
node src/simulator/attackScenarios.js
```

## 4. Cấu trúc thư mục

```
blockchain-simulator/
│
├── .gitignore                      # Cấu hình chặn file rác, dependencies và biến môi trường
├── package.json                    # Cấu hình scripts và dependencies cấp root
├── package-lock.json
│
├── server/                         # Backend mô phỏng mạng P2P & Multi-Node (Node.js/Express)
│   ├── src/
│   │   ├── blockchain.js           # Core Blockchain, Genesis Block, Mempool, PoW, Hash SHA-256
│   │   └── p2p.js                  # P2P WebSocket server/client, xử lý broadcast & sync chain
│   ├── test/                       # Unit Test cho backend core
│   │   └── blockchain.test.js      # Kiểm thử tính toàn vẹn chain và thuật toán lõi
│   ├── server.js                   # Entry point Node (nhận port động, Express REST API + WS)
│   ├── run-nodes.bat               # Script Windows chạy tự động cụm multi-node cục bộ
│   ├── package.json                # Dependencies backend (express, ws, cors, crypto-js...)
│   └── package-lock.json
│
└── client/                         # Frontend giao diện người dùng (React + Vite + Tailwind CSS)
    ├── .gitignore                  # Gitignore riêng của client
    ├── README.md                   # Hướng dẫn khởi chạy frontend
    ├── eslint.config.js            # Cấu hình kiểm tra cú pháp code JavaScript/React
    ├── index.html                  # File template HTML chính
    ├── package.json                # Dependencies frontend (lucide-react, recharts, framer-motion...)
    ├── package-lock.json
    ├── vite.config.js              # Cấu hình Vite build & alias polyfill crypto
    │
    ├── public/                     # Tài nguyên tĩnh công khai (favicon, svg assets)
    │
    └── src/
        ├── assets/                 # Hình ảnh, font chữ tĩnh
        │
        ├── components/             # Các UI Components tái sử dụng chung
        │   ├── Button.jsx          # Nút bấm tương tác
        │   ├── Card.jsx            # Khung thẻ hiển thị giao diện glassmorphism
        │   ├── ChatBot.jsx         # Trợ lý AI ChatBot tương tác giải thích Blockchain
        │   ├── Navbar.jsx          # Thanh điều hướng phía trên
        │   ├── Sidebar.jsx         # Thanh menu điều hướng bên trái workspace
        │   └── Table.jsx           # Bảng hiển thị dữ liệu chuẩn hóa
        │
        ├── layouts/                # Cấu trúc layout trang
        │   └── MainLayout.jsx      # Khung điều hướng chung, Dark Theme, Sidebar & Header
        │
        ├── modules/                # Các phân hệ tính năng chuyên sâu
        │   ├── crypto/             # Phân hệ Mật mã học (P1, P3, P5)
        │   │   ├── ECDSA.js               # Thuật toán sinh khóa, ký số và xác minh ECDSA
        │   │   ├── EcdsaVisualizer.jsx    # UI tương tác bộ công cụ ký số ECDSA
        │   │   ├── MerkleTree.js          # Thuật toán dựng cây Merkle, tính Root & Proof O(log n)
        │   │   ├── MerkleTree.jsx         # UI trực quan hóa cấu trúc cây Merkle
        │   │   ├── SHA-256.js             # Thuật toán băm SHA-256 và Avalanche Effect
        │   │   ├── Sha256Visualizer.jsx   # UI mô phỏng hàm băm và cơ chế chống giả mạo
        │   │   └── crypto.test.js         # Unit Test kiểm thử các thuật toán mật mã
        │   │
        │   ├── blockchain/         # Phân hệ Lõi Blockchain (P2, P4, P6, P7)
        │   │   ├── BlockHeaderViewer.jsx  # Xem chi tiết cấu trúc Block & Header
        │   │   ├── MempoolManager.jsx     # Giao diện quản lý hàng đợi giao dịch Mempool
        │   │   ├── ProofOfWorkSimulator.jsx # Giao diện mô phỏng đào PoW, thử nonce theo difficulty
        │   │   ├── coreBlockchain.js      # Logic xác thực và xử lý chain phía client
        │   │   ├── mempool.js             # Logic xử lý thuật toán hàng đợi giao dịch Mempool
        │   │   └── pow.js                 # Thuật toán đào Proof of Work (PoW)
        │   │
        │   └── network/            # Phân hệ Mạng P2P & Giám sát Node (P8, P9)
        │       ├── NetworkDashboard.jsx   # Bảng điều khiển trung tâm trạng thái mạng
        │       ├── NodeCard.jsx           # Thẻ hiển thị thông tin từng Node (Height, Peers, Status)
        │       └── LiveLogViewer.jsx      # Hộp hiển thị nhật ký truyền tin thời gian thực
        │
        ├── simulator/              # Phân hệ Mô phỏng Tấn công & Kháng lỗi (P10, P11)
        │   ├── attackScenarios.js         # Kịch bản tấn công: Sửa Block, Double Spending, Fork
        │   └── attackScenarios.test.js    # Unit Test kiểm thử cơ chế phòng vệ của chuỗi
        │
        ├── hooks/                  # Custom React Hooks
        │   ├── useWebSocket.js     # Hook lắng nghe kết nối socket hai chiều thời gian thực
        │   └── usePolling.js       # Hook dự phòng polling dữ liệu REST API
        │
        ├── App.jsx                 # Điều phối Routing và trạng thái toàn cục ứng dụng
        ├── App.css                 # Style tùy biến mở rộng (ChatBot widget, animations)
        ├── index.css               # Cấu hình Tailwind CSS, design tokens và theme toàn cục
        └── main.jsx                # Điểm khởi chạy (Mount React DOM)
```

---

# PHẦN B — BÁO CÁO KỸ THUẬT

## 5. Kiến trúc hệ thống

### 5.1. Sơ đồ tổng quan

```
┌──────────────────────────────────────┐
│    FRONTEND (React + Vite)           │
│  - UI Visual (Layout, Framer Motion) │
│  - Logic (WebSocket, Recharts)       │
└──────────────┬───────────────────────┘
               │ WebSocket
┌──────────────▼───────────────────────┐
│  NETWORK (Node.js, 3 Full Nodes)     │
│  Mempool → Block → PoW → Broadcast   │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  BLOCKCHAIN CORE                     │
│  Block, Blockchain, Mempool, PoW     │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  CRYPTO MODULE                       │
│  SHA-256, ECDSA secp256k1, Merkle    │
└──────────────────────────────────────┘
```

### 5.2. Mô tả module

| Module | Chức năng | Người phụ trách |
|--------|-----------|-----------------|
| Crypto | SHA-256, ECDSA, Merkle Tree | Trương Hân |
| Blockchain Core | Block, Chain, PoW, Mempool | Trần Thị Anh Thư |
| Network | WebSocket, Broadcast, Consensus | Nguyễn Thị Minh Thúy |
| Frontend UI | Layout, Components, Framer | Nguyễn Thị Kim Thùy |
| Frontend Logic | WebSocket, State, Recharts | Đoàn Tú Uyên |
| QA/Test | Kịch bản tấn công, Unit Test | Nguyễn Thị Cẩm Tú |

---

## 6. Giải thích thiết kế

### 6.1. Linked List cho Blockchain
Blockchain chỉ thêm block mới ở cuối → dùng Linked List cho O(1).

### 6.2. ECDSA secp256k1
Chuẩn Bitcoin/Ethereum, khóa 256-bit bảo mật tương đương RSA 3072-bit.

### 6.3. Merkle Tree
Kiểm tra giao dịch với O(log n), tiết kiệm băng thông cho Light Client.

### 6.4. Proof-of-Work
Chống Sybil Attack, tăng chi phí tấn công 51%.

### 6.5. WebSocket
Cập nhật real-time, không cần polling, dễ broadcast.

### 6.6. Tách Test khỏi Source
File `attackScenarios.js` chứa logic, `attackScenarios.test.js` chứa test.

---

## 7. Kịch bản tấn công

### 7.1. Transaction Tampering (Sửa giao dịch)

**Mô tả:** Hacker sửa số tiền từ 10 → 999,999.  
**Phòng chống:** Chữ ký ECDSA không khớp → phát hiện.  
**Kết quả:** ✅ Phát hiện.

### 7.2. Block Tampering (Sửa Block)

**Mô tả:** Hacker sửa giao dịch trong Block, tính lại Merkle Root.  
**Phòng chống:** Hash thay đổi → `prevHash` không khớp → chain invalid.  
**Kết quả:** ✅ Phát hiện.

### 7.3. Double Spending (Chi tiêu gấp đôi)

**Mô tả:** Hacker ký 2 giao dịch cùng số tiền, cùng nonce.  
**Phòng chống:** Nonce + Balance Check.  
**Kết quả:** ⚠️ Cần bổ sung cơ chế.

### 7.4. Fork (Chain Reorganization)

**Mô tả:** 2 miner cùng đào được 2 block khác nhau.  
**Phòng chống:** Longest Chain Rule (chain dài hơn thắng).  
**Kết quả:** ✅ Đồng thuận đúng.

---

## 8. Kết quả kiểm thử

### 8.1. Cách chạy

```bash
cd client
npx vitest run
```

### 8.2. Kết quả

```
 ✓ src/simulator/attackScenarios.test.js (5)
 ✓ src/modules/crypto/crypto.test.js (4)

 Test Files  2 passed (2)
      Tests  9 passed (9)
```

### 8.3. Bảng tổng kết

| Kịch bản | Cơ chế phòng chống | Kết quả |
|----------|-------------------|---------|
| Tx Tampering | ECDSA Signature | ✅ Phát hiện |
| Block Tampering | Hash Chain | ✅ Phát hiện |
| Double Spending | Nonce + Balance | ⚠️ Cần bổ sung |
| Fork | Longest Chain Rule | ✅ Đồng thuận |

---

## 9. Câu hỏi thảo luận

### Câu 1: Blockchain hoạt động như thế nào?

Blockchain là sổ cái phân tán:
1. Giao dịch được ký → gửi vào Mempool.
2. Miner lấy giao dịch, tạo Block.
3. Miner đào PoW: tìm nonce cho hash bắt đầu bằng k số 0.
4. Block được broadcast đến tất cả node.
5. Các node kiểm tra hợp lệ → thêm vào chain.

### Câu 2: Tại sao blockchain không thể bị sửa đổi?

Bảo vệ bởi 3 lớp:
1. **Mã hóa:** Hash của block phụ thuộc block trước.
2. **Phân tán:** Dữ liệu lưu trên nhiều node.
3. **Đồng thuận:** Các node kiểm tra chéo.
→ Sửa 1 block → phải đào lại toàn bộ chain sau → cực kỳ tốn kém.

### Câu 3: Proof-of-Work giải quyết vấn đề gì?

Chống Sybil Attack, tăng chi phí tấn công 51%. Muốn tấn công phải kiểm soát >51% hashrate toàn mạng.

### Câu 4: Merkle Tree có ưu điểm gì?

- Tiết kiệm băng thông (Light Client chỉ tải Merkle Root 32 byte).
- Kiểm tra giao dịch với O(log n).
- Không thể giả mạo giao dịch mà không đổi Merkle Root.

### Câu 5: Tại sao cần Nonce trong giao dịch?

Ngăn chặn Replay Attack và Double Spending. Mỗi giao dịch phải có nonce tăng dần.

### Câu 6: Điều gì xảy ra khi 2 miner cùng đào được 1 block?

Đây là Fork. Chain dài hơn thắng (Longest Chain Rule). Nhánh thua bị loại, giao dịch quay lại Mempool.

### Câu 7: Sự khác biệt giữa Hash và Chữ ký số?

| Tiêu chí | Hash | Signature |
|----------|------|-----------|
| Mục đích | Kiểm tra toàn vẹn | Xác thực danh tính |
| Khóa | Không cần | Private key |
| Ví dụ | SHA-256 | ECDSA secp256k1 |

### Câu 8: Avalanche Effect là gì?

Thay đổi 1 bit đầu vào → thay đổi ~50% bit đầu ra. Giúp phát hiện dữ liệu bị sửa.

### Câu 9: Tại sao cần nhiều Full Node?

- Phân tán quyền lực.
- Dự phòng khi 1 node chết.
- Đồng thuận chain chính thức.
- Kiểm tra chéo block.

### Câu 10: Replay Attack là gì và cách chống?

Hacker chặn giao dịch hợp lệ rồi gửi lại nhiều lần. Chống bằng Nonce, Timestamp, Chain ID.

### Câu 11: Tại sao dùng ECDSA thay vì RSA?

ECDSA khóa 256-bit bảo mật tương đương RSA 3072-bit, nhanh hơn, khóa nhỏ hơn, chuẩn Bitcoin/Ethereum.

### Câu 12: Làm sao ngăn chặn tấn công 51%?

Tăng hashrate mạng lưới, chuyển sang PoS, dùng Finality Checkpoints.

---

## 10. Thành viên nhóm

| STT | Họ và tên | MSSV | GitHub | Vai trò |
|-----|-----------|------|--------|---------|
| 1 | Nguyễn Thị Minh Thủy | 031340240029 | thyusnguyn0410 | Network & Integration Lead |
| 2 | Trương Hân | 031340240006 | hantruong-kbc | Crypto Engineer |
| 3 | Trần Thị Anh Thư | 031340240031 | tta-thu | Blockchain Core Engineer |
| 4 | Đoàn Tú Uyên | 031340240038 | 031340240038-droid | Frontend & UI/UX Engineer |
| 5 | Nguyễn Thị Kim Thùy | 031340240028 | thuyhub | Frontend Integration Engineer |
| 6 | Nguyễn Thị Cẩm Tú | 031340240036 | nguyenthicamtu-svg | QA, Attack Simulator & Documentation |
---

## 11. Giới hạn đã biết (Known Limitations)

Mặc dù hệ thống đã hoạt động đúng theo thiết kế và vượt qua 9/9 unit test, dự án vẫn còn một số hạn chế cần được ghi nhận và khắc phục trong tương lai:

### 11.1. Hạn chế về bảo mật

| # | Hạn chế | Mô tả | Hướng khắc phục |
|---|---------|-------|-----------------|
| 1 | **Double Spending chưa được chặn triệt để** | Hệ thống chưa kiểm tra nonce và số dư của ví trước khi chấp nhận giao dịch vào Mempool. Hacker có thể ký 2 giao dịch cùng số tiền, cùng nonce. | Bổ sung hàm `checkBalance()` và `checkNonce()` trong Mempool. |
| 2 | **Chưa mô phỏng tấn công 51%** | Chưa có kịch bản mô phỏng khi một miner kiểm soát >51% hashrate để đảo ngược giao dịch. | Thêm kịch bản `simulate51PercentAttack()` trong `attackScenarios.js`. |
| 3 | **Chưa chống Replay Attack** | Giao dịch không có timestamp validation. Hacker có thể replay giao dịch cũ trên chain khác. | Thêm trường `timestamp` và kiểm tra thời gian hợp lệ (< 5 phút). |
| 4 | **Private key lưu dạng plaintext** | Trong quá trình test, private key được sinh và lưu tạm trong biến, không mã hóa. | Mã hóa private key bằng AES-256 trước khi lưu trữ. |

### 11.2. Hạn chế về hiệu năng

| # | Hạn chế | Mô tả | Hướng khắc phục |
|---|---------|-------|-----------------|
| 5 | **PoW difficulty mặc định = 0** | Trong môi trường test, difficulty được đặt = 0 để chạy nhanh. Chưa kiểm thử với difficulty cao (3-5). | Thêm test case với `difficulty: 3` để đo thời gian đào. |
| 6 | **Mempool chưa có giới hạn kích thước** | Mempool có thể phình to vô hạn nếu có nhiều giao dịch. | Giới hạn Mempool tối đa 1000 giao dịch, loại bỏ giao dịch cũ. |
| 7 | **WebSocket chưa có reconnection logic** | Nếu kết nối WebSocket bị đứt, client không tự động kết nối lại. | Thêm exponential backoff reconnection trong `useWebSocket.js`. |

### 11.3. Hạn chế về tính năng

| # | Hạn chế | Mô tả | Hướng khắc phục |
|---|---------|-------|-----------------|
| 8 | **Chưa hỗ trợ Smart Contract** | Hệ thống chỉ hỗ trợ giao dịch chuyển tiền đơn giản, chưa có smart contract. | Tích hợp EVM đơn giản hoặc script engine. |
| 9 | **Chưa có cơ chế phí giao dịch** | Miner không nhận được phí khi đào block, dễ bị spam. | Thêm trường `fee` vào giao dịch và thưởng cho miner. |
| 10 | **Chưa hỗ trợ nhiều loại tài sản** | Chỉ có 1 loại coin duy nhất, chưa hỗ trợ token ERC-20. | Xây dựng lớp token layer phía trên blockchain. |

### 11.4. Hạn chế về kiểm thử

| # | Hạn chế | Mô tả | Hướng khắc phục |
|---|---------|-------|-----------------|
| 11 | **Test coverage ~65%** | Chưa bao phủ hết các nhánh code (đặc biệt là error handling). | Bổ sung test cho các edge cases, hướng tới 90%+. |
| 12 | **Chưa có integration test** | Unit test đã có nhưng chưa test tích hợp toàn hệ thống (client ↔ server ↔ WebSocket). | Thêm integration test với Vitest + Playwright. |
| 13 | **Chưa test trên nhiều trình duyệt** | Chỉ test trên Chrome, chưa test Firefox/Safari/Edge. | Cross-browser testing với BrowserStack. |

### 11.5. Tổng kết

Dù còn nhiều hạn chế, dự án đã đạt được mục tiêu chính:
- ✅ Mô phỏng thành công 4 kịch bản tấn công.
- ✅ Chứng minh được tính bảo mật của blockchain trước 3/4 kịch bản (Tx Tampering, Block Tampering, Fork).
- ✅ Xây dựng nền tảng vững chắc để phát triển tiếp trong tương lai.

Các hạn chế nêu trên sẽ là **định hướng cho các phiên bản tiếp theo** của dự án.

---
## 📄 License

MIT License — Dự án phục vụ mục đích học tập.
