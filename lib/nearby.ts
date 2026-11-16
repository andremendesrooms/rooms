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
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, limit))
    .map(x => ({ property: x.property, distanceKm: null }));
}


// Area-first discovery: exact area matches win. If none exists, return actual
// properties ranked from the requested station/postcode outward. Never invent
// inventory and never label text-only results as geographic neighbours.
export type AreaSearchResult = {
  kind: 'exact' | 'nearby' | 'distant' | 'text' | 'unresolved' | 'empty';
  entries: NearbyEntry[];
  radiusKm: number | null;
  located: number;
};

function normalizePlace(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(underground|overground|railway|station|estacao|london|uk)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function inRequestedArea(property: PropertyWithPhotos, request: string): boolean {
  const target = normalizePlace(request);
  if (!target) return false;

  if (postcodeKind(request)) {
    const postcode = normalizedPostcode(property.postcode || '');
    const requested = normalizedPostcode(request);
    return postcode === requested ||
      (postcodeKind(request) === 'outcode' &&
        postcode.replace(/[0-9][A-Z]{2}$/, '') === requested);
  }

  return [property.region, property.nearest_station]
    .some(value => value && normalizePlace(value) === target);
}

export function selectAreaAlternatives(
  properties: PropertyWithPhotos[],
  request: string,
  origin: Coordinates | null,
  locations: Map<string, Coordinates>,
  limit = 12,
): AreaSearchResult {
  if (!properties.length) {
    return { kind: 'empty', entries: [], radiusKm: null, located: 0 };
  }
  const ranked = origin
    ? rankNearbyProperties(properties, origin, locations, undefined, properties.length)
    : { entries: properties.map(property => ({ property, distanceKm: null })),
        located: 0 };

  const exact = ranked.entries.filter(entry => inRequestedArea(entry.property, request));
  if (exact.length) {
    return {
      kind: 'exact',
      entries: exact.slice(0, limit),
      radiusKm: null,
      located: ranked.located,
    };
  }

  if (origin && ranked.located > 0) {
    const locatedEntries = ranked.entries.filter(
      (entry): entry is NearbyEntry & { distanceKm: number } =>
        entry.distanceKm !== null,
    );
    // Expand automatically until a useful set of alternatives is found.
    // Use a single outer bound to avoid flooding the visitor with distant
    // neighbourhoods; clearly distinguish those if none are near enough.
    const radii = [1, 3, 5, 8, 12];
    const chosenRadius = radii.find(radius =>
      locatedEntries.filter(entry => entry.distanceKm <= radius).length >= 2)
      ?? radii.find(radius =>
        locatedEntries.some(entry => entry.distanceKm <= radius));
    if (chosenRadius !== undefined) {
      return {
        kind: 'nearby',
        entries: locatedEntries.filter(entry => entry.distanceKm <= chosenRadius)
          .slice(0, limit),
        radiusKm: chosenRadius,
        located: ranked.located,
      };
    }
    return {
      kind: 'distant',
      entries: locatedEntries.slice(0, Math.min(limit, 6)),
      radiusKm: null,
      located: ranked.located,
    };
  }

  const textMatches = rankTextNearby(properties, request, limit);
  return {
    kind: textMatches.length ? 'text' : 'unresolved',
    entries: textMatches,
    radiusKm: null,
    located: ranked.located,
  };
}
