// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  OpenWeatherError,
  type CurrentWeatherRaw,
  type ForecastRaw,
} from "@/lib/server/openweather";
import { clearWeatherCache, WEATHER_TTL_MS } from "@/lib/server/weather-cache";
import {
  getWeatherReportByCity,
  getWeatherReportByCoords,
  normalizeFreeTierResponse,
} from "@/lib/server/weather-service";

const NOW = 1_700_000_000_000;
const BASE_DT = 1_700_000_000;
const LAT = 51.5074;
const LON = -0.1278;

function makeCurrent(): CurrentWeatherRaw {
  return {
    dt: BASE_DT,
    name: "London",
    sys: { country: "GB" },
    weather: [{ main: "Clouds", description: "overcast clouds" }],
    main: {
      temp: 12.4,
      feels_like: 9.6,
      humidity: 81,
      temp_min: 8.2,
      temp_max: 14.7,
    },
    wind: { speed: 4.2 },
  };
}

/** 3-hourly forecast slots starting at BASE_DT, `count` slots long. */
function makeForecast(count = 40): ForecastRaw {
  return {
    city: { name: "London", country: "GB" },
    list: Array.from({ length: count }, (_, i) => ({
      dt: BASE_DT + i * 3 * 3600,
      main: {
        temp: 10 + i * 0.2,
        temp_min: 8 + i * 0.1,
        temp_max: 14 + i * 0.15,
      },
      pop: 0.35,
      weather: [{ main: "Rain", description: "light rain" }],
    })),
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

type StubOptions = {
  current?: CurrentWeatherRaw | null;
  forecast?: ForecastRaw | null;
  geo?: unknown[];
  currentStatus?: number;
  forecastStatus?: number;
};

/** Route stubbed fetch by URL: geo direct → locations, 2.5 → weather. */
function stubFetch(options: StubOptions) {
  const current = options.current ?? makeCurrent();
  const forecast = options.forecast ?? makeForecast();
  return vi.fn(async (url: URL | string) => {
    const href = String(url);
    if (href.includes("/geo/1.0/direct")) {
      return jsonResponse(
        options.geo ?? [{ name: "London", lat: LAT, lon: LON, country: "GB" }]
      );
    }
    if (href.includes("/data/2.5/weather")) {
      if (current === null) throw new Error("network down");
      return jsonResponse(current, options.currentStatus ?? 200);
    }
    if (href.includes("/data/2.5/forecast")) {
      if (forecast === null) throw new Error("network down");
      return jsonResponse(forecast, options.forecastStatus ?? 200);
    }
    throw new Error(`unexpected URL: ${href}`);
  });
}

beforeEach(() => {
  vi.stubEnv("OPENWEATHER_API_KEY", "test-key");
  clearWeatherCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  clearWeatherCache();
});

describe("normalizeFreeTierResponse", () => {
  test("maps current conditions, high/low, hourly, and daily", () => {
    const report = normalizeFreeTierResponse(makeCurrent(), makeForecast(), {
      city: "London",
      country: "GB",
      updatedAt: new Date(NOW).toISOString(),
    });

    expect(report.city).toBe("London");
    expect(report.temperature).toBe(12);
    expect(report.feelsLike).toBe(10);
    expect(report.windSpeed).toBe(15); // 4.2 m/s → km/h
    expect(report.todayHigh).toBeGreaterThan(report.todayLow);
    expect(report.hourly).toHaveLength(48);
    expect(report.hourly[0].time).toBe(
      new Date(Math.floor(BASE_DT / 3600) * 3600 * 1000).toISOString()
    );
    // Interpolated hourly temps stay within the forecast range.
    const temps = report.hourly.map((h) => h.temperature);
    expect(Math.min(...temps)).toBeGreaterThanOrEqual(9);
    expect(Math.max(...temps)).toBeLessThanOrEqual(20);
    // 40 slots at 3h steps span ~5 calendar dates.
    expect(report.daily.length).toBeGreaterThanOrEqual(4);
    expect(report.daily.length).toBeLessThanOrEqual(6);
    expect(report.daily[0]).toMatchObject({ condition: "Rain" });
    expect(report.daily[0].precipitationProbability).toBe(35);
    expect(report.isStale).toBe(false);
  });

  test("falls back for missing weather entries and clamps pop", () => {
    const current = makeCurrent();
    current.weather = [];
    const forecast = makeForecast(2);
    forecast.list[0].weather = [];
    forecast.list[0].pop = 2.5; // invalid > 1

    const report = normalizeFreeTierResponse(current, forecast, {
      city: "X",
      country: "Y",
      updatedAt: new Date(NOW).toISOString(),
    });

    expect(report.condition).toBe("Unknown");
    expect(report.daily[0].precipitationProbability).toBe(100);
  });

  test("returns current-only hourly fallback when the forecast is empty", () => {
    const report = normalizeFreeTierResponse(
      makeCurrent(),
      { list: [] },
      { city: "X", country: "Y", updatedAt: new Date(NOW).toISOString() }
    );
    expect(report.hourly).toHaveLength(48);
    expect(report.daily).toHaveLength(0);
    expect(report.todayHigh).toBe(15); // rounds current temp_max 14.7
  });
});

describe("getWeatherReportByCoords", () => {
  test("rejects invalid coordinates without fetching", async () => {
    const fetchMock = stubFetch({});
    vi.stubGlobal("fetch", fetchMock);
    await expect(getWeatherReportByCoords({ latitude: NaN, longitude: 0 }, NOW)).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("reuses cached data within the TTL (one upstream round)", async () => {
    const fetchMock = stubFetch({});
    vi.stubGlobal("fetch", fetchMock);

    const first = await getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW);
    const second = await getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW + 60_000);

    // One round = current + forecast requests.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second.updatedAt).toBe(first.updatedAt);
    expect(second.isStale).toBe(false);
  });

  test("refetches after the TTL expires", async () => {
    const fetchMock = stubFetch({});
    vi.stubGlobal("fetch", fetchMock);

    await getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW);
    await getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW + WEATHER_TTL_MS + 1);

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test("returns stale cached data when the refresh fails", async () => {
    const fetchMock = stubFetch({});
    vi.stubGlobal("fetch", fetchMock);
    await getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW);

    fetchMock.mockImplementation(async () => {
      throw new Error("network down");
    });
    const stale = await getWeatherReportByCoords(
      { latitude: LAT, longitude: LON },
      NOW + WEATHER_TTL_MS + 1
    );

    expect(stale.isStale).toBe(true);
    expect(stale.city).toBe("London");
    expect(stale.hourly).toHaveLength(48);
  });

  test("throws when the fetch fails with no cache to fall back on", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );
    await expect(
      getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW)
    ).rejects.toBeInstanceOf(OpenWeatherError);
  });

  test("surfaces a 401 for an invalid API key", async () => {
    vi.stubGlobal("fetch", stubFetch({ forecastStatus: 401, currentStatus: 401 }));
    // Silence the server-side error log for this negative test.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW)
      ).rejects.toMatchObject({ status: 401 });
    } finally {
      consoleSpy.mockRestore();
    }
  });

  test("throws a 500 when the API key is missing without fetching", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    const fetchMock = stubFetch({});
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW)
    ).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getWeatherReportByCity", () => {
  test("resolves the city to coordinates and shares the coord cache", async () => {
    const fetchMock = stubFetch({});
    vi.stubGlobal("fetch", fetchMock);

    const byCity = await getWeatherReportByCity("London", NOW);
    expect(byCity.city).toBe("London");
    expect(byCity.country).toBe("GB");

    // Same coordinates via coords path → cache hit, no extra upstream calls.
    const callsAfterCity = fetchMock.mock.calls.length;
    const byCoords = await getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW + 1000);
    expect(byCoords.updatedAt).toBe(byCity.updatedAt);
    expect(fetchMock.mock.calls.length).toBe(callsAfterCity);
  });

  test("throws 404 for an unknown city", async () => {
    vi.stubGlobal("fetch", stubFetch({ geo: [] }));
    await expect(getWeatherReportByCity("Nowhere", NOW)).rejects.toMatchObject({ status: 404 });
  });

  test("throws 400 for a blank city", async () => {
    const fetchMock = stubFetch({});
    vi.stubGlobal("fetch", fetchMock);
    await expect(getWeatherReportByCity("   ", NOW)).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
