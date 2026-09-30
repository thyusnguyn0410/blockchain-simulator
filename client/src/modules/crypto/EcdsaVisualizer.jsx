import React, { useState } from 'react';
import { generateKeyPair, getPublicKeyFromPrivate, isValidPublicKey, signMessage, verifySignature } from '../../ECDSA.js';

export default function EcdsaVisualizer() {
  // State lưu trữ thông tin: Private Key, Public Key, Thông điệp người dùng nhập, Chữ ký số, Khóa kiểm tra & Kết quả
  const [privKey, setPrivKey] = useState('');
  const [pubKey, setPubKey] = useState('');
  const [userMsg, setUserMsg] = useState('');
  const [sig, setSig] = useState('');
  const [testPriv, setTestPriv] = useState('');
  const [customPub, setCustomPub] = useState('');
  const [result, setResult] = useState(null);

  // Reset chữ ký & kết quả khi dữ liệu đầu vào thay đổi
  const resetVerify = () => { setSig(''); setResult(null); };

  // 1. Sinh khóa ngẫu nhiên
  const handleGenKeys = () => {
    const keys = generateKeyPair();
    setPrivKey(keys.privateKey);
    setPubKey(keys.publicKey);
    resetVerify();
  };

  // 2. Nhập/Sửa Private Key thủ công (Tự động trích xuất Public Key nếu Private Key hợp lệ)
  const handlePrivChange = (e) => {
    const val = e.target.value.trim();
    setPrivKey(val);
    setPubKey(val ? getPublicKeyFromPrivate(val) || 'Private Key không hợp lệ!' : '');
    resetVerify();
  };

  // 3. Ký Thông Điệp do người dùng tự gõ
  const handleSign = () => {
    if (!privKey || !userMsg.trim()) return alert('Vui lòng nhập Private Key và Thông điệp!');
    const signature = signMessage(privKey, userMsg);
    signature ? (setSig(signature), setResult(null)) : alert('Ký thất bại! Kiểm tra lại Private Key.');
  };

  // 4. Xác thực chữ ký số
  const handleVerify = () => {
    if (!userMsg.trim() || !sig) return alert('Vui lòng nhập thông điệp và ký trước!');
    // Lấy Public Key đối chiếu (Ưu tiên: Public Key tự dán -> Trích xuất từ Private Key kiểm tra -> Khóa ở Bước 1)
    const pubToTest = customPub.trim() || getPublicKeyFromPrivate(testPriv.trim() || privKey);

    if (!pubToTest || !isValidPublicKey(pubToTest)) return alert('Khóa dùng để kiểm tra không hợp lệ!');
    setResult(verifySignature(pubToTest, userMsg, sig));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '650px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50' }}>🔑 Mô Phỏng Chữ Ký Số ECDSA</h2>

      {/* BƯỚC 1: QUẢN LÝ KHÓA (Cho phép tự nhập hoặc sinh ngẫu nhiên) */}
      <div style={cardStyle}>
        <h3>1. Khởi Tạo / Nhập Khóa</h3>
        <button onClick={handleGenKeys} style={{ ...btnStyle, bg: '#27ae60' }}> Sinh Khóa Ngẫu Nhiên</button>
        <label style={lblStyle}>Private Key (Tự gõ/dán chuỗi Hex 64 ký tự vào đây):</label>
        <input type="text" value={privKey} onChange={handlePrivChange} placeholder="Nhập hoặc dán Private Key..." style={inputStyle} />
        <label style={lblStyle}>Public Key (Tự động tính từ Private Key):</label>
        <textarea value={pubKey} readOnly rows={2} style={{ ...inputStyle, fontFamily: 'monospace', bg: '#f8f9fa' }} />
      </div>

      {/* BƯỚC 2: TỰ TẠO THÔNG ĐIỆP & KÝ */}
      <div style={cardStyle}>
        <h3>2. Nhập Thông Điệp & Ký</h3>
        <label style={lblStyle}>Nội dung thông điệp (Tự do gõ nội dung bất kỳ):</label>
        <textarea value={userMsg} onChange={(e) => { setUserMsg(e.target.value); resetVerify(); }} placeholder="Gõ thông điệp của bạn..." rows={2} style={inputStyle} />
        <button onClick={handleSign} style={{ ...btnStyle, bg: '#2980b9', width: '100%', marginTop: '8px' }}>✍️ Ký Thông Điệp</button>
        {sig && <div style={boxStyle}><b>Chữ ký số (DER Hex):</b><div style={codeStyle}>{sig}</div></div>}
      </div>

      {/* BƯỚC 3: XÁC THỰC CHỮ KÝ */}
      <div style={cardStyle}>
        <h3>3. Kiểm Tra & Xác Thực</h3>
        <input type="text" value={testPriv} onChange={(e) => { setTestPriv(e.target.value); setResult(null); }} placeholder="Dán Private Key đối chiếu (hoặc để trống)..." style={inputStyle} />
        <input type="text" value={customPub} onChange={(e) => { setCustomPub(e.target.value); setResult(null); }} placeholder="Hoặc dán trực tiếp Public Key Hex đối chiếu..." style={{ ...inputStyle, marginTop: '6px' }} />
        <button onClick={handleVerify} style={{ ...btnStyle, bg: '#8e44ad', width: '100%', marginTop: '8px' }}>🔍 Xác Thực Chữ Ký</button>

        {result !== null && (
          <div style={{ ...boxStyle, borderLeftColor: result ? '#2ecc71' : '#e74c3c', bg: result ? '#e8f8f5' : '#fadbd8' }}>
            <b style={{ color: result ? '#27ae60' : '#c0392b' }}>
              {result ? 'CHỮ KÝ HỢP LỆ (Khóa chính xác & Dữ liệu nguyên vẹn)' : 'CHỮ KÝ KHÔNG HỢP LỆ'}
            </b>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline Styles tối ưu
const cardStyle = { background: '#fff', padding: '14px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', marginBottom: '12px' };
const lblStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', margin: '6px 0 2px' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const btnStyle = { color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: props => props.bg };
const boxStyle = { background: '#f8f9fa', padding: '8px', borderRadius: '4px', borderLeft: '4px solid #3498db', marginTop: '8px', fontSize: '13px' };
const codeStyle = { fontFamily: 'monospace', color: '#d35400', wordBreak: 'break-all', marginTop: '4px' };