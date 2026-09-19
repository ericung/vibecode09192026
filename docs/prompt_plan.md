## OpenCode Prompt Plan

### Phase 1 — Project foundation

**Prompt 1 — Initialize the project**

> Set up the weather application using Next.js 16 with TypeScript, App Router, Tailwind CSS, shadcn/ui, and Vitest. Configure the project for clean development and production builds. Do not implement weather functionality yet. Make sure the initial application runs successfully and add a basic test to verify the setup.

**Prompt 2 — Project architecture**

> Design and implement a clean project structure for this weather application. Separate UI components, weather API/server logic, location logic, types, utilities, and tests. Follow Next.js 16 App Router conventions and keep server-only code separate from client components.

---

### Phase 2 — Location system

**Prompt 3 — Location data model**

> Create TypeScript types and utilities for representing a weather location using city, state/province, country, latitude, and longitude. Make the types reusable throughout the application.

**Prompt 4 — City search UI**

> Build a city search interface using shadcn/ui components. Users should be able to type a city name and receive selectable location suggestions containing city, state/province, and country. Keep the interface simple and responsive.

**Prompt 5 — Recent locations**

> Implement local browser storage for recent locations. Store up to 10 recently selected locations. Avoid duplicates and move a previously selected location to the most recent position. Add tests for this behavior.

**Prompt 6 — Current location**

> Implement browser geolocation support. On startup, automatically attempt to determine the user's current location. If unavailable or permission is denied, fall back to the most recently selected location. If neither exists, display the city search interface.

---

### Phase 3 — OpenWeather integration

**Prompt 7 — OpenWeather server integration**

> Implement the OpenWeather integration using Next.js server-side code. Keep the API key exclusively in an environment variable and never expose it to the browser. Create strongly typed functions for retrieving the weather data required by the application.

**Prompt 8 — Weather data normalization**

> Create a server-side weather service that converts the OpenWeather response into a simple application-specific data model containing current conditions, today's high/low, 48 hours of hourly weather, and a 7-day forecast with precipitation probability. Keep OpenWeather-specific response structures isolated from the UI.

**Prompt 9 — Caching**

> Add server-side caching with a 15-minute TTL for weather requests. Requests for the same location within the cache window should reuse cached data. Add tests verifying cache behavior.

**Prompt 10 — Error and stale-data handling**

> Implement resilient weather fetching. If OpenWeather fails but cached weather data exists, return the cached data and mark it as potentially outdated. The UI should be able to display a clear "Data may be outdated" message. Add appropriate tests.

---

### Phase 4 — Weather UI

**Prompt 11 — Main weather page**

> Build the main weather page using shadcn/ui and Tailwind CSS. Keep the above-the-fold experience simple. Display the selected city, current temperature, weather condition, today's high/low, last-updated timestamp, and refresh control.

**Prompt 12 — 48-hour forecast**

> Add a simple horizontal scrollable 48-hour forecast below the current-weather section. Each hourly item should show only the time, weather icon, and temperature. Make it responsive and accessible.

**Prompt 13 — 7-day forecast**

> Add a 7-day forecast section. Each day should display the day, weather icon/condition, high/low temperature, and precipitation probability percentage. Keep the design visually simple.

**Prompt 14 — Refresh**

> Add the manual Refresh button to the weather page. Respect the existing 15-minute cache policy unless explicitly configured otherwise. Show loading and error states appropriately and prevent duplicate requests while a refresh is in progress.

---

### Phase 5 — UX

**Prompt 15 — Light/dark mode**

> Add light and dark mode using the user's system preference by default, with a manual theme toggle. Ensure all weather components and shadcn/ui components work correctly in both modes.

**Prompt 16 — Responsive design**

> Review the entire application for mobile, tablet, and desktop layouts. Fix spacing, typography, horizontal scrolling, navigation, and component sizing so the core weather experience works well at all viewport sizes.

**Prompt 17 — Loading states**

> Add polished loading states using shadcn/ui/Tailwind patterns. Avoid layout shifts where possible. Provide appropriate loading behavior for initial location detection, city search, and weather retrieval.

**Prompt 18 — Error states**

> Review all failure scenarios: geolocation failure, invalid city search, OpenWeather failure, missing API key, network failure, and stale cached data. Provide clear user-facing messages without exposing server implementation details.

---

### Phase 6 — Testing

**Prompt 19 — Unit tests**

> Add comprehensive Vitest tests for location utilities, recent-location storage, weather-data normalization, cache behavior, error handling, and other pure application logic. Mock external APIs rather than making real OpenWeather requests.

**Prompt 20 — Component tests**

> Add Vitest-based component tests for the city search, recent locations, current weather display, hourly forecast, 7-day forecast, refresh behavior, loading states, and error states.

**Prompt 21 — Test quality review**

> Review the existing test suite for meaningful coverage rather than superficial tests. Identify important edge cases that are missing and add tests for them. Ensure all tests pass.

---

### Phase 7 — Final engineering pass

**Prompt 22 — Code review**

> Perform a complete engineering review of the weather application. Look for unnecessary complexity, duplicated code, poor component boundaries, incorrect server/client boundaries, security issues, accessibility problems, and TypeScript issues. Make improvements while preserving existing functionality.

**Prompt 23 — Performance**

> Optimize the application for performance. Review server-side caching, client rendering, unnecessary requests, component rendering, bundle size, images/icons, and loading behavior. Avoid premature optimization and preserve maintainability.

**Prompt 24 — Final verification**

> Run the complete test suite, TypeScript checks, linting, and production build. Fix every issue you find. Do not introduce new features. The goal is a clean, production-ready MVP.