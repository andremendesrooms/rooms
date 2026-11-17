import { supabase } from "./supabase";
const PUBLIC_PROPERTY_COLUMNS = "id,type,subtype,title,price,price_frequency,bedrooms,bathrooms,occupancy,postcode,region,london_zone,nearest_station,available_from,minimum_stay,move_in_conditions,deposit,bills_included,furnished,garden,balcony,parking,gym,concierge,lift,description,featured,status,created_at,updated_at";
function publicCatalog() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    throw new Error("Catálogo não configurado.");
  return supabase.from("properties_public");
}
import type {
  PropertyPublic,
  PropertyPhoto,
  PropertyFilters,
  PropertyWithPhotos,
} from "./types";
import { isTrustedPropertyPhotoUrl } from "./photo-url";

// ----------------------------------------------------------------------------
// REGRA DE OURO: todo acesso a imóvel neste arquivo lê de `properties_public`,
// nunca de `properties`. A view deve garantir status='available', hidden=false
// e validation_status='ok'. status também é filtrado aqui. hidden e
// validation_status não são colunas públicas: o contrato da view/RLS
// precisa ser verificado no ambiente de homologação antes do lançamento.
// ----------------------------------------------------------------------------

async function attachPhotos<T extends PropertyPublic>(
  properties: T[],
): Promise<(T & { photos: string[] })[]> {
  if (properties.length === 0) return [];

  const ids = properties.map((p) => p.id);
  const { data: photos, error } = await supabase
    .from("property_photos")
    .select("property_id, url, sort_order")
    .in("property_id", ids)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[queries] erro ao buscar fotos:", error.message);
  }

  const photosByProperty = new Map<string, string[]>();
  for (const photo of (photos ?? []) as Pick<
    PropertyPhoto,
    "property_id" | "url" | "sort_order"
  >[]) {
    const list = photosByProperty.get(photo.property_id) ?? [];
    if (isTrustedPropertyPhotoUrl(photo.url)) list.push(photo.url);
    photosByProperty.set(photo.property_id, list);
  }

  return properties.map((p) => ({
    ...p,
    photos: photosByProperty.get(p.id) ?? [],
  }));
}

export async function getFeaturedProperties(
  limit = 6,
): Promise<PropertyWithPhotos[]> {
  const { data, error } = await publicCatalog()
    .select(PUBLIC_PROPERTY_COLUMNS)
    .eq("status", "available")
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[queries] erro ao buscar destaques:", error.message);
    throw new Error("Catálogo temporariamente indisponível.");
  }
  return attachPhotos((data ?? []) as PropertyPublic[]);
}

export async function getNewProperties(
  limit = 6,
): Promise<PropertyWithPhotos[]> {
  const { data, error } = await publicCatalog()
    .select(PUBLIC_PROPERTY_COLUMNS)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[queries] erro ao buscar novidades:", error.message);
    throw new Error("Catálogo temporariamente indisponível.");
  }
  return attachPhotos((data ?? []) as PropertyPublic[]);
}

export async function getProperties(
  filters: PropertyFilters = {},
  limit = 24,
): Promise<PropertyWithPhotos[]> {
  let query = publicCatalog()
    .select(PUBLIC_PROPERTY_COLUMNS)
    .eq("status", "available");

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.occupancy) query = query.eq("occupancy", filters.occupancy);
  if (filters.region) query = query.eq("region", filters.region);
  if (
    filters.maxPrice != null &&
    Number.isFinite(filters.maxPrice) &&
    filters.maxPrice >= 0
  ) {
    query = query
      .lte("price", filters.maxPrice)
      .eq(
        "price_frequency",
        filters.priceFrequency === "month" ? "month" : "week",
      );
  }
  if (filters.minBedrooms) query = query.gte("bedrooms", filters.minBedrooms);
  if (filters.availableFrom)
    query = query.lte("available_from", filters.availableFrom);

  const { data, error } = await query
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[queries] erro ao buscar imóveis:", error.message);
    throw new Error("Catálogo temporariamente indisponível.");
  }
  return attachPhotos((data ?? []) as PropertyPublic[]);
}

export async function getPropertyById(
  id: string,
): Promise<PropertyWithPhotos | null> {
  const { data, error } = await publicCatalog()
    .select(PUBLIC_PROPERTY_COLUMNS)
    .eq("status", "available")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[queries] erro ao buscar imóvel:", error.message);
    throw new Error("Catálogo temporariamente indisponível.");
  }
  if (!data) return null;

  const [withPhotos] = await attachPhotos([data as PropertyPublic]);
  return withPhotos;
}

// Filtros dinâmicos: nascem do que existe de fato em `properties_public`,
// nunca de uma lista fixa no código. Se não houver Studio hoje, Studio não
// aparece; se surgir amanhã, aparece sozinho na próxima visita.
// A home e o catálogo consultam os dois conjuntos de filtros de uma só vez.
// Esta função não usa cache persistente: disponibilidade e visibilidade são
// recalculadas em cada navegação e nunca ficam congeladas em uma CDN.
export async function getAvailableSearchOptions(): Promise<{
  types: string[];
  regions: string[];
}> {
  const { data, error } = await publicCatalog()
    .select("type,region")
    .eq("status", "available");
  if (error) throw new Error("Catálogo temporariamente indisponível.");
  const rows = data ?? [];
  return {
    types: Array.from(new Set(rows.map(row => row.type))).sort(),
    regions: Array.from(new Set(
      rows.map(row => row.region)
        .filter((region): region is string => Boolean(region)),
    )).sort(),
  };
}

export async function getAvailableTypes(): Promise<string[]> {
  const { data, error } = await publicCatalog()
    .select("type")
    .eq("status", "available");
  if (error) throw new Error("Catálogo temporariamente indisponível.");
  if (!data) return [];
  return Array.from(new Set(data.map((row) => row.type))).sort();
}

export async function getAvailableRegions(): Promise<string[]> {
  const { data, error } = await publicCatalog()
    .select("region")
    .eq("status", "available");
  if (error) throw new Error("Catálogo temporariamente indisponível.");
  if (!data) return [];
  return Array.from(
    new Set(
      data
        .map((row) => row.region)
        .filter((region): region is string => Boolean(region)),
    ),
  ).sort();
}

// Sugestões quando um imóvel não está mais disponível: mesma região, tipo
// semelhante. Não promete equivalência de preço.
//
// LIMITAÇÃO CONHECIDA: como `properties_public` só contém imóveis
// `status='available'`, um imóvel alugado desaparece inteiramente da view —
// não há como recuperar sua região/tipo depois disso sem ler a tabela
// privada (que o anon não pode). Por isso esta função só é útil quando já
// temos os dados do imóvel de referência em mãos (ex. "imóveis parecidos"
// numa página que carregou com sucesso), não para o caso de um ID que sumiu.
// Para esse segundo caso, a página usa um fallback genérico (getNewProperties).
export async function getSimilarProperties(
  reference: Pick<PropertyPublic, "region" | "type" | "price" | "id">,
  limit = 4,
): Promise<PropertyWithPhotos[]> {
  let query = publicCatalog()
    .select(PUBLIC_PROPERTY_COLUMNS)
    .eq("status", "available")
    .neq("id", reference.id);

  if (reference.region) query = query.eq("region", reference.region);
  if (reference.type) query = query.eq("type", reference.type);

  const { data, error } = await query.limit(limit);
  if (error) {
    console.error(
      "[queries] erro ao buscar imóveis semelhantes:",
      error.message,
    );
    throw new Error("Catálogo temporariamente indisponível.");
  }
  return attachPhotos((data ?? []) as PropertyPublic[]);
}
