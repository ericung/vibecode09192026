import "server-only";

import { searchLocations } from "@/lib/server/geocoding";
import {
  fetchOneCallRaw,
  OpenWeatherError,
  type OneCallDaily,
  type OneCallHourly,
  type OneCallResponse,
} from "@/lib/server/openweather";
import {
  getCachedWeather,
  getFreshWeather,
  setCachedWeather,
  weatherCacheKey,
} from "@/lib/server/weather-cache";
import type { DailyForecast, HourlyForecast, WeatherReport } from "@/types/weather";

/**
 * Server-side weather service (Prompts 8–10). Converts the raw One Call
 * response into the application-specific `WeatherReport` (current conditions,
 * today's high/low, 48 hourly entries, 7 daily entries with precipitation
 * probability), caches fresh reports for 15 minutes, and falls back to cached
 * data marked stale when the upstream request fails.
 */

export type LocationHint = {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
};

function normalizeHourly(entry: OneCallHourly): HourlyForecast {
  const current = entry.weather[0];
  return {
    time: new Date(entry.dt * 1000).toISOString(),
    temperature: Math.round(entry.temp),
    condition: current?.main ?? "Unknown",
    description: current?.description ?? "No description available",
  };
}

function normalizeDaily(entry: OneCallDaily): DailyForecast {
  const current = entry.weather[0];
  const pop = typeof entry.pop === "number" ? entry.pop : 0;
  return {
    date: new Date(entry.dt * 1000).toISOString().slice(0, 10),
    condition: current?.main ?? "Unknown",
    description: current?.description ?? "No description available",
    high: Math.round(entry.temp.max),
    low: Math.round(entry.temp.min),
    precipitationProbability: Math.round(Math.min(Math.max(pop, 0), 1) * 100),
  };
}

/**
 * Pure normalization: raw One Call response + display name → WeatherReport.
 * Exported for unit tests; never touches the network or cache.
 */
export function normalizeOneCallResponse(
  data: OneCallResponse,
  meta: { city: string; country: string; updatedAt: string }
): WeatherReport {
  const currentWeather = data.current.weather[0];
  const today = data.daily[0];

  return {
    city: meta.city,
    country: meta.country,
    temperature: Math.round(data.current.temp),
    feelsLike: Math.round(data.current.feels_like),
    humidity: data.current.humidity,
    windSpeed: Math.round(data.current.wind_speed * 3.6),
    condition: currentWeather?.main ?? "Unknown",
    description: currentWeather?.description ?? "No description available",
    todayHigh: today ? Math.round(today.temp.max) : Math.round(data.current.temp),
    todayLow: today ? Math.round(today.temp.min) : Math.round(data.current.temp),
    hourly: data.hourly.slice(0, 48).map(normalizeHourly),
    daily: data.daily.slice(0, 7).map(normalizeDaily),
    updatedAt: meta.updatedAt,
    isStale: false,
  };
}

/** Fetch a fresh report, falling back to stale cache on upstream failure. */
async function fetchFreshReport(
  hint: Required<Pick<LocationHint, "latitude" | "longitude">> & LocationHint,
  cacheKey: string,
  now: number
): Promise<WeatherReport> {
  let raw: OneCallResponse;
  try {
    raw = await fetchOneCallRaw(hint.latitude, hint.longitude);
  } catch (error) {
    // Resilient fetching (Prompt 10): serve expired cache marked outdated.
    const cached = getCachedWeather(cacheKey);
    if (cached) {
      return { ...cached, isStale: true };
    }
    throw error;
  }

  const report = normalizeOneCallResponse(raw, {
    city: hint.city?.trim() ? hint.city : "Unknown location",
    country: hint.country?.trim() ? hint.country : "",
    updatedAt: new Date(now).toISOString(),
  });
  setCachedWeather(cacheKey, report, now);
  return report;
}

/** Weather report for coordinates. Reuses fresh cache within the TTL window. */
export async function getWeatherReportByCoords(
  hint: LocationHint,
  now: number = Date.now()
): Promise<WeatherReport> {
  if (!Number.isFinite(hint.latitude) || !Number.isFinite(hint.longitude)) {
    throw new OpenWeatherError("Invalid coordinates.", 400);
  }
  const cacheKey = weatherCacheKey(hint.latitude, hint.longitude);
  const fresh = getFreshWeather(cacheKey, now);
  if (fresh) return fresh;
  return fetchFreshReport(hint, cacheKey, now);
}

/**
 * Weather report for a city name. Resolves the city to coordinates via
 * server-side geocoding (API key never leaves the server), so city and
 * coordinate requests share the same coordinate-keyed cache entries.
 */
export async function getWeatherReportByCity(
  city: string,
  now: number = Date.now()
): Promise<WeatherReport> {
  const query = city.trim();
  if (!query) {
    throw new OpenWeatherError("Please enter a city.", 400);
  }
  const matches = await searchLocations(query, 1);
  const best = matches[0];
  if (!best) {
    throw new OpenWeatherError("City not found.", 404);
  }
  return getWeatherReportByCoords(
    {
      latitude: best.latitude,
      longitude: best.longitude,
      city: best.city,
      country: best.countryCode ?? best.country,
    },
    now
  );
}
