import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { DailyForecastList, formatDayLabel } from "@/components/daily-forecast";
import type { DailyForecast } from "@/types/weather";

function makeDaily(): DailyForecast[] {
  return [
    { date: "2026-09-21", condition: "Clear", description: "clear sky", high: 24, low: 15, precipitationProbability: 5 },
    { date: "2026-09-22", condition: "Rain", description: "light rain", high: 19, low: 13, precipitationProbability: 80 },
  ];
}

describe("formatDayLabel", () => {
  test("formats a date as a short weekday", () => {
    expect(formatDayLabel("2026-09-21")).toMatch(/^[A-Za-z]{3}$/);
  });

  test("passes through invalid dates", () => {
    expect(formatDayLabel("nope")).toBe("nope");
  });
});

describe("DailyForecastList", () => {
  test("renders nothing for an empty forecast", () => {
    const { container } = render(<DailyForecastList daily={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders high/low and precipitation probability per day", () => {
    render(<DailyForecastList daily={makeDaily()} />);
    expect(screen.getByText("24°")).toBeDefined();
    expect(screen.getByText("5%")).toBeDefined();
    expect(screen.getByText("80%")).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  test("labels condition icons accessibly", () => {
    render(<DailyForecastList daily={makeDaily()} />);
    expect(screen.getByRole("img", { name: "Rain" })).toBeDefined();
  });
});
