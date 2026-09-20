"use client";

import { weatherEmoji } from "@/lib/weather";
import type { DailyForecast } from "@/types/weather";

/** Format a YYYY-MM-DD date as a short weekday, e.g. "Mon". Client-safe. */
export function formatDayLabel(dateStr: string): string {
  // Parse as UTC noon to avoid timezone day-shifts for date-only values.
  const date = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
}

type DailyForecastProps = {
  daily: DailyForecast[];
};

/**
 * Daily forecast (free tier covers ~5 days from 3-hourly data).
 * One row per day: day, icon/condition, high/low, precipitation probability.
 */
export function DailyForecastList({ daily }: DailyForecastProps) {
  if (daily.length === 0) return null;

  return (
    <section aria-label="Daily forecast" className="mt-8 w-full">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Next {daily.length} days
      </h2>
      <ul className="divide-y divide-border rounded-lg border border-[var(--line)] dark:border-white/10">
        {daily.map((day) => (
          <li
            key={day.date}
            className="flex items-center gap-2 px-3 py-2.5 text-sm sm:gap-3"
          >
            <span className="w-11 shrink-0 font-medium sm:w-12">
              {formatDayLabel(day.date)}
            </span>
            <span
              className="text-lg leading-none"
              role="img"
              aria-label={day.condition}
              title={`${day.condition} — ${day.description}`}
            >
              {weatherEmoji(day.condition)}
            </span>
            <span className="min-w-0 flex-1 truncate capitalize text-muted-foreground hidden min-[380px]:block">
              {day.description}
            </span>
            <span className="shrink-0 tabular-nums">
              <strong>{day.high}°</strong>
              <span className="text-muted-foreground"> / {day.low}°</span>
            </span>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {day.precipitationProbability}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
