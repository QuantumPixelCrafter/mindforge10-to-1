import { createContext, useContext, ReactNode } from "react";
import { type LangCode, type Translations, getTranslations } from "./languages";

interface LanguageContextValue {
  lang: LangCode;
  t: Translations;
  isRTL: boolean;
  setLang: (code: LangCode) => void;
}

const t = getTranslations("en");

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  t,
  isRTL: false,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  return (
    <LanguageContext.Provider value={{ lang: "en", t, isRTL: false, setLang: () => {} }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
