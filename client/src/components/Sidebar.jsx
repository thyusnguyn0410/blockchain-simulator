const menuGroups = [
  {
    label: "Cryptography",
    items: [
      { label: "SHA-256", icon: "#", target: "sha256-tool" },
      { label: "ECDSA", icon: "⌁", target: "ecdsa-tool" },
      { label: "Merkle", icon: "⌘", target: "merkle-tree-tab" },
    ],
  },
  {
    label: "Blockchain",
    items: [
      { label: "Block Header", icon: "◇", target: "blockheader-tool" },
      { label: "Mempool", icon: "⇄", target: "mempool-tool" },
      { label: "Proof of Work", icon: "⛏", target: "pow-tool" },
    ],
  },
  {
    label: "Network",
    items: [
      { label: "Dashboard", icon: "▦", target: "network-dashboard" },
      { label: "Attack Simulator", icon: "⚠", target: "attack-simulator" },
    ],
  },
];

export default function Sidebar({ isOpen, onClose, activeItem = "Tổng quan", onNavigate }) {
  return (
    <>
      <button
        type="button"
        className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-label="Đóng điều hướng"
        tabIndex={isOpen ? 0 : -1}
      />
      <aside
        className={`sidebar ${isOpen ? "sidebar-open" : ""}`}
        aria-label="Điều hướng mô phỏng"
      >
        <div className="mobile-sidebar-header">
          <span>Điều hướng</span>
          <button type="button" onClick={onClose} aria-label="Đóng thanh điều hướng">×</button>
        </div>

        <div className="sidebar-content">
          <button
            type="button"
            className={`sidebar-item sidebar-overview ${activeItem === "Tổng quan" ? "active" : ""}`}
            onClick={() => onNavigate?.("Tổng quan")}
            aria-current={activeItem === "Tổng quan" ? "page" : undefined}
          >
            <span className="sidebar-item-icon" aria-hidden="true">⌂</span>
            <span>Tổng quan</span>
          </button>
          {menuGroups.map((group) => (
            <div className="sidebar-group" key={group.label}>
              <h2 className="sidebar-label">{group.label}</h2>
              <nav className="sidebar-nav" aria-label={group.label}>
                {group.items.map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    className={`sidebar-item ${activeItem === item.label ? "active" : ""}`}
                    onClick={() => onNavigate?.(item.label)}
                    aria-current={activeItem === item.label ? "page" : undefined}
                  >
                    <span className="sidebar-item-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="simulator-card">
          <div className="simulator-card-title">Chế độ mô phỏng</div>
          <p>Thực hành luồng blockchain trong môi trường testnet cục bộ.</p>
          <div className="simulator-status">
            <span />Testnet sẵn sàng
          </div>
        </div>
      </aside>
    </>
  );
}
