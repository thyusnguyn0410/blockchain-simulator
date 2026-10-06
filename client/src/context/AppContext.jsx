import React, { createContext, useContext, useState, useEffect } from "react";

const translations = {
  vi: {
    dashboard: "Bảng điều khiển",
    blockchain: "Chuỗi khối",
    transactions: "Giao dịch",
    mining: "Khai thác (PoW)",
    merkle: "Cây Merkle",
    network: "Mạng phân tán",
    totalTx: "Tổng giao dịch",
    activeNodes: "Node hoạt động",
    latestBlock: "Khối mới nhất",
    mempool: "Chờ xác nhận (Mempool)",
    restOnline: "Trực tuyến",
    wsConnected: "Đã kết nối",
    refreshSim: "↻ Làm mới mô phỏng",
  },
  en: {
    dashboard: "Dashboard",
    blockchain: "Blockchain",
    transactions: "Transactions",
    mining: "Mining (PoW)",
    merkle: "Merkle Tree",
    network: "Network Nodes",
    totalTx: "Total Transactions",
    activeNodes: "Active Nodes",
    latestBlock: "Latest Block",
    mempool: "Mempool",
    restOnline: "Online",
    wsConnected: "Connected",
    refreshSim: "↻ Refresh simulation",
  }
};

const AppContext = createContext();

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "dark");
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "vi");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("app_lang", lang);
  }, [lang]);

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));
  const toggleLang = () => setLang(prev => (prev === "vi" ? "en" : "vi"));
  const t = (key) => translations[lang]?.[key] || key;

  return (
    <AppContext.Provider value={{ theme, toggleTheme, lang, toggleLang, t }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
