import { getTranslator } from "@/lib/i18n-server";
import PropertyCard from "./PropertyCard";
import type { PropertyWithPhotos } from "@/lib/types";

export default async function PropertyGrid({
  properties,
  emptyMessage = "Nenhum imóvel encontrado com esses filtros no momento.",
}: {
  properties: PropertyWithPhotos[];
  emptyMessage?: string;
}) {
  const t = await getTranslator();
  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center text-slate-soft">
        {t(emptyMessage)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
