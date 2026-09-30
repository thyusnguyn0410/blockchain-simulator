function Navbar({ onMenuClick }) {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <button type="button" className="mobile-menu-button" onClick={onMenuClick} aria-label="Open navigation">
          ☰
        </button>
        <div className="brand">
          <div className="brand-logo">B</div>
          <div className="brand-info">
            <strong>BlockSim</strong>
            <span>Blockchain Simulator</span>
          </div>
        </div>
      </div>
      <div className="navbar-right">
        <div className="network-indicator">
          <span className="online-dot" />
          <span>Network Online</span>
        </div>
        <div className="navbar-divider" />
        <button type="button" className="profile-button" aria-label="Open profile menu">
          <span className="profile-avatar">A</span>
          <span className="profile-name">Admin</span>
          <span className="profile-arrow">⌄</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;
