import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { LocatingSkeleton, WeatherSkeleton } from "@/components/weather-skeletons";

describe("WeatherSkeleton", () => {
  test("exposes an accessible loading status without layout shift gaps", () => {
    render(<WeatherSkeleton />);
    expect(screen.getByRole("status", { name: "Loading weather…" })).toBeDefined();
    expect(screen.getByText("Loading weather…")).toBeDefined();
  });

  test("locating skeleton announces location detection", () => {
    render(<LocatingSkeleton />);
    expect(
      screen.getByRole("status", { name: /detecting your location/i })
    ).toBeDefined();
  });
});
