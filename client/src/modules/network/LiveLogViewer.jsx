// client/src/modules/network/LiveLogViewer.jsx
import { useEffect, useRef, useState } from 'react';
import Card from '../../components/Card.jsx';

const POLL_INTERVAL_MS = 1500;
const MAX_LINES = 400;

export default function LiveLogViewer({ nodes }) {
  const [lines, setLines] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const cursorsRef = useRef({});
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    nodes.forEach((address) => {
      if (!(address in cursorsRef.current)) cursorsRef.current[address] = 0;

      const poll = async () => {
        try {
          const since = cursorsRef.current[address];
          const res = await fetch(`http://${address}/logs?since=${since}`);
          if (!res.ok || cancelled) return;

          const entries = await res.json();
          if (entries.length === 0) return;

          cursorsRef.current[address] = entries[entries.length - 1].at;

          setLines((prev) => {
            const merged = [...prev, ...entries.map((e) => ({ ...e, nodeAddress: address }))];
            merged.sort((a, b) => a.at - b.at);
            return merged.slice(-MAX_LINES);
          });
        } catch {
          // Node offline
        }
      };

      poll();
      timers.push(setInterval(poll, POLL_INTERVAL_MS));
    });

    return () => {
      cancelled = true;
      timers.forEach(clearInterval);
    };
  }, [nodes]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const clear = () => {
    setLines([]);
    const now = Date.now();
    nodes.forEach((address) => (cursorsRef.current[address] = now));
  };

  return (
    <Card
      title="Live Log — Mạng & Đồng thuận"
      description="Chu trình Mempool → Block → PoW → Broadcast → Consensus gộp từ tất cả Node"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Tự cuộn xuống dòng mới nhất
        </label>
        <button 
          onClick={clear} 
          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem' }}
        >
          Xoá log
        </button>
      </div>

      <div 
        ref={containerRef} 
        style={{ height: '240px', overflowY: 'auto', background: '#090d16', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.75rem' }}
      >
        {lines.length === 0 && (
          <div style={{ color: '#64748b' }}>Chưa có log nào — thử bấm "Bắt đầu đào" ở 1 Node bất kỳ.</div>
        )}
        {lines.map((entry, i) => (
          <div key={`${entry.nodeAddress}-${entry.at}-${i}`} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: '#475569', shrink: 0 }}>{new Date(entry.at).toLocaleTimeString()}</span>
            <span className={toneClass(entry.line)}>{entry.line}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function toneClass(line) {
  const lower = line.toLowerCase();
  if (lower.includes('mined') || lower.includes('đã nối thêm block') || lower.includes('đồng bộ')) {
    return 'text-emerald-400';
  }
  if (lower.includes('không hợp lệ') || lower.includes('reject') || lower.includes('lỗi') || lower.includes('thất bại')) {
    return 'text-red-400';
  }
  if (lower.includes('tx') || lower.includes('mempool') || lower.includes('giao dịch')) {
    return 'text-amber-400';
  }
  if (lower.includes('peer') || lower.includes('kết nối')) {
    return 'text-indigo-300';
  }
  return 'text-slate-300';
}