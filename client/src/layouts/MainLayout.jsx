import { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function MainLayout({ children, activeItem, onNavigate, connection, theme = "dark", onThemeToggle }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = (label) => { onNavigate?.(label); setIsSidebarOpen(false); };

  return (
    <div className="app-layout" data-theme={theme}>
      <Navbar
        onMenuClick={() => setIsSidebarOpen(true)}
        connection={connection}
        theme={theme}
        onThemeToggle={onThemeToggle}
      />
      <div className="layout-content">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activeItem={activeItem} onNavigate={navigate} />
        <main className="main-content">
          <div className="main-content-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
