"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Weather = {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description: string;
};

function weatherEmoji(condition: string) {
  switch (condition.toLowerCase()) {
    case "clear":
      return "☀️";
    case "clouds":
      return "☁️";
    case "rain":
    case "drizzle":
      return "🌧️";
    case "thunderstorm":
      return "⛈️";
    case "snow":
      return "❄️";
    case "mist":
    case "fog":
    case "haze":
      return "🌫️";
    default:
      return "🌤️";
  }
}

export default function Home() {
  const [city, setCity] = useState("London");
  const [query, setQuery] = useState("London");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWeather = useCallback(async (location: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(location)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load weather.");
      setWeather(data);
      setCity(data.city);
      setQuery(data.city);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load weather.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadWeather("London"), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadWeather]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const location = query.trim();
    if (location) void loadWeather(location);
  }

  return (
    <main className="weather-shell">
      <section className="weather-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">LIVE CONDITIONS</p>
            <h1>Weather, wherever you are.</h1>
            <p className="subtitle">Simple, current conditions powered by OpenWeather.</p>
          </div>
          <span className="sun-mark" aria-hidden="true">✦</span>
        </div>

        <form className="search-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="city">Search for a city</label>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            id="city"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a city..."
            autoComplete="address-level2"
          />
          <button type="submit" disabled={loading || !query.trim()}>
            {loading ? "Loading" : "Search"}
          </button>
        </form>

        {error ? (
          <div className="error-message" role="alert">{error}</div>
        ) : loading && !weather ? (
          <div className="loading-message">Finding current conditions...</div>
        ) : weather ? (
          <div className={`weather-content ${loading ? "is-refreshing" : ""}`}>
            <div className="location-row">
              <div>
                <p className="location">{city}, {weather.country}</p>
                <p className="updated">Current conditions</p>
              </div>
              <span className="weather-emoji" aria-label={weather.condition}>{weatherEmoji(weather.condition)}</span>
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
              <div><span>Feels like</span><strong>{weather.feelsLike}°</strong></div>
              <div><span>Humidity</span><strong>{weather.humidity}%</strong></div>
              <div><span>Wind</span><strong>{weather.windSpeed} km/h</strong></div>
            </div>
          </div>
        ) : null}

        <footer>Data provided by <a href="https://openweathermap.org/" target="_blank" rel="noreferrer">OpenWeather</a></footer>
      </section>
    </main>
  );
}
