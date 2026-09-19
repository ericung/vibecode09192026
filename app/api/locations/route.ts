import { NextRequest, NextResponse } from "next/server";

import {
  GeocodingError,
  reverseGeocode,
  searchLocations,
} from "@/lib/server/geocoding";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  const latRaw = params.get("lat");
  const lonRaw = params.get("lon");

  try {
    // Reverse-geocode takes precedence when coordinates are provided.
    if (latRaw !== null || lonRaw !== null) {
      const latitude = Number(latRaw);
      const longitude = Number(lonRaw);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
      }
      const locations = await reverseGeocode(latitude, longitude);
      return NextResponse.json({ locations });
    }

    if (!query) {
      return NextResponse.json({ locations: [] });
    }

    const locations = await searchLocations(query);
    return NextResponse.json({ locations });
  } catch (error) {
    if (error instanceof GeocodingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Unable to reach the location service." },
      { status: 502 }
    );
  }
}
