import { getTranslator } from "@/lib/i18n-server";
const OCCUPANCY_LABELS: Record<string, string> = {
  single: "Single",
  couple: "Casal",
  family: "Família",
};

export default async function FilterBar({
  types,
  regions,
  current,
}: {
  types: string[];
  regions: string[];
  current: {
    type?: string;
    occupancy?: string;
    region?: string;
    maxPrice?: string;
    priceFrequency?: string;
    availableFrom?: string;
  };
}) {
  const t = await getTranslator();
  return (
    <form
      action="/imoveis"
      method="get"
      className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-black/5 bg-white p-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      <select
        aria-label={t("Tipo de imóvel")}
        name="type"
        defaultValue={current.type ?? ""}
        className="field"
      >
        <option value="">{t("Todos os tipos")}</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select
        aria-label={t("Ocupação")}
        name="occupancy"
        defaultValue={current.occupancy ?? ""}
        className="field"
      >
        <option value="">{t("Qualquer ocupação")}</option>
        {Object.entries(OCCUPANCY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {t(label)}
          </option>
        ))}
      </select>

      <select
        aria-label={t("Região")}
        name="region"
        defaultValue={current.region ?? ""}
        className="field"
      >
        <option value="">{t("Todas as regiões")}</option>
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
        aria-label={t("Preço máximo (£)")}
        defaultValue={current.maxPrice ?? ""}
        min={0}
        className="field"
      />

      <input
        aria-label={t("Disponível até")}
        type="date"
        name="availableFrom"
        defaultValue={current.availableFrom ?? ""}
        className="field"
      />

      <select
        name="priceFrequency"
        aria-label={t("Período")}
        defaultValue={current.priceFrequency ?? "week"}
        className="field"
      >
        <option value="week">{t("Por semana")}</option>
        <option value="month">{t("Por mês")}</option>
      </select>
      <button
        type="submit"
        className="col-span-2 rounded-lg bg-ink px-4 py-2 font-medium text-paper transition hover:bg-ink/90 sm:col-span-1"
      >
        {t("Filtrar")}
      </button>
    </form>
  );
}
