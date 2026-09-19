import { describe, expect, test } from "vitest"

import { cn } from "@/lib/utils"

describe("cn", () => {
  test("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  test("resolves conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  test("handles conditional values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c")
  })
})
