// Resolves a pasted link (YouTube or Spotify) into a playable station descriptor.
import { extractYouTubeId, extractYouTubePlaylist } from "./youtube";
import { extractSpotifyEmbed } from "./spotify";

export const CUSTOM_STATION_LIMIT = 50;

export function resolveMusicLink(input) {
  // A real playlist wins over the video it happens to be opened at — sharing
  // "watch?v=X&list=PL…" almost always means "play this playlist". Radio mixes
  // (RD…) aren't embeddable, so extractYouTubePlaylist skips them and we fall
  // through to the video id instead.
  const playlist = extractYouTubePlaylist(input);
  if (playlist) return { provider: "youtube", kind: "playlist", id: playlist };

  const youtubeId = extractYouTubeId(input);
  if (youtubeId) return { provider: "youtube", id: youtubeId };

  const spotify = extractSpotifyEmbed(input);
  if (spotify) return { provider: "spotify", id: spotify.id, kind: spotify.kind };

  return null;
}

// Stable identity for a station regardless of provider, used for selection/dedup.
export function stationKey(station) {
  return `${station.provider}:${station.kind || ""}:${station.id}`;
}

/** Shape-check the local custom-station cache before any UI indexes it. */
export function validateCustomStations(raw) {
  if (!Array.isArray(raw)) return [];
  const clean = [];
  const seen = new Set();
  for (const station of raw) {
    if (!station || typeof station !== "object") continue;
    if (!["youtube", "spotify"].includes(station.provider)) continue;
    if (typeof station.id !== "string" || !/^[\w-]{3,100}$/.test(station.id)) continue;
    const kind = typeof station.kind === "string" ? station.kind : undefined;
    if (station.provider === "spotify" && !["playlist", "album", "track", "show", "episode"].includes(kind)) continue;
    if (station.provider === "youtube" && kind && kind !== "playlist") continue;
    const label = typeof station.label === "string" ? station.label.trim().slice(0, 80) : "";
    const next = { provider: station.provider, id: station.id, ...(kind && { kind }), label: label || "custom station 🎧", custom: true };
    const key = stationKey(next);
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(next);
    if (clean.length >= CUSTOM_STATION_LIMIT) break;
  }
  return clean;
}

/** Rename one station without changing the stable provider/id identity. */
export function renameStation(stations, key, label) {
  const clean = typeof label === "string" ? label.trim().slice(0, 80) : "";
  if (!clean) return stations;
  return stations.map((station) =>
    stationKey(station) === key ? { ...station, label: clean } : station
  );
}

/** Move one station by one slot, clamping at the ends of the custom list. */
export function moveStation(stations, key, direction) {
  const from = stations.findIndex((station) => stationKey(station) === key);
  if (from < 0) return stations;
  const to = Math.max(0, Math.min(stations.length - 1, from + Math.sign(direction)));
  if (to === from) return stations;
  const next = [...stations];
  const [station] = next.splice(from, 1);
  next.splice(to, 0, station);
  return next;
}

// Ids come out of the parsers above as URL-safe character classes, but a
// *current* video id comes from the YouTube player API at runtime — guard it
// rather than interpolating whatever it hands back into a link.
const VIDEO_ID = /^[\w-]{11}$/;

/**
 * The public web page for a station — where the transport bar's title links to,
 * so "what am I listening to?" is one click from an answer.
 *
 * `videoId` is the track playing RIGHT NOW (optional). For a playlist that's
 * what makes the link useful: `watch?v=…&list=…` opens the exact track in its
 * playlist, where a bare `playlist?list=…` would drop you at track 1 and make
 * you hunt. Returns null for a station shape with no addressable page, so the
 * caller can fall back to plain text instead of rendering a dead link.
 */
export function stationUrl(station, videoId = null) {
  if (!station?.id) return null;
  const now = VIDEO_ID.test(videoId || "") ? videoId : null;

  if (station.provider === "youtube") {
    if (station.kind === "playlist") {
      return now
        ? `https://www.youtube.com/watch?v=${now}&list=${station.id}`
        : `https://www.youtube.com/playlist?list=${station.id}`;
    }
    return `https://www.youtube.com/watch?v=${station.id}`;
  }
  // Spotify's page path IS the embed kind (playlist/album/track/show/episode);
  // without one there's nothing to build.
  if (station.provider === "spotify" && station.kind) {
    return `https://open.spotify.com/${station.kind}/${station.id}`;
  }
  return null;
}
