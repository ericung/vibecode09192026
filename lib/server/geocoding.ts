import "server-only";

import { locationKey } from "@/lib/location";
import type { WeatherLocation } from "@/types/location";

type GeoDirectEntry = {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
};

export class GeocodingError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GeocodingError";
    this.status = status;
  }
}

function toLocation(entry: GeoDirectEntry): WeatherLocation | null {
  if (!entry.name || !entry.country) return null;
  if (!Number.isFinite(entry.lat) || !Number.isFinite(entry.lon)) return null;
  return {
    id: locationKey(entry.lat, entry.lon),
    city: entry.name,
    state: entry.state,
    country: entry.country,
    countryCode: entry.country,
    latitude: entry.lat,
    longitude: entry.lon,
  };
}

function requireApiKey(): string {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new GeocodingError("Weather service is not configured.", 500);
  return apiKey;
}

/** Server-only: forward-geocode a city name into selectable locations. */
export async function searchLocations(query: string, limit = 5): Promise<WeatherLocation[]> {
  const apiKey = requireApiKey();
  const q = query.trim();
  if (!q) throw new GeocodingError("Please enter a city.", 400);

  const url = new URL("https://api.openweathermap.org/geo/1.0/direct");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 10)));
  url.searchParams.set("appid", apiKey);

  let response: Response;
  try {
    // `cache: "no-store"` so Next.js does not cache upstream responses —
    // location results are governed by UI debouncing, not framework cache.
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new GeocodingError("Unable to reach the location service.", 502);
  }
  if (!response.ok) {
    throw new GeocodingError("Unable to reach the location service.", 502);
  }

  const data = (await response.json()) as GeoDirectEntry[];
  if (!Array.isArray(data)) return [];
  return data
    .map(toLocation)
    .filter((location): location is WeatherLocation => location !== null);
}

/** Server-only: reverse-geocode coordinates into a displayable location. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  limit = 5
): Promise<WeatherLocation[]> {
  const apiKey = requireApiKey();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new GeocodingError("Invalid coordinates.", 400);
  }

  const url = new URL("https://api.openweathermap.org/geo/1.0/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 10)));
  url.searchParams.set("appid", apiKey);

  let response: Response;
  try {
    // `cache: "no-store"` so Next.js does not cache upstream responses.
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new GeocodingError("Unable to reach the location service.", 502);
  }
  if (!response.ok) {
    throw new GeocodingError("Unable to reach the location service.", 502);
  }

  const data = (await response.json()) as GeoDirectEntry[];
  if (!Array.isArray(data)) return [];
  return data
    .map(toLocation)
    .filter((location): location is WeatherLocation => location !== null);
}
