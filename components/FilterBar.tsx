const OCCUPANCY_LABELS: Record<string, string> = {
  single: 'Single',
  couple: 'Casal',
  family: 'Família',
};

export default function FilterBar({
  types,
  regions,
  current,
}: {
  types: string[];
  regions: string[];
  current: { type?: string; occupancy?: string; region?: string; maxPrice?: string; availableFrom?: string };
}) {
  return (
    <form
      action="/imoveis"
      method="get"
      className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-black/5 bg-white p-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      <select name="type" defaultValue={current.type ?? ''} className="field">
        <option value="">Todos os tipos</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select name="occupancy" defaultValue={current.occupancy ?? ''} className="field">
        <option value="">Qualquer ocupação</option>
        {Object.entries(OCCUPANCY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select name="region" defaultValue={current.region ?? ''} className="field">
        <option value="">Todas as regiões</option>
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
        defaultValue={current.maxPrice ?? ''}
        min={0}
        className="field"
      />

      <input
        type="date"
        name="availableFrom"
        defaultValue={current.availableFrom ?? ''}
        className="field"
      />

      <button
        type="submit"
        className="col-span-2 rounded-lg bg-ink px-4 py-2 font-medium text-paper transition hover:bg-ink/90 sm:col-span-1"
      >
        Filtrar
      </button>
    </form>
  );
}
