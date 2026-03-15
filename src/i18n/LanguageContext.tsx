import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { en } from "./translations/en";
import { fr } from "./translations/fr";
import { nl } from "./translations/nl";

export type Language = "en" | "fr" | "nl";

export const LANGUAGES = [
  { code: "en" as const, label: "English", nativeLabel: "English" },
  { code: "fr" as const, label: "French", nativeLabel: "Français" },
  { code: "nl" as const, label: "Dutch", nativeLabel: "Nederlands" },
];

const STORAGE_KEY = "ada_language";

const translations = { en, fr, nl } as const;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

function detectBrowserLanguage(): Language {
  try {
    const browserLang = navigator.language?.toLowerCase() || "";
    if (browserLang.startsWith("fr")) return "fr";
    if (browserLang.startsWith("nl")) return "nl";
  } catch {
    // navigator unavailable
  }
  return "en";
}

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "fr" || stored === "nl") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  // No saved preference — detect from browser
  return detectBrowserLanguage();
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(
        translations[language] as unknown as Record<string, unknown>,
        key
      );
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
