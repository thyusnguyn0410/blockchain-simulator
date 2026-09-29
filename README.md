# Blockchain Simulator

Phòng thí nghiệm blockchain chạy cục bộ, gồm giao diện React/Vite và các full node Express/WebSocket độc lập. Đây là mô hình giáo dục, không phải blockchain production: faucet, đồng thuận, khóa và dữ liệu chỉ phục vụ demo; không dùng với tài sản hoặc khóa thật.

## Chạy giao diện

```powershell
cd client
npm ci
npm run dev
```

Mở URL Vite hiển thị trong terminal. Giao diện hỗ trợ tổng quan, SHA-256/avalanche, ví ECDSA secp256k1, Merkle tree/proof, block header/PoW, mempool, mạng P2P và các demo double-spend/tampering/fork.

## Chạy node P2P

Cần Node.js 18 trở lên. Trong terminal riêng; `npm ci` khôi phục dependency chính xác theo lockfile:

```powershell
cd server
npm ci
npm run node1
```

Mở thêm terminal cho `npm run node2` và `npm run node3`. Trên Windows có thể chạy `npm run nodes` để mở cả ba cửa sổ. Node 1 phục vụ HTTP tại `http://localhost:3001` và WebSocket tại `ws://localhost:6001`; node 2/3 kết nối tới node 1.

REST API: `GET /status`, `/blocks`, `/mempool`, `/peers`, `/logs`; `POST /transaction`, `/mine`, `/faucet`, `/peers`; `DELETE /peers`. Faucet là phát hành coin giả lập, được relay giữa peer đang online và đưa vào block kế tiếp để chain sync có thể xác thực lại; đây không phải cơ chế tiền tệ an toàn. Giao dịch node yêu cầu địa chỉ, amount, nonce và chữ ký ECDSA hợp lệ; hãy ký body canonical `{from,to,amount,nonce}` theo module crypto phía client. Mức đào có thể chọn từ 1 đến 5.

## Kiểm tra

```powershell
cd client
npm test
npm run lint
npm run build
cd ..\server
npm test
```
