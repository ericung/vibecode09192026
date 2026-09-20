"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CitySearch } from "@/components/city-search";
import { CurrentWeather } from "@/components/current-weather";
import { DailyForecastList } from "@/components/daily-forecast";
import { ErrorState } from "@/components/error-state";
import { HourlyForecastList } from "@/components/hourly-forecast";
import { RecentLocations } from "@/components/recent-locations";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocatingSkeleton, WeatherSkeleton } from "@/components/weather-skeletons";
import {
  friendlyGeolocationNotice,
  friendlyWeatherError,
} from "@/lib/friendly-errors";
import {
  getCurrentPositionAsLocation,
  resolveInitialLocation,
} from "@/lib/geolocation";
import { reverseGeocodeLocation } from "@/lib/location-search";
import {
  addRecentLocation,
  loadRecentLocations,
  saveRecentLocations,
} from "@/lib/recent-locations";
import { fetchWeatherForLocation } from "@/lib/weather";
import type { WeatherLocation } from "@/types/location";
import type { WeatherReport } from "@/types/weather";

type StartupState = "locating" | "ready";

export default function Home() {
  const [selected, setSelected] = useState<WeatherLocation | null>(null);
  // Initialized empty so the first client render matches SSR. Recents are
  // hydrated from localStorage in the startup effect below — reading storage
  // during render would cause a hydration mismatch.
  const [recents, setRecents] = useState<WeatherLocation[]>([]);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [startup, setStartup] = useState<StartupState>("locating");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  // Guard against duplicate in-flight weather requests (Prompt 14).
  // `loading` state alone is async, so a ref gives a synchronous guard.
  const loadingRef = useRef(false);

  const loadWeather = useCallback(async (location: WeatherLocation) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      // Respects the server 15-minute cache via /api/weather — no
      // cache-busting params unless explicitly configured otherwise.
      const data = await fetchWeatherForLocation(location);
      setWeather(data);
    } catch (requestError) {
      setWeather(null);
      setError(friendlyWeatherError(requestError));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (selected) void loadWeather(selected);
  }, [selected, loadWeather]);

  const handleSelect = useCallback(
    (location: WeatherLocation) => {
      setSelected(location);
      setNotice("");
      setRecents((prev) => {
        const next = addRecentLocation(prev, location);
        saveRecentLocations(next);
        return next;
      });
      void loadWeather(location);
    },
    [loadWeather]
  );

  // Startup: geolocation → most recent → search.
  useEffect(() => {
    let cancelled = false;

    async function startupResolve() {
      const stored = loadRecentLocations();
      const result = await resolveInitialLocation({
        locate: () => getCurrentPositionAsLocation(),
        reverseGeocode: (coords) =>
          reverseGeocodeLocation(coords.latitude, coords.longitude),
        mostRecent: stored[0] ?? null,
      });
      if (cancelled) return;
      setRecents(stored);
      setStartup("ready");
      if (!result) {
        setNotice("Search for a city to see the weather.");
        return;
      }
      // handleSelect clears any notice, so set the fallback notice after it.
      handleSelect(result.location);
      if (result.source === "recent") {
        setNotice(friendlyGeolocationNotice());
      }
    }

    void startupResolve();
    return () => {
      cancelled = true;
    };
  }, [handleSelect]);

  const handleClearRecents = useCallback(() => {
    setRecents([]);
    saveRecentLocations([]);
  }, []);

  const showSearchPrompt = startup === "ready" && !selected && !loading && !error;

  return (
    <main className="weather-shell">
      <section className="weather-card" aria-busy={loading || startup === "locating"}>
        <div className="card-header">
          <div className="min-w-0">
            <p className="eyebrow">LIVE CONDITIONS</p>
            <h1>Weather, wherever you are.</h1>
            <p className="subtitle">Simple, current conditions powered by OpenWeather.</p>
          </div>
          <div className="flex shrink-0 items-start gap-3">
            <span className="sun-mark" aria-hidden="true">
              ✦
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-6 flex min-w-0 flex-col gap-4 sm:mt-8">
          <CitySearch onSelect={handleSelect} autoFocus={showSearchPrompt} />
          <RecentLocations
            locations={recents}
            selectedId={selected?.id}
            onSelect={handleSelect}
            onClear={handleClearRecents}
          />
        </div>

        <div className="mt-6 min-w-0 max-w-full" aria-live="polite">
          {startup === "locating" ? (
            <LocatingSkeleton />
          ) : error ? (
            <ErrorState
              message={error}
              hint={
                selected
                  ? "Your recent locations are saved below — try another city or retry."
                  : "Try searching for a city above."
              }
              onRetry={selected ? () => void loadWeather(selected) : undefined}
              retrying={loading}
            />
          ) : loading && !weather ? (
            <WeatherSkeleton />
          ) : weather && selected ? (
            <div className={`weather-content ${loading ? "is-refreshing" : ""}`}>
              {notice ? (
                <p className="mb-4 rounded-md border border-input bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground" role="status">
                  {notice}
                </p>
              ) : null}
              <span className="sr-only" role="status">
                {loading ? "Refreshing weather…" : "Weather up to date"}
              </span>
              <CurrentWeather
                report={weather}
                location={selected}
                loading={loading}
                onRefresh={handleRefresh}
              />
              <HourlyForecastList hourly={weather.hourly} />
              <DailyForecastList daily={weather.daily} />
            </div>
          ) : showSearchPrompt ? (
            <div className="loading-message" role="status">
              {notice || "Search for a city to see the weather."}
            </div>
          ) : null}
        </div>

        <footer>
          Data provided by{" "}
          <a href="https://openweathermap.org/" target="_blank" rel="noreferrer">
            OpenWeather
          </a>
        </footer>
      </section>
    </main>
  );
}
