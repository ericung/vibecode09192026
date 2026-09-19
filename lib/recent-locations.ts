import { isSameLocation, parseLocation } from "@/lib/location";
import type { WeatherLocation } from "@/types/location";

export const RECENT_LOCATIONS_KEY = "weather:recent-locations";
export const MAX_RECENT_LOCATIONS = 10;

/** Load recent locations from storage. Returns [] on any failure. Pure + testable. */
export function parseRecentLocations(value: unknown): WeatherLocation[] {
  if (!Array.isArray(value)) return [];
  const seen: WeatherLocation[] = [];
  for (const entry of value) {
    const location = parseLocation(entry);
    if (!location) continue;
    if (seen.some((existing) => isSameLocation(existing, location))) continue;
    seen.push(location);
    if (seen.length >= MAX_RECENT_LOCATIONS) break;
  }
  return seen;
}

/** Add a location to the front, de-duplicated and capped at 10. Pure + testable. */
export function addRecentLocation(
  recents: WeatherLocation[],
  location: WeatherLocation
): WeatherLocation[] {
  const rest = recents.filter((existing) => !isSameLocation(existing, location));
  return [location, ...rest].slice(0, MAX_RECENT_LOCATIONS);
}

/** Remove a location by coordinates. Pure + testable. */
export function removeRecentLocation(
  recents: WeatherLocation[],
  location: WeatherLocation
): WeatherLocation[] {
  return recents.filter((existing) => !isSameLocation(existing, location));
}

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read recents from browser localStorage. Client-only. */
export function loadRecentLocations(
  storage: Storage | null = getStorage()
): WeatherLocation[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENT_LOCATIONS_KEY);
    if (!raw) return [];
    return parseRecentLocations(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Persist recents to browser localStorage. Client-only. */
export function saveRecentLocations(
  recents: WeatherLocation[],
  storage: Storage | null = getStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(recents));
  } catch {
    // Quota or privacy mode — recents are best-effort.
  }
}
