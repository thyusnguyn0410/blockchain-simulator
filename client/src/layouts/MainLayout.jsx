import { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useTheme } from "../contexts/ThemeContext";

export default function MainLayout({ children, activeItem, onNavigate, connection }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = (label) => { onNavigate?.(label); setIsSidebarOpen(false); };
  return <div className="app-layout"><Navbar onMenuClick={() => setIsSidebarOpen(true)} connection={connection} theme={theme} onToggleTheme={toggleTheme} /><div className="layout-content"><Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activeItem={activeItem} onNavigate={navigate} /><main className="main-content"><div className="main-content-inner">{children}</div></main></div></div>;
}
