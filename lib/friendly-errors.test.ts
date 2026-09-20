import { describe, expect, test } from "vitest";

import {
  friendlyGeolocationNotice,
  friendlyLocationError,
  friendlyWeatherError,
} from "@/lib/friendly-errors";
import { LocationSearchError } from "@/lib/location-search";
import { WeatherRequestError } from "@/lib/weather";

describe("friendlyWeatherError", () => {
  test("maps 400 to a valid-location prompt", () => {
    expect(friendlyWeatherError(new WeatherRequestError("bad", 400))).toBe(
      "Please enter a valid location."
    );
  });

  test("maps 404 to a not-found prompt", () => {
    expect(friendlyWeatherError(new WeatherRequestError("missing", 404))).toBe(
      "Location not found. Try another city search."
    );
  });

  test("maps auth failures without leaking key details", () => {
    for (const status of [401, 403]) {
      expect(friendlyWeatherError(new WeatherRequestError("Invalid API key", status))).toBe(
        "Weather service is unavailable right now. Please try again later."
      );
    }
  });

  test("maps rate limiting", () => {
    expect(friendlyWeatherError(new WeatherRequestError("limit", 429))).toBe(
      "Too many requests. Please wait a moment and try again."
    );
  });

  test("maps 5xx to a service-unavailable message", () => {
    expect(friendlyWeatherError(new WeatherRequestError("boom", 502))).toBe(
      "Weather service is unavailable. Check your connection and try again."
    );
  });

  test("maps network TypeError to an offline message", () => {
    expect(friendlyWeatherError(new TypeError("Failed to fetch"))).toBe(
      "No connection. Check your internet and try again."
    );
  });

  test("passes through short safe messages", () => {
    expect(friendlyWeatherError(new Error("City not found."))).toBe("City not found.");
  });

  test("sanitizes messages containing server internals", () => {
    expect(
      friendlyWeatherError(new Error("OPENWEATHER_API_KEY is missing, stack at ENOENT"))
    ).toBe("Could not load weather. Please try again.");
    expect(friendlyWeatherError("plain string")).toBe(
      "Could not load weather. Please try again."
    );
  });
});

describe("friendlyLocationError", () => {
  test("maps 404 to an empty-search prompt", () => {
    expect(friendlyLocationError(new LocationSearchError("x", 404))).toBe(
      "No locations found. Try another search."
    );
  });

  test("maps 5xx to a search-unavailable message", () => {
    expect(friendlyLocationError(new LocationSearchError("x", 503))).toBe(
      "Search is unavailable right now. Please try again."
    );
  });

  test("maps network failure to an offline message", () => {
    expect(friendlyLocationError(new TypeError("network error"))).toBe(
      "No connection. Check your internet and try again."
    );
  });

  test("sanitizes key material", () => {
    expect(friendlyLocationError(new Error("bad token value"))).toBe(
      "Could not search locations. Please try again."
    );
  });
});

describe("friendlyGeolocationNotice", () => {
  test("returns a stable user-facing notice", () => {
    expect(friendlyGeolocationNotice()).toBe(
      "Location unavailable — showing your most recent location."
    );
  });
});
