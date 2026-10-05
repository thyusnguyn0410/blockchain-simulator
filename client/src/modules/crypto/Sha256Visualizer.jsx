import React, { useState, useEffect, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import {
  calculateSHA256,
  formatHashFormatted,
  checkAvalancheEffect,
  bruteforceHash,
} from './SHA-256.js';

// ============ TABS ============
const TABS = [
  { id: 'interact', label: 'Tương tác' },
  { id: 'length', label: 'Độ dài cố định' },
  { id: 'avalanche', label: 'Avalanche' },
  { id: 'explain', label: 'Giải thích' },
];

// ============ HASH BLOCK (4x4 grid of 4-char chunks) ============
function HashBlock({ hash, accent = '#a78bfa' }) {
  if (!hash) return <div className="sha256-hash-empty">—</div>;

  // Chia 64 ký tự thành 16 khối 4 ký tự
  const chunks = [];
  for (let i = 0; i < 64; i += 4) {
    chunks.push(hash.slice(i, i + 4));
  }

  return (
    <div className="sha256-hash-grid">
      {chunks.map((chunk, i) => (
        <span
          key={i}
          className="sha256-hash-chunk"
          style={{ color: accent }}
        >
          {chunk}
        </span>
      ))}
    </div>
  );
}

// ============ TAB: TƯƠNG TÁC ============
function TabInteract({ shaInput, setShaInput, shaResult }) {
  return (
    <>
      <div className="sha256-section">
        <div className="sha256-section-head">
          <h3>Trình tạo mã băm SHA-256</h3>
          <p>Nhập văn bản và xem mã băm SHA-256 cập nhật ngay tức thì</p>
        </div>

        <label className="sha256-label">VĂN BẢN ĐẦU VÀO</label>
        <textarea
          className="sha256-textarea"
          value={shaInput}
          onChange={(e) => setShaInput(e.target.value)}
          rows={3}
          placeholder="Nhập văn bản..."
        />

        <label className="sha256-label">
          MÃ BĂM SHA-256 ĐẦU RA
          <span className="sha256-meta">64/64 ký tự hex = 256 bits</span>
        </label>
        <div className="sha256-hash-box">
          <HashBlock hash={shaResult} />
        </div>

        <div className="sha256-info-row">
          <span>🔒 Một chiều</span>
          <span>📏 Cố định 256 bit</span>
          <span>⚡ Avalanche Effect</span>
        </div>
      </div>
    </>
  );
}

// ============ TAB: ĐỘ DÀI CỐ ĐỊNH ============
function TabLength({ shaInput, setShaInput, shaResult }) {
  const lengths = useMemo(() => {
    const samples = [
      { label: '1 ký tự', value: 'a' },
      { label: '10 ký tự', value: 'HelloWorld' },
      { label: '100 ký tự', value: 'a'.repeat(100) },
      { label: '1000 ký tự', value: 'a'.repeat(1000) },
    ];
    return samples.map((s) => ({
      ...s,
      hash: calculateSHA256(s.value),
      hashLength: calculateSHA256(s.value).length,
    }));
  }, []);

  return (
    <div className="sha256-section">
      <div className="sha256-section-head">
        <h3>Độ dài đầu ra cố định</h3>
        <p>Dù đầu vào dài ngắn khác nhau, SHA-256 luôn trả về 256 bit = 64 ký tự hex</p>
      </div>

      <div className="sha256-length-grid">
        {lengths.map((item) => (
          <div key={item.label} className="sha256-length-card">
            <div className="sha256-length-label">{item.label}</div>
            <div className="sha256-length-hash">{item.hash.slice(0, 32)}…</div>
            <div className="sha256-length-badge">{item.hashLength} ký tự hex</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ TAB: AVALANCHE ============
function TabAvalanche({ i1, setI1, i2, setI2, av }) {
  return (
    <div className="sha256-section">
      <div className="sha256-section-head">
        <h3>Hiệu ứng thác đổ (Avalanche Effect)</h3>
        <p>Đổi 1 ký tự → ~50% bit đầu ra thay đổi</p>
      </div>

      <div className="sha256-avalanche-inputs">
        <div>
          <label className="sha256-label">INPUT 1</label>
          <input
            className="sha256-input"
            value={i1}
            onChange={(e) => setI1(e.target.value)}
          />
        </div>
        <div>
          <label className="sha256-label">INPUT 2</label>
          <input
            className="sha256-input"
            value={i2}
            onChange={(e) => setI2(e.target.value)}
          />
        </div>
      </div>

      {av && (
        <>
          <div className="sha256-hash-compare">
            <div>
              <label className="sha256-label">HASH 1</label>
              <div className="sha256-hash-box small">
                <HashBlock hash={av.hash1} accent="#22d3ee" />
              </div>
            </div>
            <div>
              <label className="sha256-label">HASH 2</label>
              <div className="sha256-hash-box small">
                <HashBlock hash={av.hash2} accent="#f472b6" />
              </div>
            </div>
          </div>

          <div className="sha256-avalanche-stats">
            <div className="sha256-stat">
              <span>Số bit khác</span>
              <strong>{av.differentBits}/256</strong>
            </div>
            <div className="sha256-stat">
              <span>Tỷ lệ</span>
              <strong style={{ color: '#22d3ee' }}>{av.percentageChange}</strong>
            </div>
            <div className="sha256-stat">
              <span>Kỳ vọng</span>
              <strong>~50%</strong>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[
                { name: 'Giống nhau', bits: 256 - av.differentBits },
                { name: 'Khác nhau', bits: av.differentBits },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis domain={[0, 256]} stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid rgba(148,163,184,0.2)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                }}
              />
              <Bar dataKey="bits" radius={[8, 8, 0, 0]}>
                <Cell fill="#22d3ee" />
                <Cell fill="#f472b6" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}

// ============ TAB: GIẢI THÍCH ============
function TabExplain() {
  const questions = [
    {
      q: 'Vì sao output luôn 256 bit dù input khác độ dài?',
      a: 'SHA-256 dùng thuật toán nén: chia input thành các block 512 bit (padding), sau đó nén qua 64 vòng và luôn xuất ra 256 bit = 64 ký tự hex.',
    },
    {
      q: 'Vì sao Hash ≠ Encryption?',
      a: 'Hash là hàm một chiều — không thể giải ngược từ output ra input. Encryption là hai chiều — có key để giải mã. Hash không cần key, encryption cần key.',
    },
    {
      q: 'Bruteforce phụ thuộc yếu tố nào?',
      a: 'Phụ thuộc: (1) độ dài input, (2) bảng ký tự (26 chữ cái vs 62 ký tự), (3) tốc độ tính hash của máy. Độ phức tạp tăng theo cấp số nhân.',
    },
    {
      q: 'Avalanche Effect là gì?',
      a: 'Thay đổi 1 ký tự trong input → ~50% bit trong output thay đổi (128/256 bit). Đây là tính chất quan trọng để chống tấn công dò đoán.',
    },
  ];

  return (
    <div className="sha256-section">
      <div className="sha256-section-head">
        <h3>Câu hỏi thảo luận P1</h3>
        <p>Các khái niệm cần hiểu rõ khi bảo vệ đồ án</p>
      </div>

      <div className="sha256-faq">
        {questions.map((item, i) => (
          <details key={i} className="sha256-faq-item">
            <summary>
              <span className="sha256-faq-num">Q{i + 1}</span>
              {item.q}
            </summary>
            <p className="sha256-faq-answer">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

// ============ COMPONENT CHÍNH ============
export default function Sha256Visualizer() {
  const [activeTab, setActiveTab] = useState('interact');

  // State
  const [shaInput, setShaInput] = useState('Hello, World!');
  const [shaResult, setShaResult] = useState('');
  const [i1, setI1] = useState('HanTruong');
  const [i2, setI2] = useState('TruongHan');
  const [av, setAv] = useState(null);
  const [powData, setPowData] = useState('Block #1 Data');
  const [prefix, setPrefix] = useState('0000');
  const [pow, setPow] = useState(null);
  const [mining, setMining] = useState(false);

  useEffect(() => setShaResult(calculateSHA256(shaInput)), [shaInput]);
  useEffect(() => {
    if (i1 && i2) setAv(checkAvalancheEffect(i1, i2));
  }, [i1, i2]);

  const handleMine = () => {
    setMining(true);
    setPow(null);
    setTimeout(() => {
      setPow(bruteforceHash(powData, prefix));
      setMining(false);
    }, 50);
  };

  return (
    <div className="sha256-visualizer">
      {/* HEADER */}
      <div className="sha256-header">
        <span className="sha256-eyebrow">CRYPTOGRAPHY LAB</span>
        <h1>Mô Phỏng Hash SHA-256</h1>
        <p>Trình diễn tương tác các tính chất của hàm băm mật mã SHA-256</p>
      </div>

      {/* TABS */}
      <div className="sha256-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`sha256-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="sha256-content">
        {activeTab === 'interact' && (
          <TabInteract
            shaInput={shaInput}
            setShaInput={setShaInput}
            shaResult={shaResult}
          />
        )}
        {activeTab === 'length' && (
          <TabLength
            shaInput={shaInput}
            setShaInput={setShaInput}
            shaResult={shaResult}
          />
        )}
        {activeTab === 'avalanche' && (
          <TabAvalanche
            i1={i1}
            setI1={setI1}
            i2={i2}
            setI2={setI2}
            av={av}
          />
        )}
        {activeTab === 'explain' && <TabExplain />}
      </div>

      {/* PoW SECTION (hiển thị dưới mọi tab) */}
      <div className="sha256-section">
        <div className="sha256-section-head">
          <h3>Khai thác Block (Proof of Work)</h3>
          <p>Thử nonce tăng dần đến khi hash có prefix đúng độ khó</p>
        </div>

        <div className="sha256-pow-inputs">
          <input
            className="sha256-input"
            value={powData}
            onChange={(e) => setPowData(e.target.value)}
            placeholder="Data của block"
          />
          <input
            className="sha256-input small"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="Độ khó (VD: 0000)"
          />
          <button
            className="sha256-btn primary"
            onClick={handleMine}
            disabled={mining}
          >
            {mining ? '⏳ Đang đào...' : '⛏️ Chạy PoW'}
          </button>
        </div>

        {pow && (
          <div className="sha256-pow-result">
            <div className="sha256-pow-stats">
              <div className="sha256-stat">
                <span>Nonce tìm được</span>
                <strong>{pow.nonce}</strong>
              </div>
              <div className="sha256-stat">
                <span>Thời gian</span>
                <strong>{pow.timeTakenSeconds}s</strong>
              </div>
              <div className="sha256-stat">
                <span>Difficulty</span>
                <strong>{prefix.length} số 0</strong>
              </div>
            </div>
            <label className="sha256-label">HASH HỢP LỆ</label>
            <div className="sha256-hash-box">
              <HashBlock hash={pow.hash} accent="#34d399" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
