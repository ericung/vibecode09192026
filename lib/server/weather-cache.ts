import "server-only";

import type { WeatherReport } from "@/types/weather";

/** Server-side cache TTL: 15 minutes (Prompt 9). */
export const WEATHER_TTL_MS = 15 * 60 * 1000;

type CacheEntry = {
  data: WeatherReport;
  /** Epoch ms when the entry stops being fresh. */
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();

/** Bound the in-memory cache so a long-lived server never grows without limit. */
const MAX_CACHE_ENTRIES = 200;

/** Cache key for coordinates, rounded so nearby requests share entries. */
export function weatherCacheKey(latitude: number, longitude: number): string {
  return `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)}`;
}

/** Fresh cached report, or null on miss/expiry. Never throws. */
export function getFreshWeather(
  key: string,
  now: number = Date.now()
): WeatherReport | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) return null;
  return entry.data;
}

/** Most recent cached report regardless of freshness (for stale fallback). */
export function getCachedWeather(
  key: string
): WeatherReport | null {
  return store.get(key)?.data ?? null;
}

/** Store a report with a 15-minute TTL. */
export function setCachedWeather(
  key: string,
  data: WeatherReport,
  now: number = Date.now()
): void {
  // Prune expired entries first so the bound only evicts live entries.
  for (const [storedKey, entry] of store) {
    if (entry.expiresAt <= now) store.delete(storedKey);
  }
  if (!store.has(key) && store.size >= MAX_CACHE_ENTRIES) {
    // Evict the oldest entry (Map preserves insertion order).
    const oldest = store.keys().next();
    if (!oldest.done) store.delete(oldest.value);
  }
  store.set(key, { data, expiresAt: now + WEATHER_TTL_MS });
}

/** Clear all entries. Used in tests. */
export function clearWeatherCache(): void {
  store.clear();
}
