import { describe, expect, test } from "vitest";

import { resolveInitialLocation } from "@/lib/geolocation";
import { createLocation } from "@/lib/location";

describe("resolveInitialLocation", () => {
  const recent = createLocation({ city: "Austin", country: "US", latitude: 30, longitude: -97 });

  test("prefers geolocation and reverse-geocodes it", async () => {
    const coords = createLocation({ city: "Current location", country: "", latitude: 1, longitude: 2 });
    const named = createLocation({ city: "Paris", country: "FR", latitude: 1, longitude: 2 });
    const result = await resolveInitialLocation({
      locate: async () => coords,
      reverseGeocode: async () => named,
      mostRecent: recent,
    });
    expect(result).toEqual({ location: named, source: "geolocation" });
  });

  test("falls back to the most recent location when geolocation fails", async () => {
    const result = await resolveInitialLocation({
      locate: async () => {
        throw new Error("denied");
      },
      mostRecent: recent,
    });
    expect(result).toEqual({ location: recent, source: "recent" });
  });

  test("returns null when neither geolocation nor recents exist", async () => {
    const result = await resolveInitialLocation({
      locate: async () => {
        throw new Error("denied");
      },
    });
    expect(result).toBeNull();
  });
});
