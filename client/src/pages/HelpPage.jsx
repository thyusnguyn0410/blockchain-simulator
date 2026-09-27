import React from 'react';

function HelpPage() {
  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <span className="page-label">DOCUMENTATION</span>
          <h1>Help Center</h1>
          <p>Find answers and learn how to use the blockchain simulator.</p>
        </div>
      </header>
      <section className="dashboard-panel utility-panel">
        <div className="utility-icon">?</div>
        <h2>Blockchain Simulator guide</h2>
        <p>Explore the Dashboard, Blockchain, Transactions, Mining, and Network Nodes pages from the sidebar.</p>
        {/* Help content sẽ được thêm sau */}
      </section>
    </div>
  );
}

export default HelpPage;
