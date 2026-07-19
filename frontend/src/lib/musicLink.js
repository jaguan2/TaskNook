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
