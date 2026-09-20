import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ThemeToggle } from "@/components/theme-toggle";

afterEach(() => {
  document.documentElement.classList.remove("dark");
  vi.unstubAllGlobals();
});

function stubStorage(value: string | null) {
  const store = new Map<string, string>();
  if (value !== null) store.set("theme", value);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => void store.set(key, val),
    removeItem: (key: string) => void store.delete(key),
  } as unknown as Storage);
  return store;
}

describe("ThemeToggle", () => {
  test("defaults to light without stored preference or matchMedia", () => {
    stubStorage(null);
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeDefined();
  });

  test("respects a stored dark preference", () => {
    stubStorage("dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeDefined();
  });

  test("toggles the theme class and persists the choice", () => {
    const store = stubStorage("light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: "Switch to dark mode" });
    fireEvent.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(store.get("theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeDefined();
  });

  test("still toggles when storage throws (private mode)", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /switch to/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
