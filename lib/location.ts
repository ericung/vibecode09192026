import type { NewWeatherLocation, WeatherLocation } from "@/types/location";

/** Build a stable id from coordinates, rounded to 4 decimals (~11m precision). */
export function locationKey(latitude: number, longitude: number): string {
  return `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)}`;
}

/** Create a full WeatherLocation, deriving `id` when omitted. */
export function createLocation(input: NewWeatherLocation): WeatherLocation {
  return {
    ...input,
    id: input.id ?? locationKey(input.latitude, input.longitude),
  };
}

/** True when two locations refer to the same coordinates. */
export function isSameLocation(a: WeatherLocation, b: WeatherLocation): boolean {
  return locationKey(a.latitude, a.longitude) === locationKey(b.latitude, b.longitude);
}

/** Full display label: "London, England, United Kingdom". */
export function formatLocationLabel(location: WeatherLocation): string {
  return [location.city, location.state, location.country]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");
}

/** Short display label: "London, GB". */
export function formatLocationShort(location: WeatherLocation): string {
  const region = location.countryCode ?? location.country;
  return `${location.city}, ${region}`;
}

/** Parse and validate a raw value (e.g. from localStorage) into a WeatherLocation. */
export function parseLocation(value: unknown): WeatherLocation | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.city !== "string" || v.city.trim() === "") return null;
  if (typeof v.country !== "string" || v.country.trim() === "") return null;
  if (typeof v.latitude !== "number" || !Number.isFinite(v.latitude)) return null;
  if (typeof v.longitude !== "number" || !Number.isFinite(v.longitude)) return null;
  if (v.latitude < -90 || v.latitude > 90) return null;
  if (v.longitude < -180 || v.longitude > 180) return null;

  const state =
    typeof v.state === "string" && v.state.trim() !== "" ? v.state : undefined;
  const countryCode =
    typeof v.countryCode === "string" && v.countryCode.trim() !== ""
      ? v.countryCode
      : undefined;

  return createLocation({
    id: typeof v.id === "string" && v.id.trim() !== "" ? v.id : undefined,
    city: v.city,
    state,
    country: v.country,
    countryCode,
    latitude: v.latitude,
    longitude: v.longitude,
  });
}
