// Bridges to desktop.py's pywebview `js_api` (DesktopApi), reachable only
// from the packaged native window as `window.pywebview.api.*`. The Vite dev
// server and any plain browser tab never define `window.pywebview` at all —
// every caller here must treat its absence as "not the desktop app", not an
// error, since TaskNook's web mode is a fully supported way to run it.
export function hasDesktopApi() {
  return typeof window !== "undefined" && !!window.pywebview?.api?.set_always_on_top;
}

// pywebview injects the bridge asynchronously and fires this once it's ready
// (see finish.js in the pywebview package) — it may not exist yet on first
// render even inside the real desktop window.
export function onDesktopApiReady(callback) {
  window.addEventListener("pywebviewready", callback);
  return () => window.removeEventListener("pywebviewready", callback);
}

export async function setAlwaysOnTop(value) {
  if (!hasDesktopApi()) return false;
  return window.pywebview.api.set_always_on_top(value);
}
