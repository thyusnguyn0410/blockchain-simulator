import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

function MainLayout({ children, activePage = 'Dashboard', onNavigate = () => {} }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return <div className="app-layout"><Navbar onMenuClick={() => setIsSidebarOpen(true)} /><div className="layout-content"><Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activePage={activePage} onNavigate={onNavigate} /><main className="main-content"><div className="main-content-inner">{children}</div></main></div></div>;
}

export default MainLayout;
