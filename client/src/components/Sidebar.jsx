import React from "react";

const menuItems = [
  { label: "Dashboard", icon: "▦" },
  { label: "Blockchain", icon: "◇" },
  { label: "Transactions", icon: "⇄" },
  { label: "Mining", icon: "⛏" },
  { label: "Merkle Tree", icon: "⌘" },
  { label: "Network Nodes", icon: "◎" },
];

export default function Sidebar({ isOpen, onClose, activeItem = "Dashboard", onNavigate }) {
  return (
    <>
      <button
        type="button"
        className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-label="Close navigation"
      />
      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="mobile-sidebar-header">
          <span>Navigation</span>
          <button type="button" onClick={onClose} aria-label="Close sidebar">×</button>
        </div>

        <div className="sidebar-content">
          <p className="sidebar-label">Workspace</p>
          <nav className="sidebar-nav" aria-label="Main navigation">
            {menuItems.map((item) => (
              <button
                type="button"
                key={item.label}
                className={`sidebar-item ${activeItem === item.label ? "active" : ""}`}
                onClick={() => onNavigate?.(item.label)}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.label === "Network Nodes" && <span className="nav-pip" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="simulator-card">
          <div className="simulator-card-title">Simulator mode</div>
          <p>Educational blockchain network running locally.</p>
          <div className="simulator-status">
            <span />Active testnet
          </div>
        </div>
      </aside>
    </>
  );
}
