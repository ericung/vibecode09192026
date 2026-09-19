import { describe, expect, test } from "vitest"

import { weatherEmoji } from "@/lib/weather"

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
