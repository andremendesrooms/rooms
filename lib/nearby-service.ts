import 'server-only';
import { normalizedPostcode, postcodeKind, withinGreaterLondon, type Coordinates } from './nearby';

type GeocodeResponse = {
  status?: number;
  result?: { latitude?: number | null; longitude?: number | null; postcode?: string } | null;
};

type TfLMatch = {
  id?: string;
  name?: string;
  commonName?: string;
  lat?: number;
  lon?: number;
  modes?: string[];
};
type TfLSearch = { matches?: TfLMatch[] };

function coords(value: unknown): Coordinates | null {
  if (!value || typeof value !== 'object') return null;
  const found = value as Record<string, unknown>;
  const latitude = found.latitude ?? found.lat;
  const longitude = found.longitude ?? found.lon;
  const point = { latitude: Number(latitude), longitude: Number(longitude) };
  return latitude != null && longitude != null && withinGreaterLondon(point) ? point : null;
}

async function getLocation(url: string): Promise<unknown> {
  const response = await fetch(url, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(6000),
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) return null;
  return response.json();
}

const cleanedText = (input: string) => input.toLowerCase()
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\b(underground|overground|railway|train|tube|station|estacao|estação|london|uk)\b/g, '')
  .replace(/[^a-z0-9]/g, '');

export type ResolvedLocation = {
  point: Coordinates;
  label: string;
  source: 'postcode' | 'outcode' | 'station';
};

export async function resolveLondonLocation(input: string): Promise<ResolvedLocation | null> {
  const term = input.trim().slice(0, 80);
  if (!term) return null;
  const kind = postcodeKind(term);
  if (kind) {
    const code = normalizedPostcode(term);
    try {
      const endpoint = kind === 'full' ? 'postcodes' : 'outcodes';
      const json = await getLocation(
        'https://api.postcodes.io/' + endpoint + '/' + encodeURIComponent(code),
      ) as GeocodeResponse | null;
      const point = coords(json?.result);
      if (point) return { point, label: term.toUpperCase(), source: kind === 'full' ? 'postcode' : 'outcode' };
    } catch { /* External geocoder unavailable; text search can still work. */ }
    return null;
  }

  // London stations. Without a TfL key the public endpoint can be rate-limited;
  // failure falls back to text-matching without fabricating any distances.
  // Never send private addresses, only the term typed by the visitor.
  const stationQuery = term.replace(/\b(station|estação|tube|underground)\b/gi, '').trim();
  if (stationQuery.length < 2 || stationQuery.length > 75) return null;
  try {
    const url = 'https://api.tfl.gov.uk/StopPoint/Search/' +
      encodeURIComponent(stationQuery) +
      '?modes=tube,overground,dlr,elizabeth-line,national-rail&maxResults=10';
    const data = await getLocation(url) as TfLSearch | null;
    const wanted = cleanedText(stationQuery);
    const matches = (data?.matches ?? [])
      .filter(m => typeof m.id === 'string' && m.id.length <= 60)
      .filter(m => cleanedText(m.name || m.commonName || '').includes(wanted))
      .sort((a,b) => {
        const exact = (m: TfLMatch) => Number(cleanedText(m.name || m.commonName || '') === wanted);
        return exact(b) - exact(a);
      });

    for (const station of matches.slice(0, 4)) {
      const point = coords(station);
      if (point) return {
        point, label: station.name || station.commonName || stationQuery, source: 'station',
      };
      const id = station.id || '';
      if (!/^[a-zA-Z0-9]+$/.test(id)) continue;
      const details = await getLocation('https://api.tfl.gov.uk/StopPoint/' + id) as
        { lat?: number; lon?: number; commonName?: string } | null;
      const located = coords(details);
      if (located) return {
        point: located,
        label: details?.commonName || station.name || stationQuery,
        source: 'station',
      };
    }
  } catch { /* Named area may still have matching inventory text. */ }
  return null;
}

type LookupRow = {
  query?: string;
  result?: { latitude?: number | null; longitude?: number | null } | null;
};
type BulkResponse = { result?: LookupRow[] };

export async function resolvePropertyPostcodes(
  postcodes: (string | null)[],
): Promise<Map<string, Coordinates>> {
  const full = [...new Set(postcodes
    .filter((v): v is string => typeof v === 'string')
    .map(normalizedPostcode)
    .filter(p => postcodeKind(p) === 'full'))].slice(0, 200);
  const areaCodes = [...new Set(postcodes
    .filter((v): v is string => typeof v === 'string')
    .map(normalizedPostcode)
    .filter(p => postcodeKind(p) === 'outcode'))].slice(0, 20);
  const found = new Map<string, Coordinates>();

  for (let i = 0; i < full.length; i += 100) {
    try {
      const batch = full.slice(i, i + 100);
      const response = await fetch(
        'https://api.postcodes.io/postcodes?filter=postcode,latitude,longitude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ postcodes: batch }),
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
      if (!response.ok) continue;
      const json = await response.json() as BulkResponse;
      for (const row of json.result ?? []) {
        const key = normalizedPostcode(row.query || '');
        const point = coords(row.result);
        if (point && batch.includes(key)) found.set(key, point);
      }
    } catch { /* Show remaining properties as "distance unavailable". */ }
  }

  // Some landlords enter only an outward postcode (e.g. SW16).
  // Use the outcode centroid and do not suggest street-level accuracy.
  for (const code of areaCodes) {
    try {
      const result = await getLocation(
        'https://api.postcodes.io/outcodes/' + encodeURIComponent(code),
      ) as GeocodeResponse | null;
      const point = coords(result?.result);
      if (point) found.set(code, point);
    } catch { /* No distance for this property. */ }
  }
  return found;
}
