import { useState } from 'react';

export default function DoubleSpendingAttack() {
  const [balance, setBalance] = useState(10);
  const [amount, setAmount] = useState(7);
  const [resolved, setResolved] = useState(false);
  const [accepted, setAccepted] = useState(0);
  const submitBoth = () => {
    setAccepted(amount <= balance ? 1 : 0);
    setResolved(true);
  };
  return <section className="glass-panel"><div className="panel-heading"><div><h2>Double-spend</h2><p>Hai giao dịch cạnh tranh tiêu cùng một số dư; nonce và số dư đã xác nhận chặn giao dịch thứ hai.</p></div><span className="tag tag-red">ATTACK DEMO</span></div><div className="two-column"><label className="field-label">Số dư Alice<input className="text-input" type="number" min="0" value={balance} onChange={(event) => { setBalance(Number(event.target.value)); setResolved(false); }} /></label><label className="field-label">Mỗi lần gửi<input className="text-input" type="number" min="0" value={amount} onChange={(event) => { setAmount(Number(event.target.value)); setResolved(false); }} /></label></div><div className="attack-flow"><div className={`attack-tx ${resolved && accepted > 0 ? 'accepted' : ''}`}><b>TX-A</b><span>Alice → Bob</span><strong>{amount} coin</strong></div><span className="fork-mark">↙ ↘</span><div className={`attack-tx ${resolved && accepted > 1 ? 'accepted' : ''}`}><b>TX-B · double spend</b><span>Alice → Mallory</span><strong>{amount} coin</strong></div></div><button className="danger-button" type="button" onClick={submitBoth}>Đưa cả hai vào kiểm tra</button>{resolved && <p className={`notice ${accepted === 1 ? 'notice-ok' : 'notice-danger'}`}>{accepted === 1 ? 'TX-A được nhận trước; TX-B bị từ chối vì nonce trùng / số dư không đủ.' : 'Cả hai bị từ chối vì số dư không đủ.'} Chỉ giao dịch đầu tiên vượt qua kiểm tra được đưa vào mempool.</p>}</section>;
}
