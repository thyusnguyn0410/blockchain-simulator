import React, { useState, useMemo } from 'react';

// IMPORT CÁC MODULE THUẬT TOÁN
import { generateKeyPair, signMessage, getAddressFromPublicKey, canonical } from '../crypto/ECDSA.js';
import { calculateSHA256 } from '../crypto/SHA-256.js';
import { Blockchain, Block } from './coreBlockchain.js';
import { Mempool } from './mempool.js';
import { mineBlock } from './pow.js';

// CẤU HÌNH & HÀM TIỆN ÍCH
const DEFAULT_DIFFICULTY = 3;
const REWARD = 6.25;
const COINBASE = 'COINBASE';

const FEE_TABLE = {
  slow: 0.0001,
  std: 0.0005,
  fast: 0.0020
};

const shortAddr = (a) => (a && a.length > 16 ? `${a.slice(0, 8)}...${a.slice(-6)}` : a);
const amt = (n, dp = 4) => Number(n || 0).toFixed(dp);

const copyToClipboard = (text) => {
  if (text) {
    navigator.clipboard.writeText(text);
    alert('Đã sao chép vào bộ nhớ tạm!');
  }
};

const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

const bytesToBase64 = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const toPem = (keyHex, isPrivate = true) => {
  if (!keyHex) return '';

  let derBytes;
  if (isPrivate) {
    const pkcs8Header = "3081a4020100301006072a8648ce3d020106052b8104000a04818c3081890201010420";
    const cleanKey = keyHex.padStart(64, '0');
    derBytes = hexToBytes(pkcs8Header + cleanKey);
  } else {
    const x509Header = "3056301006072a8648ce3d020106052b8104000a034200";
    const cleanKey = keyHex.startsWith('04') ? keyHex : '04' + keyHex;
    derBytes = hexToBytes(x509Header + cleanKey);
  }

  const base64 = bytesToBase64(derBytes);
  const formattedBase64 = base64.match(/.{1,64}/g).join('\n');
  const type = isPrivate ? 'PRIVATE KEY' : 'PUBLIC KEY';

  return `-----BEGIN ${type}-----\n${formattedBase64}\n-----END ${type}-----`;
};

// Hàm khởi tạo Blockchain mẫu đồng bộ theo địa chỉ Ví chính
const createInitialBlockchain = (myWallet, otherWallets) => {
  const bc = new Blockchain({ difficulty: DEFAULT_DIFFICULTY, autoGenesis: false });
  
  // Block #0 - Genesis Block
  bc.addBlock([{ from: COINBASE, to: myWallet.addr, amount: 50.0, fee: 0, type: 'Coinbase', note: 'Genesis' }]);

  // Block #1
  bc.addBlock([
    { from: COINBASE, to: myWallet.addr, amount: 6.2506, fee: 0, type: 'Coinbase' },
    { from: myWallet.addr, to: otherWallets[0].addr, amount: 4.2000, fee: 0.0005, type: 'Transfer', note: 'Consulting' },
    { from: myWallet.addr, to: otherWallets[2].addr, amount: 1.5000, fee: 0.0005, type: 'Transfer', note: 'Tuition' }
  ]);

  // Block #2
  bc.addBlock([
    { from: COINBASE, to: myWallet.addr, amount: 6.2525, fee: 0, type: 'Coinbase' },
    { from: otherWallets[0].addr, to: otherWallets[1].addr, amount: 0.8500, fee: 0.0005, type: 'Transfer', note: 'Hardware wallet' },
    { from: myWallet.addr, to: otherWallets[3].addr, amount: 3.0000, fee: 0.0005, type: 'Transfer', note: 'Staking' }
  ]);

  return bc;
};

