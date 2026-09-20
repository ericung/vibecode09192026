"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatLocationLabel } from "@/lib/location";
import { friendlyLocationError } from "@/lib/friendly-errors";
import { searchLocations } from "@/lib/location-search";
import type { WeatherLocation } from "@/types/location";
import { cn } from "@/lib/utils";

type CitySearchProps = {
  onSelect: (location: WeatherLocation) => void;
  autoFocus?: boolean;
  placeholder?: string;
};

/**
 * City search with debounced suggestions.
 * Suggestions show city, state/province, and country.
 */
export function CitySearch({ onSelect, autoFocus, placeholder }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<WeatherLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  function handleQueryChange(value: string) {
    setQuery(value);
    // Update search UI synchronously in the event handler (not in an effect)
    // so typing stays responsive without cascading renders.
    if (value.trim().length < 2) {
      requestId.current += 1;
      setSuggestions([]);
      setOpen(false);
      setSearching(false);
      setSearchError("");
      setHighlighted(-1);
    } else {
      setSearching(true);
      setSearchError("");
    }
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchLocations(q);
        if (requestId.current !== id) return;
        setSuggestions(results);
        setOpen(true);
        setHighlighted(results.length > 0 ? 0 : -1);
        setSearchError(results.length === 0 ? "No locations found. Try another search." : "");
      } catch (error) {
        if (requestId.current !== id) return;
        setSuggestions([]);
        setOpen(true);
        setSearchError(friendlyLocationError(error));
      } finally {
        if (requestId.current === id) setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function select(location: WeatherLocation) {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    onSelect(location);
  }

  function handleSearchClick() {
    // The debounced effect already searches as the user types; the button
    // confirms the current best match so it never appears dead.
    const target = suggestions[highlighted] ?? suggestions[0];
    if (target) select(target);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = suggestions[highlighted] ?? suggestions[0];
      if (target) select(target);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
        <label htmlFor="city-search" className="sr-only">
          Search for a city
        </label>
        <Input
          id="city-search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 || searchError) setOpen(true);
          }}
          placeholder={placeholder ?? "Search a city..."}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            highlighted >= 0 ? `${listboxId}-option-${highlighted}` : undefined
          }
          autoFocus={autoFocus}
          className="min-[420px]:flex-1"
        />
        <Button
          type="button"
          disabled={searching || query.trim().length < 2}
          aria-live="polite"
          className="shrink-0 min-[420px]:w-auto w-full"
          onClick={handleSearchClick}
        >
          {searching ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Searching
            </span>
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-[min(320px,50vh)] overflow-y-auto rounded-md border border-input bg-popover text-popover-foreground shadow-md">
          {searchError && suggestions.length === 0 && !searching ? (
            <p className="px-3 py-3 text-sm text-muted-foreground" role="status">
              {searchError}
            </p>
          ) : (
            <ul id={listboxId} role="listbox" aria-label="Location suggestions">
              {suggestions.map((location, index) => (
                <li
                  key={location.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={index === highlighted}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      index === highlighted && "bg-accent text-accent-foreground"
                    )}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => select(location)}
                  >
                    <span className="font-medium">{location.city}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatLocationLabel(location)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
