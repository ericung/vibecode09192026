import { NextRequest, NextResponse } from "next/server";

import { OpenWeatherError } from "@/lib/server/openweather";
import { GeocodingError } from "@/lib/server/geocoding";
import {
  getWeatherReportByCity,
  getWeatherReportByCoords,
} from "@/lib/server/weather-service";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const city = params.get("city")?.trim() ?? "";
  const latRaw = params.get("lat");
  const lonRaw = params.get("lon");

  try {
    // Coordinates take precedence so geolocated positions work without a city name.
    // Optional city/country hints label the report without an extra reverse lookup.
    if (latRaw !== null || lonRaw !== null) {
      const latitude = Number(latRaw);
      const longitude = Number(lonRaw);
      const report = await getWeatherReportByCoords({
        latitude,
        longitude,
        city: params.get("city") ?? undefined,
        country: params.get("country") ?? undefined,
      });
      return NextResponse.json(report);
    }
    const report = await getWeatherReportByCity(city);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof OpenWeatherError || error instanceof GeocodingError) {
      const status = error.status;
      const message =
        status === 500 || status === 502
          ? "Unable to reach the weather service."
          : error.message;
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json(
      { error: "Unable to reach the weather service." },
      { status: 502 }
    );
  }
}
