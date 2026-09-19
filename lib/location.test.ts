import { describe, expect, test } from "vitest";

import {
  createLocation,
  formatLocationLabel,
  formatLocationShort,
  isSameLocation,
  locationKey,
  parseLocation,
} from "@/lib/location";

describe("locationKey", () => {
  test("rounds coordinates to a stable key", () => {
    expect(locationKey(51.507351, -0.127758)).toBe("51.5074,-0.1278");
  });
});

describe("createLocation", () => {
  test("derives an id when omitted", () => {
    const location = createLocation({
      city: "London",
      country: "GB",
      latitude: 51.5074,
      longitude: -0.1278,
    });
    expect(location.id).toBe("51.5074,-0.1278");
  });
});

describe("isSameLocation", () => {
  test("matches locations with the same coordinates", () => {
    const a = createLocation({ city: "London", country: "GB", latitude: 1, longitude: 2 });
    const b = createLocation({ city: "Londres", country: "GB", latitude: 1, longitude: 2 });
    expect(isSameLocation(a, b)).toBe(true);
  });

  test("distinguishes different coordinates", () => {
    const a = createLocation({ city: "London", country: "GB", latitude: 1, longitude: 2 });
    const b = createLocation({ city: "London", country: "GB", latitude: 3, longitude: 4 });
    expect(isSameLocation(a, b)).toBe(false);
  });
});

describe("formatLocationLabel", () => {
  test("joins city, state, and country", () => {
    expect(
      formatLocationLabel(
        createLocation({
          city: "Austin",
          state: "Texas",
          country: "US",
          latitude: 30,
          longitude: -97,
        })
      )
    ).toBe("Austin, Texas, US");
  });

  test("omits a missing state", () => {
    expect(
      formatLocationLabel(
        createLocation({ city: "Paris", country: "FR", latitude: 48, longitude: 2 })
      )
    ).toBe("Paris, FR");
  });
});

describe("formatLocationShort", () => {
  test("prefers the country code", () => {
    expect(
      formatLocationShort(
        createLocation({
          city: "London",
          country: "United Kingdom",
          countryCode: "GB",
          latitude: 51,
          longitude: 0,
        })
      )
    ).toBe("London, GB");
  });
});

describe("parseLocation", () => {
  test("rejects invalid payloads", () => {
    expect(parseLocation(null)).toBeNull();
    expect(parseLocation({ city: "", country: "GB", latitude: 1, longitude: 2 })).toBeNull();
    expect(parseLocation({ city: "London", country: "GB", latitude: 200, longitude: 2 })).toBeNull();
  });

  test("accepts a valid payload", () => {
    expect(
      parseLocation({ city: "London", country: "GB", latitude: 51.5, longitude: -0.12 })
    ).toMatchObject({ city: "London", country: "GB" });
  });
});
