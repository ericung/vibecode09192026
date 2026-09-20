import "server-only";

import { searchLocations } from "@/lib/server/geocoding";
import {
  fetchCurrentWeatherRaw,
  fetchForecastRaw,
  OpenWeatherError,
  type CurrentWeatherRaw,
  type ForecastRaw,
  type ForecastSlotRaw,
} from "@/lib/server/openweather";
import {
  getCachedWeather,
  getFreshWeather,
  setCachedWeather,
  weatherCacheKey,
} from "@/lib/server/weather-cache";
import type { DailyForecast, HourlyForecast, WeatherReport } from "@/types/weather";

/**
 * Server-side weather service (free tier). Converts the free
 * `data/2.5/weather` (current) + `data/2.5/forecast` (5-day / 3-hourly)
 * responses into the application-specific `WeatherReport` (current
 * conditions, today's high/low, 48 hourly entries interpolated from the
 * 3-hourly forecast, and daily entries with precipitation probability),
 * caches fresh reports for 15 minutes, and falls back to cached data marked
 * stale when the upstream request fails.
 */

export type LocationHint = {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
};

function clampPop(pop: unknown): number {
  const value = typeof pop === "number" ? pop : 0;
  return Math.round(Math.min(Math.max(value, 0), 1) * 100);
}

function utcDateKey(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
}

type InterpPoint = {
  t: number;
  temp: number;
  condition: string;
  description: string;
};

function toPoint(slot: ForecastSlotRaw): InterpPoint {
  const entry = slot.weather[0];
  return {
    t: slot.dt,
    temp: slot.main.temp,
    condition: entry?.main ?? "Unknown",
    description: entry?.description ?? "No description available",
  };
}

/**
 * Build 48 hourly entries by linearly interpolating the 3-hourly forecast
 * temperatures. Conditions come from the nearer bracketing slot. Entries
 * outside the forecast range reuse the nearest slot.
 */
function buildHourly48(
  slots: ForecastSlotRaw[],
  startEpochSeconds: number,
  fallback: InterpPoint
): HourlyForecast[] {
  const points = [...slots].sort((a, b) => a.dt - b.dt).map(toPoint);
  if (points.length === 0) {
    return Array.from({ length: 48 }, (_, i) => ({
      time: new Date((startEpochSeconds + i * 3600) * 1000).toISOString(),
      temperature: Math.round(fallback.temp),
      condition: fallback.condition,
      description: fallback.description,
    }));
  }

  return Array.from({ length: 48 }, (_, i) => {
    const target = startEpochSeconds + i * 3600;
    let before = points[0];
    let after = points[points.length - 1];
    for (const point of points) {
      if (point.t <= target) before = point;
      if (point.t >= target) {
        after = point;
        break;
      }
    }
    const span = after.t - before.t;
    const ratio = span > 0 ? (target - before.t) / span : 0;
    const temp = before.temp + (after.temp - before.temp) * ratio;
    const nearer = ratio < 0.5 ? before : after;
    return {
      time: new Date(target * 1000).toISOString(),
      temperature: Math.round(temp),
      condition: nearer.condition,
      description: nearer.description,
    };
  });
}

/** Group 3-hourly slots by UTC calendar date, oldest date first. */
function groupByDate(slots: ForecastSlotRaw[]): { date: string; slots: ForecastSlotRaw[] }[] {
  const groups = new Map<string, ForecastSlotRaw[]>();
  for (const slot of [...slots].sort((a, b) => a.dt - b.dt)) {
    const key = utcDateKey(slot.dt);
    const group = groups.get(key);
    if (group) group.push(slot);
    else groups.set(key, [slot]);
  }
  return [...groups.entries()].map(([date, groupSlots]) => ({
    date,
    slots: groupSlots,
  }));
}

/** Pick the slot closest to local noon UTC as the day's representative. */
function middaySlot(slots: ForecastSlotRaw[]): ForecastSlotRaw {
  let best = slots[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const slot of slots) {
    const date = new Date(slot.dt * 1000);
    const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
    const distance = Math.abs(hours - 12);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = slot;
    }
  }
  return best;
}

