import "server-only";

/**
 * Raw OpenWeather client (free tier: Current Weather + 5-day forecast).
 * The API key lives exclusively in the `OPENWEATHER_API_KEY` environment
 * variable and is only ever used in this server-only module. Callers receive
 * strongly typed raw responses; the application-specific model is built in
 * `weather-service.ts` so OpenWeather-specific structures stay isolated
 * from the UI.
 *
 * NOTE: One Call 3.0 (`/data/3.0/onecall`) requires a paid subscription, so
 * free API keys get 401 there. This module uses only the free endpoints:
 * `GET /data/2.5/weather` (current) and `GET /data/2.5/forecast` (5-day /
 * 3-hourly), which work with a standard free key.
 */

export class OpenWeatherError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenWeatherError";
    this.status = status;
  }
}

export type WeatherConditionEntry = {
  main: string;
  description: string;
};

export type CurrentWeatherRaw = {
  dt: number;
  name?: string;
  sys?: { country?: string };
  weather: WeatherConditionEntry[];
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    temp_min: number;
    temp_max: number;
  };
  wind: { speed: number };
};

export type ForecastSlotRaw = {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: WeatherConditionEntry[];
  pop?: number;
};

export type ForecastRaw = {
  list: ForecastSlotRaw[];
  city?: { name?: string; country?: string };
};

export function requireApiKey(): string {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new OpenWeatherError("Weather service is not configured.", 500);
  }
  return apiKey;
}

function validateCoords(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new OpenWeatherError("Invalid coordinates.", 400);
  }
}

function buildUrl(
  path: string,
  latitude: number,
  longitude: number,
  apiKey: string
): URL {
  const url = new URL(`https://api.openweathermap.org${path}`);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", apiKey);
  return url;
}

/** Map an upstream failure to a typed error without leaking the key. */
function toUpstreamError(response: Response, bodyMessage?: string): OpenWeatherError {
  const status = response.status;
  // Log the real status server-side so 401/429/paywall issues are diagnosable.
  console.error(`OpenWeather request failed: ${status} ${bodyMessage ?? ""}`.trim());
  if (status === 401) {
    return new OpenWeatherError(
      "Invalid OpenWeather API key. Check OPENWEATHER_API_KEY.",
      401
    );
  }
  if (status === 404) {
    return new OpenWeatherError("Location not found.", 404);
  }
  if (status === 429) {
    return new OpenWeatherError("Weather service rate limit exceeded.", 429);
  }
  return new OpenWeatherError("Unable to reach the weather service.", 502);
}

async function fetchJson(url: URL): Promise<{ response: Response; body: unknown }> {
  let response: Response;
  try {
    // `cache: "no-store"` so Next.js does not cache upstream responses —
    // freshness is governed by our own 15-minute TTL cache instead.
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new OpenWeatherError("Unable to reach the weather service.", 502);
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

function upstreamMessage(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null) {
    const message = (body as Record<string, unknown>).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return undefined;
}

/** Fetch raw current weather (free `data/2.5/weather` endpoint). */
export async function fetchCurrentWeatherRaw(
  latitude: number,
  longitude: number
): Promise<CurrentWeatherRaw> {
  const apiKey = requireApiKey();
  validateCoords(latitude, longitude);

  const url = buildUrl("/data/2.5/weather", latitude, longitude, apiKey);
  const { response, body } = await fetchJson(url);
  if (!response.ok) {
    throw toUpstreamError(response, upstreamMessage(body));
  }
  const data = body as Partial<CurrentWeatherRaw>;
  if (
    !data ||
    typeof data.dt !== "number" ||
    !data.main ||
    typeof data.main.temp !== "number" ||
    !Array.isArray(data.weather)
  ) {
    throw new OpenWeatherError("Unable to reach the weather service.", 502);
  }
  return data as CurrentWeatherRaw;
}

/** Fetch the raw 5-day / 3-hourly forecast (free `data/2.5/forecast` endpoint). */
export async function fetchForecastRaw(
  latitude: number,
  longitude: number
): Promise<ForecastRaw> {
  const apiKey = requireApiKey();
  validateCoords(latitude, longitude);

  const url = buildUrl("/data/2.5/forecast", latitude, longitude, apiKey);
  const { response, body } = await fetchJson(url);
  if (!response.ok) {
    throw toUpstreamError(response, upstreamMessage(body));
  }
  const data = body as Partial<ForecastRaw>;
  if (!data || !Array.isArray(data.list)) {
    throw new OpenWeatherError("Unable to reach the weather service.", 502);
  }
  return data as ForecastRaw;
}
