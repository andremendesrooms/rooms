import Image from 'next/image';
import Link from 'next/link';
import Badge from './Badge';
import { formatPrice, propertyLabel } from '@/lib/format';
import type { PropertyWithPhotos } from '@/lib/types';

export default function PropertyCard({ property }: { property: PropertyWithPhotos }) {
  const cover = property.photos[0];

  return (
    <Link
      href={`/property/${property.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full bg-slate-soft/10">
        {cover ? (
          <Image
            src={cover}
            alt={propertyLabel(property)}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-soft">
            Foto a confirmar
          </div>
        )}
        {property.featured && (
          <div className="absolute left-3 top-3">
            <Badge variant="gold">⭐ Destaque</Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="font-mono text-lg font-semibold text-ink">
          {formatPrice(property.price, property.price_frequency)}
        </p>
        <p className="text-sm text-slate-soft">{propertyLabel(property)}</p>
        {property.bedrooms != null && (
          <p className="text-xs text-slate-soft">
            {property.bedrooms} {property.bedrooms === 1 ? 'quarto' : 'quartos'}
            {property.bathrooms != null &&
              ` · ${property.bathrooms} ${property.bathrooms === 1 ? 'banheiro' : 'banheiros'}`}
          </p>
        )}
      </div>
    </Link>
  );
}
