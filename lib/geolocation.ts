import { createLocation } from "@/lib/location";
import type { WeatherLocation } from "@/types/location";

export type GeolocationFailureReason =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unknown";

export class GeolocationError extends Error {
  reason: GeolocationFailureReason;

  constructor(message: string, reason: GeolocationFailureReason) {
    super(message);
    this.name = "GeolocationError";
    this.reason = reason;
  }
}

export type GeolocationPositionLike = {
  coords: { latitude: number; longitude: number };
};

export type GeolocationProvider = {
  getCurrentPosition: (
    onSuccess: (position: GeolocationPositionLike) => void,
    onError?: (error: { code: number; message: string }) => void,
    options?: PositionOptions
  ) => void;
};

function getProvider(): GeolocationProvider | null {
  if (typeof navigator === "undefined") return null;
  const geo = navigator.geolocation;
  if (!geo || typeof geo.getCurrentPosition !== "function") return null;
  return geo as unknown as GeolocationProvider;
}

function toReason(code: number): GeolocationFailureReason {
  // Mirrors GeolocationPositionError codes: 1 = denied, 2 = unavailable, 3 = timeout.
  if (code === 1) return "denied";
  if (code === 2) return "unavailable";
  if (code === 3) return "timeout";
  return "unknown";
}

/**
 * Resolve the browser's current coordinates as a WeatherLocation.
 * City/country are left as placeholders — callers should reverse-geocode
 * via `/api/locations?lat=&lon=` to get a display name.
 */
export function getCurrentPositionAsLocation(options?: {
  provider?: GeolocationProvider | null;
  timeoutMs?: number;
}): Promise<WeatherLocation> {
  const provider = options?.provider ?? getProvider();
  const timeoutMs = options?.timeoutMs ?? 10_000;

  if (!provider) {
    return Promise.reject(
      new GeolocationError("Geolocation is not supported in this browser.", "unsupported")
    );
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new GeolocationError("Location request timed out.", "timeout"));
    }, timeoutMs);

    provider.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(
          createLocation({
            city: "Current location",
            country: "",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        );
      },
      (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        const reason = toReason(error.code);
        reject(
          new GeolocationError(error.message || "Unable to determine location.", reason)
        );
      },
      { timeout: timeoutMs, maximumAge: 5 * 60 * 1000 }
    );
  });
}

/**
 * Startup resolution order per spec: geolocation → most recent → null (show search).
 * The `locate` function is injectable so this is unit-testable without a browser.
 */
export async function resolveInitialLocation(options: {
  locate: () => Promise<WeatherLocation>;
  reverseGeocode?: (coords: WeatherLocation) => Promise<WeatherLocation>;
  mostRecent?: WeatherLocation | null;
}): Promise<{ location: WeatherLocation; source: "geolocation" | "recent" } | null> {
  try {
    const coords = await options.locate();
    if (options.reverseGeocode) {
      try {
        const named = await options.reverseGeocode(coords);
        return { location: named, source: "geolocation" };
      } catch {
        // Reverse-geocode failed — still use raw coordinates if they look valid.
        if (coords.country.trim() === "") return null;
        return { location: coords, source: "geolocation" };
      }
    }
    return { location: coords, source: "geolocation" };
  } catch {
    if (options.mostRecent) return { location: options.mostRecent, source: "recent" };
    return null;
  }
}
