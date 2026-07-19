/**
 * Format a Date as YYYY-MM-DD using its **local** parts.
 *
 * Deliberately not `toISOString().slice(0, 10)`: that converts to UTC first,
 * so for anyone west of Greenwich an evening date silently becomes the
 * previous day — which put tasks on the wrong calendar cell and mis-highlighted
 * "today". The backend buckets by local `date.today()`, so the frontend must
 * agree on what "local day" means.
 */
export function toISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
