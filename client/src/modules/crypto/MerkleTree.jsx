import React, { useState } from 'react';

// Hàm băm SHA-256 dùng Web Crypto API
const sha256 = async (d) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(d));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export default function MerkleTree() {
  const [rawTx, setRawTx] = useState('tx1, tx2, tx3, tx4');
  const [txList, setTxList] = useState([]);
  const [root, setRoot] = useState('');
  const [reqTx, setReqTx] = useState('');
  const [proof, setProof] = useState(null);
  const [verTx, setVerTx] = useState('');
  const [result, setResult] = useState(null);

  // Dựng Merkle Root đệ quy
  const buildRoot = async (layer) => {
    if (!layer.length) return '';
    if (layer.length === 1) return layer[0];
    if (layer.length % 2) layer.push(layer[layer.length - 1]);
    const next = [];
    for (let i = 0; i < layer.length; i += 2) next.push(await sha256(layer[i] + layer[i + 1]));
    return buildRoot(next);
  };

  // 1. Full Node: Đóng gói Block
  const handleBuild = async () => {
    const list = rawTx.split(',').map((t) => t.trim()).filter(Boolean);
    if (!list.length) return;
    setTxList(list);
    const leaves = await Promise.all(list.map(sha256));
    setRoot(await buildRoot(leaves));
    setProof(null); setResult(null);
  };

  // 2. Full Node: Tự tìm index & Tạo Proof
  const handleProof = async () => {
    let idx = txList.indexOf(reqTx.trim());
    if (idx === -1) return alert(`"${reqTx}" không có trong Block!`);
    
    let layer = await Promise.all(txList.map(sha256)), p = [];
    while (layer.length > 1) {
      if (layer.length % 2) layer.push(layer[layer.length - 1]);
      const isRight = idx % 2 === 0;
      p.push({ hash: layer[isRight ? idx + 1 : idx - 1] || layer[idx], isLeft: !isRight });
      idx = Math.floor(idx / 2);
      const next = [];
      for (let i = 0; i < layer.length; i += 2) next.push(await sha256(layer[i] + layer[i + 1]));
      layer = next;
    }
    setProof(p); setVerTx(reqTx.trim()); setResult(null);
  };

  // 3. Light Client: Xác minh Proof
  const handleVerify = async () => {
    let cur = await sha256(verTx.trim());
    for (const p of proof) cur = await sha256(p.isLeft ? p.hash + cur : cur + p.hash);
    setResult(cur === root);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', fontFamily: 'sans-serif', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Mô Phỏng Merkle Tree (React)</h3>

      {/* Bước 1 */}
      <div style={{ marginBottom: '15px' }}>
        <input style={{ width: '70%', padding: '6px' }} value={rawTx} onChange={(e) => setRawTx(e.target.value)} />
        <button style={{ padding: '6px 12px', marginLeft: '8px' }} onClick={handleBuild}>Tạo Block</button>
      </div>
      {root && <p style={{ wordBreak: 'break-all', fontSize: '12px', background: '#f0f0f0', padding: '6px' }}><b>Root:</b> {root}</p>}

      {/* Bước 2 */}
      {root && (
        <div style={{ margin: '15px 0' }}>
          <input style={{ width: '70%', padding: '6px' }} placeholder="Nhập TxID xin Proof" value={reqTx} onChange={(e) => setReqTx(e.target.value)} />
          <button style={{ padding: '6px 12px', marginLeft: '8px' }} onClick={handleProof}>Xin Proof</button>
        </div>
      )}

      {/* Bước 3 */}
      {proof && (
        <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <p>Xác minh Light Client (sửa dữ liệu để test <code>false</code>):</p>
          <input style={{ width: '70%', padding: '6px' }} value={verTx} onChange={(e) => setVerTx(e.target.value)} />
          <button style={{ padding: '6px 12px', marginLeft: '8px' }} onClick={handleVerify}>Xác Minh</button>
          
          {result !== null && (
            <h4 style={{ color: result ? 'green' : 'red', marginTop: '10px' }}>
              {result ? ' XÁC MINH THÀNH CÔNG (true)' : 'XÁC MINH THẤT BẠI (false)'}
            </h4>
          )}
        </div>
      )}
    </div>
  );
}