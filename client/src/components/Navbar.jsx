import React from "react";
import { useApp } from "../context/AppContext";

export default function Navbar({ onMenuClick, connection = "connecting" }) {
  const { theme, toggleTheme, lang, toggleLang, t } = useApp();
  const connected = connection === "connected";

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button type="button" className="mobile-menu-button" onClick={onMenuClick}>☰</button>
        <div className="brand">
          <div className="brand-logo">⛓️</div>
          <div className="brand-info">
            <strong>BlockSim</strong>
            <span>{lang === "vi" ? "Bộ mô phỏng Blockchain" : "Blockchain Simulator"}</span>
          </div>
        </div>
      </div>

      <div className="navbar-right">
        {/* Nút chuyển đổi VI / EN */}
        <button
          type="button"
          className="lang-toggle-btn"
          onClick={toggleLang}
          title="Chuyển ngôn ngữ / Switch language"
          style={{ padding: "4px 8px", cursor: "pointer", borderRadius: "6px" }}
        >
          {lang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
        </button>

        {/* Nút chuyển đổi Light / Dark */}
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Chuyển sang chế độ ${theme === "dark" ? "Sáng" : "Tối"}`}
          style={{ padding: "4px 8px", cursor: "pointer", borderRadius: "6px" }}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <span className={`network-indicator ${connected ? "connected" : ""}`}>
          <i></i>{connected ? t("wsConnected") : "Connecting..."}
        </span>
      </div>
    </header>
  );
}