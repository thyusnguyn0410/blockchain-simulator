const menuItems = [
  { label: "Dashboard", icon: "▦" },
  { label: "Blockchain", icon: "◇" },
  { label: "Transactions", icon: "⇄" },
  { label: "Mining", icon: "⛏" },
  { label: "Network Nodes", icon: "◎" },
];

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <button type="button" className="sidebar-overlay" onClick={onClose} aria-label="Close navigation" />
      )}
      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="mobile-sidebar-header">
          <span>Navigation</span>
          <button type="button" onClick={onClose} aria-label="Close sidebar">×</button>
        </div>
        <div className="sidebar-content">
          <p className="sidebar-label">Main Menu</p>
          <nav className="sidebar-nav" aria-label="Main navigation">
            {menuItems.map((item, index) => (
              <button type="button" key={item.label} className={`sidebar-item ${index === 0 ? "active" : ""}`}>
                <span className="sidebar-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <p className="sidebar-label system-label">System</p>
          <nav className="sidebar-nav" aria-label="System navigation">
            <button type="button" className="sidebar-item"><span className="sidebar-item-icon">⚙</span><span>Settings</span></button>
            <button type="button" className="sidebar-item"><span className="sidebar-item-icon">?</span><span>Help Center</span></button>
          </nav>
        </div>
        <div className="simulator-card">
          <div className="simulator-card-title">Simulator Mode</div>
          <p>Your blockchain network is running in simulation mode.</p>
          <div className="simulator-status"><span />Active</div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
