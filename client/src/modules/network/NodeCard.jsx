// client/src/modules/network/NodeCard.jsx
import { useState } from 'react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import { usePolling } from '../../hooks/usePolling.js';

export default function NodeCard({ address, onRemove }) {
  const nodeBaseUrl = `${/^https?:\/\//i.test(address) ? '' : 'http://'}${address
    .replace(/^https?:\/\//i, '')
    .replace(/\/status\/?$/i, '')
    .replace(/\/+$/, '')}`;
  const { data, error } = usePolling(nodeBaseUrl, { interval: 2000 });

  const [mining, setMining] = useState(false);
  const [lastMined, setLastMined] = useState(null);
  const [mineError, setMineError] = useState(null);

  const online = !error && data !== null;

  const handleMine = async () => {
    setMining(true);
    setMineError(null);
    const start = performance.now();

    try {
      const res = await fetch(`${nodeBaseUrl}/mineBlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Mine block thất bại');

      setLastMined({ ...json, elapsedMs: Math.round(performance.now() - start) });
    } catch (err) {
      setMineError(err.message);
    } finally {
      setMining(false);
    }
  };

  return (
    <Card className="network-node-card">
      <div className="network-node-header">
        <div className="network-node-identity">
          <span className={`network-node-dot ${online ? 'is-online' : 'is-offline'}`} aria-hidden="true" />
          <div className="network-node-details">
            <div className="network-node-name">{data?.nodeId ?? '(chưa xác định)'}</div>
            <div className="network-node-address">{address}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(address)}
          className="network-remove-button"
          title="Bỏ theo dõi Node này"
          aria-label={`Bỏ theo dõi node ${address}`}
        >
          ✕
        </button>
      </div>

      {online ? (
        <>
          <div className="network-node-stats">
            <Stat label="Status" value="ONLINE" valueClass="network-value-online" />
            <Stat label="Height" value={data.height} />
            <Stat
              label="Chain"
              value={data.isChainValid ? 'VALID' : 'INVALID'}
              valueClass={data.isChainValid ? 'network-value-online' : 'network-value-error'}
            />
            <Stat label="Mempool" value={data.mempoolSize} />
            <Stat label="Peers" value={data.peers} className="network-stat-wide" />
          </div>

          <Button onClick={handleMine} loading={mining} disabled={mining} variant="primary">
            {mining ? 'Đang đào...' : '⛏ Bắt đầu đào (mine block)'}
          </Button>

          {lastMined && (
            <div className="network-mine-result" role="status">
              <div>Đã mine Block <strong>#{lastMined.index}</strong> — nonce={lastMined.nonce}</div>
              <div className="network-mined-hash" title={lastMined.hash}>
                hash={lastMined.hash}
              </div>
              <div className="network-mine-time">~{lastMined.elapsedMs}ms</div>
            </div>
          )}
          {mineError && <div className="network-error" role="alert">{mineError}</div>}
        </>
      ) : (
        <div className="network-offline-message" role="status">
          OFFLINE — không kết nối được ({typeof error === 'string' ? error : error?.message || 'máy chủ chưa bật'})
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, valueClass = '', className = '' }) {
  return (
    <div className={`network-stat ${className}`}>
      <div className="network-stat-label">{label}</div>
      <div className={`network-stat-value ${valueClass}`}>{value ?? '—'}</div>
    </div>
  );
}