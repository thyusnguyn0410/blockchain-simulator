import { useMemo, useState } from 'react';
import MainLayout from './layouts/MainLayout.jsx';
import Sha256Visualizer from './modules/crypto/Sha256Visualizer.jsx';
import EcdsaTool from './modules/crypto/EcdsaTool.jsx';
import MerkleTree from './modules/crypto/MerkleTree.jsx';
import BlockHeaderViewer from './modules/blockchain/BlockHeaderViewer.jsx';
import MempoolManager from './modules/blockchain/MempoolManager.jsx';
import ProofOfWorkSimulator from './modules/blockchain/ProofOfWorkSimulator.jsx';
import NetworkDashboard from './modules/network/NetworkDashboard.jsx';
import DoubleSpendingAttack from './modules/simulator/DoubleSpendingAttack.jsx';
import TamperBlockDemo from './modules/simulator/TamperBlockDemo.jsx';
import ForkVisualizer from './modules/simulator/ForkVisualizer.jsx';
import { Blockchain } from './modules/blockchain/coreBlockchain.js';
import './App.css';

function makeDemoChain() {
  const chain = new Blockchain({ difficulty: 1 });
  chain.addBlock([{ from: 'Alice', to: 'Bob', amount: 2.5 }, { from: 'Carol', to: 'Dave', amount: 0.75 }]);
  chain.addBlock([{ from: 'Bob', to: 'Eve', amount: 1.2 }]);
  return chain.toArray();
}

const pages = {
  home: ['Blockchain Simulator', 'Phòng thí nghiệm tương tác: từ hàm băm đến đồng thuận P2P.'],
  sha256: ['SHA-256', 'Quan sát realtime hash, avalanche effect và giới hạn Proof of Work.'],
  ecdsa: ['Wallet & ECDSA', 'Tạo khóa secp256k1, ký giao dịch và xác minh tính toàn vẹn dữ liệu.'],
  chain: ['Blocks & chain', 'Khám phá header, liên kết hash, Merkle root và proof of work.'],
  mempool: ['Transaction mempool', 'Xếp hàng giao dịch, kiểm tra dữ liệu và đóng gói vào block.'],
  merkle: ['Merkle tree', 'Tạo cây Merkle, root hash và proof path gọn theo O(log n).'],
  network: ['P2P network & consensus', 'Quan sát node, kết nối WebSocket, relay và đồng bộ chuỗi.'],
  attacks: ['Attack playground', 'Thử tamper, double-spending và so sánh các nhánh fork.'],
};

