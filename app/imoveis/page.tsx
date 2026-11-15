
import FilterBar from '@/components/FilterBar';
import PropertyGrid from '@/components/PropertyGrid';
import TrackSearch from '@/components/TrackSearch';
import {
  getAvailableRegions,
  getAvailableTypes,
  getProperties,
} from '@/lib/queries';
import type { PropertyFilters } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    type?: string;
    occupancy?: string;
    region?: string;
    maxPrice?: string;
    availableFrom?: string;
  }>;
}

export default async function ImoveisPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: PropertyFilters = {
    type: params.type || undefined,
    occupancy: params.occupancy || undefined,
    region: params.region || undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    availableFrom: params.availableFrom || undefined,
  };

  const [types, regions, properties] = await Promise.all([
    getAvailableTypes(),
    getAvailableRegions(),
    getProperties(filters, 48),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 font-display text-2xl text-ink">
        Imóveis disponíveis
      </h1>
      <FilterBar types={types} regions={regions} current={params} />
      <PropertyGrid properties={properties} />
      <TrackSearch filters={filters} resultCount={properties.length} />
    </div>
  );
}
