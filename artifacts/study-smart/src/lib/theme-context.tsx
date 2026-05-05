import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeState>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
});

const STORAGE_KEY = "study_smart_theme";

function getPreferred(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? getPreferred() : mode;
}

function applyTheme(resolved: "light" | "dark") {
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? "system";
    } catch {
      return "system";
    }
  });

  const [resolvedTheme, setResolved] = useState<"light" | "dark">(() => resolve(theme));

  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    applyTheme(r);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const r = getPreferred();
        setResolved(r);
        applyTheme(r);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
