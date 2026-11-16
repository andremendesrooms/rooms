"use client";
import { useTranslation } from "./LanguageProvider";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { languages, type Language } from "@/lib/i18n";
const labels = {
  pt: "Português",
  en: "English",
  es: "Español",
  it: "Italiano",
  fr: "Français",
};
export default function LanguageSelector({ language }: { language: Language }) {
  const t = useTranslation();
  const [error, setError] = useState("");
  const router = useRouter();
  const path = usePathname();
  const [pending, setPending] = useState(false);
  if (path.startsWith("/admin")) return null;
  return (
    <div className="relative">
      <select
        aria-label="Language / Idioma"
        value={language}
        disabled={pending}
        className="w-[76px] sm:w-auto rounded-lg border border-black/15 bg-white px-1 py-2 text-xs sm:max-w-none"
        onChange={async (e) => {
          const next = e.target.value;
          setPending(true);
          setError("");
          try {
            const response = await fetch("/api/language", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ language: next }),
            });
            if (response.ok) {
              document.documentElement.lang = next === "pt" ? "pt-BR" : next;
              router.refresh();
            } else {
              setError(
                t("Não foi possível alterar o idioma. Tente novamente."),
              );
            }
          } catch {
            setError(t("Não foi possível alterar o idioma. Tente novamente."));
          } finally {
            setPending(false);
          }
        }}
      >
        {languages.map((l) => (
          <option key={l} value={l}>
            {labels[l]}
          </option>
        ))}
      </select>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-full w-56 rounded-lg border bg-white p-3 text-xs text-red-800"
        >
          {error}
        </p>
      )}
    </div>
  );
}
