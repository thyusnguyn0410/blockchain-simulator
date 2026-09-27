import React from 'react';

function TransactionsPage() {
  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <span className="page-label">LEDGER ACTIVITY</span>
          <h1>Transactions</h1>
          <p>Search and review every transaction processed by the simulator.</p>
        </div>
        <button className="primary-button">+ Create transaction</button>
      </header>
      <section className="toolbar">
        <input className="search-input" placeholder="🔍  Search by hash or address..." />
        <select className="filter-select">
          <option>All statuses</option>
          <option>Confirmed</option>
          <option>Pending</option>
        </select>
      </section>
      {/* Transactions content sẽ được thêm sau */}
    </div>
  );
}

export default TransactionsPage;
