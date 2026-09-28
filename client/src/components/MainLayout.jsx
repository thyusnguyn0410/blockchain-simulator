import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function openSidebar() {
    setIsSidebarOpen(true);
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="app-layout">
      <Navbar onMenuClick={openSidebar} />
      <div className="layout-content">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <main className="main-content">
          <div className="main-content-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
