import PropertyCard from './PropertyCard';
import { getTranslator } from '@/lib/i18n-server';
import type { NearbyEntry } from '@/lib/nearby';

function mapsDirections(origin: string, destination: string): string {
  const parameters = new URLSearchParams({
    api: '1',
    origin: origin + ', London, United Kingdom',
    destination: destination + ', London, United Kingdom',
    travelmode: 'transit',
  });
  return 'https://www.google.com/maps/dir/?' + parameters.toString();
}

export default async function NearbyPropertyGrid({
  entries,
  near,
}: {
  entries: NearbyEntry[];
  near: string;
}) {
  const t = await getTranslator();
  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center text-slate-soft">
        {t('Nenhum imóvel corresponde a esses critérios. Experimente aumentar o orçamento ou ampliar a área.')}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(({ property, distanceKm }) => (
        <div key={property.id} className="flex flex-col gap-2">
          <PropertyCard property={property} />
          <div className="rounded-xl border border-black/5 bg-white px-4 py-3 text-xs text-slate-soft">
            {distanceKm == null
              ? <p>{t('Distância indisponível para este imóvel')}</p>
              : <p className="font-semibold text-ink">
                  {distanceKm < 1
                    ? Math.round(distanceKm * 1000) + ' m'
                    : distanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km'}
                  {' · '}{t('em linha reta (aproximadamente)')}
                </p>
            }
            {property.postcode && (
              <a href={mapsDirections(near, property.postcode)}
                target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex font-semibold text-route-gold underline underline-offset-2">
                {t('Ver trajeto no Google Maps')}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
