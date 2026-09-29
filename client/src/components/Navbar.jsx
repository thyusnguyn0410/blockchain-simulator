const navigation = [
  { id: 'home', vi: 'Tổng quan', en: 'Overview', icon: '⌂' },
  { id: 'sha256', vi: 'SHA-256', en: 'SHA-256', icon: '#' },
  { id: 'ecdsa', vi: 'Ví & ECDSA', en: 'Wallet & ECDSA', icon: '◇' },
  { id: 'chain', vi: 'Chuỗi khối', en: 'Blocks & chain', icon: '▤' },
  { id: 'mempool', vi: 'Mempool', en: 'Mempool', icon: '⇄' },
  { id: 'merkle', vi: 'Merkle', en: 'Merkle', icon: '⌘' },
  { id: 'network', vi: 'Mạng & đồng thuận', en: 'Network', icon: '◉' },
  { id: 'attacks', vi: 'Tấn công demo', en: 'Attack demos', icon: '⚑' },
];

export default function Navbar({
  activePage,
  onNavigate,
  language,
  onLanguageChange,
  onlineNodes = 0,
}) {
  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={() => onNavigate('home')} aria-label="Về trang tổng quan">
        <span className="brand-mark">B</span>
        <span className="brand-copy"><strong>Block<span>Sim</span></strong><small>BLOCKCHAIN LAB</small></span>
      </button>
      <nav className="main-nav" aria-label="Điều hướng chính">
        {navigation.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`nav-pill ${activePage === item.id ? 'active' : ''}`}
            aria-current={activePage === item.id ? 'page' : undefined}
          >
            <span>{item.icon}</span>{language === 'vi' ? item.vi : item.en}
          </button>
        ))}
      </nav>
      <div className="topbar-actions">
        <span className={`network-indicator ${onlineNodes ? 'is-online' : ''}`}>
          <i />{onlineNodes ? `${onlineNodes}/3 NODE` : 'LOCAL DEMO'}
        </span>
        <button type="button" className="language-toggle" onClick={onLanguageChange} aria-label="Switch language">
          {language === 'vi' ? 'VI / EN' : 'EN / VI'}
        </button>
      </div>
    </header>
  );
}
