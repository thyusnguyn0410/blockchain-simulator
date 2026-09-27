import { useState } from 'react';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import BlockchainPage from './pages/BlockchainPage';
import TransactionsPage from './pages/TransactionsPage';
import MiningPage from './pages/MiningPage';
import NodesPage from './pages/NodesPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';
import './App.css';
import './Pages.css';

const pages = { Dashboard, Blockchain: BlockchainPage, Transactions: TransactionsPage, Mining: MiningPage, 'Network Nodes': NodesPage, Settings: SettingsPage, 'Help Center': HelpPage };

function App() {
  const [activePage, setActivePage] = useState('Dashboard');
  const Page = pages[activePage] || Dashboard;
  return <MainLayout activePage={activePage} onNavigate={setActivePage}><Page onNavigate={setActivePage} /></MainLayout>;
}

export default App;
