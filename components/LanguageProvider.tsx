"use client";
import { createContext, useContext } from "react";
import { translator, type Language } from "@/lib/i18n";
const LanguageContext = createContext<Language>("pt");
export function LanguageProvider({
  language,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={language}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useTranslation() {
  return translator(useContext(LanguageContext));
}
