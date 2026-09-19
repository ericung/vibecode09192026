Understood. We have enough decisions to produce a developer-ready specification.

Key requirements captured:

* **Stack:** Next.js 16, Tailwind CSS, shadcn/ui, Vitest
* **Weather provider:** OpenWeather
* **Security:** API key server-side via environment variables
* **Caching:** 15-minute server-side cache
* **Fallback:** Display cached data with an “outdated” warning if OpenWeather fails
* **Locations:** City/state/country search with typed city search
* **Recent locations:** Store up to 10 locally in the browser
* **Startup:** Automatically use current location when available; otherwise use most recent location; otherwise show city search
* **Current weather:** Temperature, condition, and today's high/low
* **Hourly:** 48-hour horizontal timeline showing time, icon, and temperature
* **7-day forecast:** Day, icon/condition, high/low, and precipitation probability
* **Refresh:** Manual refresh functionality
* **UI:** Responsive desktop/tablet/mobile
* **Theme:** Light/dark mode with system preference and manual toggle

This gives you a solid MVP scope without unnecessarily expanding the feature set.
