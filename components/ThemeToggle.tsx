"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--surface-secondary)] text-[var(--muted)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary-text)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]"
      title={label}
      aria-label={label}
      aria-pressed={isDark}
    >
      <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--primary)] opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="relative z-10 transition-transform duration-200 group-hover:rotate-6">
        {isDark ? (
          <Sun className="h-[18px] w-[18px] text-[#ff9a5f]" />
        ) : (
          <Moon className="h-[18px] w-[18px] text-[#315f57]" />
        )}
      </span>
    </button>
  );
}
