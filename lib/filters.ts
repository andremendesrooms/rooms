import type { PropertyFilters } from "./types";
/** URL inputs are untrusted. Invalid/repeated values must not poison catalogue queries. */
export function parsePropertyFilters(
  params: Record<string, unknown>,
): PropertyFilters {
  const text = (key: string) =>
    typeof params[key] === "string" && (params[key] as string).length <= 120
      ? (params[key] as string).trim()
      : "";
  const budget = text("maxPrice");
  const date = text("availableFrom");
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date;
  return {
    type: text("type") || undefined,
    region: text("region") || undefined,
    occupancy: ["single", "couple", "family"].includes(text("occupancy"))
      ? text("occupancy")
      : undefined,
    maxPrice:
      budget && Number.isFinite(Number(budget)) && Number(budget) >= 0
        ? Number(budget)
        : undefined,
    priceFrequency: text("priceFrequency") === "month" ? "month" : "week",
    availableFrom: validDate ? date : undefined,
  };
}
