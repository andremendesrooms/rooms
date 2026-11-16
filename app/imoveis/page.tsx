import { getTranslator } from "@/lib/i18n-server";

import FilterBar from "@/components/FilterBar";
import PropertyGrid from "@/components/PropertyGrid";
import NearbyPropertyGrid from "@/components/NearbyPropertyGrid";
import TrackSearch from "@/components/TrackSearch";
import {
  getAvailableRegions,
  getAvailableTypes,
  getProperties,
} from "@/lib/queries";
import { parsePropertyFilters } from "@/lib/filters";
import { resolveLondonLocation, resolvePropertyPostcodes } from "@/lib/nearby-service";
import { rankNearbyProperties, rankTextNearby } from "@/lib/nearby";
import type { NearbyEntry } from "@/lib/nearby";

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
  const [types, regions, properties] = await Promise.all([
    getAvailableTypes(),
    getAvailableRegions(),
    // Consultar um conjunto maior quando a pessoa pede proximidade. A busca
    // continua limitada à VIEW pública, sem acesso às tabelas administrativas.
    getProperties(filters, near ? 200 : 48),
  ]).catch(() => {
    unavailable = true;
    return [[], [], []] as [
      string[],
      string[],
      import("@/lib/types").PropertyWithPhotos[],
    ];
  });

  let nearby: NearbyEntry[] = [];
  let match: "geographic" | "text" | "none" = "none";
  let resolvedLabel = near;
  let located = 0;

  if (!unavailable && near) {
    const origin = await resolveLondonLocation(near);
    if (origin) {
      const coordinates = await resolvePropertyPostcodes(properties.map(p => p.postcode));
      const ranked = rankNearbyProperties(properties, origin.point, coordinates, undefined, 48);
      nearby = ranked.entries;
      located = ranked.located;
      resolvedLabel = origin.label;
      match = located ? "geographic" : "text";
      if (!located) nearby = rankTextNearby(properties, near);
    } else {
      nearby = rankTextNearby(properties, near);
      match = "text";
    }
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
            {t("Imóveis próximos de")} {resolvedLabel}
          </h2>
          <p className="mt-1 text-sm text-slate-soft">
            {match === "geographic"
              ? t("Ordenados por proximidade geográfica aproximada, não pelo tempo de viagem. Abra o Google Maps para comparar metrô, trem e ônibus.")
              : t("Não foi possível calcular a distância deste local. Veja as correspondências de nome e abra o Google Maps para conferir a ligação de transporte.")}
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
        <NearbyPropertyGrid entries={nearby} near={near} />
      ) : (
        <PropertyGrid properties={properties} />
      )}

      {!unavailable && (
        <TrackSearch filters={{ ...filters, near: near || undefined }}
          resultCount={near ? nearby.length : properties.length} />
      )}
    </div>
  );
}
