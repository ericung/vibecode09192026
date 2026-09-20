import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { CurrentWeather } from "@/components/current-weather";
import { createLocation } from "@/lib/location";
import type { WeatherReport } from "@/types/weather";

function makeReport(overrides: Partial<WeatherReport> = {}): WeatherReport {
  return {
    city: "Paris",
    country: "FR",
    temperature: 21,
    feelsLike: 20,
    humidity: 55,
    windSpeed: 12,
    condition: "Clear",
    description: "clear sky",
    todayHigh: 24,
    todayLow: 15,
    hourly: [],
    daily: [],
    updatedAt: new Date("2026-09-20T12:00:00Z").toISOString(),
    isStale: false,
    ...overrides,
  };
}

const location = createLocation({ city: "Paris", country: "FR", latitude: 48.85, longitude: 2.35 });

describe("CurrentWeather", () => {
  test("shows city, temperature, high/low, and refresh", () => {
    render(
      <CurrentWeather report={makeReport()} location={location} loading={false} onRefresh={() => {}} />
    );
    expect(screen.getByText("Paris, FR")).toBeDefined();
    expect(screen.getByText("21")).toBeDefined();
    expect(screen.getByText(/H: 24°/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDefined();
  });

  test("shows the stale banner when cached data is outdated", () => {
    render(
      <CurrentWeather
        report={makeReport({ isStale: true })}
        location={location}
        loading={false}
        onRefresh={() => {}}
      />
    );
    expect(screen.getByRole("status").textContent).toMatch(/outdated/i);
  });

  test("disables refresh while loading and calls onRefresh", () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <CurrentWeather report={makeReport()} location={location} loading={false} onRefresh={onRefresh} />
    );
    screen.getByRole("button", { name: "Refresh" }).click();
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender(
      <CurrentWeather report={makeReport()} location={location} loading={true} onRefresh={onRefresh} />
    );
    const refreshing = screen.getByRole("button", { name: "Refreshing…" });
    expect((refreshing as HTMLButtonElement).disabled).toBe(true);
  });

  test("falls back to the raw timestamp for invalid dates", () => {
    render(
      <CurrentWeather
        report={makeReport({ updatedAt: "not-a-date" })}
        location={location}
        loading={false}
        onRefresh={() => {}}
      />
    );
    expect(screen.getByText(/not-a-date/)).toBeDefined();
  });
});
