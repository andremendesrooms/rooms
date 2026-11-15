const OCCUPANCY_LABELS: Record<string, string> = {
  single: 'Single',
  couple: 'Casal',
  family: 'Família',
};

export default function QuickSearchForm({
  types,
  regions,
}: {
  types: string[];
  regions: string[];
}) {
  return (
    <form
      action="/imoveis"
      method="get"
      className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-lg sm:grid-cols-3 lg:grid-cols-5"
    >
      <select name="type" defaultValue="" className="field col-span-1">
        <option value="">Tipo</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select name="occupancy" defaultValue="" className="field col-span-1">
        <option value="">Pessoas</option>
        {Object.entries(OCCUPANCY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select name="region" defaultValue="" className="field col-span-1">
        <option value="">Região</option>
        {regions.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>

      <input
        type="number"
        name="maxPrice"
        placeholder="Preço máximo (£)"
        min={0}
        className="field col-span-1"
      />

      <input type="date" name="availableFrom" className="field col-span-1" />

      <button
        type="submit"
        className="col-span-2 rounded-lg bg-route-gold px-4 py-2.5 font-semibold text-white transition hover:bg-route-gold/90 sm:col-span-3 lg:col-span-5"
      >
        Encontrar imóveis
      </button>
    </form>
  );
}
