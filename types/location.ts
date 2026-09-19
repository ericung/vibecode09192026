/** Reusable weather location model, shared by client and server. */

export type WeatherLocation = {
  /** Stable key derived from coordinates, e.g. "51.5074,-0.1278". */
  id: string;
  /** City / locality name, e.g. "London". */
  city: string;
  /** State, province, or region, e.g. "England". Optional — not all results have one. */
  state?: string;
  /** Full country name when known, otherwise the country code. */
  country: string;
  /** ISO country code, e.g. "GB". Optional but useful for disambiguation. */
  countryCode?: string;
  latitude: number;
  longitude: number;
};

/** Minimum fields required to build a WeatherLocation (id is derived). */
export type NewWeatherLocation = Omit<WeatherLocation, "id"> & {
  id?: string;
};
