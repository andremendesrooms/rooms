import ArrowIcon from "@/components/ArrowIcon";
import { getTranslator } from "@/lib/i18n-server";
import Image from "next/image";
import Link from "next/link";
import Badge from "./Badge";
import WhatsAppButton from "./WhatsAppButton";
import { formatPrice, propertyLabel } from "@/lib/format";
import type { PropertyWithPhotos } from "@/lib/types";

export default async function PropertyCard({
  property,
}: {
  property: PropertyWithPhotos;
}) {
  const t = await getTranslator();
  const cover = property.photos[0];

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:shadow-md">
      <Link
        href={`/property/${property.id}`}
        aria-label={property.title || propertyLabel(property)}
        className="relative block aspect-[4/3] w-full bg-slate-soft/10"
      >
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
            {t("Foto a confirmar")}
          </div>
        )}
        {property.featured && (
          <div className="absolute left-3 top-3">
            <Badge variant="gold">{t("⭐ Destaque")}</Badge>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="font-mono text-lg font-semibold text-ink">
          {formatPrice(property.price, property.price_frequency, t)}
        </p>
        <p className="text-sm font-semibold">
          <Link href={`/property/${property.id}`} className="hover:underline">
            {property.title || propertyLabel(property)}
          </Link>
        </p>
        <p className="text-sm text-slate-soft">
          {property.type} ·{" "}
          {[property.postcode, property.region].filter(Boolean).join(" · ")}
        </p>
        <p className="text-xs text-slate-soft">
          {property.available_from
            ? `${t("Disponível a partir de")} ${property.available_from.split("-").reverse().join("/")}`
            : t("Data a confirmar")}
          {property.occupancy
            ? ` · ${t({ single: "Individual", couple: "Casal", family: "Família" }[property.occupancy])}`
            : ""}
        </p>
        {property.bedrooms != null && (
          <p className="text-xs text-slate-soft">
            {property.bedrooms}{" "}
            {property.bedrooms === 1 ? t("quarto") : t("quartos")}
            {property.bathrooms != null &&
              ` · ${property.bathrooms} ${property.bathrooms === 1 ? t("banheiro") : t("banheiros")}`}
          </p>
        )}
        <WhatsAppButton
          propertyId={property.id}
          title={property.title}
          className="mt-4 inline-flex justify-center rounded-full border border-route-gold px-4 py-2 text-sm font-semibold text-route-gold"
        >
          {t("Consultar pelo WhatsApp ↗").replace(" ↗", "")}
          <ArrowIcon />
        </WhatsAppButton>
      </div>
    </article>
  );
}
