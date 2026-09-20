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

/** One day of the daily forecast (free tier: ~5 days from 3-hourly data). */
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
 * high/low, 48 hours of hourly weather (interpolated from 3-hourly data),
 * and a daily forecast (free tier covers ~5 days).
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
