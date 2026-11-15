import QuickSearchForm from '@/components/QuickSearchForm';
import PropertyGrid from '@/components/PropertyGrid';
import {
  getAvailableRegions,
  getAvailableTypes,
  getFeaturedProperties,
  getNewProperties,
  getProperties,
} from '@/lib/queries';

// Disponibilidade muda o tempo todo — nunca cachear estaticamente esta página.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [types, regions, featured, latest, available] = await Promise.all([
    getAvailableTypes(),
    getAvailableRegions(),
    getFeaturedProperties(6),
    getNewProperties(6),
    getProperties({}, 9),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <section className="relative -mx-4 mb-10 bg-ink px-4 pb-14 pt-10 text-paper sm:mx-0 sm:rounded-b-3xl sm:px-8">
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">
          Encontre seu próximo imóvel em Londres.
        </h1>
        <p className="mt-2 max-w-xl text-paper/80">
          Quartos, studios, flats e casas — feito para brasileiros que estão de mudança para
          Londres.
        </p>
        <div className="mt-6">
          <QuickSearchForm types={types} regions={regions} />
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-display text-2xl text-ink">Destaques</h2>
          <PropertyGrid properties={featured} />
        </section>
      )}

      {latest.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-display text-2xl text-ink">Novidades</h2>
          <PropertyGrid properties={latest} />
        </section>
      )}

      <section>
        <h2 className="mb-4 font-display text-2xl text-ink">Imóveis disponíveis</h2>
        <PropertyGrid properties={available} />
      </section>
    </div>
  );
}
