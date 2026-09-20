import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { HourlyForecastList } from "@/components/hourly-forecast";
import type { HourlyForecast } from "@/types/weather";

function makeHourly(count: number): HourlyForecast[] {
  const base = Date.parse("2026-09-20T00:00:00Z");
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(base + i * 3600_000).toISOString(),
    temperature: 10 + i,
    condition: i % 2 === 0 ? "Clear" : "Clouds",
    description: "sky",
  }));
}

describe("HourlyForecastList", () => {
  test("renders nothing for an empty forecast", () => {
    const { container } = render(<HourlyForecastList hourly={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders one cell per hour with time, icon, and temperature", () => {
    render(<HourlyForecastList hourly={makeHourly(48)} />);
    expect(screen.getByRole("list", { name: /next 48 hours/i })).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(48);
    expect(screen.getAllByText(/°$/).length).toBeGreaterThanOrEqual(48);
  });

  test("labels icons for assistive technology", () => {
    render(<HourlyForecastList hourly={makeHourly(2)} />);
    expect(screen.getAllByRole("img", { name: "Clear" })).toHaveLength(1);
    expect(screen.getAllByRole("img", { name: "Clouds" })).toHaveLength(1);
  });

  test("passes through invalid timestamps instead of crashing", () => {
    render(
      <HourlyForecastList
        hourly={[{ time: "not-a-date", temperature: 5, condition: "Snow", description: "snow" }]}
      />
    );
    expect(screen.getByText("not-a-date")).toBeDefined();
  });
});
