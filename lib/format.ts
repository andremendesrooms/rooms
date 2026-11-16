import type { PropertyPublic } from "./types";

export function formatPrice(
  price: number | null,
  frequency: string | null,
  t: (text: string) => string = (text) => text,
): string {
  if (price == null) return t("Preço a confirmar");
  const value = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(price);
  return frequency
    ? `${value}/${t(frequency === "week" ? "semana" : "mês")}`
    : value;
}

export function whatsappLink(
  propertyId: string,
  title?: string | null,
): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  if (!/^\d{8,15}$/.test(number)) return "";
  const message = `Olá, vi o imóvel ${propertyId}${
    title ? ` (${title})` : ""
  } no site e gostaria de saber se ainda está disponível.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function propertyLabel(
  property: Pick<PropertyPublic, "type" | "subtype" | "region">,
): string {
  const kind = property.subtype || property.type;
  return property.region ? `${kind} · ${property.region}` : kind;
}
