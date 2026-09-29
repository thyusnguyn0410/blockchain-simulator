import Navbar from '../components/Navbar.jsx';

export default function MainLayout({
  children,
  activePage,
  onNavigate,
  language,
  onLanguageChange,
  onlineNodes = 0,
}) {
  return (
    <div className="app-layout">
      <Navbar
        activePage={activePage}
        onNavigate={onNavigate}
        language={language}
        onLanguageChange={onLanguageChange}
        onlineNodes={onlineNodes}
      />
      <main className="main-content">
        <div className="main-content-inner">{children}</div>
      </main>
      <footer className="app-footer">
        <span>BLOCKSIM · MÔ PHỎNG GIÁO DỤC</span>
        <span>Không dùng với tài sản hoặc khóa production</span>
      </footer>
    </div>
  );
}
