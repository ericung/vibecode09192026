"use client";

import { Button } from "@/components/ui/button";

/** Route error boundary — friendly fallback, no server details. */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="weather-shell">
      <section className="weather-card">
        <div className="flex flex-col items-center gap-3 py-10 text-center" role="alert">
          <span aria-hidden="true" className="text-3xl leading-none">
            ⚠
          </span>
          <p className="max-w-sm text-sm font-medium">
            Something went wrong loading the weather.
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Please try again. If the problem continues, check your connection.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
        </div>
      </section>
    </main>
  );
}
