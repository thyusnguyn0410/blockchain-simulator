export default function NodeCard({ node }) {
  const online = node.status === 'online';
  return (
    <article className="node-card">
      <div className="node-card-top"><span className={`node-icon ${online ? 'online' : ''}`}>◉</span><span className={`tag ${online ? 'tag-green' : 'tag-red'}`}>{online ? 'ONLINE' : 'OFFLINE'}</span></div>
      <strong>{node.nodeId}</strong><small>{node.url || `HTTP :${node.httpPort} · WS :${node.wsPort}`}</small>
      <div className="node-stats"><span>Height <b>{node.height ?? '—'}</b></span><span>Peers <b>{node.peers ?? 0}</b></span><span>Mempool <b>{node.mempoolSize ?? 0}</b></span></div>
    </article>
  );
}
