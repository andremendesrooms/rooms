import type { PropertyWithPhotos } from './types';

export type Coordinates = { latitude: number; longitude: number };
export type NearbyEntry = { property: PropertyWithPhotos; distanceKm: number | null };
export type NearbyRanking = {
  entries: NearbyEntry[];
  outsideRadius: boolean;
  located: number;
};

export function withinGreaterLondon(point: Coordinates): boolean {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) &&
    point.latitude > 51.1 && point.latitude < 51.8 &&
    point.longitude > -0.65 && point.longitude < 0.4;
}

export function normalizedPostcode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function postcodeKind(value: string): 'full' | 'outcode' | null {
  const p = normalizedPostcode(value);
  if (/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(p)) return 'full';
  if (/^[A-Z]{1,2}[0-9][A-Z0-9]?$/.test(p)) return 'outcode';
  return null;
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) *
    Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function rankNearbyProperties(
  properties: PropertyWithPhotos[],
  origin: Coordinates,
  locations: Map<string, Coordinates>,
  radiusKm?: number,
  limit = 48,
): NearbyRanking {
  const sorted = properties.map((property, i) => {
    const coords = property.postcode
      ? locations.get(normalizedPostcode(property.postcode)) : undefined;
    return {
      property,
      i,
      distanceKm: coords && withinGreaterLondon(coords)
        ? haversineKm(origin, coords) : null,
    };
  }).sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm !== null) return 1;
    if (a.distanceKm !== null && b.distanceKm === null) return -1;
    if (a.distanceKm !== null && b.distanceKm !== null)
      return a.distanceKm - b.distanceKm || a.i - b.i;
    return a.i - b.i;
  });
  const located = sorted.filter(x => x.distanceKm !== null).length;
  const chosenWithin = radiusKm === undefined ? sorted :
    sorted.filter(x => x.distanceKm !== null && x.distanceKm <= radiusKm);
  // If nothing matches a requested radius, show nearest alternatives rather
  // than claiming no inventory. State explicitly that they are outside radius.
  const outsideRadius = radiusKm !== undefined && chosenWithin.length === 0 &&
    located > 0;
  const chosen = outsideRadius ? sorted : chosenWithin;
  return {
    entries: chosen.slice(0, Math.max(1, limit)).map(({ property, distanceKm }) =>
      ({ property, distanceKm })),
    outsideRadius,
    located,
  };
}

export function rankTextNearby(
  properties: PropertyWithPhotos[],
  query: string,
  limit = 48,
): NearbyEntry[] {
  const normalized = (value: string) =>
    value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const input = normalized(query);
  return properties
    .map((property, index) => {
      const region = normalized(property.region || '');
      const station = normalized(property.nearest_station || '');
      const postcode = normalized(property.postcode || '');
      const title = normalized(property.title || '');
      const score = !input ? 0 :
        region === input || station === input || postcode === input ? 4 :
        region.includes(input) || station.includes(input) || postcode.includes(input) ? 3 :
        title.includes(input) ? 1 : 0;
      return { property, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, limit))
    .map(x => ({ property: x.property, distanceKm: null }));
}
