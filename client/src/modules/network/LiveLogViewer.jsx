export default function LiveLogViewer({ logs = [] }) {
  return (
    <section className="glass-panel log-panel">
      <div className="panel-heading"><div><h2>Nhật ký mạng trực tiếp</h2><p>Thông điệp P2P, kết nối peer và sự kiện đồng thuận.</p></div><span className="tag tag-cyan">LIVE</span></div>
      <div className="live-logs" aria-live="polite">{logs.length ? logs.slice(-30).map((entry, index) => <div className="log-entry" key={`${entry.time}-${index}`}><time>{new Date(entry.time).toLocaleTimeString()}</time><span>{entry.message}</span></div>) : <p className="muted">Chưa có sự kiện. Khởi động server bằng <code>npm run node1</code> để xem luồng P2P.</p>}</div>
    </section>
  );
}
