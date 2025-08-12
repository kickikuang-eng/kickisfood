import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "sv";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "sv" || saved === "en") return saved;
    return navigator.language?.toLowerCase().startsWith("sv") ? "sv" : "en";
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    // Optional: update html lang attribute for accessibility/SEO
    document.documentElement.lang = l === "sv" ? "sv-SE" : "en";
  };

  useEffect(() => {
    document.documentElement.lang = lang === "sv" ? "sv-SE" : "en";
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
