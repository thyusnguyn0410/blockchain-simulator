import React, { useState, useEffect } from 'react';
import { calculateSHA256, formatHashFormatted, checkAvalancheEffect, bruteforceHash } from './SHA-256.js';

export default function Sha256Visualizer() {
  // 1. STATE LƯU TRỮ DỮ LIỆU INPUT
  const [shaInput, setShaInput] = useState('Hello Blockchain');
  const [shaResult, setShaResult] = useState('');
  const [i1, setI1] = useState('HanTruong');
  const [i2, setI2] = useState('TruongHan');
  const [av, setAv] = useState(null);
  const [powData, setPowData] = useState('Block #1 Data');
  const [prefix, setPrefix] = useState('0000');
  const [pow, setPow] = useState(null);
  const [mining, setMining] = useState(false);

  // 2. TỰ ĐỘNG TÍNH TOÁN REALTIME KHI INPUT THAY ĐỔI
  useEffect(() => setShaResult(calculateSHA256(shaInput)), [shaInput]);
  useEffect(() => { if (i1 && i2) setAv(checkAvalancheEffect(i1, i2)); }, [i1, i2]);

  // Xử lý đào Proof of Work
  const handleMine = () => {
    setMining(true); setPow(null);
    setTimeout(() => { setPow(bruteforceHash(powData, prefix)); setMining(false); }, 50);
  };

  // 3. COMPONENT CON HIỂN THỊ KHỐI HASH 4x4
  const HashBlock = ({ label, hash }) => (
    <div>
      {label && <strong>{label}:</strong>}
      <pre style={{ fontFamily: 'monospace', color: '#8e44ad', bg: '#eef2f5', padding: '6px', borderRadius: '4px', margin: '4px 0' }}>
        {formatHashFormatted(hash)}
      </pre>
    </div>
  );

  // 4. GIAO DIỆN CHÍNH (JSX)
  return (
    <div style={{ padding: '15px', fontFamily: 'Arial, sans-serif', maxWidth: '750px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50' }}>🔐 SHA-256 Visualizer</h2>

      {/* MỤC 1: TÍNH SHA-256 REALTIME */}
      <div style={card}>
        <h3>1. Tính mã băm SHA-256 (Realtime)</h3>
        <input type="text" value={shaInput} onChange={e => setShaInput(e.target.value)} style={inp} placeholder="Nhập văn bản..." />
        <div style={box}><HashBlock label="Kết quả (Khối 4x4)" hash={shaResult} /></div>
      </div>

      {/* MỤC 2: HIỆU ỨNG THÁC ĐỔ (AVALANCHE EFFECT) */}
      <div style={card}>
        <h3>2. Hiệu ứng Thác đổ (Avalanche Effect)</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="text" value={i1} onChange={e => setI1(e.target.value)} style={inp} />
          <input type="text" value={i2} onChange={e => setI2(e.target.value)} style={inp} />
        </div>
        {av && (
          <div style={box}>
            <HashBlock label="Hash 1" hash={av.hash1} />
            <HashBlock label="Hash 2" hash={av.hash2} />
            <p style={{ margin: '5px 0' }}>Khác biệt: <b>{av.differentBits}/256 bits</b> <span style={{ color: '#e74c3c' }}>({av.percentageChange})</span></p>
          </div>
        )}
      </div>

      {/* MỤC 3: PROOF OF WORK (MINING) */}
      <div style={card}>
        <h3>3. Khai thác Block (Proof of Work)</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <input type="text" value={powData} onChange={e => setPowData(e.target.value)} style={{ ...inp, flex: 2 }} placeholder="Data" />
          <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Độ khó" />
        </div>
        <button onClick={handleMine} disabled={mining} style={{ ...btn, bg: mining ? '#95a5a6' : '#2980b9' }}>
          {mining ? '⏳ Đang đào...' : '⛏️ Chạy Proof of Work'}
        </button>
        {pow && (
          <div style={box}>
            <p style={{ margin: '2px 0' }}>Nonce: <b style={{ color: '#d35400' }}>{pow.nonce}</b> | Thời gian: {pow.timeTakenSeconds}</p>
            <HashBlock label="Hash hợp lệ" hash={pow.hash} />
          </div>
        )}
      </div>
    </div>
  );
}

// 5. STYLES TỐI GIẢN
const card = { bg: '#fff', padding: '12px', borderRadius: '6px', boxShadow: '0 1px 5px rgba(0,0,0,0.1)', marginBottom: '12px' };
const inp = { width: '100%', padding: '7px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const btn = { color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' };
const box = { bg: '#f8f9fa', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #3498db', marginTop: '8px', fontSize: '13px' };