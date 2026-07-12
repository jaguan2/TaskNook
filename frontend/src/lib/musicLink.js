// Resolves a pasted link (YouTube or Spotify) into a playable station descriptor.
import { extractYouTubeId } from "./youtube";
import { extractSpotifyEmbed } from "./spotify";

export function resolveMusicLink(input) {
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
