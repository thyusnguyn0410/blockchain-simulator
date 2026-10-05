export default function Navbar({ onMenuClick, connection = "connecting", theme = "dark", onThemeToggle }) {
  const connected = connection === "connected";

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button type="button" className="mobile-menu-button" onClick={onMenuClick} aria-label="Open navigation">☰</button>
        <div className="brand">
          <div className="brand-logo">⛓️</div>
          <div className="brand-info">
            <strong>BlockSim</strong>
            <span>Simulator</span>
          </div>
        </div>
      </div>

      <div className="navbar-right">
        <button
          className="theme-toggle-btn"
          onClick={onThemeToggle}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <span className={`network-indicator ${connected ? "connected" : ""}`}>
          <i></i>
          {connected ? "Live" : "Offline"}
        </span>

        <div className="profile-button">
          <div className="profile-avatar">👤</div>
        </div>
      </div>
    </header>
  );
}