function Overview({ blocks, mempool, navigate }) {
  const totalTransactions = blocks.reduce((sum, block) => sum + (block.transactions?.length || 0), 0) + mempool.length;
  const latest = blocks.at(-1);
  const shortcuts = [
    ['sha256', 'SHA-256 realtime', 'Hash, avalanche effect và nonce proof-of-work', '01'],
    ['ecdsa', 'Ví & chữ ký số', 'secp256k1 · ký và xác minh giao dịch', '02'],
    ['chain', 'Khối & chuỗi', 'Genesis, Merkle root và liên kết hash', '03'],
    ['network', 'Mạng P2P', 'WebSocket relay, peer và đồng thuận', '04'],
  ];
  return (
    <div className="module-stack">
      <section className="hero-panel">
        <div className="hero-copy"><span className="eyebrow"><i /> EDUCATIONAL BLOCKCHAIN SANDBOX</span><h1>Hiểu blockchain.<br /><span>Qua từng khối.</span></h1><p>Một phòng thí nghiệm tương tác để khám phá mật mã, giao dịch, khai thác và mạng ngang hàng — trực tiếp trên trình duyệt.</p><button className="primary-button" type="button" onClick={() => navigate('sha256')}>Bắt đầu khám phá <span>↗</span></button></div>
        <div className="hero-graphic" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-block">⛓<small>BLOCK<br />CHAIN</small></div><span className="float-node node-a">SHA-256</span><span className="float-node node-b">P2P</span><span className="float-node node-c">ECDSA</span></div>
      </section>
      <section className="stats-grid">
        {[['Chiều cao chuỗi', `#${latest?.index ?? 0}`, 'Block mới nhất', '▤', 'cyan'], ['Giao dịch', totalTransactions, 'Trong chuỗi & mempool', '⇄', 'purple'], ['Mempool chờ', mempool.length, 'Giao dịch chưa đào', '◷', 'orange'], ['Proof of Work', 'ĐỘ KHÓ 1', 'Demo cục bộ giới hạn tài nguyên', '⚡', 'green']].map(([label, value, note, icon, color]) => <article className="stat-card" key={label}><div className="stat-card-top"><span className="stat-title">{label}</span><span className={`stat-icon ${color}`}>{icon}</span></div><div className="stat-card-value">{value}</div><p className="stat-description">{note}</p></article>)}
      </section>
      <section className="glass-panel">
        <div className="panel-heading"><div><span className="eyebrow">LEARNING MODULES</span><h2>Chọn một chủ đề để bắt đầu</h2><p>Mỗi mô-đun có mô phỏng trực quan và giải thích giới hạn của demo.</p></div></div>
        <div className="shortcut-grid">{shortcuts.map(([page, title, description, number]) => <button className="shortcut-card" type="button" key={page} onClick={() => navigate(page)}><span className="shortcut-number">{number}</span><span className="shortcut-arrow">↗</span><strong>{title}</strong><p>{description}</p></button>)}</div>
      </section>
      <section className="glass-panel overview-chain"><div className="panel-heading"><div><h2>Chuỗi hiện tại</h2><p>Genesis → các block gần nhất · xác thực SHA-256 liên kết.</p></div><button className="outline-button" type="button" onClick={() => navigate('chain')}>Xem chi tiết</button></div><div className="chain-view">{blocks.slice(-3).map((block) => <div className="block-card" key={block.hash}><span className="block-index">BLOCK #{block.index}</span><code>{block.hash.slice(0, 22)}…</code><small>{block.transactions.length} giao dịch</small><span className="tag tag-green">VALID</span></div>)}</div></section>
      <p className="notice notice-warn">Môi trường học tập: thuật toán và node chỉ mô phỏng các ý tưởng cốt lõi. Không lưu tài sản, không bảo vệ khóa bí mật và không thay thế mạng blockchain thực.</p>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState('home');
  const [language, setLanguage] = useState('vi');
  const [blocks, setBlocks] = useState(makeDemoChain);
  const [mempool, setMempool] = useState([
    { from: 'a'.repeat(40), to: 'b'.repeat(40), amount: 1.5, nonce: 0, createdAt: new Date().toISOString() },
  ]);
  const [mining, setMining] = useState(false);
  const [onlineNodes, setOnlineNodes] = useState(0);
  const latest = blocks.at(-1);
  const page = useMemo(() => pages[activePage], [activePage]);

  const mineMempool = () => {
    setMining(true);
    window.setTimeout(() => {
      const chain = new Blockchain({ autoGenesis: false, difficulty: 1 });
      chain.blocks = blocks.map((block) => ({
        ...block,
        transactions: [...block.transactions],
        data: [...block.transactions],
        next: null,
      }));
      chain.addBlock(mempool.length ? mempool : [{ info: 'Empty demo block' }]);
      setBlocks(chain.toArray());
      setMempool([]);
      setMining(false);
    }, 40);
  };

  return (
    <MainLayout activePage={activePage} onNavigate={setActivePage} language={language} onLanguageChange={() => setLanguage((current) => current === 'vi' ? 'en' : 'vi')} onlineNodes={onlineNodes}>
      {activePage !== 'home' && <header className="page-header"><div><span className="page-label">BLOCKSIM / LAB {String(Object.keys(pages).indexOf(activePage) + 1).padStart(2, '0')}</span><h1>{page[0]}</h1><p>{page[1]}</p></div>{activePage === 'chain' && <div className="page-meta"><span className="tag tag-cyan">HEIGHT #{latest.index}</span><span className="tag tag-green">CHAIN VALID</span></div>}</header>}
      {activePage === 'home' && <Overview blocks={blocks} mempool={mempool} navigate={setActivePage} />}
      {activePage === 'sha256' && <Sha256Visualizer />}
      {activePage === 'ecdsa' && <EcdsaTool />}
      {activePage === 'chain' && <div className="module-stack"><section className="glass-panel"><BlockHeaderViewer key={blocks.length} blocks={blocks} mining={mining} onMine={mineMempool} /></section><ProofOfWorkSimulator /></div>}
      {activePage === 'mempool' && <MempoolManager transactions={mempool} onAdd={(tx) => setMempool((current) => [...current, tx])} onMine={mineMempool} mining={mining} />}
      {activePage === 'merkle' && <MerkleTree />}
      {activePage === 'network' && <NetworkDashboard onOnlineNodesChange={setOnlineNodes} />}
      {activePage === 'attacks' && <div className="module-stack"><DoubleSpendingAttack /><TamperBlockDemo blocks={blocks} /><ForkVisualizer /></div>}
    </MainLayout>
  );
}

export default App;
