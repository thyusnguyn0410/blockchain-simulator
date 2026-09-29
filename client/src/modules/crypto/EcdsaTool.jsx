import { useState } from 'react';
import { canonicalize, createSignedTransaction, generateKeyPair, getAddressFromPublicKey, verifySignature } from './ECDSA.js';

export default function EcdsaTool() {
  const [keys, setKeys] = useState(() => generateKeyPair());
  const [to, setTo] = useState('b'.repeat(40));
  const [amount, setAmount] = useState('2.5');
  const [nonce, setNonce] = useState('0');
  const [signed, setSigned] = useState(null);
  const [editedAmount, setEditedAmount] = useState('');
  const [nodeUrl, setNodeUrl] = useState('http://localhost:3001');
  const [nodeMessage, setNodeMessage] = useState(null);
  const [nodeBusy, setNodeBusy] = useState(false);

  const sign = () => {
    try {
      const tx = createSignedTransaction(keys.privateKey, { to, amount, nonce });
      setSigned(tx);
      setEditedAmount(String(tx.amount));
    } catch (error) {
      setSigned(null);
      window.alert(error.message);
    }
  };
  const signatureValid = signed && verifySignature(
    signed.publicKey,
    canonicalize({ amount: Number(editedAmount), from: signed.from, nonce: signed.nonce, to: signed.to }),
    signed.signature,
  );
  const fundWallet = async () => {
    setNodeBusy(true);
    setNodeMessage(null);
    try {
      const response = await fetch(`${nodeUrl.replace(/\/$/, '')}/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: getAddressFromPublicKey(keys.publicKey), amount: 100 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      setNodeMessage({ ok: true, text: `Faucet demo đã cấp 100 coin · số dư ${result.balance}.` });
    } catch (error) {
      setNodeMessage({ ok: false, text: `Không thể cấp coin: ${error.message}` });
    } finally {
      setNodeBusy(false);
    }
  };
  const submitTransaction = async () => {
    if (!signed || !signatureValid) return;
    setNodeBusy(true);
    setNodeMessage(null);
    try {
      const response = await fetch(`${nodeUrl.replace(/\/$/, '')}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signed),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      setNodeMessage({ ok: true, text: `Giao dịch ${result.transaction.id.slice(0, 16)}… đã vào mempool node (${result.mempoolSize}).` });
    } catch (error) {
      setNodeMessage({ ok: false, text: `Node từ chối giao dịch: ${error.message}` });
    } finally {
      setNodeBusy(false);
    }
  };

  return (
    <div className="module-stack">
      <section className="glass-panel">
        <div className="panel-heading"><div><h2>Ví demo secp256k1</h2><p>Khóa được tạo ngay trong trình duyệt; không gửi private key lên node.</p></div><button className="outline-button" type="button" onClick={() => { setKeys(generateKeyPair()); setSigned(null); }}>Tạo ví mới</button></div>
        <div className="key-grid"><div><span className="field-label">Địa chỉ (SHA-256 rút gọn)</span><code className="hash-value">{getAddressFromPublicKey(keys.publicKey)}</code></div><div><span className="field-label">Public key</span><code className="hash-value">{keys.publicKey}</code></div></div>
        <p className="notice notice-warn">Private key chỉ nằm trong bộ nhớ của tab này. Đây là khóa demo, không dùng với tài sản thật.</p>
      </section>
      <section className="glass-panel">
        <div className="panel-heading"><div><h2>Ký giao dịch & kiểm tra chữ ký</h2><p>Sửa số tiền sau khi ký để quan sát chữ ký không còn khớp.</p></div><span className="tag tag-purple">ECDSA</span></div>
        <div className="three-column">
          <label className="field-label">Địa chỉ nhận<input className="text-input" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <label className="field-label">Số lượng<input className="text-input" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label className="field-label">Nonce<input className="text-input" type="number" min="0" step="1" value={nonce} onChange={(event) => setNonce(event.target.value)} /></label>
        </div>
        <button className="primary-button" type="button" onClick={sign}>Ký giao dịch</button>
        {signed && <div className="signed-box"><div className="two-column"><div><span className="field-label">Số lượng đã ký</span><code className="hash-value">{signed.amount}</code></div><label className="field-label">Số lượng sau chỉnh sửa<input className="text-input" type="number" value={editedAmount} onChange={(event) => setEditedAmount(event.target.value)} /></label></div><div><span className="field-label">Chữ ký DER</span><code className="hash-value">{signed.signature}</code></div><p className={`notice ${signatureValid ? 'notice-ok' : 'notice-danger'}`}>{signatureValid ? '✓ Chữ ký hợp lệ — dữ liệu chưa bị thay đổi.' : '✕ Chữ ký không hợp lệ — số tiền đã thay đổi sau khi ký.'}</p><button type="button" className="outline-button" onClick={() => setEditedAmount(String(signed.amount))}>Khôi phục số tiền đã ký</button></div>}
        <div className="node-submit">
          <label className="field-label">Node REST<input className="text-input mono" value={nodeUrl} onChange={(event) => setNodeUrl(event.target.value)} /></label>
          <div className="connection-actions"><button type="button" className="outline-button" disabled={nodeBusy} onClick={fundWallet}>Cấp 100 coin demo</button><button type="button" className="primary-button" disabled={nodeBusy || !signatureValid} onClick={submitTransaction}>Gửi giao dịch đã ký tới mempool</button></div>
        </div>
        {nodeMessage && <p className={`notice ${nodeMessage.ok ? 'notice-ok' : 'notice-danger'}`}>{nodeMessage.text}</p>}
      </section>
    </div>
  );
}
