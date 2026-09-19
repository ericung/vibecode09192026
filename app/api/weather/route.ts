import { NextRequest, NextResponse } from "next/server";

type OpenWeatherResponse = {
  name: string;
  sys: { country: string };
  main: { temp: number; feels_like: number; humidity: number };
  weather: Array<{ main: string; description: string }>;
  wind: { speed: number };
};

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city")?.trim();
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Weather service is not configured." },
      { status: 500 },
    );
  }

  if (!city) {
    return NextResponse.json({ error: "Please enter a city." }, { status: 400 });
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("q", city);
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");

  try {
    const response = await fetch(url, { next: { revalidate: 600 } });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "City not found." }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Unable to reach the weather service." },
        { status: response.status },
      );
    }

    const data = (await response.json()) as OpenWeatherResponse;
    const current = data.weather[0];

    return NextResponse.json({
      city: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6),
      condition: current?.main ?? "Unknown",
      description: current?.description ?? "No description available",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the weather service." },
      { status: 502 },
    );
  }
}
