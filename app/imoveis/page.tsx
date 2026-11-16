import { getTranslator } from "@/lib/i18n-server";

import FilterBar from "@/components/FilterBar";
import PropertyGrid from "@/components/PropertyGrid";
import TrackSearch from "@/components/TrackSearch";
import {
  getAvailableRegions,
  getAvailableTypes,
  getProperties,
} from "@/lib/queries";
import { parsePropertyFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    occupancy?: string;
    region?: string;
    maxPrice?: string;
    priceFrequency?: string;
    availableFrom?: string;
  }>;
}

export default async function ImoveisPage({ searchParams }: PageProps) {
  const t = await getTranslator();
  const params = await searchParams;

  const filters = parsePropertyFilters(params);

  let unavailable = false;
  const [types, regions, properties] = await Promise.all([
    getAvailableTypes(),
    getAvailableRegions(),
    getProperties(filters, 48),
  ]).catch(() => {
    unavailable = true;
    return [[], [], []] as [
      string[],
      string[],
      import("@/lib/types").PropertyWithPhotos[],
    ];
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 font-display text-2xl text-ink">
        {t("Imóveis disponíveis")}
      </h1>
      <FilterBar types={types} regions={regions} current={params} />
      {unavailable ? (
        <p role="status">
          {t(
            "Catálogo temporariamente indisponível. Você pode enviar suas preferências pelo WhatsApp.",
          )}
        </p>
      ) : (
        <PropertyGrid properties={properties} />
      )}
      {!unavailable && (
        <TrackSearch filters={filters} resultCount={properties.length} />
      )}
    </div>
  );
}
