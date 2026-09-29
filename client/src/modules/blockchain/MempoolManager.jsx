import { useState } from 'react';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import Table from '../../components/Table.jsx';

export default function MempoolManager({ transactions = [], onAdd = () => {}, onMine = () => {}, mining = false }) {
  const [from, setFrom] = useState('a'.repeat(40));
  const [to, setTo] = useState('b'.repeat(40));
  const [amount, setAmount] = useState('1.25');
  const [error, setError] = useState('');
  const columns = [
    {
      key: 'number',
      label: 'Giao dịch',
      render: (tx, index) => <span className="mono">{String(index + 1).padStart(2, '0')} · {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString() : 'demo'}</span>,
    },
    {
      key: 'addresses',
      label: 'Người gửi → nhận',
      render: (tx) => <span className="mono">{tx.from.slice(0, 8)}… → {tx.to.slice(0, 8)}…</span>,
    },
    { key: 'amount', label: 'Số lượng', render: (tx) => `${tx.amount} coin` },
    { key: 'nonce', label: 'Nonce' },
    { key: 'status', label: 'Trạng thái', render: () => <span className="tag tag-amber">Chờ xác thực</span> },
  ];

  const add = (event) => {
    event.preventDefault();
    if (!/^[0-9a-f]{40}$/i.test(from) || !/^[0-9a-f]{40}$/i.test(to)) return setError('Địa chỉ phải có 40 ký tự hex.');
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return setError('Số lượng phải lớn hơn 0.');
    if (from === to) return setError('Người gửi và nhận phải khác nhau.');
    setError('');
    onAdd({ from, to, amount: Number(amount), nonce: transactions.filter((tx) => tx.from === from).length, createdAt: new Date().toISOString() });
  };

  return (
    <div className="module-stack">
      <Card>
        <div className="panel-heading"><div><h2>Tạo giao dịch demo</h2><p>Node thật chỉ nhận giao dịch có chữ ký; form này minh họa hàng đợi trong trình duyệt.</p></div><span className="tag tag-amber">MEMPOOL</span></div>
        <form onSubmit={add} className="module-stack">
          <div className="two-column"><label className="field-label">Người gửi<input className="text-input mono" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="field-label">Người nhận<input className="text-input mono" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
          <div className="field-row"><label className="field-label">Số lượng<input className="text-input" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><Button type="submit">＋ Thêm vào mempool</Button></div>
        </form>
        {error && <p className="notice notice-danger">{error}</p>}
      </Card>
      <Card>
        <div className="panel-heading"><div><h2>Giao dịch đang chờ <span className="count-pill">{transactions.length}</span></h2><p>Kiểm tra định dạng · chữ ký · số dư · nonce · giao dịch trùng.</p></div><button className="primary-button" type="button" disabled={!transactions.length || mining} onClick={onMine}>{mining ? 'Đang đào…' : '⛏ Đóng gói & đào block'}</button></div>
        <Table columns={columns} rows={transactions} rowKey={(tx, index) => `${tx.from}-${tx.nonce}-${index}`} emptyMessage="Mempool đang trống. Thêm giao dịch để tạo block mới." />
        <p className="notice notice-warn">Lưu ý: giao dịch ở trang này chỉ là dữ liệu minh họa. Kết nối node thật yêu cầu ECDSA secp256k1, nonce hợp lệ và số dư đủ.</p>
      </Card>
    </div>
  );
}
