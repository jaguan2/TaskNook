// Every localStorage access in TaskNook goes through here.
//
// Both halves of the API throw, and not only in exotic setups: `setItem`
// raises QuotaExceededError when the profile's storage is full, and *both*
// raise SecurityError outright when storage is disabled or partitioned. That
// matters because TaskNook writes from inside effects and setters (the room
// mirror, the sound mix, the iso camera, the theme) — an unguarded throw
// propagates into React's render/commit and, in the packaged app where there
// is no console, surfaces as a blank window.
//
// A preference that fails to save is never worth the app. Reads degrade to
// "no saved value", writes degrade to "not saved this time".

export function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse a JSON value, falling back on anything unusable — a missing
 * key, unreadable storage, or a corrupted value. The fallback is returned as
 * given, so pass a fresh object/array if the caller will mutate it.
 */
export function readJSON(key, fallback = null) {
  const raw = readStored(key);
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/** Serialize and store a JSON value. Returns false if it couldn't be saved. */
export function writeJSON(key, value) {
  try {
    return writeStored(key, JSON.stringify(value));
  } catch {
    return false; // circular structure — treat like any other failed save
  }
}
