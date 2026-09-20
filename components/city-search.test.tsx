import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CitySearch } from "@/components/city-search";

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function typeQuery(value: string) {
  fireEvent.change(screen.getByRole("combobox"), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
}

describe("CitySearch", () => {
  test("does not fetch for queries shorter than 2 characters", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<CitySearch onSelect={() => {}} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "a" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  test("shows suggestions and selects on click", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          locations: [{ city: "Paris", country: "FR", latitude: 48.85, longitude: 2.35 }],
        })
      )
    );
    const onSelect = vi.fn();
    render(<CitySearch onSelect={onSelect} />);
    await typeQuery("par");
    expect(screen.getByRole("listbox")).toBeDefined();
    const optionButton = screen.getByRole("option", { name: /paris/i }).querySelector("button")!;
    fireEvent.click(optionButton);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ city: "Paris" }));
  });

  test("shows an empty-state message when no locations match", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ locations: [] })));
    render(<CitySearch onSelect={() => {}} />);
    await typeQuery("xyz");
    expect(screen.getByRole("status").textContent).toMatch(/no locations found/i);
  });

  test("shows a friendly error without server internals on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "down" }, 503)));
    render(<CitySearch onSelect={() => {}} />);
    await typeQuery("paris");
    const status = screen.getByRole("status");
    expect(status).toBeDefined();
    expect(status.textContent).not.toMatch(/key|stack/i);
  });

  test("selects the highlighted suggestion with Enter", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          locations: [
            { city: "Paris", country: "FR", latitude: 48.85, longitude: 2.35 },
            { city: "Parma", country: "IT", latitude: 44.8, longitude: 10.33 },
          ],
        })
      )
    );
    const onSelect = vi.fn();
    render(<CitySearch onSelect={onSelect} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "par" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(screen.getByRole("listbox")).toBeDefined();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ city: "Parma" }));
  });

  test("Search button confirms the first suggestion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          locations: [{ city: "Paris", country: "FR", latitude: 48.85, longitude: 2.35 }],
        })
      )
    );
    const onSelect = vi.fn();
    render(<CitySearch onSelect={onSelect} />);
    await typeQuery("par");
    expect(screen.getByRole("listbox")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ city: "Paris" }));
  });
});
