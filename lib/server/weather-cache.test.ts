// @vitest-environment node
import { afterEach, describe, expect, test } from "vitest";

import {
  clearWeatherCache,
  getCachedWeather,
  getFreshWeather,
  setCachedWeather,
  weatherCacheKey,
  WEATHER_TTL_MS,
} from "@/lib/server/weather-cache";
import type { WeatherReport } from "@/types/weather";

const NOW = 1_700_000_000_000;

function makeReport(city = "London"): WeatherReport {
  return {
    city,
    country: "GB",
    temperature: 12,
    feelsLike: 10,
    humidity: 80,
    windSpeed: 15,
    condition: "Clouds",
    description: "overcast clouds",
    todayHigh: 14,
    todayLow: 8,
    hourly: [],
    daily: [],
    updatedAt: new Date(NOW).toISOString(),
    isStale: false,
  };
}

afterEach(() => {
  clearWeatherCache();
});

describe("weatherCacheKey", () => {
  test("rounds coordinates so nearby requests share entries", () => {
    expect(weatherCacheKey(51.507351, -0.127758)).toBe(weatherCacheKey(51.50735, -0.12776));
    expect(weatherCacheKey(51.5, -0.12)).not.toBe(weatherCacheKey(48.85, 2.35));
  });
});

describe("getFreshWeather / setCachedWeather", () => {
  test("returns null on a cache miss", () => {
    expect(getFreshWeather("0.0000,0.0000", NOW)).toBeNull();
  });

  test("returns cached data within the 15-minute TTL", () => {
    const key = weatherCacheKey(51.5, -0.12);
    setCachedWeather(key, makeReport(), NOW);
    expect(getFreshWeather(key, NOW + WEATHER_TTL_MS - 1)?.city).toBe("London");
  });

  test("treats entries at or past the TTL as expired", () => {
    const key = weatherCacheKey(51.5, -0.12);
    setCachedWeather(key, makeReport(), NOW);
    expect(getFreshWeather(key, NOW + WEATHER_TTL_MS)).toBeNull();
    expect(getFreshWeather(key, NOW + WEATHER_TTL_MS + 1)).toBeNull();
  });

  test("latest write wins for the same key", () => {
    const key = weatherCacheKey(51.5, -0.12);
    setCachedWeather(key, makeReport("Old"), NOW);
    setCachedWeather(key, makeReport("New"), NOW + 1);
    expect(getFreshWeather(key, NOW + 2)?.city).toBe("New");
  });
});

describe("getCachedWeather (stale fallback)", () => {
  test("returns data even after the TTL expired", () => {
    const key = weatherCacheKey(51.5, -0.12);
    setCachedWeather(key, makeReport(), NOW);
    expect(getCachedWeather(key)?.city).toBe("London");
  });

  test("returns null when nothing was cached", () => {
    expect(getCachedWeather("9.9999,9.9999")).toBeNull();
  });
});
