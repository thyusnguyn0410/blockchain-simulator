import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "blocksim-theme";

function getInitialTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
  } catch {
    return "dark";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  const setTheme = useCallback((nextTheme) => {
    if (nextTheme === "light" || nextTheme === "dark") {
      setThemeState(nextTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error("Unable to save the selected theme.", error);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Context modules intentionally export both their provider and consumer hook.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}
