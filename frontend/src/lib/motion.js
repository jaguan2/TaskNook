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

/**
 * The two custom properties that make one item's ambience its own, inherited by
 * every animation inside its sprite. IsoRoom sets them on each placement group.
 *
 * `--phase` is the delay. NEGATIVE, so each item is already part-way through
 * its cycle on the first frame — a positive delay would leave the whole room
 * dead still and then lurch it into motion together, which is worse than the
 * synchrony it set out to fix.
 *
 * `--dur-scale` stretches the period a little (0.90–1.12). Offset alone holds
 * every pair of plants at a FIXED relative phase forever; different periods let
 * them drift, which is the difference between staggered and independent. Only
 * the long loops spend it — a 1.5s candle flame gains nothing.
 *
 * Both derive from the tile, never `Math.random`: the scene re-renders on a
 * timer, and a value that changed would restart every animation from the top —
 * a room of plants twitching once a second. Coordinates arrive on half-tiles,
 * hence the doubling; the multipliers are mixed so a row of identical plants
 * doesn't step in an obvious 1-2-3, and the moduli are coprime with them so
 * short runs don't repeat. Two different hashes, so an item's speed isn't
 * readable from its offset.
 *
 * Lives here rather than in the component so it can be tested as itself. It was
 * a local function, and the test could only mirror it — which meant flipping
 * that leading minus sign left every assertion green.
 */
export function ambienceVars(gx, gy) {
  const mod = (n, m) => ((n % m) + m) % m;
  const x = Math.round(gx * 2);
  const y = Math.round(gy * 2);
  return {
    // Hundredths, not tenths. What a phase is worth is measured MODULO the loop
    // it delays, so 0.1s steps gave a 0.5s loop only five possible positions —
    // eight residents typing landed on four beats instead of eight. Slow loops
    // never noticed; the fast ones did. 719 is prime, so the spread stays even.
    "--phase": `-${(mod(x * 37 + y * 61, 719) / 100).toFixed(2)}s`,
    "--dur-scale": (0.9 + mod(x * 19 + y * 43, 23) / 100).toFixed(2),
  };
}

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
