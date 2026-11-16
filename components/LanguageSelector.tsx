"use client";

import { useTranslation } from "./LanguageProvider";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { languages, type Language } from "@/lib/i18n";

const labels: Record<Language, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
  it: "Italiano",
  fr: "Français",
  pl: "Polski",
};

export default function LanguageSelector({ language }: { language: Language }) {
  const t = useTranslation();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const path = usePathname();

  if (path.startsWith("/admin")) return null;

  async function changeLanguage(next: Language) {
    if (pending || next === language) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: next }),
      });
      if (!response.ok) throw new Error("language update failed");
      document.documentElement.lang = next === "pt" ? "pt-BR" : next;
      router.refresh();
    } catch {
      setError(t("Não foi possível alterar o idioma. Tente novamente."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor="public-language" className="sr-only">
        {t("Escolha outro idioma")}
      </label>
      <select
        id="public-language"
        aria-label="Language / Idioma"
        value={language}
        disabled={pending}
        className="min-h-10 w-[112px] rounded-full border border-black/15 bg-white px-2.5 py-2 text-xs font-medium text-ink outline-none transition focus-visible:ring-2 focus-visible:ring-route-gold sm:w-[126px] sm:text-sm disabled:opacity-60"
        onChange={(event) => void changeLanguage(event.target.value as Language)}
      >
        {languages.map((l) => (
          <option key={l} value={l}>{labels[l]}</option>
        ))}
      </select>
      {error && (
        <p role="alert" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-red-200 bg-white p-2 text-xs text-red-800 shadow-md">
          {error}
        </p>
      )}
    </div>
  );
}
