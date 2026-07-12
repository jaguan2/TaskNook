// Pure helper for turning a YouTube URL (or bare video id) into an embeddable id.
const URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/live\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/)([\w-]{11})/,
];

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
