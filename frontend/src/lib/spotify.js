// Pure helper for turning a Spotify URL into an embeddable {kind, id}.
// Handles playlists, albums, tracks, shows (podcasts), and episodes.
const SPOTIFY_PATTERN =
  /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(playlist|album|track|show|episode)\/([a-zA-Z0-9]+)/;

export function extractSpotifyEmbed(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  const match = trimmed.match(SPOTIFY_PATTERN);
  if (!match) return null;
  return { kind: match[1], id: match[2] };
}
