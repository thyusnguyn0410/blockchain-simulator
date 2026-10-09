import { useState, useMemo } from 'react';

// IMPORT CÁC MODULE THUẬT TOÁN
import { generateKeyPair, signMessage, getAddressFromPublicKey, canonical } from '../crypto/ECDSA.js';
import { calculateSHA256 } from '../crypto/SHA-256.js';
import { Blockchain, Block } from './coreBlockchain.js';
import { Mempool } from './mempool.js';
import { mineBlock } from './pow.js';

// ============ CONFIG ============
const DEFAULT_DIFFICULTY = 3;
const REWARD = 6.25;
const COINBASE = 'COINBASE';

const FEE_TABLE = {
  slow: 0.0001,
  std: 0.0005,
  fast: 0.0020
};

// ============ HELPERS ============
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

const createInitialBlockchain = (myWallet, otherWallets) => {
  const bc = new Blockchain({ difficulty: DEFAULT_DIFFICULTY, autoGenesis: false });

  bc.addBlock([{ from: COINBASE, to: myWallet.addr, amount: 50.0, fee: 0, type: 'Coinbase', note: 'Genesis' }]);

  bc.addBlock([
    { from: COINBASE, to: myWallet.addr, amount: 6.2506, fee: 0, type: 'Coinbase' },
    { from: myWallet.addr, to: otherWallets[0].addr, amount: 4.2000, fee: 0.0005, type: 'Transfer', note: 'Consulting' },
    { from: myWallet.addr, to: otherWallets[2].addr, amount: 1.5000, fee: 0.0005, type: 'Transfer', note: 'Tuition' }
  ]);

  bc.addBlock([
    { from: COINBASE, to: myWallet.addr, amount: 6.2525, fee: 0, type: 'Coinbase' },
    { from: otherWallets[0].addr, to: otherWallets[1].addr, amount: 0.8500, fee: 0.0005, type: 'Transfer', note: 'Hardware wallet' },
    { from: myWallet.addr, to: otherWallets[3].addr, amount: 3.0000, fee: 0.0005, type: 'Transfer', note: 'Staking' }
  ]);

  return bc;
};

