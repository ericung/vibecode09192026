import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { RecentLocations } from "@/components/recent-locations";
import { createLocation } from "@/lib/location";

function makeLocation(city: string, latitude: number) {
  return createLocation({ city, country: "US", latitude, longitude: 0 });
}

describe("RecentLocations", () => {
  test("renders nothing when there are no locations", () => {
    const { container } = render(<RecentLocations locations={[]} onSelect={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders each recent city and marks the active one", () => {
    const austin = makeLocation("Austin", 30);
    const paris = makeLocation("Paris", 48);
    render(
      <RecentLocations locations={[austin, paris]} selectedId={paris.id} onSelect={() => {}} />
    );
    expect(screen.getByRole("button", { name: "Austin" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Paris" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Paris" }).textContent).toBe("Paris");
  });

  test("selects a location on click and clears on Clear", () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();
    const austin = makeLocation("Austin", 30);
    render(
      <RecentLocations locations={[austin]} onSelect={onSelect} onClear={onClear} />
    );
    screen.getByRole("button", { name: "Austin" }).click();
    expect(onSelect).toHaveBeenCalledWith(austin);
    screen.getByRole("button", { name: "Clear" }).click();
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test("omits the Clear button when no handler is provided", () => {
    render(<RecentLocations locations={[makeLocation("Austin", 30)]} onSelect={() => {}} />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });
});
