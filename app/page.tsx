"use client";

import { useCallback, useEffect, useState } from "react";

import { CitySearch } from "@/components/city-search";
import { RecentLocations } from "@/components/recent-locations";
import { Button } from "@/components/ui/button";
import {
  getCurrentPositionAsLocation,
  resolveInitialLocation,
} from "@/lib/geolocation";
import { formatLocationLabel } from "@/lib/location";
import { reverseGeocodeLocation } from "@/lib/location-search";
import {
  addRecentLocation,
  loadRecentLocations,
  saveRecentLocations,
} from "@/lib/recent-locations";
import { fetchWeatherForLocation, weatherEmoji } from "@/lib/weather";
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

  const loadWeather = useCallback(async (location: WeatherLocation) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchWeatherForLocation(location);
      setWeather(data);
    } catch (requestError) {
      setWeather(null);
      setError(requestError instanceof Error ? requestError.message : "Could not load weather.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (location: WeatherLocation) => {
      setSelected(location);
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
      if (result.source === "recent") {
        setNotice("Location unavailable — showing your most recent location.");
      }
      handleSelect(result.location);
    }

    void startupResolve();
    return () => {
      cancelled = true;
    };
  }, [handleSelect]);

  function handleClearRecents() {
    setRecents([]);
    saveRecentLocations([]);
  }

  const showSearchPrompt = startup === "ready" && !selected && !loading;

  return (
    <main className="weather-shell">
      <section className="weather-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">LIVE CONDITIONS</p>
            <h1>Weather, wherever you are.</h1>
            <p className="subtitle">Simple, current conditions powered by OpenWeather.</p>
          </div>
          <span className="sun-mark" aria-hidden="true">
            ✦
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <CitySearch onSelect={handleSelect} autoFocus={showSearchPrompt} />
          <RecentLocations
            locations={recents}
            selectedId={selected?.id}
            onSelect={handleSelect}
            onClear={handleClearRecents}
          />
        </div>

        <div className="mt-6">
          {startup === "locating" ? (
            <div className="loading-message">Detecting your location...</div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="error-message min-h-0" role="alert">
                {error}
              </div>
              {selected ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => void loadWeather(selected)}
                >
                  {loading ? "Retrying..." : "Try again"}
                </Button>
              ) : null}
            </div>
          ) : loading && !weather ? (
            <div className="loading-message">Finding current conditions...</div>
          ) : weather && selected ? (
            <div className={`weather-content ${loading ? "is-refreshing" : ""}`}>
              {weather.isStale ? (
                <p className="mb-4 rounded-md border px-3 py-2 text-center text-sm" role="status">
                  Data may be outdated — live update failed.
                </p>
              ) : null}
              <div className="location-row">
                <div>
                  <p className="location">
                    {selected.city}, {weather.country}
                  </p>
                  <p className="updated">{formatLocationLabel(selected)}</p>
                </div>
                <span className="weather-emoji" aria-label={weather.condition}>
                  {weatherEmoji(weather.condition)}
                </span>
              </div>

              <div className="temperature-row">
                <span className="temperature">{weather.temperature}</span>
                <span className="degree">°C</span>
                <div className="condition">
                  <strong>{weather.condition}</strong>
                  <span>{weather.description}</span>
                </div>
              </div>

              <div className="details-grid">
                <div>
                  <span>Feels like</span>
                  <strong>{weather.feelsLike}°</strong>
                </div>
                <div>
                  <span>Humidity</span>
                  <strong>{weather.humidity}%</strong>
                </div>
                <div>
                  <span>Wind</span>
                  <strong>{weather.windSpeed} km/h</strong>
                </div>
              </div>
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
