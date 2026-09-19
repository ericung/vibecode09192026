import { parseLocation } from "@/lib/location";
import type { WeatherLocation } from "@/types/location";

export class LocationSearchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LocationSearchError";
    this.status = status;
  }
}

type LocationsApiResponse = {
  locations?: unknown;
  error?: string;
};

/** Client-safe: search selectable locations via our own API route (key stays server-side). */
export async function searchLocations(query: string): Promise<WeatherLocation[]> {
  const q = query.trim();
  if (!q) return [];

  const response = await fetch(`/api/locations?q=${encodeURIComponent(q)}`);
  const data = (await response.json()) as LocationsApiResponse;
  if (!response.ok) {
    throw new LocationSearchError(data.error || "Could not search locations.", response.status);
  }
  if (!Array.isArray(data.locations)) return [];
  return data.locations
    .map(parseLocation)
    .filter((location): location is WeatherLocation => location !== null);
}

/** Client-safe: reverse-geocode coordinates into a named location. */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<WeatherLocation> {
  const response = await fetch(
    `/api/locations?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`
  );
  const data = (await response.json()) as LocationsApiResponse;
  if (!response.ok) {
    throw new LocationSearchError(
      data.error || "Could not determine location name.",
      response.status
    );
  }
  const first = Array.isArray(data.locations) ? parseLocation(data.locations[0]) : null;
  if (!first) {
    throw new LocationSearchError("Could not determine location name.", 404);
  }
  return first;
}
