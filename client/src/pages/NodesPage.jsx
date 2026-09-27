import React from 'react';

function NodesPage() {
  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <span className="page-label">PEER-TO-PEER NETWORK</span>
          <h1>Network Nodes</h1>
          <p>See connected peers and their synchronization health.</p>
        </div>
        <button className="primary-button">+ Add node</button>
      </header>
      <section className="node-summary">
        <div className="summary-card">
          <span>Online nodes</span>
          <strong>2 / 3</strong>
        </div>
        <div className="summary-card">
          <span>Average latency</span>
          <strong>18 ms</strong>
        </div>
        <div className="summary-card">
          <span>Network height</span>
          <strong>#1,284</strong>
        </div>
      </section>
      {/* Nodes content sẽ được thêm sau */}
    </div>
  );
}

export default NodesPage;
