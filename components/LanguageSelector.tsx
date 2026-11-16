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
    <div className="border-t border-orange-200 bg-orange-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          lang="en"
          aria-pressed={language === "en"}
          disabled={pending}
          onClick={() => void changeLanguage("en")}
          className="shrink-0 min-h-11 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          English
        </button>
        <label
          htmlFor="public-language"
          className="flex min-w-0 flex-1 flex-col items-start gap-x-3 gap-y-1 text-xs font-semibold text-ink sm:flex-none sm:flex-row sm:items-center sm:text-sm"
        >
          {t("Escolha outro idioma")}
          <select
            id="public-language"
            aria-label="Language / Idioma"
            value={language}
            disabled={pending}
            className="min-h-11 w-full max-w-full rounded-lg sm:w-auto border border-orange-300 bg-white px-3 py-2 text-sm font-medium"
            onChange={(e) => void changeLanguage(e.target.value as Language)}
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {labels[l]}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="w-full text-sm text-red-800">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
