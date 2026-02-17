"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { colors, darkColors } from "../styles/design-system";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  themeColors: typeof colors;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  isDark: false,
  toggleTheme: () => {},
  themeColors: colors,
});

const STORAGE_KEY = "ai-muhasebi-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const isDark = theme === "dark";
  const themeColors = isDark ? darkColors : colors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
