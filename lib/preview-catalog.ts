import type { PropertyFilters, PropertyWithPhotos } from "./types";

// EXCLUSIVAMENTE PARA O DEPLOY PREVIEW. Dados selecionados da lista fornecida
// pelo proprietário em 18/11/2026; NÃO são disponibilidade confirmada.
// Não vincular fotos, landlords, clientes, chaves, analytics ou WhatsApp.
// Esta amostra NÃO substitui o banco de produção nem o catálogo completo.
export const isVisualPreview = process.env.NEXT_PUBLIC_PREVIEW_VISUAL_MODE === "1";

type PreviewRow = [
  slug: string, type: string, region: string, postcode: string,
  price: number, availableFrom: string | null, notes: string
];
const rows: PreviewRow[] = [
  [
    "sw17-9na",
    "Double",
    "Tooting Broadway",
    "SW17 9NA",
    210,
    "2026-11-23",
    "£210/semana para 1 pessoa; £240/semana para casal. Casa com dois banheiros. Pagamento quinzenal."
  ],
  [
    "sw17-9pd",
    "Double",
    "Tooting Broadway",
    "SW17 9PD",
    200,
    "2026-12-09",
    "£200/semana para 1 pessoa; £250/semana para casal. Pagamento quinzenal."
  ],
  [
    "sw17-0qq",
    "Single",
    "Tooting Broadway",
    "SW17 0QQ",
    190,
    null,
    "Gilbey Road. Data de disponibilidade a confirmar. Pagamento quinzenal."
  ],
  [
    "sw16-1qe",
    "Double",
    "Streatham",
    "SW16 1QE",
    200,
    null,
    "Double para uma pessoa. Anunciado como entrada imediata na lista de 18/11."
  ],
  [
    "sm4-5sh",
    "Double",
    "Morden",
    "SM4 5SH",
    190,
    "2026-12-06",
    "£190/semana para uma pessoa; £230/semana para casal. Central Gardens; pagamento quinzenal."
  ],
  [
    "sm4-5hh",
    "Quarto",
    "Morden",
    "SM4 5HH",
    170,
    null,
    "Tipo e ocupação a confirmar. Pagamento quinzenal; verificar disponibilidade."
  ],
  [
    "sw16-2tz",
    "Single",
    "Streatham",
    "SW16 2TZ",
    175,
    "2026-11-24",
    "Single anunciado para 24/11; disponibilidade sujeita a confirmação."
  ],
  [
    "sw16-5dy",
    "En-suite",
    "Streatham",
    "SW16 5DY",
    270,
    null,
    "Suíte, unidade 4. Anunciada como entrada imediata, sujeita a confirmação."
  ],
  [
    "sw16-5ug",
    "En-suite",
    "Streatham",
    "SW16 5UG",
    270,
    null,
    "Suíte, unidade 5. Anunciada como entrada imediata, sujeita a confirmação."
  ],
  [
    "se15-1jf-7",
    "Single",
    "Elephant & Castle",
    "SE15 1JF",
    170,
    null,
    "Unidade 7, ocupação de uma pessoa. Disponibilidade a confirmar."
  ],
  [
    "se15-1jf-8",
    "Single",
    "Elephant & Castle",
    "SE15 1JF",
    170,
    "2026-11-28",
    "Unidade 8, ocupação de uma pessoa. Disponibilidade a confirmar."
  ],
  [
    "nw2-3jg",
    "Single",
    "Cricklewood",
    "NW2 3JG",
    155,
    "2026-11-28",
    "Single anunciado para 28/11. Confirmar condições."
  ],
  [
    "nw2-7dl",
    "Single",
    "Neasden",
    "NW2 7DL",
    170,
    null,
    "Quarto individual, unidade 1. Disponibilidade a confirmar."
  ],
  [
    "nw10-2el-1",
    "Studio",
    "Dollis Hill",
    "NW10 2EL",
    340,
    null,
    "Studio, unidade 1. Disponibilidade a confirmar."
  ],
  [
    "nw10-2el-4",
    "Studio",
    "Dollis Hill",
    "NW10 2EL",
    370,
    "2026-11-28",
    "Studio, unidade 4, anunciado para 28/11."
  ],
  [
    "n7-6bl-a2",
    "Studio",
    "Holloway",
    "N7 6BL",
    330,
    null,
    "Studio, unidade A2. Disponibilidade a confirmar."
  ],
  [
    "n9-8pe",
    "En-suite",
    "Edmonton",
    "N9 8PE",
    270,
    null,
    "Suíte, unidade 1, para duas pessoas. Disponibilidade a confirmar."
  ],
  [
    "w3-6lh",
    "En-suite",
    "Ealing",
    "W3 6LH",
    270,
    null,
    "Suíte, unidade D2, para duas pessoas. Disponibilidade a confirmar."
  ],
  [
    "sw18-4ld",
    "Flat",
    "Wandsworth",
    "SW18 4LD",
    490,
    "2026-11-21",
    "Flat de 1 quarto, unidade Flat 1. Depósito de quatro semanas, parcelamento possível."
  ],
  [
    "nw4-3sr",
    "Flat",
    "Hendon",
    "NW4 3SR",
    650,
    "2026-11-22",
    "Flat de 2 quartos, unidade 3, para quatro pessoas."
  ],
  [
    "sw16-3sj",
    "Flat",
    "Streatham",
    "SW16 3SJ",
    450,
    "2026-12-10",
    "Flat de 1 quarto. Localização e disponibilidade a reconfirmar."
  ],
  [
    "sw16-5rz-2",
    "Studio",
    "Streatham",
    "SW16 5RZ",
    320,
    null,
    "Studio, unidade 2, para duas pessoas. Disponibilidade a confirmar."
  ],
  [
    "se6-1es",
    "En-suite",
    "Lewisham",
    "SE6 1ES",
    270,
    null,
    "Suíte, unidade 1, para duas pessoas. Disponibilidade a confirmar."
  ]
];

