"use client";

import { weatherEmoji } from "@/lib/weather";
import type { HourlyForecast } from "@/types/weather";

/** Format an hourly ISO timestamp as a short local hour, e.g. "2 PM". Client-safe. */
export function formatHourLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date
    .toLocaleString(undefined, { hour: "numeric", hour12: true })
    .replace(/\s+/g, " ")
    .toUpperCase();
}

type HourlyForecastProps = {
  hourly: HourlyForecast[];
};

/**
 * 48-hour forecast strip (Phase 4, Prompt 12).
 * Horizontal scroll, one compact cell per hour: time, icon, temperature.
 */
export function HourlyForecastList({ hourly }: HourlyForecastProps) {
  if (hourly.length === 0) return null;

  return (
    <section aria-label="48-hour forecast" className="mt-8 w-full min-w-0 max-w-full overflow-hidden">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Next 48 hours
      </h2>
      <ul
        className="flex min-w-0 max-w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]"
        aria-label="Hourly weather for the next 48 hours"
      >
        {hourly.map((hour) => (
          <li
            key={hour.time}
            className="flex min-w-[64px] shrink-0 snap-start flex-col items-center gap-1 rounded-lg border border-[var(--line)] bg-background/60 px-2 py-3 text-center dark:border-white/10 sm:min-w-[72px]"
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {formatHourLabel(hour.time)}
            </span>
            <span
              className="text-xl leading-none"
              role="img"
              aria-label={hour.condition}
              title={`${hour.condition} — ${hour.description}`}
            >
              {weatherEmoji(hour.condition)}
            </span>
            <span className="text-sm font-semibold">{hour.temperature}°</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
