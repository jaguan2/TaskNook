/**
 * Which of the three scene palettes suits the hour on the wall clock.
 *
 * This exists so the room can follow your day WITHOUT a location. The only
 * automation before this was "Match my real weather", which needs browser
 * geolocation (or a typed city), a network call to Open-Meteo, and acceptance of
 * the real weather visual as well — three things you have to want in order to
 * get the one thing most people are after: that it's dark outside when it's dark
 * outside. Everything else in TaskNook works offline; this now does too.
 *
 * Auto-match is still the better source when it's on, because real sunrise and
 * sunset beat fixed bands — it knows about your latitude and the season. These
 * bands are the offline approximation, so the two are mutually exclusive rather
 * than layered.
 *
 * The bands are deliberately generous at the edges: "sunset" covers dawn as well
 * as dusk, because the warm low-sun palette reads as either and the scene has no
 * separate sunrise. Hours are LOCAL, matching the rest of the app's day handling.
 */
export const DAYLIGHT_BANDS = [
  { until: 5, mode: "night" }, // 00:00–04:59
  { until: 7, mode: "sunset" }, // 05:00–06:59 — dawn
  { until: 17, mode: "day" }, // 07:00–16:59
  { until: 20, mode: "sunset" }, // 17:00–19:59 — dusk
  { until: 24, mode: "night" }, // 20:00–23:59
];

/** "night" | "sunset" | "day" for a local hour (0–23). */
export function timeOfDayForHour(hour) {
  // Tolerate rubbish rather than returning undefined into a lookup table: an
  // out-of-range hour means a clock we don't understand, and night is the app's
  // own default.
  if (!Number.isFinite(hour)) return "night";
  const h = Math.floor(hour);
  if (h < 0 || h > 23) return "night";
  for (const band of DAYLIGHT_BANDS) if (h < band.until) return band.mode;
  return "night";
}

/** What the scene should be showing right now. */
export function timeOfDayNow(now = new Date()) {
  return timeOfDayForHour(now.getHours());
}
