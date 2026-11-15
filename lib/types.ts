// Espelha exatamente as colunas expostas pela view `properties_public`.
// Qualquer campo interno (comissão, notas, landlord, priority_tier,
// assigned_agent) não existe aqui de propósito — a view nunca os expõe.
export interface PropertyPublic {
  id: string;
  type: string;
  subtype: string | null;
  title: string | null;
  price: number | null;
  price_frequency: 'week' | 'month' | null;
  bedrooms: number | null;
  bathrooms: number | null;
  occupancy: 'single' | 'couple' | 'family' | null;
  postcode: string | null;
  address: string | null;
  region: string | null;
  london_zone: number | null;
  nearest_station: string | null;
  latitude: number | null;
  longitude: number | null;
  available_from: string | null;
  minimum_stay: string | null;
  move_in_conditions: string | null;
  deposit: number | null;
  bills_included: boolean | null;
  furnished: boolean | null;
  garden: boolean | null;
  balcony: boolean | null;
  parking: boolean | null;
  gym: boolean | null;
  concierge: boolean | null;
  lift: boolean | null;
  description: string | null;
  featured: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyPhoto {
  id: string;
  property_id: string;
  url: string;
  sort_order: number;
}

export interface PropertyFilters {
  type?: string;
  occupancy?: string;
  region?: string;
  maxPrice?: number;
  minBedrooms?: number;
  availableFrom?: string;
}

export interface PropertyWithPhotos extends PropertyPublic {
  photos: string[];
}
