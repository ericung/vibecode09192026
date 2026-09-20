/**
 * User-facing error messages (Phase 5, Prompt 18).
 * Maps technical / HTTP failures to clear messages without
 * exposing server implementation details (keys, URLs, stacks).
 */

export function friendlyWeatherError(error: unknown): string {
  if (error instanceof Error) {
    const status =
      typeof (error as unknown as { status?: unknown }).status === "number"
        ? (error as unknown as { status: number }).status
        : null;
    const raw = error.message || "";

    if (status === 400) return "Please enter a valid location.";
    if (status === 404) return "Location not found. Try another city search.";
    if (status === 401 || status === 403)
      return "Weather service is unavailable right now. Please try again later.";
    if (status === 429)
      return "Too many requests. Please wait a moment and try again.";
    if (status !== null && status >= 500)
      return "Weather service is unavailable. Check your connection and try again.";

    // fetch() network failure surfaces as TypeError in browsers.
    if (error instanceof TypeError || /failed to fetch|network|load failed/i.test(raw)) {
      return "No connection. Check your internet and try again.";
    }
    // Server routes already sanitize messages; pass through short safe ones.
    if (raw && raw.length <= 120 && !/key|token|openweather|stack|ENOENT|fetch.*http/i.test(raw)) {
      return raw;
    }
  }
  return "Could not load weather. Please try again.";
}

export function friendlyLocationError(error: unknown): string {
  if (error instanceof Error) {
    const status =
      typeof (error as unknown as { status?: unknown }).status === "number"
        ? (error as unknown as { status: number }).status
        : null;
    if (status === 404) return "No locations found. Try another search.";
    if (status !== null && status >= 500)
      return "Search is unavailable right now. Please try again.";
    if (error instanceof TypeError || /failed to fetch|network/i.test(error.message)) {
      return "No connection. Check your internet and try again.";
    }
    const raw = error.message || "";
    if (raw && raw.length <= 120 && !/key|token|stack|ENOENT/i.test(raw)) return raw;
  }
  return "Could not search locations. Please try again.";
}

export function friendlyGeolocationNotice(): string {
  return "Location unavailable — showing your most recent location.";
}
