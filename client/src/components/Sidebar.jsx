const menuItems = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'Blockchain', icon: '◇' },
  { label: 'Transactions', icon: '⇄' },
  { label: 'Mining', icon: '⛏' },
  { label: 'Network Nodes', icon: '◎' },
];

function Sidebar({ isOpen, onClose, activePage = 'Dashboard', onNavigate = () => {} }) {
  const navigate = (page) => { onNavigate(page); onClose(); };
  const systemItems = [['Settings', '⚙'], ['Help Center', '?']];
  return <><button type="button" className="sidebar-overlay" onClick={onClose} aria-label="Close navigation" style={{ display: isOpen ? undefined : 'none' }} /><aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}><div className="mobile-sidebar-header"><span>Navigation</span><button type="button" onClick={onClose} aria-label="Close sidebar">×</button></div><div className="sidebar-content"><p className="sidebar-label">Main Menu</p><nav className="sidebar-nav">{menuItems.map((item) => <button type="button" key={item.label} onClick={() => navigate(item.label)} className={`sidebar-item ${activePage === item.label ? 'active' : ''}`}><span className="sidebar-item-icon">{item.icon}</span><span>{item.label}</span></button>)}</nav><p className="sidebar-label system-label">System</p><nav className="sidebar-nav">{systemItems.map(([label, icon]) => <button type="button" key={label} onClick={() => navigate(label)} className={`sidebar-item ${activePage === label ? 'active' : ''}`}><span className="sidebar-item-icon">{icon}</span><span>{label}</span></button>)}</nav></div><div className="simulator-card"><div className="simulator-card-title">Simulator Mode</div><p>Your blockchain network is running in simulation mode.</p><div className="simulator-status"><span />Active</div></div></aside></>;
}

export default Sidebar;
