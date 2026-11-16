import { getTranslator } from "@/lib/i18n-server";
const OCCUPANCY_LABELS: Record<string, string> = {
  single: "Single",
  couple: "Casal",
  family: "Família",
};

export default async function QuickSearchForm({
  types,
  regions,
}: {
  types: string[];
  regions: string[];
}) {
  const t = await getTranslator();
  return (
    <form
      action="/imoveis"
      method="get"
      className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-lg sm:grid-cols-3 lg:grid-cols-5"
    >
      <select
        aria-label={t("Tipo de imóvel")}
        name="type"
        defaultValue=""
        className="field col-span-1"
      >
        <option value="">{t("Tipo")}</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select
        aria-label={t("Ocupação")}
        name="occupancy"
        defaultValue=""
        className="field col-span-1"
      >
        <option value="">{t("Pessoas")}</option>
        {Object.entries(OCCUPANCY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {t(label)}
          </option>
        ))}
      </select>

      <select
        aria-label={t("Região")}
        name="region"
        defaultValue=""
        className="field col-span-1"
      >
        <option value="">{t("Região")}</option>
        {regions.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="maxPrice">
        {t("Preço máximo (£)")}
      </label>
      <input
        id="maxPrice"
        type="number"
        name="maxPrice"
        placeholder={t("Preço máximo (£)")}
        aria-label={t(
          "Preço máximo em libras no período indicado em cada anúncio",
        )}
        min={0}
        className="field col-span-1"
      />

      <input
        aria-label={t("Disponível até")}
        type="date"
        name="availableFrom"
        className="field col-span-1"
      />

      <select
        name="priceFrequency"
        aria-label={t("Período")}
        defaultValue={"week"}
        className="field"
      >
        <option value="week">{t("Por semana")}</option>
        <option value="month">{t("Por mês")}</option>
      </select>
      <button
        type="submit"
        className="col-span-2 rounded-lg bg-route-gold px-4 py-2.5 font-semibold text-white transition hover:bg-route-gold/90 sm:col-span-3 lg:col-span-5"
      >
        {t("Encontrar imóveis")}
      </button>
    </form>
  );
}
