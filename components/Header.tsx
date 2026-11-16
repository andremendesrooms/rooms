import ArrowIcon from "@/components/ArrowIcon";
import LanguageSelector from "./LanguageSelector";
import { getLanguage, getTranslator } from "@/lib/i18n-server";
import Link from "next/link";
import Image from "next/image";

export default async function Header() {
  const [t, language] = await Promise.all([getTranslator(), getLanguage()]);
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4">
        <Link href="/" aria-label={t("André Mendes, início")}
          className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
          <Image src="/brand/andre-mendes-icon.svg" alt=""
            width={44} height={44} unoptimized
            className="h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12" />
          <span className="min-w-0 leading-tight">
            <span className="block whitespace-nowrap text-[12px] font-bold tracking-tight text-ink sm:text-lg">
              ANDRÉ MENDES<span className="text-route-gold">.</span>
            </span>
            <span className="block whitespace-nowrap text-[9px] tracking-[.18em] text-slate-soft sm:text-xs sm:tracking-[.22em]">
              LONDON ROOMS
            </span>
          </span>
        </Link>
        <nav aria-label={t("Navegação principal")} className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link href="/#como-funciona" className="hidden text-sm text-ink hover:underline md:block">
            {t("Como funciona")}
          </Link>
          <LanguageSelector language={language} />
          <Link href="/imoveis"
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-full bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink/90 sm:px-5">
            <span className="sr-only sm:not-sr-only">{t("Ver imóveis")}</span>
            <ArrowIcon />
          </Link>
        </nav>
      </div>
    </header>
  );
}
