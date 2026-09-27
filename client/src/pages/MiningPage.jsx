import React from 'react';

function MiningPage() {
  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <span className="page-label">PROOF OF WORK</span>
          <h1>Mining Lab</h1>
          <p>Experiment with SHA-256 and mine a block in simulation mode.</p>
        </div>
        <span className="status-badge info">Simulation mode</span>
      </header>
      {/* Mining content sẽ được thêm sau */}
    </div>
  );
}

export default MiningPage;