const timestamp = "2026-11-18T00:00:00.000Z";
export const previewProperties: PropertyWithPhotos[] = rows.map(
  ([slug, type, region, postcode, price, availableFrom, notes]) => ({
    id: "preview-" + slug,
    type, subtype: null,
    title: type + " · " + region + " · " + postcode,
    price, price_frequency: "week",
    bedrooms: type === "Flat" ? (slug === "nw4-3sr" ? 2 : 1) : null,
    bathrooms: null,
    occupancy: null,
    postcode, region, london_zone: null, nearest_station: null,
    available_from: availableFrom, minimum_stay: null,
    move_in_conditions: null, deposit: null, bills_included: true,
    furnished: null, garden: null, balcony: null, parking: null,
    gym: null, concierge: null, lift: null,
    description: notes + "\nAmostra da lista de 18/11/2026 para avaliação visual. Preço e disponibilidade precisam de confirmação; não é anúncio ativo.",
    featured: false, status: "available",
    created_at: timestamp, updated_at: timestamp, photos: [],
  })
);

export function getPreviewProperties(filters: PropertyFilters = {}, limit = 24): PropertyWithPhotos[] {
  return previewProperties.filter(property => {
    if (filters.type && property.type !== filters.type) return false;
    if (filters.region && property.region !== filters.region) return false;
    if (filters.occupancy && property.occupancy !== filters.occupancy) return false;
    if (filters.maxPrice != null && (property.price === null ||
      property.price > filters.maxPrice ||
      property.price_frequency !== (filters.priceFrequency === "month" ? "month" : "week"))) return false;
    if (filters.minBedrooms && (property.bedrooms ?? 0) < filters.minBedrooms) return false;
    if (filters.availableFrom && (!property.available_from || property.available_from > filters.availableFrom)) return false;
    return true;
  }).slice(0, limit);
}
