import { describe, expect, test } from "vitest";

import { createLocation } from "@/lib/location";
import {
  addRecentLocation,
  loadRecentLocations,
  MAX_RECENT_LOCATIONS,
  parseRecentLocations,
  removeRecentLocation,
  saveRecentLocations,
} from "@/lib/recent-locations";

function makeLocation(city: string, latitude: number, longitude = 0) {
  return createLocation({ city, country: "US", latitude, longitude });
}

describe("addRecentLocation", () => {
  test("prepends a new location", () => {
    const result = addRecentLocation([makeLocation("Austin", 30)], makeLocation("Paris", 48));
    expect(result.map((l) => l.city)).toEqual(["Paris", "Austin"]);
  });

  test("moves a duplicate to the front without duplicating", () => {
    const austin = makeLocation("Austin", 30);
    const paris = makeLocation("Paris", 48);
    const result = addRecentLocation([paris, austin], austin);
    expect(result.map((l) => l.city)).toEqual(["Austin", "Paris"]);
  });

  test("caps the list at 10 entries", () => {
    const recents = Array.from({ length: 10 }, (_, i) => makeLocation(`City ${i}`, i));
    const result = addRecentLocation(recents, makeLocation("New", 99));
    expect(result).toHaveLength(MAX_RECENT_LOCATIONS);
    expect(result[0].city).toBe("New");
    expect(result.map((l) => l.city)).not.toContain("City 9");
  });
});

describe("removeRecentLocation", () => {
  test("removes the matching coordinates", () => {
    const result = removeRecentLocation(
      [makeLocation("Austin", 30), makeLocation("Paris", 48)],
      makeLocation("Austin", 30)
    );
    expect(result.map((l) => l.city)).toEqual(["Paris"]);
  });
});

describe("parseRecentLocations", () => {
  test("drops invalid and duplicate entries", () => {
    const result = parseRecentLocations([
      { city: "Austin", country: "US", latitude: 30, longitude: -97 },
      { city: "Austin", country: "US", latitude: 30, longitude: -97 },
      { city: "", country: "US", latitude: 1, longitude: 1 },
      "not a location",
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].city).toBe("Austin");
  });

  test("returns [] for non-arrays", () => {
    expect(parseRecentLocations(null)).toEqual([]);
    expect(parseRecentLocations({})).toEqual([]);
  });
});

describe("localStorage round-trip", () => {
  test("saves and loads recents", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      length: 0,
    } as unknown as Storage;

    saveRecentLocations([makeLocation("Austin", 30)], storage);
    expect(loadRecentLocations(storage).map((l) => l.city)).toEqual(["Austin"]);
  });

  test("returns [] when storage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    expect(loadRecentLocations(broken)).toEqual([]);
  });
});
