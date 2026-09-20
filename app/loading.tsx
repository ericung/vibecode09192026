import { WeatherSkeleton } from "@/components/weather-skeletons";

/** Route loading fallback — instant skeleton while the page streams in. */
export default function Loading() {
  return (
    <main className="weather-shell">
      <section className="weather-card">
        <WeatherSkeleton label="Loading weather…" />
      </section>
    </main>
  );
}
