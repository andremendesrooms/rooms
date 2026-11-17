import ArrowIcon from "@/components/ArrowIcon";
import { getTranslator } from "@/lib/i18n-server";
import Link from "next/link";
import Image from "next/image";
import QuickSearchForm from "@/components/QuickSearchForm";
import PropertyGrid from "@/components/PropertyGrid";
import LeadForm from "@/components/LeadForm";
import {
  getAvailableRegions,
  getAvailableTypes,
  getProperties,
} from "@/lib/queries";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const t = await getTranslator();
  let unavailable = false;
  const [types, regions, available] = await Promise.all([
    getAvailableTypes(),
    getAvailableRegions(),
    getProperties({}, 6),
  ]).catch(() => {
    unavailable = true;
    return [[], [], []] as [
      string[],
      string[],
      import("@/lib/types").PropertyWithPhotos[],
    ];
  });
  // Home editorial independente da galeria: fotos de anúncios e testes não viram banner automaticamente.
  return (
    <div>
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[.22em] text-orange-300">
              {t("Londres • Seu próximo endereço")}
            </p>
            <h1 className="font-display text-5xl leading-[1.08] sm:text-6xl">
              {t("Seu próximo imóvel em Londres")}{" "}
              <span className="text-orange-300">{t("está aqui.")}</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/75">
              {t(
                "Já mora em Londres e quer mudar? Encontre um espaço para a sua próxima fase, com atendimento em português e condições claras.",
              )}
            </p>
            <Link
              href="#busca"
              className="mt-8 inline-flex rounded-full bg-route-gold px-6 py-3 font-semibold text-white"
            >
              {t("Encontre seu novo lugar ↗").replace(" ↗", "")}
              <ArrowIcon />
            </Link>
            <p className="mt-6 text-sm text-white/60">
              {t("Quartos · Suítes · Studios · Flats · Casas")}
            </p>
          </div>
          <div className="relative flex min-h-72 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#2b2929] via-ink to-[#3a261c] p-8 sm:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-orange-300/20" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-12 h-64 w-64 rounded-full border border-orange-300/15" />
            <div className="relative flex w-full flex-col items-start justify-between">
              <Image
                src="/brand/andre-mendes-icon.svg"
                width={72}
                height={72}
                alt=""
                unoptimized
                className="rounded-2xl"
              />
              <div className="mt-12">
                <p className="text-xs font-semibold uppercase tracking-[.22em] text-orange-300">
                  ANDRÉ MENDES · LONDON ROOMS
                </p>
                <p className="mt-3 font-display text-4xl leading-tight text-white sm:text-5xl">
                  {t("Uma nova fase.")}
                  <br />
                  <span className="text-orange-300">{t("Um novo endereço.")}</span>
                </p>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
                  {t("Explore as opções disponíveis ou conte o que você procura.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4">
        <section id="busca" className="relative -mt-4 mb-16 scroll-mt-24">
          <h2 className="sr-only">{t("Busque seu imóvel")}</h2>
          <QuickSearchForm types={types} regions={regions} />
        </section>
        <section className="mb-20">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-route-gold">
                {t("Encontre seu lugar")}
              </p>
              <h2 className="mt-2 font-display text-4xl">
                {t("Imóveis disponíveis")}
              </h2>
            </div>
            <Link
              href="/imoveis"
              className="text-sm font-semibold underline underline-offset-4"
            >
              {t("Ver catálogo ↗").replace(" ↗", "")}
              <ArrowIcon />
            </Link>
          </div>
          {unavailable ? (
            <p
              role="status"
              className="rounded-2xl border border-black/10 p-6 text-slate-soft"
            >
              {t(
                "Catálogo temporariamente indisponível. Você pode enviar suas preferências pelo WhatsApp.",
              )}
            </p>
          ) : (
            <PropertyGrid properties={available} />
          )}
        </section>
        <section id="como-funciona" className="mb-20 scroll-mt-28">
          <p className="text-xs font-semibold uppercase tracking-widest text-route-gold">
            {t("Do primeiro contato à mudança")}
          </p>
          <h2 className="mt-2 font-display text-4xl">
            {t("Seu próximo passo, com clareza.")}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              [
                "Escolha seu espaço",
                "Filtre por região, tipo e data. Veja fotos e informações de cada anúncio.",
              ],
              [
                "Converse com a gente",
                "Confirme disponibilidade, valores, depósito e condições pelo WhatsApp.",
              ],
              [
                "Combine os próximos passos",
                "Agende uma visita e confirme os detalhes antes de decidir.",
              ],
            ].map(([title, text], i) => (
              <article key={title} className="border-t border-black/15 py-6">
                <span className="text-sm text-route-gold">0{i + 1}</span>
                <h3 className="mt-4 text-xl font-semibold">{t(title)}</h3>
                <p className="mt-3 leading-relaxed text-slate-soft">
                  {t(text)}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="mb-20 rounded-3xl bg-ink p-8 text-white sm:p-12">
          <h2 className="font-display text-4xl">
            {t("Mais clareza para escolher melhor.")}
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              [
                "Fotos dos anúncios",
                "Explore as fotografias de cada imóvel e confirme os detalhes na visita.",
              ],
              [
                "Atendimento próximo",
                "Conte sua rotina, sua região preferida e o que precisa no novo espaço.",
              ],
              [
                "Condições antes da decisão",
                "Valores e regras variam por imóvel. Confirme entrada, depósito e datas no atendimento.",
              ],
            ].map(([title, text]) => (
              <div key={title}>
                <h3 className="font-semibold text-orange-300">{t(title)}</h3>
                <p className="mt-3 leading-relaxed text-white/70">{t(text)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mb-20 grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-route-gold">
              {t("Uma busca mais pessoal")}
            </p>
            <h2 className="mt-3 font-display text-4xl">
              {t("O que você procura?")}
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-slate-soft">
              {t(
                "Envie suas preferências pelo WhatsApp. Se sua mudança ainda está longe, podemos acompanhar sua procura, sem promessa de reserva antecipada.",
              )}
            </p>
          </div>
          <LeadForm />
        </section>
        <section className="mb-16">
          <h2 className="mb-6 font-display text-4xl">{t("Antes de mudar")}</h2>
          {[
            [
              "Já preciso morar em Londres?",
              "Não. Atendemos quem já mora em Londres e quem está planejando chegar, de qualquer nacionalidade. Conte sua situação e a data prevista para entendermos sua procura.",
            ],
            [
              "As contas estão incluídas?",
              "Depende do imóvel. Confira o anúncio e confirme contas, depósito e demais condições com a equipe.",
            ],
            [
              "Posso reservar com dois meses de antecedência?",
              "A disponibilidade muda. Podemos acompanhar sua procura, mas não prometemos reservas antecipadas.",
            ],
          ].map(([q, a]) => (
            <details key={q} className="border-b border-black/10 py-5">
              <summary className="cursor-pointer font-semibold">{t(q)}</summary>
              <p className="mt-3 max-w-3xl leading-relaxed text-slate-soft">
                {t(a)}
              </p>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
