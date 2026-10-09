// client/src/modules/network/LiveLogViewer.jsx
import { useEffect, useRef, useState } from 'react';
import Card from '../../components/Card.jsx';

const POLL_INTERVAL_MS = 1500;
const MAX_LINES = 400;

export default function LiveLogViewer({ nodes }) {
  const [lines, setLines] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState('all');
  const cursorsRef = useRef({});
  const containerRef = useRef(null);
  const filters = [
    { id: 'all', label: 'Tất cả' },
    { id: 'tx', label: 'Tx' },
    { id: 'block', label: 'Block' },
    { id: 'sync', label: 'Sync' },
    { id: 'reject', label: 'Reject' },
  ];
  const visibleLines = lines.filter((entry) => (
    logFilter === 'all' || classifyLog(entry.line) === logFilter
  ));

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
      <div className="network-live-toolbar">
        <label className="network-auto-scroll">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Tự cuộn xuống dòng mới nhất
        </label>
        <button type="button" onClick={clear} className="network-quiet-button">
          Xoá log
        </button>
      </div>

      <div className="network-log-filters" role="group" aria-label="Lọc log theo loại sự kiện">
        {filters.map(({ id, label }) => (
          <button
            type="button"
            key={id}
            className={`network-filter-button ${logFilter === id ? 'is-active' : ''}`}
            aria-pressed={logFilter === id}
            onClick={() => setLogFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="network-live-log" aria-live="polite">
        {lines.length === 0 && (
          <div className="network-empty">Chưa có log nào — thử bấm "Bắt đầu đào" ở 1 Node bất kỳ.</div>
        )}
        {lines.length > 0 && visibleLines.length === 0 && (
          <div className="network-empty">Không có log thuộc bộ lọc này.</div>
        )}
        {visibleLines.map((entry, i) => (
          <div key={`${entry.nodeAddress}-${entry.at}-${i}`} className="network-live-log-line">
            <span className="network-log-time">{new Date(entry.at).toLocaleTimeString()}</span>
            <span className={`network-log-event network-log-${classifyLog(entry.line)}`}>{entry.line}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function classifyLog(line = '') {
  const lower = line.toLowerCase();
  if (lower.includes('không hợp lệ') || lower.includes('reject') || lower.includes('lỗi') || lower.includes('thất bại')) {
    return 'reject';
  }
  if (lower.includes('đồng bộ') || lower.includes('sync') || lower.includes('consensus') || lower.includes('đồng thuận')) {
    return 'sync';
  }
  if (lower.includes('tx') || lower.includes('mempool') || lower.includes('giao dịch')) {
    return 'tx';
  }
  if (lower.includes('block') || lower.includes('mined') || lower.includes('khối')) {
    return 'block';
  }
  return 'other';
}