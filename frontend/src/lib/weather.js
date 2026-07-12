// Real-world weather via Open-Meteo — free, no API key or account needed.
// WMO weather codes: https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")
const WMO = {
  0: { label: "Clear sky", icon: "☀️", mode: "off" },
  1: { label: "Mostly clear", icon: "🌤️", mode: "off" },
  2: { label: "Partly cloudy", icon: "⛅", mode: "off" },
  3: { label: "Overcast", icon: "☁️", mode: "off" },
  45: { label: "Foggy", icon: "🌫️", mode: "off" },
  48: { label: "Foggy", icon: "🌫️", mode: "off" },
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

function describeCode(code, isDay) {
  if (code === 0) return { label: isDay ? "Clear sky" : "Clear night", icon: isDay ? "☀️" : "🌙", mode: "off" };
  return WMO[code] || { label: "Unknown", icon: "🌡️", mode: "off" };
}

export function locateBrowser(timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation isn't available in this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => reject(new Error("Location access was denied or unavailable")),
      { timeout, maximumAge: 10 * 60 * 1000 }
    );
  });
}

export async function geocodeCity(name) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`
  );
  if (!res.ok) throw new Error("Couldn't reach the location service");
  const data = await res.json();
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
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset` +
      `&temperature_unit=fahrenheit&timezone=auto`
  );
  if (!res.ok) throw new Error("Couldn't reach the weather service");
  const data = await res.json();
  const current = data.current;
  const info = describeCode(current.weather_code, current.is_day === 1);

  const now = Date.now();
  const sunrise = new Date(data.daily.sunrise[0]).getTime();
  const sunset = new Date(data.daily.sunset[0]).getTime();
  const nearTwilight =
    Math.abs(now - sunrise) < TWILIGHT_WINDOW_MS || Math.abs(now - sunset) < TWILIGHT_WINDOW_MS;
  const timeOfDay = nearTwilight ? "sunset" : current.is_day === 1 ? "day" : "night";

  return {
    tempF: Math.round(current.temperature_2m),
    isDay: current.is_day === 1,
    label: info.label,
    icon: info.icon,
    mode: info.mode,
    timeOfDay,
    fetchedAt: now,
  };
}
