// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { OpenWeatherError, type OneCallResponse } from "@/lib/server/openweather";
import { clearWeatherCache, WEATHER_TTL_MS } from "@/lib/server/weather-cache";
import {
  getWeatherReportByCity,
  getWeatherReportByCoords,
  normalizeOneCallResponse,
} from "@/lib/server/weather-service";

const NOW = 1_700_000_000_000;
const LAT = 51.5074;
const LON = -0.1278;

function makeOneCall(hourlyCount = 50, dailyCount = 9): OneCallResponse {
  return {
    lat: LAT,
    lon: LON,
    current: {
      dt: 1_700_000_000,
      temp: 12.4,
      feels_like: 9.6,
      humidity: 81,
      wind_speed: 4.2,
      weather: [{ main: "Clouds", description: "overcast clouds" }],
    },
    hourly: Array.from({ length: hourlyCount }, (_, i) => ({
      dt: 1_700_000_000 + i * 3600,
      temp: 10 + i * 0.1,
      pop: 0.2,
      weather: [{ main: "Clear", description: "clear sky" }],
    })),
    daily: Array.from({ length: dailyCount }, (_, i) => ({
      dt: 1_700_000_000 + i * 86400,
      temp: { min: 5 + i, max: 15 + i },
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

/** Route stubbed fetch by URL: geo direct → locations, onecall → weather. */
function stubFetch(options: { oneCall: OneCallResponse | null; geo?: unknown[] }) {
  return vi.fn(async (url: URL | string) => {
    const href = String(url);
    if (href.includes("/geo/1.0/direct")) {
      return jsonResponse(
        options.geo ?? [{ name: "London", lat: LAT, lon: LON, country: "GB" }]
      );
    }
    if (href.includes("/data/3.0/onecall")) {
      if (!options.oneCall) throw new Error("network down");
      return jsonResponse(options.oneCall);
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

describe("normalizeOneCallResponse", () => {
  test("maps current conditions, high/low, hourly, and daily", () => {
    const report = normalizeOneCallResponse(makeOneCall(), {
      city: "London",
      country: "GB",
      updatedAt: new Date(NOW).toISOString(),
    });

    expect(report.city).toBe("London");
    expect(report.temperature).toBe(12);
    expect(report.feelsLike).toBe(10);
    expect(report.windSpeed).toBe(15); // 4.2 m/s → km/h
    expect(report.todayHigh).toBe(15);
    expect(report.todayLow).toBe(5);
    expect(report.hourly).toHaveLength(48);
    expect(report.hourly[0]).toMatchObject({ temperature: 10, condition: "Clear" });
    expect(report.daily).toHaveLength(7);
    expect(report.daily[0]).toMatchObject({
      high: 15,
      low: 5,
      precipitationProbability: 35,
      condition: "Rain",
    });
    expect(report.isStale).toBe(false);
  });

  test("falls back for missing weather entries and clamps pop", () => {
    const raw = makeOneCall(1, 1);
    raw.current.weather = [];
    raw.hourly[0].weather = [];
    raw.daily[0].weather = [];
    raw.daily[0].pop = 2.5; // invalid > 1

    const report = normalizeOneCallResponse(raw, {
      city: "X",
      country: "Y",
      updatedAt: new Date(NOW).toISOString(),
    });

    expect(report.condition).toBe("Unknown");
    expect(report.daily[0].precipitationProbability).toBe(100);
  });
});

describe("getWeatherReportByCoords", () => {
  test("rejects invalid coordinates without fetching", async () => {
    const fetchMock = stubFetch({ oneCall: makeOneCall() });
    vi.stubGlobal("fetch", fetchMock);
    await expect(getWeatherReportByCoords({ latitude: NaN, longitude: 0 }, NOW)).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("reuses cached data within the TTL (one upstream call)", async () => {
    const fetchMock = stubFetch({ oneCall: makeOneCall() });
    vi.stubGlobal("fetch", fetchMock);

    const first = await getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW);
    const second = await getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW + 60_000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.updatedAt).toBe(first.updatedAt);
    expect(second.isStale).toBe(false);
  });

  test("refetches after the TTL expires", async () => {
    const fetchMock = stubFetch({ oneCall: makeOneCall() });
    vi.stubGlobal("fetch", fetchMock);

    await getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW);
    await getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW + WEATHER_TTL_MS + 1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("returns stale cached data when the refresh fails", async () => {
    const fetchMock = stubFetch({ oneCall: makeOneCall() });
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
    expect(stale.city).toBe("Unknown location");
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

  test("throws a 500 when the API key is missing without fetching", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    const fetchMock = stubFetch({ oneCall: makeOneCall() });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      getWeatherReportByCoords({ latitude: LAT, longitude: LON }, NOW)
    ).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getWeatherReportByCity", () => {
  test("resolves the city to coordinates and shares the coord cache", async () => {
    const fetchMock = stubFetch({ oneCall: makeOneCall() });
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
    vi.stubGlobal("fetch", stubFetch({ oneCall: makeOneCall(), geo: [] }));
    await expect(getWeatherReportByCity("Nowhere", NOW)).rejects.toMatchObject({ status: 404 });
  });

  test("throws 400 for a blank city", async () => {
    const fetchMock = stubFetch({ oneCall: makeOneCall() });
    vi.stubGlobal("fetch", fetchMock);
    await expect(getWeatherReportByCity("   ", NOW)).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
