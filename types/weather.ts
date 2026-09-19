/** Display models for weather, shared by client and server. */

/** Current conditions. OpenWeather-specific structures never reach the UI. */
export type Weather = {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description: string;
};

/** One hour of the 48-hour forecast. */
export type HourlyForecast = {
  /** ISO timestamp of the hour. */
  time: string;
  temperature: number;
  condition: string;
  description: string;
};

/** One day of the 7-day forecast. */
export type DailyForecast = {
  /** Calendar date as YYYY-MM-DD. */
  date: string;
  condition: string;
  description: string;
  high: number;
  low: number;
  /** Precipitation probability as a 0–100 percentage. */
  precipitationProbability: number;
};

/**
 * Application-specific weather report: current conditions plus today's
 * high/low, 48 hours of hourly weather, and a 7-day forecast.
 * `isStale` marks data served from cache after a failed refresh.
 */
export type WeatherReport = Weather & {
  todayHigh: number;
  todayLow: number;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  /** ISO timestamp of the successful upstream fetch. */
  updatedAt: string;
  /** True when this data is cached and may be outdated. */
  isStale: boolean;
};
