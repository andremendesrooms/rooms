import { getTranslator } from "@/lib/i18n-server";
import Image from "next/image";
import Badge from "@/components/Badge";
import PropertyGrid from "@/components/PropertyGrid";
import TrackPageView from "@/components/TrackPageView";
import WhatsAppButton from "@/components/WhatsAppButton";
import { formatPrice, propertyLabel } from "@/lib/format";
import { getNewProperties, getPropertyById } from "@/lib/queries";

export const dynamic = "force-dynamic";

const FEATURE_LABELS: Record<string, string> = {
  bills_included: "Bills included",
  furnished: "Mobiliado",
  garden: "Jardim",
  balcony: "Varanda",
  parking: "Estacionamento",
  gym: "Academia",
  concierge: "Concierge",
  lift: "Elevador",
};

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslator();
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) {
    // Não dá para saber, só com dado público, se o ID nunca existiu ou se o
    // imóvel foi alugado e saiu de `properties_public` — nos dois casos, a
    // resposta certa é a mesma: ser honesto e oferecer o que está disponível
    // agora, em vez de simplesmente mostrar 404.
    const suggestions = await getNewProperties(4);
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-ink">
          {t("Este imóvel não está disponível no catálogo.")}
        </h1>
        <p className="mt-2 text-slate-soft">
          {t("Veja outras opções disponíveis agora:")}
        </p>
        <div className="mt-8 text-left">
          <PropertyGrid properties={suggestions} />
        </div>
      </div>
    );
  }

  const activeFeatures = Object.entries(FEATURE_LABELS).filter(
    ([key]) => property[key as keyof typeof property] === true,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-6">
      <TrackPageView propertyId={property.id} />

      <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl sm:grid-cols-4">
        {property.photos.length > 0 ? (
          property.photos.map((url, i) => (
            <div
              key={url}
              className={`relative aspect-square ${i === 0 ? "col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : ""}`}
            >
              <Image
                src={url}
                alt={propertyLabel(property)}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          ))
        ) : (
          <div className="col-span-2 flex aspect-video items-center justify-center bg-slate-soft/10 text-slate-soft sm:col-span-4">
            {t("Fotos a confirmar")}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {property.featured && <Badge variant="gold">{t("⭐ Destaque")}</Badge>}
        <span className="font-mono text-xs text-slate-soft">
          Ref. {property.id}
        </span>
      </div>

      <h1 className="mt-2 font-display text-3xl text-ink">
        {propertyLabel(property)}
      </h1>
      <p className="mt-1 font-mono text-2xl font-semibold text-route-gold">
        {formatPrice(property.price, property.price_frequency, t)}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {property.bedrooms != null && (
          <div>
            <dt className="text-slate-soft">{t("Quartos")}</dt>
            <dd className="font-medium text-ink">{property.bedrooms}</dd>
          </div>
        )}
        {property.bathrooms != null && (
          <div>
            <dt className="text-slate-soft">{t("Banheiros")}</dt>
            <dd className="font-medium text-ink">{property.bathrooms}</dd>
          </div>
        )}
        {property.occupancy && (
          <div>
            <dt className="text-slate-soft">{t("Ocupação")}</dt>
            <dd className="font-medium text-ink capitalize">
              {t(
                { single: "Individual", couple: "Casal", family: "Família" }[
                  property.occupancy
                ],
              )}
            </dd>
          </div>
        )}
        {property.available_from && (
          <div>
            <dt className="text-slate-soft">{t("Disponível a partir de")}</dt>
            <dd className="font-medium text-ink">
              {property.available_from.split("-").reverse().join("/")}
            </dd>
          </div>
        )}
        {property.deposit != null && (
          <div>
            <dt className="text-slate-soft">{t("Depósito")}</dt>
            <dd className="font-medium text-ink">
              {formatPrice(property.deposit, null, t)}
            </dd>
          </div>
        )}
        {property.minimum_stay && (
          <div>
            <dt className="text-slate-soft">{t("Estadia mínima")}</dt>
            <dd className="font-medium text-ink">{property.minimum_stay}</dd>
          </div>
        )}
      </dl>

      {activeFeatures.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {activeFeatures.map(([key, label]) => (
            <span
              key={key}
              className="rounded-full bg-route-green/10 px-3 py-1 text-xs font-medium text-route-green"
            >
              {t(label)}
            </span>
          ))}
        </div>
      )}

      {property.description && (
        <div className="mt-8">
          <h2 className="mb-2 font-display text-xl text-ink">
            {t("Descrição")}
          </h2>
          <p className="whitespace-pre-line text-slate-soft">
            {property.description}
          </p>
        </div>
      )}

      {/* CTA fixo no mobile — sempre acessível sem precisar rolar até o fim */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/95 p-3 backdrop-blur sm:static sm:mt-10 sm:border-0 sm:bg-transparent sm:p-0">
        <WhatsAppButton
          propertyId={property.id}
          title={property.title}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-route-green px-5 py-3 font-semibold text-white transition hover:bg-route-green/90 sm:w-auto"
        >
          {t("QUERO ESTE IMÓVEL")}
        </WhatsAppButton>
      </div>
    </div>
  );
}
