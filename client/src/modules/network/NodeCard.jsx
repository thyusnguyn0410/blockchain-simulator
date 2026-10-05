// client/src/modules/network/NodeCard.jsx
import { useState } from 'react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import { usePolling } from '../../hooks/usePolling.js';

export default function NodeCard({ address, onRemove }) {
  const { data, error } = usePolling(`http://${address}/status`, { interval: 2000 });

  const [mining, setMining] = useState(false);
  const [lastMined, setLastMined] = useState(null);
  const [mineError, setMineError] = useState(null);

  const online = !error && data !== null;

  const handleMine = async () => {
    setMining(true);
    setMineError(null);
    const start = performance.now();

    try {
      const res = await fetch(`http://${address}/mineBlock`, {
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
    <Card className="relative">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            background: online ? '#34d399' : '#f87171' 
          }} />
          <div>
            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>{data?.nodeId ?? '(chưa xác định)'}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{address}</div>
          </div>
        </div>
        <button
          onClick={() => onRemove(address)}
          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
          title="Bỏ theo dõi Node này"
        >
          ✕
        </button>
      </div>

      {online ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', marginBottom: '14px' }}>
            <Stat label="Status" value="ONLINE" valueClass="text-emerald-400" />
            <Stat label="Height" value={data.height} />
            <Stat
              label="Chain"
              value={data.isChainValid ? 'VALID' : 'INVALID'}
              valueClass={data.isChainValid ? 'text-emerald-400' : 'text-red-400'}
            />
            <Stat label="Mempool" value={data.mempoolSize} />
            <Stat label="Peers" value={data.peers} style={{ gridColumn: 'span 2' }} />
          </div>

          <Button onClick={handleMine} loading={mining} disabled={mining} variant="primary">
            {mining ? 'Đang đào...' : '⛏ Bắt đầu đào (mine block)'}
          </Button>

          {lastMined && (
            <div style={{ marginTop: '12px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#6ee7b7', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <div>Đã mine Block <strong>#{lastMined.index}</strong> — nonce={lastMined.nonce}</div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8' }} title={lastMined.hash}>
                hash={lastMined.hash}
              </div>
              <div style={{ color: '#94a3b8' }}>~{lastMined.elapsedMs}ms</div>
            </div>
          )}
          {mineError && <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#f87171' }}>{mineError}</div>}
        </>
      ) : (
        <div style={{ fontSize: '0.85rem', color: '#f87171' }}>
          OFFLINE — không kết nối được ({error ?? 'máy chủ chưa bật'})
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, valueClass = '', style = {} }) {
  return (
    <div style={style}>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label}</div>
      <div className={valueClass} style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{value ?? '—'}</div>
    </div>
  );
}