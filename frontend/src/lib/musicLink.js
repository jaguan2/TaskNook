// Resolves a pasted link (YouTube or Spotify) into a playable station descriptor.
import { extractYouTubeId, extractYouTubePlaylist } from "./youtube";
import { extractSpotifyEmbed } from "./spotify";

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
