// Real-world weather via Open-Meteo — free, no API key or account needed.
// WMO weather codes: https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")
const WMO = {
  0: { label: "Clear sky", icon: "☀️", mode: "off" },
  1: { label: "Mostly clear", icon: "🌤️", mode: "off" },
  2: { label: "Partly cloudy", icon: "⛅", mode: "cloudy" },
  3: { label: "Overcast", icon: "☁️", mode: "cloudy" },
  45: { label: "Foggy", icon: "🌫️", mode: "cloudy" },
  48: { label: "Foggy", icon: "🌫️", mode: "cloudy" },
  51: { label: "Light drizzle", icon: "🌦️", mode: "rain" },
  53: { label: "Drizzle", icon: "🌦️", mode: "rain" },
  55: { label: "Heavy drizzle", icon: "🌧️", mode: "rain" },
  56: { label: "Freezing drizzle", icon: "🌧️", mode: "rain" },
  57: { label: "Freezing drizzle", icon: "🌧️", mode: "rain" },
  61: { label: "Light rain", icon: "🌦️", mode: "rain" },
  63: { label: "Rain", icon: "🌧️", mode: "rain" },
  65: { label: "Heavy rain", icon: "🌧️", mode: "rain" },
  66: { label: "Freezing rain", icon: "🌧️", mode: "rain" },
  67: { label: "Freezing rain", icon: "🌧️", mode: "rain" },
  71: { label: "Light snow", icon: "🌨️", mode: "snow" },
  73: { label: "Snow", icon: "❄️", mode: "snow" },
  75: { label: "Heavy snow", icon: "❄️", mode: "snow" },
  77: { label: "Snow grains", icon: "❄️", mode: "snow" },
  80: { label: "Rain showers", icon: "🌦️", mode: "rain" },
  81: { label: "Rain showers", icon: "🌧️", mode: "rain" },
  82: { label: "Violent showers", icon: "🌧️", mode: "rain" },
  85: { label: "Snow showers", icon: "🌨️", mode: "snow" },
  86: { label: "Snow showers", icon: "🌨️", mode: "snow" },
  95: { label: "Thunderstorm", icon: "⛈️", mode: "storm" },
  96: { label: "Thunderstorm w/ hail", icon: "⛈️", mode: "storm" },
  99: { label: "Thunderstorm w/ hail", icon: "⛈️", mode: "storm" },
};

// The fair-weather icons are literally suns, so after dark they need twins.
// (Rain, snow and storms look the same at any hour.) Only code 0 used to get
// this treatment, so "Mostly clear" showed ☀️ at 2am.
const NIGHT_ICONS = { 0: "🌙", 1: "🌙", 2: "☁️" };

function describeCode(code, isDay) {
  const base = WMO[code] || { label: "Unknown", icon: "🌡️", mode: "off" };
  if (isDay) return base;
  return {
    ...base,
    label: code === 0 ? "Clear night" : base.label,
    icon: NIGHT_ICONS[code] || base.icon,
  };
}

export function locateBrowser(timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation isn't available in this browser"));
      return;
    }
    // The API's own `timeout` only starts counting once permission is
    // granted — a dismissed/ignored permission prompt settles NEITHER
    // callback, which left the panel stuck on "loading" forever. Our own
    // deadline guarantees the promise settles.
    const deadline = setTimeout(
      () => reject(new Error("Timed out waiting for a location")),
      timeout + 4000
    );
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(deadline);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        clearTimeout(deadline);
        const msg =
          err?.code === 1
            ? "Location access was denied — try searching for your city instead"
            : err?.code === 3
            ? "Timed out waiting for a location"
            : "Couldn't work out where you are";
        reject(new Error(msg));
      },
      { timeout, maximumAge: 10 * 60 * 1000 }
    );
  });
}

// Open-Meteo is the one part of TaskNook that needs the internet, so it's also
// the one part that can hang. `fetch` has no deadline of its own: a connection
// that opens and then stalls never settles, which pinned the Weather panel on
// "loading" with no retry path — and auto-match's 15-minute refresh just piled
// more stalled requests on top.
const REQUEST_TIMEOUT = 12000;

async function getJSON(url, fallback) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
  } catch (cause) {
    throw new Error(
      cause?.name === "TimeoutError" ? "The weather service took too long" : fallback
    );
  }
  // Open-Meteo returns HTTP 400 with {error, reason} for bad params — surface
  // the reason instead of blaming the network.
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.reason || fallback);
  }
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== "object") throw new Error(fallback);
  return data;
}

export async function geocodeCity(name) {
  const data = await getJSON(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`,
    "Couldn't reach the location service"
  );
  const hit = data.results?.[0];
  if (!hit) throw new Error(`No place found named "${name}"`);
  return {
    lat: hit.latitude,
    lon: hit.longitude,
    label: [hit.name, hit.admin1, hit.country].filter(Boolean).join(", "),
  };
}

// A 45-minute window around actual sunrise/sunset reads as "sunset" — the
// hazy in-between the day/night lighting presets are meant to capture.
const TWILIGHT_WINDOW_MS = 45 * 60 * 1000;

export async function fetchCurrentWeather(lat, lon) {
  // timeformat=unixtime matters: the default is a LOCAL-time ISO string with
  // no offset, which JS parses in the BROWSER's zone — wrong whenever the
  // queried city (manual search) isn't in the browser's timezone.
  const data = await getJSON(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset` +
      `&temperature_unit=fahrenheit&timezone=auto&timeformat=unixtime`,
    "Couldn't reach the weather service"
  );
  // Shape guard: without it a changed/blocked response surfaced as a raw
  // "Cannot read properties of undefined" in the panel's error line.
  const current = data.current;
  if (!current || typeof current !== "object") {
    throw new Error("The weather service sent something unexpected");
  }
  const info = describeCode(current.weather_code, current.is_day === 1);

  // Sunrise/sunset are genuinely UTC epoch seconds here (timeformat=unixtime),
  // so they're directly comparable to Date.now(). Treat them as optional
  // anyway — the daily block can come back empty for some coordinates.
  const now = Date.now();
  const near = (seconds) => {
    const ms = Number(seconds) * 1000;
    return Number.isFinite(ms) && Math.abs(now - ms) < TWILIGHT_WINDOW_MS;
  };
  const nearTwilight = near(data.daily?.sunrise?.[0]) || near(data.daily?.sunset?.[0]);
  const timeOfDay = nearTwilight ? "sunset" : current.is_day === 1 ? "day" : "night";

  return {
    tempF: Number.isFinite(current.temperature_2m)
      ? Math.round(current.temperature_2m)
      : null,
    isDay: current.is_day === 1,
    label: info.label,
    icon: info.icon,
    mode: info.mode,
    timeOfDay,
    fetchedAt: now,
  };
}
