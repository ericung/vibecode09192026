import type { WeatherLocation } from "@/types/location";
import type { WeatherReport } from "@/types/weather";

/** Map an OpenWeather condition to a display emoji. Client-safe. */
export function weatherEmoji(condition: string): string {
  switch (condition.toLowerCase()) {
    case "clear":
      return "☀️";
    case "clouds":
      return "☁️";
    case "rain":
    case "drizzle":
      return "🌧️";
    case "thunderstorm":
      return "⛈️";
    case "snow":
      return "❄️";
    case "mist":
    case "fog":
    case "haze":
      return "🌫️";
    default:
      return "🌤️";
  }
}

export class WeatherRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WeatherRequestError";
    this.status = status;
  }
}

/** Fetch and validate a weather report from our own API route. Client-safe. */
async function requestWeatherReport(path: string): Promise<WeatherReport> {
  const response = await fetch(path);
  const data = await response.json();
  if (!response.ok) {
    throw new WeatherRequestError(
      data.error || "Could not load weather.",
      response.status
    );
  }
  return data as WeatherReport;
}

/** Fetch the full weather report for a city from our own API route. Client-safe. */
export async function fetchWeather(location: string): Promise<WeatherReport> {
  return requestWeatherReport(
    `/api/weather?city=${encodeURIComponent(location)}`
  );
}

/** Fetch the full weather report for a structured location (coords preferred). Client-safe. */
export async function fetchWeatherForLocation(location: WeatherLocation): Promise<WeatherReport> {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
    city: location.city,
    country: location.countryCode ?? location.country,
  });
  return requestWeatherReport(`/api/weather?${params.toString()}`);
}
