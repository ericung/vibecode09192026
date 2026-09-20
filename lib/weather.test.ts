import { afterEach, describe, expect, test, vi } from "vitest"

import { createLocation } from "@/lib/location"
import {
  fetchWeather,
  fetchWeatherForLocation,
  weatherEmoji,
  WeatherRequestError,
} from "@/lib/weather"

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("weatherEmoji", () => {
  test("maps known conditions", () => {
    expect(weatherEmoji("Clear")).toBe("☀️")
    expect(weatherEmoji("Clouds")).toBe("☁️")
    expect(weatherEmoji("Rain")).toBe("🌧️")
    expect(weatherEmoji("Snow")).toBe("❄️")
  })

  test("falls back for unknown conditions", () => {
    expect(weatherEmoji("VolcanicAsh")).toBe("🌤️")
  })
})

describe("fetchWeather", () => {
  test("returns the report on success", async () => {
    const report = { city: "Paris", temperature: 20 }
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(report)))
    expect(await fetchWeather("Paris")).toEqual(report)
  })

  test("throws a WeatherRequestError with status on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "nope" }, 404)))
    const error = await fetchWeather("Nowhere").catch((e) => e)
    expect(error).toBeInstanceOf(WeatherRequestError)
    expect((error as WeatherRequestError).status).toBe(404)
  })

  test("propagates network failures without a status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      })
    )
    await expect(fetchWeather("Paris")).rejects.toBeInstanceOf(TypeError)
  })
})

describe("fetchWeatherForLocation", () => {
  const location = createLocation({ city: "Paris", country: "FR", latitude: 48.85, longitude: 2.35 })

  test("encodes coordinates in the request URL", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ city: "Paris" }))
    vi.stubGlobal("fetch", fetchMock)
    await fetchWeatherForLocation(location)
    const firstCall = fetchMock.mock.calls[0] as unknown[]
    const url = String(firstCall[0])
    expect(url).toContain("lat=48.85")
    expect(url).toContain("lon=2.35")
  })

  test("throws with status when the API route fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "down" }, 502)))
    await expect(fetchWeatherForLocation(location)).rejects.toMatchObject({ status: 502 })
  })
})
