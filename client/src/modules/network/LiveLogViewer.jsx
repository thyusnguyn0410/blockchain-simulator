import { useEffect, useRef, useState } from 'react';
import Card from '../../components/Card.jsx';
import { normalizeLogEntry } from './logUtils.js';

const POLL_INTERVAL_MS = 1500;
const MAX_LINES = 400;

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'tx', label: 'Tx' },
  { id: 'block', label: 'Block' },
  { id: 'sync', label: 'Sync' },
  { id: 'reject', label: 'Reject' },
];

function getNodeHttpUrl(address) {
  const normalizedAddress = /^https?:\/\//i.test(address) ? address : `http://${address}`;
  return normalizedAddress.replace(/\/+$/, '');
}

export default function LiveLogViewer({ nodes = [] }) {
  const [lines, setLines] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState('all');
  const cursorsRef = useRef({});
  const containerRef = useRef(null);
  const visibleLines = lines.filter((entry) => logFilter === 'all' || entry.type === logFilter);

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    nodes.forEach((address) => {
      if (!(address in cursorsRef.current)) cursorsRef.current[address] = 0;

      const poll = async () => {
        try {
          const since = cursorsRef.current[address] || 0;
          const res = await fetch(`${getNodeHttpUrl(address)}/logs?since=${Math.max(0, since - 1)}`);
          if (!res.ok || cancelled) return;

          const payload = await res.json();
          const entries = Array.isArray(payload) ? payload : Array.isArray(payload?.logs) ? payload.logs : [];
          if (entries.length === 0) return;

          const normalized = entries.map((entry, index) => normalizeLogEntry(entry, address, index));
          const newestTimestamp = normalized.reduce(
            (latest, entry) => entry.timestamp === null ? latest : Math.max(latest, entry.timestamp),
            since,
          );
          cursorsRef.current[address] = newestTimestamp;

          setLines((previous) => {
            const knownIds = new Set(previous.map((entry) => entry.id));
            const additions = normalized.filter((entry) => !knownIds.has(entry.id));
            return [...previous, ...additions]
              .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
              .slice(-MAX_LINES);
          });
        } catch {
          // Keep displaying existing logs while an individual node is offline.
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
  }, [lines, visibleLines.length, autoScroll]);

  const clear = () => {
    setLines([]);
    nodes.forEach((address) => {
      cursorsRef.current[address] = Date.now();
    });
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
            onChange={(event) => setAutoScroll(event.target.checked)}
          />
          Tự cuộn xuống dòng mới nhất
        </label>
        <button type="button" onClick={clear} className="network-quiet-button">
          Xoá log
        </button>
      </div>

      <div className="network-log-filters" role="group" aria-label="Lọc log theo loại sự kiện">
        {FILTERS.map(({ id, label }) => (
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
        {visibleLines.map((entry) => (
          <div key={entry.id} className="network-live-log-line">
            <span className="network-log-time">[{entry.time}]</span>
            {entry.source && <span className="network-log-source">[{entry.source}]</span>}
            <span className={`network-log-tag network-log-${entry.type}`}>
              {entry.type === 'other' ? 'LOG' : entry.type.toUpperCase()}
            </span>
            <span className={`network-log-event network-log-${entry.type}`}>{entry.message}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
