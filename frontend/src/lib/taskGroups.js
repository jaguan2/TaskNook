export const TASK_GROUP_MAX = 60;
export const TASK_GROUP_LIMIT = 50;

/** Clean the device-local list that keeps otherwise-empty task groups alive. */
export function validateTaskGroups(raw) {
  if (!Array.isArray(raw)) return [];
  const clean = [];
  const seen = new Set();
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const name = value.trim().slice(0, TASK_GROUP_MAX);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    clean.push(name);
    if (clean.length >= TASK_GROUP_LIMIT) break;
  }
  return clean;
}
