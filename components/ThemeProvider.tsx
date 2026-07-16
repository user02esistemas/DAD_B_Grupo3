"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(newTheme: Theme) {
  const root = document.documentElement;
  const isDark = newTheme === "dark";

  root.classList.toggle("dark", isDark);
  root.dataset.theme = newTheme;
  root.style.colorScheme = newTheme;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Leer preferencia guardada o detectar del sistema
    const stored = localStorage.getItem("theme") as Theme | null;
    let detectedTheme: Theme = "light";

    if (stored === "dark" || stored === "light") {
      detectedTheme = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      detectedTheme = "dark";
    }

    setTheme(detectedTheme);
    applyTheme(detectedTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Escuchar cambios de preferencia del sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem("theme");
      if (!stored) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
