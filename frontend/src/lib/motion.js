// Whether to reduce motion, resolving the in-app setting against the OS one.
//
// Two consumers need this and they need it in different forms:
//   * CSS animations are silenced by `data-motion="reduced"` on <html>, which
//     an inline script in index.html sets before first paint (see there — the
//     flash it avoids is the whole reason it isn't done in React).
//   * framer-motion and the JS-driven lightning flash need a BOOLEAN at
//     render time, which is what this hook is for.
//
// Keeping both fed from the same three-state setting is why `applyMotionMode`
// lives here too: the store calls it whenever the setting changes, so the
// attribute and the hook can never disagree.
import { useEffect, useState } from "react";

export const MOTION_MODES = ["auto", "full", "reduced"];
const QUERY = "(prefers-reduced-motion: reduce)";

/** Does the OS ask for reduced motion right now? */
export function systemPrefersReduced() {
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    return false; // very old webviews: treat as no preference
  }
}

/** Resolve a mode to a boolean. "auto" defers to the OS. */
export function reducesMotion(mode) {
  if (mode === "reduced") return true;
  if (mode === "full") return false;
  return systemPrefersReduced();
}

/** Stamp (or clear) the attribute every CSS rule keys off. */
export function applyMotionMode(mode) {
  const root = document.documentElement;
  if (reducesMotion(mode)) root.setAttribute("data-motion", "reduced");
  else root.removeAttribute("data-motion");
}

/**
 * The boolean, for components. Re-evaluates when the OS preference changes
 * mid-session (a real thing on macOS and Windows), which a plain read at
 * render time would miss until something else happened to re-render.
 */
export function useReducedMotionPref(mode) {
  const [system, setSystem] = useState(systemPrefersReduced);
  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia(QUERY);
    } catch {
      return undefined;
    }
    const onChange = (e) => setSystem(e.matches);
    // addListener is the pre-2019 Safari spelling; still worth the fallback
    // in a WebView we don't control.
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  if (mode === "reduced") return true;
  if (mode === "full") return false;
  return system;
}
