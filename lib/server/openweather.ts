import "server-only";

/**
 * Raw OpenWeather client (Prompt 7). The API key lives exclusively in the
 * `OPENWEATHER_API_KEY` environment variable and is only ever used in this
 * server-only module. Callers receive strongly typed raw responses; the
 * application-specific model is built in `weather-service.ts` so
 * OpenWeather-specific structures stay isolated from the UI.
 */

export class OpenWeatherError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenWeatherError";
    this.status = status;
  }
}

export type OneCallWeatherEntry = {
  main: string;
  description: string;
};

export type OneCallCurrent = {
  dt: number;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather: OneCallWeatherEntry[];
};

export type OneCallHourly = {
  dt: number;
  temp: number;
  pop?: number;
  weather: OneCallWeatherEntry[];
};

export type OneCallDaily = {
  dt: number;
  temp: { min: number; max: number };
  pop?: number;
  weather: OneCallWeatherEntry[];
};

export type OneCallResponse = {
  lat: number;
  lon: number;
  current: OneCallCurrent;
  hourly: OneCallHourly[];
  daily: OneCallDaily[];
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

/**
 * Fetch the raw One Call 3.0 response (current + hourly + daily) for coordinates.
 * Uses `cache: "no-store"` so Next.js does not cache upstream responses —
 * freshness is governed by our own 15-minute TTL cache instead.
 */
export async function fetchOneCallRaw(
  latitude: number,
  longitude: number
): Promise<OneCallResponse> {
  const apiKey = requireApiKey();
  validateCoords(latitude, longitude);

  const url = new URL("https://api.openweathermap.org/data/3.0/onecall");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("exclude", "minutely,alerts");
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", apiKey);

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new OpenWeatherError("Unable to reach the weather service.", 502);
  }

  if (!response.ok) {
    throw new OpenWeatherError("Unable to reach the weather service.", 502);
  }

  const data = (await response.json()) as OneCallResponse;
  if (!data || !data.current || !Array.isArray(data.hourly) || !Array.isArray(data.daily)) {
    throw new OpenWeatherError("Unable to reach the weather service.", 502);
  }
  return data;
}
