"use client";

import { memo } from "react";

import { Button } from "@/components/ui/button";
import { weatherEmoji } from "@/lib/weather";
import type { WeatherLocation } from "@/types/location";
import type { WeatherReport } from "@/types/weather";

type CurrentWeatherProps = {
  report: WeatherReport;
  location: WeatherLocation;
  loading: boolean;
  onRefresh: () => void;
};

/** Format an ISO timestamp for the "last updated" line. Client-safe. */
export function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Main current-weather section (Phase 4, Prompt 11).
 * Above-the-fold essentials only: city, temperature, condition,
 * today's high/low, last-updated timestamp, and refresh control.
 * Memoized: parent re-renders on recents/notice changes without new data.
 */
export const CurrentWeather = memo(function CurrentWeather({ report, location, loading, onRefresh }: CurrentWeatherProps) {
  return (
    <section aria-label="Current weather" className="w-full">
      {report.isStale ? (
        <p
          className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-900 dark:text-amber-200"
          role="status"
        >
          Data may be outdated — live update failed.
        </p>
      ) : null}

      <div className="location-row">
        <div>
          <p className="location">
            {location.city}, {report.country || location.country}
          </p>
          <p className="updated">
            H: {report.todayHigh}°&nbsp;&nbsp;L: {report.todayLow}°
          </p>
        </div>
        <span className="weather-emoji" role="img" aria-label={report.condition}>
          {weatherEmoji(report.condition)}
        </span>
      </div>

      <div className="temperature-row">
        <span className="temperature">{report.temperature}</span>
        <span className="degree">°C</span>
        <div className="condition">
          <strong>{report.condition}</strong>
          <span>{report.description}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Updated {formatUpdatedAt(report.updatedAt)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={onRefresh}
          aria-live="polite"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="details-grid">
        <div>
          <span>Feels like</span>
          <strong>{report.feelsLike}°</strong>
        </div>
        <div>
          <span>Humidity</span>
          <strong>{report.humidity}%</strong>
        </div>
        <div>
          <span>Wind</span>
          <strong>{report.windSpeed} km/h</strong>
        </div>
      </div>
    </section>
  );
});
