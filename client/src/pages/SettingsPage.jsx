import React from 'react';

function SettingsPage() {
  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <span className="page-label">SYSTEM</span>
          <h1>Settings</h1>
          <p>Configure your simulator workspace and network preferences.</p>
        </div>
      </header>
      <section className="dashboard-panel utility-panel">
        <div className="utility-icon">⚙</div>
        <h2>Workspace preferences</h2>
        <p>Settings are ready for the next simulation session.</p>
        {/* Settings content sẽ được thêm sau */}
      </section>
    </div>
  );
}

export default SettingsPage;
