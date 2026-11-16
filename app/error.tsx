"use client";
import { useTranslation } from "@/components/LanguageProvider";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslation();
  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="font-display text-3xl">
        {t("Não foi possível carregar esta página.")}
      </h1>
      <p className="mt-4">
        {t(
          "Catálogo temporariamente indisponível. Você pode enviar suas preferências pelo WhatsApp.",
        )}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-ink px-5 py-3 text-white"
      >
        {t("Tentar novamente")}
      </button>
    </section>
  );
}
