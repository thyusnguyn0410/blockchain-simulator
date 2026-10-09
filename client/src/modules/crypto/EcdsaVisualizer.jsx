import { useState } from "react";
import {
  generateKeyPair,
  getPublicKeyFromPrivate,
  isValidPublicKey,
  signMessage,
  verifySignature,
} from "./ECDSA.js";

export default function EcdsaVisualizer() {
  const [privKey, setPrivKey] = useState("");
  const [pubKey, setPubKey] = useState("");
  const [userMsg, setUserMsg] = useState("");
  const [sig, setSig] = useState("");
  const [testPriv, setTestPriv] = useState("");
  const [customPub, setCustomPub] = useState("");
  const [result, setResult] = useState(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showTestKey, setShowTestKey] = useState(false);

  const resetVerify = () => {
    setSig("");
    setResult(null);
  };

  const handleGenKeys = () => {
    const keys = generateKeyPair();
    setPrivKey(keys.privateKey);
    setPubKey(keys.publicKey);
    resetVerify();
  };

  const handlePrivChange = (event) => {
    const value = event.target.value.trim();
    setPrivKey(value);
    setPubKey(value ? getPublicKeyFromPrivate(value) || "Private Key không hợp lệ!" : "");
    resetVerify();
  };

  const handleSign = () => {
    if (!privKey || !userMsg.trim()) return alert("Vui lòng nhập Private Key và Thông điệp!");
    const signature = signMessage(privKey, userMsg);
    signature ? (setSig(signature), setResult(null)) : alert("Ký thất bại! Kiểm tra lại Private Key.");
  };

  const handleVerify = () => {
    if (!userMsg.trim() || !sig) return alert("Vui lòng nhập thông điệp và ký trước!");
    const publicKeyToTest = customPub.trim() || getPublicKeyFromPrivate(testPriv.trim() || privKey);
    if (!publicKeyToTest || !isValidPublicKey(publicKeyToTest)) {
      return alert("Khóa dùng để kiểm tra không hợp lệ!");
    }
    setResult(verifySignature(publicKeyToTest, userMsg, sig));
  };

  return (
    <div className="ecdsa-visualizer">
      <div className="ecdsa-intro">
        <span className="ecdsa-kicker">CHỮ KÝ SỐ / SECP256K1</span>
        <p>
          Private Key ký dữ liệu; Public Key giúp các node xác minh nguồn gốc và tính toàn vẹn
          của thông điệp.
        </p>
      </div>

      <section className="ecdsa-step" aria-labelledby="ecdsa-key-title">
        <div className="ecdsa-step-heading">
          <span className="ecdsa-step-number">01</span>
          <div>
            <h3 id="ecdsa-key-title">Tạo khóa</h3>
            <p>Tạo cặp khóa mới hoặc nhập private key để suy ra public key.</p>
          </div>
        </div>
        <button className="ui-button outline-button" type="button" onClick={handleGenKeys}>
          Tạo cặp khóa ngẫu nhiên
        </button>
        <label className="ecdsa-label" htmlFor="ecdsa-private-key">Private Key</label>
        <div className="ecdsa-secret-field">
          <input
            id="ecdsa-private-key"
            className="ecdsa-input ecdsa-mono"
            type={showPrivateKey ? "text" : "password"}
            value={privKey}
            onChange={handlePrivChange}
            placeholder="Nhập private key hex (64 ký tự)"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            className="ecdsa-visibility-button"
            type="button"
            onClick={() => setShowPrivateKey((visible) => !visible)}
            aria-label={showPrivateKey ? "Ẩn Private Key" : "Hiện Private Key"}
          >
            {showPrivateKey ? "Ẩn" : "Hiện"}
          </button>
        </div>
        <label className="ecdsa-label" htmlFor="ecdsa-public-key">Public Key</label>
        <textarea
          id="ecdsa-public-key"
          className="ecdsa-input ecdsa-mono"
          value={pubKey}
          readOnly
          rows={2}
          placeholder="Public key sẽ xuất hiện sau khi tạo khóa"
        />
      </section>

      <section className="ecdsa-step" aria-labelledby="ecdsa-sign-title">
        <div className="ecdsa-step-heading">
          <span className="ecdsa-step-number">02</span>
          <div>
            <h3 id="ecdsa-sign-title">Ký thông điệp</h3>
            <p>Ký nội dung bằng Private Key. Thay đổi dù chỉ một ký tự sẽ làm chữ ký mất hiệu lực.</p>
          </div>
        </div>
        <label className="ecdsa-label" htmlFor="ecdsa-message">Thông điệp</label>
        <textarea
          id="ecdsa-message"
          className="ecdsa-input"
          value={userMsg}
          onChange={(event) => {
            setUserMsg(event.target.value);
            resetVerify();
          }}
          placeholder="Nhập nội dung cần ký"
          rows={3}
        />
        <button className="ui-button primary-button" type="button" onClick={handleSign}>
          ✍ Ký thông điệp
        </button>
        {sig && (
          <div className="ecdsa-output">
            <span className="ecdsa-label">Chữ ký số (DER Hex)</span>
            <code className="ecdsa-code">{sig}</code>
          </div>
        )}
      </section>

      <section className="ecdsa-step" aria-labelledby="ecdsa-verify-title">
        <div className="ecdsa-step-heading">
          <span className="ecdsa-step-number">03</span>
          <div>
            <h3 id="ecdsa-verify-title">Xác minh chữ ký</h3>
            <p>Đối chiếu bằng Public Key để xác nhận người gửi và nội dung không bị thay đổi.</p>
          </div>
        </div>
        <label className="ecdsa-label" htmlFor="ecdsa-test-private-key">
          Private Key đối chiếu (không bắt buộc)
        </label>
        <div className="ecdsa-secret-field">
          <input
            id="ecdsa-test-private-key"
            className="ecdsa-input ecdsa-mono"
            type={showTestKey ? "text" : "password"}
            value={testPriv}
            onChange={(event) => {
              setTestPriv(event.target.value);
              setResult(null);
            }}
            placeholder="Để trống để dùng khóa hiện tại"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            className="ecdsa-visibility-button"
            type="button"
            onClick={() => setShowTestKey((visible) => !visible)}
            aria-label={showTestKey ? "Ẩn Private Key đối chiếu" : "Hiện Private Key đối chiếu"}
          >
            {showTestKey ? "Ẩn" : "Hiện"}
          </button>
        </div>
        <label className="ecdsa-label" htmlFor="ecdsa-test-public-key">
          Hoặc Public Key đối chiếu
        </label>
        <input
          id="ecdsa-test-public-key"
          className="ecdsa-input ecdsa-mono"
          type="text"
          value={customPub}
          onChange={(event) => {
            setCustomPub(event.target.value);
            setResult(null);
          }}
          placeholder="Dán public key hex"
          autoComplete="off"
          spellCheck="false"
        />
        <button className="ui-button primary-button" type="button" onClick={handleVerify}>
          Xác minh chữ ký
        </button>
        {result !== null && (
          <div
            className={`ecdsa-verification ${result ? "valid" : "invalid"}`}
            role="status"
            aria-live="polite"
          >
            <span aria-hidden="true">{result ? "✓" : "!"}</span>
            <strong>{result ? "VALID · Chữ ký hợp lệ" : "INVALID · Chữ ký không hợp lệ"}</strong>
          </div>
        )}
      </section>
    </div>
  );
}
