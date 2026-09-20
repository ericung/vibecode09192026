import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import Page from "../app/page";

function makeReport(overrides: Record<string, unknown> = {}) {
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

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  return vi.fn(async (url: string) => handler(String(url)));
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

function denyGeolocation() {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (_: unknown, onError: (e: { code: number; message: string }) => void) =>
        onError({ code: 1, message: "denied" }),
    },
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("page loading and error states", () => {
  test("shows a locating skeleton on startup", () => {
    denyGeolocation();
    vi.stubGlobal("fetch", stubFetch(() => new Promise(() => {})));
    render(<Page />);
    expect(
      screen.getByRole("status", { name: /detecting your location/i })
    ).toBeDefined();
  });

  test("loads weather after geolocation and shows a stale banner when outdated", async () => {
    denyGeolocation();
    window.localStorage.setItem(
      "weather:recent-locations",
      JSON.stringify([{ city: "Paris", country: "FR", latitude: 48.85, longitude: 2.35 }])
    );
    vi.stubGlobal(
      "fetch",
      stubFetch((url) =>
        url.includes("/api/weather")
          ? jsonResponse(makeReport({ isStale: true }))
          : jsonResponse({ locations: [] })
      )
    );
    render(<Page />);
    await waitFor(() =>
      expect(screen.getByText(/data may be outdated/i)).toBeDefined()
    );
    expect(screen.getByText(/most recent location/i)).toBeDefined();
  });

  test("shows a friendly error and retries on weather failure", async () => {
    denyGeolocation();
    window.localStorage.setItem(
      "weather:recent-locations",
      JSON.stringify([{ city: "Paris", country: "FR", latitude: 48.85, longitude: 2.35 }])
    );
    const fetchMock = stubFetch((url) =>
      url.includes("/api/weather")
        ? jsonResponse({ error: "Unable to reach the weather service." }, 502)
        : jsonResponse({ locations: [] })
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<Page />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/unavailable|connection|try again/i);
    expect(alert.textContent).not.toMatch(/key|stack|openweather/i);

    // Retry issues another weather request.
    const callsBefore = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/api/weather")).length;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => {
      const callsAfter = fetchMock.mock.calls.filter((c) =>
        String(c[0]).includes("/api/weather")
      ).length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
  });

  test("prevents duplicate refresh requests while loading", async () => {
    let resolveWeather!: (value: Response) => void;
    denyGeolocation();
    window.localStorage.setItem(
      "weather:recent-locations",
      JSON.stringify([{ city: "Paris", country: "FR", latitude: 48.85, longitude: 2.35 }])
    );
    const fetchMock = stubFetch((url) => {
      if (!url.includes("/api/weather")) return jsonResponse({ locations: [] });
      return new Promise<Response>((resolve) => {
        resolveWeather = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Page />);

    // Wait until the first weather request is in flight, then resolve it.
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/api/weather"))).toBe(true);
    });
    resolveWeather(jsonResponse(makeReport()));
    await screen.findByRole("button", { name: "Refresh" });

    // Two rapid refresh clicks issue only one additional request (loadingRef guard).
    const before = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/api/weather")
    ).length;
    const refresh = screen.getByRole("button", { name: "Refresh" });
    fireEvent.click(refresh);
    fireEvent.click(refresh);
    await waitFor(() => {
      const after = fetchMock.mock.calls.filter((c) =>
        String(c[0]).includes("/api/weather")
      ).length;
      expect(after).toBe(before + 1);
    });
  });
});