export default function MempoolManager({ apiUrl }) {
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
      { name: 'Kho bạc', emoji: '🏛' },
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

  const [serverWalletReady, setServerWalletReady] = useState(false);
  const [serverWalletUrl, setServerWalletUrl] = useState('');
  const [serverError, setServerError] = useState('');

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

  const patternColors = useMemo(() => {
    const colors = ['var(--theme-surface-raised)', 'var(--accent-green)', 'var(--accent-orange)'];
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
    setServerError('');

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

    const serverSignedBody = {
      from: txData.from,
      to: txData.to,
      amount: txData.amount,
      nonce: txData.nonce,
    };
    const serverSignature = signMessage(me.privateKey, canonical(serverSignedBody));

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

      const transactionResponse = await fetch(`${backendUrl}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="mp-container">
      <div className="mp-header">
        <div className="mp-top-badge-wrap">
          <div className="mp-testnet-tag">
            <span className="mp-orange-dot">●</span> MẠNG THỬ NGHIỆM · SECP256K1
          </div>
        </div>

        <div className="mp-title-row">
          <div>
            <h1 className="mp-main-title">
              Giao dịch & <span className="mp-title-accent">Chữ ký số</span>
            </h1>
            <p className="mp-subtitle">
              Ký, phát tán và xác minh giao dịch ngay trong trình duyệt — không máy chủ, không thư viện ngoài.
            </p>
          </div>

          <div className="mp-status-badge">
            <span className="mp-green-dot">●</span>
            <span className="mp-status-strong">Testnet</span>
            <span className="mp-sep">·</span>
            <span className="mp-status-muted">secp256k1</span>
            <span className="mp-sep">·</span>
            <span className="mp-status-muted">SHA-256</span>
            <span className="mp-sep">·</span>
            <span className="mp-status-muted">PoW</span>
          </div>
        </div>

        <div className="mp-stats-grid">
          <div className="mp-stat-card">
            <div className="mp-stat-label">SỐ DƯ</div>
            <div className="mp-stat-value-wrap">
              <span className="mp-stat-value mp-stat-orange">{amt(myBalance, 4)}</span>
            </div>
          </div>

          <div className="mp-stat-card">
            <div className="mp-stat-label">CHIỀU CAO</div>
            <div className="mp-stat-value-wrap">
              <span className="mp-stat-value">#{blockHeight}</span>
            </div>
          </div>

          <div className="mp-stat-card">
            <div className="mp-stat-label">GIAO DỊCH</div>
            <div className="mp-stat-value-wrap">
              <span className="mp-stat-value">{totalTransactions}</span>
            </div>
          </div>

          <div className="mp-stat-card">
            <div className="mp-stat-label">GIÁ TRỊ LUÂN CHUYỂN</div>
            <div className="mp-stat-value-wrap">
              <span className="mp-stat-value">{amt(totalVolume, 2)}</span>
            </div>
          </div>

          <div className="mp-stat-card">
            <div className="mp-stat-label">CHỜ XÁC NHẬN</div>
            <div className="mp-stat-value-wrap">
              <span className="mp-stat-value mp-stat-orange">{mempoolList.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mp-main-grid">
        <div className="mp-col">
          {/* WALLET CARD */}
          <div className="mp-card">
            <div className="mp-row-between">
              <div className="mp-row-gap">
                <span className="mp-emoji-lg">🦊</span>
                <div>
                  <div className="mp-card-subtitle">VÍ CỦA TÔI</div>
                  <div className="mp-addr-chip" onClick={() => copyToClipboard(me.addr)}>
                    {shortAddr(me.addr)} <span className="mp-chip-icon">📋</span>
                  </div>
                </div>
              </div>

              <button onClick={handleRefreshWallet} className="mp-icon-btn" title="Đổi ID & làm mới sổ cái">
                🔄
              </button>
            </div>

            <div className="mp-balance-big">{amt(myBalance)}</div>

            <button onClick={() => setShowPem(!showPem)} className="mp-pem-accordion">
              🔑 Khóa & định dạng PEM <span className="mp-float-right">{showPem ? '▲' : '▼'}</span>
            </button>

            {showPem && (
              <div className="mp-pem-section">
                <div className="mp-formula-box">
                  <span className="mp-formula-accent">Q = d · G</span>
                  <span className="mp-formula-muted">secp256k1 · y² = x³ + 7</span>
                </div>

                <div className="mp-mt-12">
                  <div className="mp-row-between mp-mb-4">
                    <span className="mp-pem-title">KHOÁ RIÊNG · 256 BIT</span>
                    <button onClick={() => setHidePrivateKey(!hidePrivateKey)} className="mp-small-text-btn">
                      🙈 {hidePrivateKey ? 'Hiện' : 'Ẩn'}
                    </button>
                  </div>
                  <div className="mp-key-box mp-key-private">
                    {hidePrivateKey ? '•'.repeat(64) : me.privateKey}
                  </div>
                  <div className="mp-warning-text">
                    Ai cầm chuỗi này là nắm toàn quyền với ví.
                  </div>
                </div>

                <div className="mp-mt-12">
                  <div className="mp-row-between mp-mb-4">
                    <span className="mp-pem-title">KHOÁ CÔNG KHẢI · 04 + X + Y</span>
                    <button onClick={() => copyToClipboard(me.publicKey)} className="mp-small-text-btn">📋</button>
                  </div>
                  <div className="mp-key-box mp-key-public">{me.publicKey}</div>
                </div>

                <div className="mp-grid-2 mp-mt-12">
                  <div>
                    <div className="mp-row-between mp-mb-4">
                      <span className="mp-pem-title">DẠNG NÉN</span>
                      <button onClick={() => copyToClipboard('02' + me.publicKey.slice(2, 66))} className="mp-small-text-btn">📋</button>
                    </div>
                    <div className="mp-key-box">02{me.publicKey.slice(2, 66)}</div>
                  </div>
                  <div>
                    <div className="mp-row-between mp-mb-4">
                      <span className="mp-pem-title">ĐỊA CHỈ · SHA-256</span>
                      <button onClick={() => copyToClipboard(me.addr)} className="mp-small-text-btn">📋</button>
                    </div>
                    <div className="mp-key-box mp-key-public">{me.addr}</div>
                  </div>
                </div>

                <div className="mp-grid-2 mp-mt-12">
                  <div>
                    <div className="mp-row-between mp-mb-4">
                      <span className="mp-pem-title">PEM · PKCS#8</span>
                      <button onClick={() => copyToClipboard(toPem(me.privateKey, true))} className="mp-small-text-btn">📋</button>
                    </div>
                    <pre className="mp-pem-box">{toPem(me.privateKey, true)}</pre>
                    <div className="mp-pem-bar" style={{ width: '40%' }}></div>
                  </div>
                  <div>
                    <div className="mp-row-between mp-mb-4">
                      <span className="mp-pem-title">PEM · X.509</span>
                      <button onClick={() => copyToClipboard(toPem(me.publicKey, false))} className="mp-small-text-btn">📋</button>
                    </div>
                    <pre className="mp-pem-box">{toPem(me.publicKey, false)}</pre>
                    <div className="mp-pem-bar" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SEND/RECEIVE CARD */}
          <div className="mp-card">
            <div className="mp-tabs">
              <button
                onClick={() => setActiveTab('send')}
                className={`mp-tab ${activeTab === 'send' ? 'active' : ''}`}
              >
                ↗ Gửi
              </button>
              <button
                onClick={() => setActiveTab('receive')}
                className={`mp-tab ${activeTab === 'receive' ? 'active' : ''}`}
              >
                ↙ Nhận
              </button>
            </div>

            {activeTab === 'send' && (
              <div>
                {errorMessage && <div className="mp-error-box">⚠️ {errorMessage}</div>}
                {serverError && <div className="mp-error-box">⚠️ Đồng bộ node: {serverError}</div>}

                <div className="mp-mb-14">
                  <label className="mp-label">NGƯỜI NHẬN</label>
                  <div className="mp-user-grid">
                    {otherAccounts.map((acc) => (
                      <button
                        key={acc.addr}
                        onClick={() => setSelectedTo(acc.addr)}
                        className={`mp-user-btn ${selectedTo === acc.addr ? 'active' : ''}`}
                      >
                        <div className="mp-user-emoji">{acc.emoji}</div>
                        <div className="mp-user-name">{acc.key}</div>
                        <div className="mp-user-balance">{amt(calculateBalance(acc.addr), 2)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mp-mb-14">
                  <div className="mp-row-between mp-mb-4">
                    <label className="mp-label">SỐ TIỀN</label>
                    <button
                      onClick={() => setAmount(amt(Math.max(0, availableBalance - currentFee)))}
                      className="mp-max-btn"
                    >
                      Tối đa
                    </button>
                  </div>
                  <input
                    type="number"
                    placeholder="0.0000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mp-input"
                  />
                </div>

                <div className="mp-mb-14">
                  <label className="mp-label">PHÍ GIAO DỊCH</label>
                  <div className="mp-fee-grid">
                    {[
                      { key: 'slow', label: 'Chậm', val: '0.0001' },
                      { key: 'std', label: 'Thường', val: '0.0005' },
                      { key: 'fast', label: 'Nhanh', val: '0.0020' }
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFeeType(f.key)}
                        className={`mp-fee-btn ${feeType === f.key ? 'active' : ''}`}
                      >
                        <div className="mp-fee-label">{f.label}</div>
                        <div className="mp-fee-val">{f.val}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mp-mb-14">
                  <label className="mp-label">GHI CHÚ</label>
                  <input
                    type="text"
                    placeholder="Không bắt buộc"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mp-input"
                  />
                </div>

                <div className="mp-remaining-hint">
                  Trừ {currentFee} · còn {amt(Math.max(0, remainingAfterTx))}
                </div>

                <button onClick={handleSend} className="mp-primary-btn">
                  ✍️ Ký & Phát tán
                </button>
              </div>
            )}

            {activeTab === 'receive' && (
              <div>
                <div className="mp-receive-row">
                  <div className="mp-pattern-grid">
                    {patternColors.map((color, idx) => (
                      <div key={idx} className="mp-pattern-cell" style={{ backgroundColor: color }} />
                    ))}
                  </div>

                  <div className="mp-receive-info">
                    <div className="mp-receive-label">ĐỊA CHỈ VÍ</div>
                    <div className="mp-addr-display">{me.addr}</div>
                  </div>
                </div>

                <p className="mp-receive-desc">
                  Hoa văn bên cạnh sinh từ chính hash địa chỉ — nhìn là nhận ra ví, khỏi dò từng ký tự.
                </p>

                <button onClick={() => copyToClipboard(me.addr)} className="mp-copy-btn">
                  📋 Chép địa chỉ
                </button>
              </div>
            )}
          </div>

          {/* SIGNATURE DETAILS */}
          {lastSignatureDetails && (
            <div className="mp-card">
              <div className="mp-row-between mp-mb-10">
                <span className="mp-sig-success">✓ Chữ ký vừa tạo</span>
                <span className="mp-der-badge">71 byte · DER</span>
              </div>

              <div className="mp-grid-2 mp-mb-8">
                <div>
                  <div className="mp-row-between mp-mb-2">
                    <span className="mp-pem-title">Z = SHA-256(TX)</span>
                    <button onClick={() => copyToClipboard(lastSignatureDetails.zHash)} className="mp-small-text-btn">📋</button>
                  </div>
                  <div className="mp-key-box">{lastSignatureDetails.zHash.slice(0, 32)}...</div>
                </div>
                <div>
                  <div className="mp-row-between mp-mb-2">
                    <span className="mp-pem-title">K · DÙNG MỘT LẦN</span>
                    <button onClick={() => copyToClipboard(lastSignatureDetails.kNonce)} className="mp-small-text-btn">📋</button>
                  </div>
                  <div className="mp-key-box mp-key-private">{lastSignatureDetails.kNonce.slice(0, 32)}...</div>
                </div>
              </div>

              <div className="mp-grid-2 mp-mb-8">
                <div>
                  <div className="mp-row-between mp-mb-2">
                    <span className="mp-pem-title">R</span>
                    <button onClick={() => copyToClipboard(lastSignatureDetails.r)} className="mp-small-text-btn">📋</button>
                  </div>
                  <div className="mp-key-box">{lastSignatureDetails.r.slice(0, 32)}...</div>
                </div>
                <div>
                  <div className="mp-row-between mp-mb-2">
                    <span className="mp-pem-title">S</span>
                    <button onClick={() => copyToClipboard(lastSignatureDetails.s)} className="mp-small-text-btn">📋</button>
                  </div>
                  <div className="mp-key-box">{lastSignatureDetails.s.slice(0, 32)}...</div>
                </div>
              </div>

              <div>
                <div className="mp-row-between mp-mb-2">
                  <span className="mp-pem-title">CHỮ KÝ DER</span>
                  <button onClick={() => copyToClipboard(lastSignatureDetails.derSig)} className="mp-small-text-btn">📋</button>
                </div>
                <div className="mp-key-box mp-key-public">{lastSignatureDetails.derSig}</div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="mp-col">
          {/* MEMPOOL */}
          <div className="mp-card">
            <div className="mp-row-between mp-mb-12">
              <div className="mp-row-gap">
                <span className="mp-pulse-dot"></span>
                <span className="mp-section-title">Mempool</span>
                <span className="mp-count-badge">{mempoolList.length}</span>
              </div>
              <button
                onClick={handleMine}
                disabled={mempoolList.length === 0}
                className="mp-mine-btn"
              >
                ⛏ Đào khối
              </button>
            </div>

            {mempoolList.length === 0 ? (
              <div className="mp-empty-box">Mempool trống. Hãy tạo giao dịch mới!</div>
            ) : (
              <div className="mp-tx-list">
                {mempoolList.map((tx, idx) => (
                  <div key={idx} className="mp-tx-row">
                    <div className="mp-row-between">
                      <div>
                        <span className="mp-tx-name">Ví của tôi</span>
                        <span className="mp-tx-arrow">→</span>
                        <span className="mp-tx-name">{getAccountName(tx.to)}</span>
                        <div className="mp-tx-meta">
                          {shortAddr(tx.from)}... · Phí {tx.fee}
                        </div>
                      </div>
                      <div className="mp-row-gap-sm">
                        <span className="mp-status-badge mp-status-pending">Đang chờ</span>
                        <div className="mp-tx-amount-out">-{amt(tx.amount)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LEDGER */}
          <div className="mp-card">
            <div className="mp-row-between mp-mb-14">
              <div className="mp-row-gap">
                <span className="mp-section-title">Sổ cái</span>
                <span className="mp-chain-badge">✓ Chuỗi hợp lệ</span>
              </div>
            </div>

            <div className="mp-block-list">
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
                    <div key={blockIndex} className="mp-block-card">
                      <div onClick={() => toggleBlock(blockIndex)} className="mp-block-header">
                        <div className="mp-row-gap">
                          <span className="mp-block-badge">#{blockIndex}</span>
                          <div>
                            <div className="mp-block-hash">
                              {block.hash ? `${block.hash.slice(0, 28)}...` : 'N/A'}
                            </div>
                            <div className="mp-block-txcount">
                              {block.transactions ? block.transactions.length : 0} giao dịch
                            </div>
                          </div>
                        </div>

                        <div className="mp-block-stats">
                          <div className="mp-block-stat">
                            <div className="mp-block-stat-label">TỔNG VOL</div>
                            <div className="mp-block-stat-value">{amt(totalBlockVol, 2)}</div>
                          </div>

                          <div className="mp-block-stat">
                            <div className="mp-block-stat-label">VÍ CỦA TÔI</div>
                            <div className={`mp-block-stat-value ${myBlockChange > 0 ? 'positive' : myBlockChange < 0 ? 'negative' : ''}`}>
                              {myBlockChange > 0 ? `+${amt(myBlockChange, 4)}` : amt(myBlockChange, 4)}
                            </div>
                          </div>

                          <span className="mp-block-chevron">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mp-block-detail">
                          <div className="mp-block-meta-grid">
                            <div>
                              <span className="mp-meta-label">MERKLE ROOT</span>
                              <div className="mp-meta-val">{block.merkleRoot ? block.merkleRoot.slice(0, 18) + '...' : 'N/A'}</div>
                            </div>
                            <div>
                              <span className="mp-meta-label">HASH KHỐI TRƯỚC</span>
                              <div className="mp-meta-val">{block.prevHash ? block.prevHash.slice(0, 18) + '...' : (block.previousHash ? block.previousHash.slice(0, 18) + '...' : '0'.repeat(18) + '...')}</div>
                            </div>
                            <div>
                              <span className="mp-meta-label">NONCE</span>
                              <div className="mp-meta-val mp-meta-strong">{block.nonce ?? 0}</div>
                            </div>
                          </div>

                          <div className="mp-mini-tx-list">
                            {block.transactions && block.transactions.map((tx, tIdx) => (
                              <div key={tIdx} className="mp-mini-tx">
                                <div className="mp-row-between">
                                  <div>
                                    <span className="mp-tx-name">{getAccountName(tx.from)}</span>
                                    <span className="mp-tx-arrow">→</span>
                                    <span className="mp-tx-name">{getAccountName(tx.to)}</span>
                                    {tx.note && <span className="mp-tx-note">· {tx.note}</span>}
                                  </div>

                                  <div className="mp-row-gap-sm">
                                    <span className="mp-status-badge mp-status-packed">Đã đóng gói</span>
                                    {tx.type === 'Coinbase' ? (
                                      <span className="mp-reward-badge">↖ Thưởng khối</span>
                                    ) : (
                                      <span className="mp-ecdsa-badge">✓ ECDSA</span>
                                    )}
                                    <span className={tx.type === 'Coinbase' ? 'mp-amount-reward' : tx.from === me.addr ? 'mp-amount-out' : 'mp-amount-in'}>
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
