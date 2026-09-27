import React from 'react';

function Dashboard() {
  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <span className="page-label">BLOCKCHAIN SIMULATOR</span>
          <h1>Blockchain Dashboard</h1>
          <p>Monitor your blockchain network and explore its current activity.</p>
        </div>
        <button className="primary-button">+ New Simulation</button>
      </header>
      {/* Dashboard content sẽ được thêm sau */}
    </div>
  );
}

export default Dashboard;
