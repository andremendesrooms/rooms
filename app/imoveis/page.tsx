import { getTranslator } from "@/lib/i18n-server";

import FilterBar from "@/components/FilterBar";
import PropertyGrid from "@/components/PropertyGrid";
import NearbyPropertyGrid from "@/components/NearbyPropertyGrid";
import TrackSearch from "@/components/TrackSearch";
import {
  getAvailableSearchOptions,
  getProperties,
} from "@/lib/queries";
import { parsePropertyFilters } from "@/lib/filters";
import { resolveLondonLocation, resolvePropertyPostcodes } from "@/lib/nearby-service";
import { selectAreaAlternatives } from "@/lib/nearby";
import type { AreaSearchResult } from "@/lib/nearby";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    occupancy?: string;
    region?: string;
    near?: string;
    maxPrice?: string;
    priceFrequency?: string;
    availableFrom?: string;
  }>;
}

export default async function ImoveisPage({ searchParams }: PageProps) {
  const t = await getTranslator();
  const params = await searchParams;
  const near = typeof params.near === "string" && params.near.length <= 80
    ? params.near.trim() : "";
  const filters = parsePropertyFilters(params);

  let unavailable = false;
  const [options, properties] = await Promise.all([
    getAvailableSearchOptions(),
    // Consultar um conjunto maior quando a pessoa pede proximidade. A busca
    // continua limitada à VIEW pública, sem acesso às tabelas administrativas.
    // A região exata não pode eliminar imóveis dos bairros vizinhos.
    getProperties(near ? { ...filters, region: undefined } : filters, near ? 200 : 48),
  ]).catch(() => {
    unavailable = true;
    return [
      { types: [], regions: [] },
      [] as import("@/lib/types").PropertyWithPhotos[],
    ] as const;
  });
  const { types, regions } = options;

  let result: AreaSearchResult = {
    kind: "empty", entries: [], radiusKm: null, located: 0,
  };

  if (!unavailable && near) {
    const location = await resolveLondonLocation(near);
    const coordinates = location
      ? await resolvePropertyPostcodes(properties.map(p => p.postcode))
      : new Map();
    result = selectAreaAlternatives(
      properties, near, location?.point ?? null, coordinates, 12,
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 font-display text-2xl text-ink">
        {t("Imóveis disponíveis")}
      </h1>
      <FilterBar types={types} regions={regions} current={params} />

      {near && !unavailable && (
        <section className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4"
          aria-live="polite">
          <h2 className="text-lg font-semibold text-ink">
            {result.kind === "exact"
              ? <>{t("Encontramos imóveis na região solicitada:")} {near}</>
              : result.kind === "nearby"
                ? <>{t("Não encontramos imóveis no local solicitado:")} {near}</>
                : result.kind === "distant"
                  ? <>{t("Não encontramos imóveis próximos de")} {near}</>
                  : result.kind === "text"
                    ? <>{t("Encontramos correspondências para")} {near}</>
                    : <>{t("Nenhum imóvel encontrado para")} {near}</>}
          </h2>
          <p className="mt-1 text-sm text-slate-soft">
            {result.kind === "nearby"
              ? <>{t("Estas são as opções reais disponíveis nos arredores, até")} {result.radiusKm} {t("km em linha reta. Veja o trajeto de transporte público no Google Maps.")}</>
              : result.kind === "exact"
                ? t("Estas opções correspondem ao local que você procurou.")
                : result.kind === "distant"
                  ? t("Não temos opções nos arredores imediatos. Veja os imóveis mais próximos do catálogo, mesmo que sejam mais distantes.")
                  : result.kind === "text"
                    ? t("A estação ou região não pôde ser localizada no mapa. Estas são correspondências pelo nome, sem distância confirmada.")
                    : t("Não encontramos opções que atendam aos filtros ou não foi possível localizar a região. Tente informar uma estação ou postcode completo.")}
          </p>
          <p className="mt-2 text-xs text-slate-soft">
            {t("A busca considera apenas anúncios disponíveis que atendem aos demais filtros.")}
          </p>
        </section>
      )}

      {unavailable ? (
        <p role="status">
          {t(
            "Catálogo temporariamente indisponível. Você pode enviar suas preferências pelo WhatsApp.",
          )}
        </p>
      ) : near ? (
        <NearbyPropertyGrid entries={result.entries} near={near} />
      ) : (
        <PropertyGrid properties={properties} />
      )}

      {!unavailable && (
        <TrackSearch filters={{ ...filters, region: near ? undefined : filters.region, near: near || undefined }}
          resultCount={near ? result.entries.length : properties.length} />
      )}
    </div>
  );
}
