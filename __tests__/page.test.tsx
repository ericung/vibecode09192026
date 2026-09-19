import { render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

import Page from "../app/page"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test("attempts geolocation on startup and falls back to search", async () => {
  const getCurrentPosition = vi.fn((_: unknown, onError: (e: { code: number; message: string }) => void) => {
    onError({ code: 1, message: "denied" })
  })
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } })
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("mocked fetch"))
  )

  render(<Page />)

  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Weather, wherever you are.",
    })
  ).toBeDefined()
  expect(await screen.findByRole("combobox")).toBeDefined()
})