export default function MempoolManager({ apiUrl }) {
  // Nếu polling chưa nhận được node, dùng Node khác làm đường dự phòng.
  const backendUrl = apiUrl || 'http://localhost:3002' || 'http://localhost:3003';
  const createMyWallet = () => {
    const kp = generateKeyPair();
    return {
      key: 'Ví của tôi',
      emoji: '🦊',
      privateKey: kp.privateKey,
      publicKey: kp.publicKey,
      addr: getAddressFromPublicKey(kp.publicKey)
    };
  };

  const [me, setMe] = useState(() => createMyWallet());

  const [otherAccounts] = useState(() => {
    const keys = [
      { name: 'Bob', emoji: '🐋' },
      { name: 'Charlie', emoji: '🦈' },
      { name: 'Kho bạc ', emoji: '🏛' },
      { name: 'Quỹ DeFi', emoji: '🌊' }
    ];

    return keys.map((item) => {
      const kp = generateKeyPair();
      return {
        key: item.name,
        emoji: item.emoji,
        privateKey: kp.privateKey,
        publicKey: kp.publicKey,
        addr: getAddressFromPublicKey(kp.publicKey)
      };
    });
  });

  const accounts = useMemo(() => [me, ...otherAccounts], [me, otherAccounts]);
  const [blockchain, setBlockchain] = useState(() => createInitialBlockchain(me, otherAccounts));
  const [chainState, setChainState] = useState(() => blockchain.toArray());
  const [mempoolList, setMempoolList] = useState([]);
  const [accountNonces, setAccountNonces] = useState({});

  // Để đồng bộ số nonce của các địa chỉ ví từ blockchain hiện tại
  const [serverWalletReady, setServerWalletReady] = useState(false); // Để xác định ví đã được cấp coin demo trên node hay chưa, tránh cấp lại nhiều lần.
  const [serverWalletUrl, setServerWalletUrl] = useState(''); // Để xác định ví đã được cấp coin demo trên node nào, tránh cấp lại nhiều lần nếu đổi node.
  const [serverError, setServerError] = useState(''); // Để hiển thị lỗi từ node khi gửi transaction hoặc mine block, ví dụ node từ chối transaction hoặc không thể mine block.

  // Tab chuyển đổi (send / receive)
  const [activeTab, setActiveTab] = useState('send');

  const [selectedTo, setSelectedTo] = useState(otherAccounts[1].addr);
  const [amount, setAmount] = useState('');
  const [feeType, setFeeType] = useState('std');
  const [note, setNote] = useState('');
  const [expandedBlocks, setExpandedBlocks] = useState({ 0: false, 1: true, 2: true, 3: true });
  const [errorMessage, setErrorMessage] = useState('');
  const [showPem, setShowPem] = useState(true);
  const [hidePrivateKey, setHidePrivateKey] = useState(false);
  const [lastSignatureDetails, setLastSignatureDetails] = useState(null);

  // Sinh hoa văn pixel từ Hash địa chỉ ví
  const patternColors = useMemo(() => {
    const colors = ['#1e293b', '#22c55e', '#f97316'];
    const grid = [];
    let hashVal = 0;
    const addr = me.addr || '';
    for (let i = 0; i < addr.length; i++) {
      hashVal += addr.charCodeAt(i);
    }
    for (let i = 0; i < 64; i++) {
      const colorIndex = (hashVal + i * 7 + (i % 3)) % 3;
      grid.push(colors[colorIndex]);
    }
    return grid;
  }, [me.addr]);

  const handleRefreshWallet = () => {
    const newWallet = createMyWallet();
    setMe(newWallet);
    const newBc = createInitialBlockchain(newWallet, otherAccounts);
    setBlockchain(newBc);
    setChainState(newBc.toArray());
    setMempoolList([]);
    setLastSignatureDetails(null);
    // Reset trạng thái ví trên node để cấp coin demo lại nếu cần.
    setServerWalletReady(false);
    setServerWalletUrl('');
    setServerError('');
  };

  const calculateBalance = (targetAddr) => {
    let bal = 0;
    const blocks = blockchain.toArray();
    for (const block of blocks) {
      if (block.transactions) {
        for (const tx of block.transactions) {
          if (typeof tx === 'object') {
            if (tx.to === targetAddr) bal += tx.amount;
            if (tx.from === targetAddr && tx.type !== 'Coinbase') {
              bal -= (tx.amount + (tx.fee || 0));
            }
          }
        }
      }
    }
    return bal;
  };

  const mempoolEngine = useMemo(() => {
    return new Mempool((addr) => calculateBalance(addr));
  }, [blockchain, chainState]);

  const myBalance = calculateBalance(me.addr);
  const pendingOut = mempoolList.reduce(
    (s, tx) => (tx.from === me.addr ? s + tx.amount + (tx.fee || 0) : s), 
    0
  );
  const availableBalance = myBalance - pendingOut;
  const currentFee = FEE_TABLE[feeType];
  const numAmount = parseFloat(amount) || 0;
  const remainingAfterTx = availableBalance - numAmount - currentFee;

  const blockHeight = chainState.length > 0 ? chainState.length - 1 : 0;
  
  const totalTransactions = useMemo(() => {
    return chainState.reduce((total, block) => {
      return total + (block.transactions ? block.transactions.length : 0);
    }, 0);
  }, [chainState]);

  const totalVolume = useMemo(() => {
    return chainState.reduce((total, block) => {
      if (!block.transactions) return total;
      const blockVol = block.transactions.reduce((bSum, tx) => {
        return bSum + (typeof tx === 'object' && tx.type !== 'Coinbase' ? (tx.amount || 0) : 0);
      }, 0);
      return total + blockVol;
    }, 0);
  }, [chainState]);

  const handleSend = async () => {
    setErrorMessage('');
    setServerError(''); // Reset lỗi từ node trước khi gửi transaction mới.

    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Vui lòng nhập số tiền hợp lệ!');
      return;
    }

    if (numAmount + currentFee > availableBalance) {
      setErrorMessage('Số dư khả dụng không đủ!');
      return;
    }

    const currentNonce = accountNonces[me.addr] || 0;

    const txData = {
      from: me.addr,
      to: selectedTo,
      amount: numAmount,
      fee: currentFee,
      nonce: currentNonce,
      publicKey: me.publicKey,
      note: note || ''
    };

    const txHash = calculateSHA256(canonical(txData));
    const signatureHex = signMessage(me.privateKey, txHash);

    // Backend dùng 4 trường cốt lõi, nên tạo thêm chữ ký riêng cho request server.
    const serverSignedBody = {
      from: txData.from,
      to: txData.to,
      amount: txData.amount,
      nonce: txData.nonce,
    };
    const serverSignature = signMessage(
      me.privateKey,
      canonical(serverSignedBody),
    );

    const rVal = calculateSHA256(txHash + me.privateKey).slice(0, 64);
    const sVal = signatureHex ? signatureHex.slice(10, 74) : '0'.repeat(64);
    const kVal = calculateSHA256(me.privateKey + txHash + Date.now()).slice(0, 64);

    setLastSignatureDetails({
      zHash: txHash,
      kNonce: kVal,
      r: rVal,
      s: sVal,
      derSig: signatureHex || '3045022100' + rVal.slice(0, 32) + '0220' + sVal.slice(0, 32)
    });

    const fullTx = {
      ...txData,
      txid: txHash,
      signature: signatureHex,
      timestamp: Date.now()
    };

    try {
      mempoolEngine.addTransaction(fullTx);
      setMempoolList([...mempoolEngine.transactions]);
      setAccountNonces((prev) => ({ ...prev, [me.addr]: currentNonce + 1 }));
      setAmount('');
      setNote('');

      // Ví mới tạo trong trình duyệt chưa có tiền trên node, cấp coin demo một lần.
      if (!serverWalletReady || serverWalletUrl !== backendUrl) {
        const faucetResponse = await fetch(`${backendUrl}/faucet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: me.addr, amount: 100 }),
        });
        if (!faucetResponse.ok) {
          throw new Error('Không thể cấp coin demo cho ví trên node.');
        }

        const fundingMineResponse = await fetch(`${backendUrl}/mine`, { method: 'POST' });
        if (!fundingMineResponse.ok) {
          throw new Error('Không thể xác nhận coin demo trên node.');
        }
        setServerWalletReady(true);
        setServerWalletUrl(backendUrl);
      }

      // Gửi transaction đã ký vào mempool thật của backend.
      const transactionResponse = await fetch(`${backendUrl}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Chỉ thay chữ ký khi gửi server; txData và chữ ký local vẫn giữ nguyên.
        body: JSON.stringify({ ...fullTx, signature: serverSignature }),
      });
      if (!transactionResponse.ok) {
        const result = await transactionResponse.json().catch(() => ({}));
        throw new Error(result.error || 'Node từ chối transaction.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi khi tạo giao dịch');
      setServerError(err.message || 'Không thể đồng bộ transaction với node.');
    }
  };

  const handleMine = async () => {
    if (mempoolList.length === 0) return;

    const totalFees = mempoolList.reduce((s, x) => s + (x.fee || 0), 0);

    const coinbaseTx = {
      from: COINBASE,
      to: me.addr,
      amount: REWARD + totalFees,
      fee: 0,
      nonce: Date.now(),
      signature: 'COINBASE_TX_SIG',
      publicKey: me.publicKey,
      type: 'Coinbase',
      note: 'Thưởng khối'
    };

    const blockTxs = [coinbaseTx, ...mempoolList];
    const prevHash = blockchain.tail ? blockchain.tail.hash : '0'.repeat(64);
    const newBlock = new Block(chainState.length, prevHash, blockTxs, Math.floor(Date.now() / 1000), DEFAULT_DIFFICULTY);
    
    mineBlock(newBlock, DEFAULT_DIFFICULTY);

    if (blockchain.head) {
      blockchain.tail.next = newBlock;
      blockchain.tail = newBlock;
    } else {
      blockchain.head = newBlock;
      blockchain.tail = newBlock;
    }
    blockchain.length++;

    mempoolEngine.removeTransactions(mempoolList);
    setMempoolList([]);
    setChainState(blockchain.toArray());

    // Mine backend để server broadcast block cho Recent Transactions.
    try {
      const response = await fetch(`${backendUrl}/mine`, { method: 'POST' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Không thể mine transaction trên node.');
      }
    } catch (error) {
      setServerError(error.message || 'Không thể mine transaction trên node.');
    }
  };

  const toggleBlock = (idx) => {
    setExpandedBlocks((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getAccountName = (addr) => {
    if (addr === COINBASE) return 'Thưởng khối';
    const acc = accounts.find((a) => a.addr === addr);
    return acc ? acc.key : shortAddr(addr);
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerContainer}>
        <div style={styles.topBadgeContainer}>
          <div style={styles.testnetTag}>
            <span style={styles.orangeDot}>●</span> MẠNG THỬ NGHIỆM · SECP256K1
          </div>
        </div>

        <div style={styles.titleRow}>
          <div>
            <h1 style={styles.mainTitle}>
              Giao dịch & <span style={{ color: '#84cc16' }}>Chữ ký số</span>
            </h1>
            <p style={styles.subTitle}>
              Ký, phát tán và xác minh giao dịch ngay trong trình duyệt — không máy chủ, không thư viện ngoài.
            </p>
          </div>

          <div style={styles.statusBadge}>
            <span style={styles.greenLiveDot}>●</span>
            <span style={{ fontWeight: 'bold', color: '#fff' }}>Testnet</span>
            <span style={{ color: '#6b7280', margin: '0 4px' }}>·</span>
            <span style={{ color: '#9ca3af' }}>secp256k1</span>
            <span style={{ color: '#6b7280', margin: '0 4px' }}>·</span>
            <span style={{ color: '#9ca3af' }}>SHA-256</span>
            <span style={{ color: '#6b7280', margin: '0 4px' }}>·</span>
            <span style={{ color: '#9ca3af' }}>PoW</span>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>SỐ DƯ</div>
            <div style={styles.statValueContainer}>
              <span style={{ ...styles.statValue, color: '#f59e0b' }}>{amt(myBalance, 4)}</span>
              <span style={styles.statUnit}></span>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>CHIỀU CAO</div>
            <div style={styles.statValueContainer}>
              <span style={styles.statValue}>#{blockHeight}</span>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>GIAO DỊCH</div>
            <div style={styles.statValueContainer}>
              <span style={styles.statValue}>{totalTransactions}</span>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>GIÁ TRỊ LUÂN CHUYỂN</div>
            <div style={styles.statValueContainer}>
              <span style={styles.statValue}>{amt(totalVolume, 2)}</span>
              <span style={styles.statUnit}></span>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>CHỜ XÁC NHẬN</div>
            <div style={styles.statValueContainer}>
              <span style={{ ...styles.statValue, color: '#f59e0b' }}>{mempoolList.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🦊</span>
                <div>
                  <div style={styles.cardSubTitle}>VÍ CỦA TÔI</div>
                  <div style={styles.addrChip} onClick={() => copyToClipboard(me.addr)}>
                    {shortAddr(me.addr)} <span style={{ fontSize: '10px', opacity: 0.6 }}>📋</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleRefreshWallet} 
                style={styles.iconBtn} 
                title="Đổi ID & làm mới sổ cái"
              >
                🔄
              </button>
            </div>

            <div style={styles.balanceBig}>{amt(myBalance)}</div>

            <button onClick={() => setShowPem(!showPem)} style={styles.pemAccordionBtn}>
              🔑 Khóa & định dạng PEM <span style={{ float: 'right' }}>{showPem ? '▲' : '▼'}</span>
            </button>

            {showPem && (
              <div style={styles.pemSection}>
                <div style={styles.formulaBox}>
                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Q = d · G</span>
                  <span style={{ color: '#6b7280', fontSize: '11px' }}>secp256k1 · y² = x³ + 7</span>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={styles.pemTitle}>KHOÁ RIÊNG · 256 BIT</span>
                    <button onClick={() => setHidePrivateKey(!hidePrivateKey)} style={styles.smallTextBtn}>
                      🙈 {hidePrivateKey ? 'Hiện' : 'Ẩn'}
                    </button>
                  </div>
                  <div style={{ ...styles.keyBox, color: '#f87171' }}>
                    {hidePrivateKey ? '•'.repeat(64) : me.privateKey}
                  </div>
                  <div style={styles.warningText}>
                    Ai cầm chuỗi này là nắm toàn quyền với ví.
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={styles.pemTitle}>KHOÁ CÔNG KHẢI · 04 + X + Y</span>
                    <button onClick={() => copyToClipboard(me.publicKey)} style={styles.smallTextBtn}>📋</button>
                  </div>
                  <div style={{ ...styles.keyBox, color: '#34d399' }}>{me.publicKey}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={styles.pemTitle}>DẠNG NÉN</span>
                      <button onClick={() => copyToClipboard('02' + me.publicKey.slice(2, 66))} style={styles.smallTextBtn}>📋</button>
                    </div>
                    <div style={styles.keyBox}>02{me.publicKey.slice(2, 66)}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={styles.pemTitle}>ĐỊA CHỈ · SHA-256(KHOÁ CÔNG KHẢI)</span>
                      <button onClick={() => copyToClipboard(me.addr)} style={styles.smallTextBtn}>📋</button>
                    </div>
                    <div style={{ ...styles.keyBox, color: '#34d399' }}>{me.addr}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={styles.pemTitle}>PEM · PKCS#8</span>
                      <button onClick={() => copyToClipboard(toPem(me.privateKey, true))} style={styles.smallTextBtn}>📋</button>
                    </div>
                    <pre style={styles.pemBox}>{toPem(me.privateKey, true)}</pre>
                    <div style={{ height: '3px', background: '#f59e0b', borderRadius: '2px', marginTop: '4px', width: '40%' }}></div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={styles.pemTitle}>PEM · X.509</span>
                      <button onClick={() => copyToClipboard(toPem(me.publicKey, false))} style={styles.smallTextBtn}>📋</button>
                    </div>
                    <pre style={styles.pemBox}>{toPem(me.publicKey, false)}</pre>
                    <div style={{ height: '3px', background: '#f59e0b', borderRadius: '2px', marginTop: '4px', width: '60%' }}></div>
                  </div>
                </div>

              </div>
            )}
          </div>

          <div style={styles.card}>
            {/* Thanh chuyển đổi Tab Gửi / Nhận */}
            <div style={{
              display: 'flex',
              backgroundColor: '#0a0d0a',
              borderRadius: '8px',
              padding: '4px',
              marginBottom: '16px',
              border: '1px solid #1a231c'
            }}>
              <button
                onClick={() => setActiveTab('send')}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: activeTab === 'send' ? '#172219' : 'transparent',
                  color: activeTab === 'send' ? '#ffffff' : '#889988',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                ↗ Gửi
              </button>
              <button
                onClick={() => setActiveTab('receive')}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: activeTab === 'receive' ? '#172219' : 'transparent',
                  color: activeTab === 'receive' ? '#ffffff' : '#889988',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                ↙ Nhận
              </button>
            </div>

            {/* TAB GỬI */}
            {activeTab === 'send' && (
              <div>
                {errorMessage && <div style={styles.errorBox}>⚠️ {errorMessage}</div>}
                {serverError && <div style={styles.errorBox}>⚠️ Đồng bộ node: {serverError}</div>}

                <div style={{ marginBottom: '14px' }}>
                  <label style={styles.label}>NGƯỜI NHẬN</label>
                  <div style={styles.userGrid}>
                    {otherAccounts.map((acc) => (
                      <button
                        key={acc.addr}
                        onClick={() => setSelectedTo(acc.addr)}
                        style={{
                          ...styles.userBtn,
                          border: selectedTo === acc.addr ? '1px solid #f59e0b' : '1px solid #2d3748',
                          background: selectedTo === acc.addr ? '#232733' : '#161922'
                        }}
                      >
                        <div style={{ fontSize: '18px' }}>{acc.emoji}</div>
                        <div style={styles.userBtnName}>{acc.key}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>{amt(calculateBalance(acc.addr), 2)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={styles.label}>SỐ TIỀN</label>
                    <button
                      onClick={() => setAmount(amt(Math.max(0, availableBalance - currentFee)))}
                      style={styles.maxBtn}
                    >
                      Tối đa
                    </button>
                  </div>
                  <input
                    type="number"
                    placeholder="0.0000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={styles.label}>PHÍ GIAO DỊCH</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' }}>
                    {[
                      { key: 'slow', label: 'Chậm', val: '0.0001' },
                      { key: 'std', label: 'Thường', val: '0.0005' },
                      { key: 'fast', label: 'Nhanh', val: '0.0020' }
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFeeType(f.key)}
                        style={{
                          ...styles.feeBtn,
                          border: feeType === f.key ? '1px solid #10b981' : '1px solid #2d3748',
                          background: feeType === f.key ? 'rgba(16, 185, 129, 0.1)' : '#161922',
                          color: feeType === f.key ? '#10b981' : '#9ca3af'
                        }}
                      >
                        <div style={{ fontWeight: 'bold' }}>{f.label}</div>
                        <div style={{ fontSize: '10px', opacity: 0.8 }}>{f.val}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={styles.label}>GHI CHÚ</label>
                  <input
                    type="text"
                    placeholder="Không bắt buộc"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={{ textAlign: 'right', fontSize: '11px', color: '#9ca3af', marginBottom: '10px' }}>
                  Trừ {currentFee} · còn {amt(Math.max(0, remainingAfterTx))}
                </div>

                <button onClick={handleSend} style={styles.primaryBtn}>
                  ✍️ Ký & Phát tán
                </button>
              </div>
            )}

            {/* TAB NHẬN */}
            {activeTab === 'receive' && (
              <div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                  
                  {/* Hoa văn Pixel sinh ra từ Hash */}
                  <div style={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: '#080a08',
                    border: '1px solid #1d2820',
                    borderRadius: '12px',
                    padding: '8px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '3px',
                    boxSizing: 'border-box'
                  }}>
                    {patternColors.map((color, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: color,
                          borderRadius: '2px',
                          width: '100%',
                          height: '100%'
                        }}
                      />
                    ))}
                  </div>

                  {/* Khung chứa địa chỉ ví */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      color: '#88a088',
                      marginBottom: '8px',
                      textTransform: 'uppercase'
                    }}>
                      ĐỊA CHỈ VÍ
                    </div>
                    
                    <div style={{
                      backgroundColor: '#080a08',
                      border: '1px solid #1d2820',
                      borderRadius: '8px',
                      padding: '10px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: '#d1d5db',
                      wordBreak: 'break-all',
                      lineHeight: '1.4'
                    }}>
                      {me.addr}
                    </div>
                  </div>
                </div>

                {/* Dòng mô tả chú thích */}
                <p style={{
                  fontSize: '12.5px',
                  color: '#718071',
                  lineHeight: '1.5',
                  margin: '0 0 16px 0'
                }}>
                  Hoa văn bên cạnh sinh từ chính hash địa chỉ — nhìn là nhận ra ví, khỏi dò từng ký tự.
                </p>

                {/* Nút Sao Chép Địa Chỉ */}
                <button
                  onClick={() => copyToClipboard(me.addr)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#121a14',
                    border: '1px solid #233326',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  📋 Chép địa chỉ
                </button>
              </div>
            )}
          </div>

          {lastSignatureDetails && (
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '12px' }}>✓ Chữ ký vừa tạo</span>
                <span style={styles.derBadge}>71 byte · DER</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={styles.pemTitle}>Z = SHA-256(TX)</span>
                    <button onClick={() => copyToClipboard(lastSignatureDetails.zHash)} style={styles.smallTextBtn}>📋</button>
                  </div>
                  <div style={styles.keyBox}>{lastSignatureDetails.zHash.slice(0, 32)}...</div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={styles.pemTitle}>K · DÙNG MỘT LẦN</span>
                    <button onClick={() => copyToClipboard(lastSignatureDetails.kNonce)} style={styles.smallTextBtn}>📋</button>
                  </div>
                  <div style={{ ...styles.keyBox, color: '#f87171' }}>{lastSignatureDetails.kNonce.slice(0, 32)}...</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={styles.pemTitle}>R</span>
                    <button onClick={() => copyToClipboard(lastSignatureDetails.r)} style={styles.smallTextBtn}>📋</button>
                  </div>
                  <div style={styles.keyBox}>{lastSignatureDetails.r.slice(0, 32)}...</div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={styles.pemTitle}>S</span>
                    <button onClick={() => copyToClipboard(lastSignatureDetails.s)} style={styles.smallTextBtn}>📋</button>
                  </div>
                  <div style={styles.keyBox}>{lastSignatureDetails.s.slice(0, 32)}...</div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={styles.pemTitle}>CHỮ KÝ DER</span>
                  <button onClick={() => copyToClipboard(lastSignatureDetails.derSig)} style={styles.smallTextBtn}>📋</button>
                </div>
                <div style={{ ...styles.keyBox, color: '#34d399' }}>{lastSignatureDetails.derSig}</div>
              </div>
            </div>
          )}

        </div>

        <div style={styles.rightCol}>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={styles.pulseDot}></span>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Mempool</span>
                <span style={{ fontSize: '12px', background: '#232733', padding: '2px 6px', borderRadius: '10px' }}>
                  {mempoolList.length}
                </span>
              </div>
              <button
                onClick={handleMine}
                disabled={mempoolList.length === 0}
                style={{
                  ...styles.mineBtn,
                  opacity: mempoolList.length === 0 ? 0.4 : 1,
                  cursor: mempoolList.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                ⛏ Đào khối
              </button>
            </div>

            {mempoolList.length === 0 ? (
              <div style={styles.emptyBox}>Mempool trống. Hãy tạo giao dịch mới!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mempoolList.map((tx, idx) => (
                  <div key={idx} style={styles.txRow}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>Ví của tôi</span>
                        <span style={{ color: '#6b7280', margin: '0 6px' }}>→</span>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>{getAccountName(tx.to)}</span>
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                          {shortAddr(tx.from)}... · Phí {tx.fee}
                        </div>
                      </div>
                      <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>
                        -{amt(tx.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Sổ cái</span>
                <span style={styles.chainStatusBadge}>✓ Chuỗi hợp lệ</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chainState
                .slice()
                .reverse()
                .map((block, idx) => {
                  const blockIndex = chainState.length - 1 - idx;

                  const totalBlockVol = block.transactions ? block.transactions.reduce(
                    (s, x) => s + (typeof x === 'object' && x.type !== 'Coinbase' ? (x.amount || 0) : 0),
                    0
                  ) : 0;

                  const myBlockChange = block.transactions ? block.transactions.reduce((s, tx) => {
                    if (typeof tx !== 'object') return s;
                    let change = 0;
                    if (tx.to === me?.addr) change += (tx.amount || 0);
                    if (tx.from === me?.addr && tx.type !== 'Coinbase') {
                      change -= ((tx.amount || 0) + (tx.fee || 0));
                    }
                    return s + change;
                  }, 0) : 0;

                  const isExpanded = expandedBlocks[blockIndex];

                  return (
                    <div key={blockIndex} style={styles.blockCard}>
                      <div onClick={() => toggleBlock(blockIndex)} style={styles.blockHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={styles.blockBadge}>#{blockIndex}</span>
                          <div>
                            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#34d399' }}>
                              {block.hash ? `${block.hash.slice(0, 28)}...` : 'N/A'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                              {block.transactions ? block.transactions.length : 0} giao dịch
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 'bold' }}>
                              TỔNG VOL
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#d1d5db', fontFamily: 'monospace' }}>
                              {amt(totalBlockVol, 2)}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 'bold' }}>
                              VÍ CỦA TÔI
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: 'bold', 
                              fontFamily: 'monospace',
                              color: myBlockChange > 0 ? '#34d399' : myBlockChange < 0 ? '#ef4444' : '#9ca3af' 
                            }}>
                              {myBlockChange > 0 ? `+${amt(myBlockChange, 4)}` : amt(myBlockChange, 4)}
                            </div>
                          </div>

                          <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '4px' }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={styles.blockDetail}>
                          <div style={styles.blockMetaGrid}>
                            <div>
                              <span style={styles.metaLabel}>MERKLE ROOT</span>
                              <div style={styles.metaVal}>{block.merkleRoot ? block.merkleRoot.slice(0, 18) + '...' : 'N/A'}</div>
                            </div>
                            <div>
                              <span style={styles.metaLabel}>HASH KHỐI TRƯỚC</span>
                              <div style={styles.metaVal}>{block.prevHash ? block.prevHash.slice(0, 18) + '...' : (block.previousHash ? block.previousHash.slice(0, 18) + '...' : '0'.repeat(18) + '...')}</div>
                            </div>
                            <div>
                              <span style={styles.metaLabel}>NONCE</span>
                              <div style={{ ...styles.metaVal, color: '#fff' }}>{block.nonce ?? 0}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                            {block.transactions && block.transactions.map((tx, tIdx) => (
                              <div key={tIdx} style={styles.miniTx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{getAccountName(tx.from)}</span>
                                    <span style={{ color: '#4b5563', margin: '0 4px' }}>→</span>
                                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{getAccountName(tx.to)}</span>
                                    {tx.note && <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '6px' }}>· {tx.note}</span>}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {tx.type === 'Coinbase' ? (
                                      <span style={styles.rewardBadge}>↖ Thưởng khối</span>
                                    ) : (
                                      <span style={styles.ecdsaBadge}>✓ ECDSA</span>
                                    )}
                                    <span style={{ color: tx.type === 'Coinbase' ? '#f59e0b' : tx.from === me.addr ? '#ef4444' : '#34d399', fontWeight: 'bold' }}>
                                      {tx.type === 'Coinbase' ? `+${amt(tx.amount)}` : tx.from === me.addr ? `-${amt(tx.amount)}` : `+${amt(tx.amount)}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#0a0c0e',
    color: '#d1d5db',
    minHeight: '100vh',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  headerContainer: {
    marginBottom: '28px'
  },
  topBadgeContainer: {
    marginBottom: '12px'
  },
  testnetTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid #78350f',
    backgroundColor: 'rgba(120, 53, 15, 0.15)',
    color: '#d97706',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '0.8px'
  },
  orangeDot: {
    color: '#f59e0b',
    fontSize: '10px'
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  mainTitle: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  subTitle: {
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '6px',
    margin: 0
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#12161f',
    border: '1px solid #1e2638',
    borderRadius: '20px',
    padding: '6px 14px',
    fontSize: '12px',
    fontFamily: 'monospace'
  },
  greenLiveDot: {
    color: '#10b981',
    fontSize: '12px',
    marginRight: '4px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '12px'
  },
  statCard: {
    backgroundColor: '#11141c',
    border: '1px solid #1e2433',
    borderRadius: '10px',
    padding: '14px 16px'
  },
  statLabel: {
    fontSize: '10px',
    color: '#6b7280',
    fontWeight: '700',
    letterSpacing: '0.6px',
    marginBottom: '8px'
  },
  statValueContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px'
  },
  statValue: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'monospace'
  },
  statUnit: {
    fontSize: '10px',
    color: '#6b7280',
    fontWeight: 'bold'
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '16px'
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  card: {
    background: '#14171f',
    border: '1px solid #202532',
    borderRadius: '12px',
    padding: '16px'
  },
  cardSubTitle: {
    fontSize: '10px',
    color: '#6b7280',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  },
  addrChip: {
    background: '#1d222e',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#d1d5db',
    cursor: 'pointer',
    display: 'inline-block',
    marginTop: '2px'
  },
  iconBtn: {
    background: '#1d222e',
    border: 'none',
    color: '#fff',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  balanceBig: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#fff',
    marginTop: '12px',
    letterSpacing: '-0.5px'
  },
  pemAccordionBtn: {
    width: '100%',
    background: '#1d222e',
    border: '1px dashed #374151',
    color: '#d1d5db',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '14px',
    textAlign: 'left'
  },
  pemSection: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #202532'
  },
  formulaBox: {
    background: '#0d0f12',
    border: '1px solid #202532',
    borderRadius: '6px',
    padding: '8px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: 'monospace'
  },
  pemTitle: {
    fontSize: '9px',
    color: '#9ca3af',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  },
  smallTextBtn: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: '10px',
    cursor: 'pointer',
    padding: 0
  },
  keyBox: {
    background: '#0d0f12',
    border: '1px solid #202532',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '11px',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    color: '#d1d5db'
  },
  warningText: {
    fontSize: '11px',
    color: '#f59e0b',
    marginTop: '4px',
    fontWeight: '500'
  },
  pemBox: {
    background: '#0d0f12',
    border: '1px solid #202532',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '9px',
    fontFamily: 'monospace',
    color: '#6b7280',
    margin: 0,
    whiteSpace: 'pre-wrap',
    maxHeight: '65px',
    overflowY: 'auto'
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '11px',
    marginBottom: '10px'
  },
  label: {
    fontSize: '10px',
    color: '#6b7280',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  },
  maxBtn: {
    background: '#1d222e',
    border: 'none',
    color: '#d1d5db',
    borderRadius: '10px',
    padding: '2px 8px',
    fontSize: '10px',
    cursor: 'pointer'
  },
  userGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    marginTop: '6px'
  },
  userBtn: {
    padding: '8px 4px',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center'
  },
  userBtnName: {
    fontSize: '11px',
    color: '#fff',
    fontWeight: 'bold'
  },
  input: {
    width: '100%',
    background: '#0d0f12',
    border: '1px solid #202532',
    borderRadius: '8px',
    padding: '10px',
    color: '#fff',
    fontSize: '13px',
    boxSizing: 'border-box',
    outline: 'none',
    marginTop: '4px'
  },
  feeBtn: {
    padding: '8px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '11px',
    textAlign: 'center'
  },
  primaryBtn: {
    width: '100%',
    background: '#ea580c',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer'
  },
  derBadge: {
    background: '#1d222e',
    color: '#9ca3af',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px'
  },
  pulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#34d399'
  },
  mineBtn: {
    background: '#34d399',
    color: '#000',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  emptyBox: {
    textAlign: 'center',
    padding: '24px',
    border: '1px dashed #202532',
    borderRadius: '8px',
    color: '#4b5563',
    fontSize: '12px'
  },
  txRow: {
    background: '#0d0f12',
    border: '1px solid #202532',
    borderRadius: '8px',
    padding: '10px 12px'
  },
  chainStatusBadge: {
    background: 'rgba(52, 211, 153, 0.1)',
    color: '#34d399',
    border: '1px solid rgba(52, 211, 153, 0.2)',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px'
  },
  blockCard: {
    background: '#0d0f12',
    border: '1px solid #202532',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  blockHeader: {
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  },
  blockBadge: {
    background: '#1d222e',
    color: '#f59e0b',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    fontFamily: 'monospace'
  },
  blockDetail: {
    borderTop: '1px solid #1a1d26',
    padding: '12px',
    background: '#11131a'
  },
  blockMetaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 60px',
    gap: '8px',
    borderBottom: '1px solid #1a1d26',
    paddingBottom: '8px'
  },
  metaLabel: {
    fontSize: '9px',
    color: '#6b7280',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  },
  metaVal: {
    fontFamily: 'monospace',
    fontSize: '10px',
    color: '#9ca3af',
    marginTop: '2px'
  },
  miniTx: {
    background: '#14171f',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '11px'
  },
  ecdsaBadge: {
    background: 'rgba(52, 211, 153, 0.1)',
    color: '#34d399',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  rewardBadge: {
    background: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold'
  }
};