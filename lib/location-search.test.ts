import { afterEach, describe, expect, test, vi } from "vitest";

import { LocationSearchError, reverseGeocodeLocation, searchLocations } from "@/lib/location-search";

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchLocations", () => {
  test("returns [] without fetching for blank queries", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchLocations("   ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("parses valid locations and drops invalid entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          locations: [
            { city: "Paris", country: "FR", latitude: 48.85, longitude: 2.35 },
            { city: "", country: "FR", latitude: 1, longitude: 1 },
          ],
        })
      )
    );
    const results = await searchLocations("paris");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ city: "Paris", country: "FR" });
  });

  test("throws a LocationSearchError with status on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "bad" }, 503)));
    await expect(searchLocations("paris")).rejects.toMatchObject({ status: 503 });
  });

  test("propagates network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    await expect(searchLocations("paris")).rejects.toBeInstanceOf(TypeError);
  });

  test("returns [] when the payload shape is unexpected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ locations: "nope" })));
    expect(await searchLocations("paris")).toEqual([]);
  });
});

describe("reverseGeocodeLocation", () => {
  test("returns the first valid location", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          locations: [{ city: "Paris", country: "FR", latitude: 48.85, longitude: 2.35 }],
        })
      )
    );
    const location = await reverseGeocodeLocation(48.85, 2.35);
    expect(location.city).toBe("Paris");
  });

  test("throws 404 when no named location resolves", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ locations: [] })));
    await expect(reverseGeocodeLocation(0, 0)).rejects.toMatchObject({ status: 404 });
  });

  test("wraps upstream errors with status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "down" }, 500))
    );
    const error = await reverseGeocodeLocation(1, 2).catch((e) => e);
    expect(error).toBeInstanceOf(LocationSearchError);
    expect((error as LocationSearchError).status).toBe(500);
  });
});
