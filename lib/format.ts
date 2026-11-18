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
  t: (text: string) => string = (text) => text,
): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  if (!/^\d{8,15}$/.test(number)) return "";
  const reference = `${propertyId}${title ? ` (${title})` : ""}`;
  const message = t(
    "Olá, vi o imóvel {reference} no site e gostaria de saber se ainda está disponível.",
  ).replace("{reference}", () => reference);
  const actualMessage = process.env.NEXT_PUBLIC_PREVIEW_VISUAL_MODE === "1"
    ? "[TESTE DA PRÉVIA — NÃO É UMA SOLICITAÇÃO DE RESERVA]\\n" + message
    : message;
  return `https://wa.me/${number}?text=${encodeURIComponent(actualMessage)}`;
}

export function propertyLabel(
  property: Pick<PropertyPublic, "type" | "subtype" | "region">,
): string {
  const kind = property.subtype || property.type;
  return property.region ? `${kind} · ${property.region}` : kind;
}
