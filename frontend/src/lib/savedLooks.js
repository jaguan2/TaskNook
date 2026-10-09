import { validateCharacter } from "./profile";

export const SAVED_LOOK_LIMIT = 12;
export const LOOK_NAME_MAX = 32;
let lookCounter = 0;

export function validateSavedLooks(raw) {
  if (!Array.isArray(raw)) return [];
  const keys = new Set(), names = new Set();
  return raw.slice(0, SAVED_LOOK_LIMIT).flatMap((look) => {
    if (!look || typeof look.key !== "string" || !look.key || look.key.length > 64 || typeof look.label !== "string") return [];
    const label = look.label.trim(), name = label.toLocaleLowerCase();
    if (!label || label.length > LOOK_NAME_MAX || keys.has(look.key) || names.has(name) || !look.character || typeof look.character !== "object" || Array.isArray(look.character)) return [];
    keys.add(look.key); names.add(name);
    return [{ key: look.key, label, character: validateCharacter(look.character) }];
  });
}

/** A named snapshot is complete; updating its name keeps the existing key. */
export function saveLookSnapshot(looks, label, character) {
  if (typeof label !== "string") return null;
  label = label.trim();
  if (!label || label.length > LOOK_NAME_MAX) return null;
  const existing = looks.find((look) => look.label.toLocaleLowerCase() === label.toLocaleLowerCase());
  if (!existing && looks.length >= SAVED_LOOK_LIMIT) return null;
  let key = existing?.key;
  while (!key || (!existing && looks.some((look) => look.key === key))) key = `look-${Date.now().toString(36)}-${++lookCounter}`;
  const saved = { key, label, character: validateCharacter(character) };
  return existing ? looks.map((look) => look.key === key ? saved : look) : [...looks, saved];
}
