import ArrowIcon from "@/components/ArrowIcon";
import LanguageSelector from "./LanguageSelector";
import { getLanguage } from "@/lib/i18n-server";
import { getTranslator } from "@/lib/i18n-server";
import Link from "next/link";
export default async function Header() {
  const t = await getTranslator();
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-4 px-4 py-4">
        <Link
          href="/"
          aria-label={t("André Mendes, início")}
          className="shrink-0 leading-tight"
        >
          <span className="block text-base font-bold sm:text-lg tracking-tight">
            ANDRÉ MENDES<span className="text-route-gold">.</span>
          </span>
          <span className="text-xs tracking-[.22em] text-slate-soft">
            LONDON ROOMS
          </span>
        </Link>
        <nav
          aria-label={t("Navegação principal")}
          className="flex shrink-0 items-center gap-4"
        >
          <Link href="/#como-funciona" className="hidden text-sm sm:block">
            {t("Como funciona")}
          </Link>
          <Link
            href="/imoveis"
            className="inline-flex items-center justify-center rounded-full bg-ink p-3 sm:px-5 text-sm font-semibold text-white"
          >
            <span className="sr-only sm:not-sr-only">{t("Ver imóveis")}</span>
            <ArrowIcon />
          </Link>
        </nav>
      </div>
      <LanguageSelector language={await getLanguage()} />
    </header>
  );
}
