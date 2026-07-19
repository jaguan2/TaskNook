// Pure helper for turning a YouTube URL (or bare video id) into an embeddable id.
const URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/live\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/)([\w-]{11})/,
];

// Auto-generated "radio" mixes (RD…, and the RDMM "My Mix" variants) are the
// lists YouTube's share button produces from a single video. They refuse to
// load in an iframe embed, so they're never worth keeping as a playlist.
const EMBEDDABLE_LIST = /^(?!RD)[\w-]{12,}$/;

/**
 * Pull an *embeddable* playlist id out of a link (or a bare id).
 * Returns null for radio mixes, so callers can fall back to the video id.
 */
export function extractYouTubePlaylist(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  if (EMBEDDABLE_LIST.test(trimmed) && /^(PL|OL|UU|FL|LL)/.test(trimmed)) {
    return trimmed;
  }

  let list = trimmed.match(/[?&]list=([\w-]+)/)?.[1] || null;
  if (!list) {
    try {
      list = new URL(trimmed).searchParams.get("list");
    } catch {
      /* not a valid URL */
    }
  }
  return list && EMBEDDABLE_LIST.test(list) ? list : null;
}

export function extractYouTubeId(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  try {
    const v = new URL(trimmed).searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
  } catch {
    /* not a valid URL */
  }
  return null;
}
