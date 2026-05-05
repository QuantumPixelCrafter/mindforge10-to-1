import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type UIMode = "mobile" | "tablet";

interface UIModeContextValue {
  uiMode: UIMode;
  setUIMode: (mode: UIMode) => void;
}

const UIModeContext = createContext<UIModeContextValue>({
  uiMode: "tablet",
  setUIMode: () => {},
});

const STORAGE_KEY = "mf_ui_mode";

export function UIModeProvider({ children }: { children: ReactNode }) {
  const [uiMode, setUIModeState] = useState<UIMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "mobile" ? "mobile" : "tablet";
  });

  const setUIMode = (mode: UIMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    setUIModeState(mode);
  };

  return (
    <UIModeContext.Provider value={{ uiMode, setUIMode }}>
      {children}
    </UIModeContext.Provider>
  );
}

export function useUIMode() {
  return useContext(UIModeContext);
}