function normalizeDailyGroup(date: string, slots: ForecastSlotRaw[]): DailyForecast {
  const representative = middaySlot(slots);
  const entry = representative.weather[0];
  let high = Number.NEGATIVE_INFINITY;
  let low = Number.POSITIVE_INFINITY;
  let pop = 0;
  for (const slot of slots) {
    const slotHigh = Number.isFinite(slot.main.temp_max) ? slot.main.temp_max : slot.main.temp;
    const slotLow = Number.isFinite(slot.main.temp_min) ? slot.main.temp_min : slot.main.temp;
    if (slotHigh > high) high = slotHigh;
    if (slotLow < low) low = slotLow;
    if (typeof slot.pop === "number" && slot.pop > pop) pop = slot.pop;
  }
  return {
    date,
    condition: entry?.main ?? "Unknown",
    description: entry?.description ?? "No description available",
    high: Math.round(high),
    low: Math.round(low),
    precipitationProbability: clampPop(pop),
  };
}

/**
 * Pure normalization: free-tier current + forecast responses + display
 * name → WeatherReport. Exported for unit tests; never touches the
 * network or cache.
 */
export function normalizeFreeTierResponse(
  current: CurrentWeatherRaw,
  forecast: ForecastRaw,
  meta: { city: string; country: string; updatedAt: string }
): WeatherReport {
  const currentWeather = current.weather[0];
  const slots = Array.isArray(forecast.list) ? forecast.list : [];
  const groups = groupByDate(slots);
  const todayKey = utcDateKey(current.dt);
  const todayGroup = groups.find((group) => group.date === todayKey);

  const todayHigh = todayGroup
    ? Math.max(
        ...todayGroup.slots.map((slot) =>
          Number.isFinite(slot.main.temp_max) ? slot.main.temp_max : slot.main.temp
        )
      )
    : current.main.temp_max;
  const todayLow = todayGroup
    ? Math.min(
        ...todayGroup.slots.map((slot) =>
          Number.isFinite(slot.main.temp_min) ? slot.main.temp_min : slot.main.temp
        )
      )
    : current.main.temp_min;

  const startHour = Math.floor(current.dt / 3600) * 3600;
  const fallbackPoint: InterpPoint = {
    t: current.dt,
    temp: current.main.temp,
    condition: currentWeather?.main ?? "Unknown",
    description: currentWeather?.description ?? "No description available",
  };

  return {
    city: meta.city,
    country: meta.country,
    temperature: Math.round(current.main.temp),
    feelsLike: Math.round(current.main.feels_like),
    humidity: current.main.humidity,
    windSpeed: Math.round(current.wind.speed * 3.6),
    condition: currentWeather?.main ?? "Unknown",
    description: currentWeather?.description ?? "No description available",
    todayHigh: Math.round(todayHigh),
    todayLow: Math.round(todayLow),
    hourly: buildHourly48(slots, startHour, fallbackPoint),
    // Free forecast covers ~5 days of 3-hourly slots; return every
    // available calendar date rather than a fixed 7.
    daily: groups.map((group) => normalizeDailyGroup(group.date, group.slots)),
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
  let current: CurrentWeatherRaw;
  let forecast: ForecastRaw;
  try {
    [current, forecast] = await Promise.all([
      fetchCurrentWeatherRaw(hint.latitude, hint.longitude),
      fetchForecastRaw(hint.latitude, hint.longitude),
    ]);
  } catch (error) {
    // Resilient fetching: serve expired cache marked outdated.
    const cached = getCachedWeather(cacheKey);
    if (cached) {
      return { ...cached, isStale: true };
    }
    throw error;
  }

  const report = normalizeFreeTierResponse(current, forecast, {
    city: hint.city?.trim() ? hint.city : (current.name?.trim() ? current.name : "Unknown location"),
    country: hint.country?.trim()
      ? hint.country
      : (current.sys?.country?.trim() ? current.sys.country : ""),
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
