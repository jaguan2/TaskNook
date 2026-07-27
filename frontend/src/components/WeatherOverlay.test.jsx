// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import WeatherOverlay from "./WeatherOverlay";

afterEach(cleanup);

/** Every particle's {delay, duration} in seconds, as the browser sees them. */
function particles(mode, selector) {
  const { container } = render(<WeatherOverlay mode={mode} />);
  return [...container.querySelectorAll(selector)].map((el) => ({
    delay: parseFloat(el.style.animationDelay),
    dur: parseFloat(el.style.animationDuration),
  }));
}

describe("weather particles are already falling on the first frame", () => {
  // A particle animates from ABOVE the viewport downward, so a POSITIVE
  // animation-delay parks it off-screen until the delay elapses. Snow shipped
  // with delays up to 4.4s on a 6–15s fall, which meant picking "snow" showed
  // an empty sky for seconds and didn't read as snowfall for fifteen — it
  // looked like the button hadn't worked.
  it.each([
    ["snow", ".snow-flake"],
    ["rain", ".rain-drop"],
    ["storm", ".rain-drop"],
    ["leaves", ".leaf-fall"],
  ])("%s starts every particle mid-flight", (mode, selector) => {
    const found = particles(mode, selector);
    expect(found.length).toBeGreaterThan(10);
    for (const p of found) {
      expect(p.delay, `${mode}: a particle waits ${p.delay}s before appearing`).toBeLessThanOrEqual(0);
    }
  });

  it("staggers them rather than dropping them in one curtain", () => {
    // All-zero delays would satisfy the rule above and still look wrong.
    const offsets = new Set(particles("snow", ".snow-flake").map((p) => p.delay.toFixed(2)));
    expect(offsets.size).toBeGreaterThan(5);
  });

  it("never offsets a particle past its own cycle", () => {
    // |delay| > duration is harmless (it wraps) but means the spread is no
    // longer describing a position within the fall — keep the intent honest.
    for (const mode of ["snow", "rain"]) {
      const sel = mode === "snow" ? ".snow-flake" : ".rain-drop";
      for (const p of particles(mode, sel)) {
        expect(Math.abs(p.delay)).toBeLessThanOrEqual(p.dur);
      }
      cleanup();
    }
  });

  it("draws nothing at all when the sky is clear", () => {
    const { container } = render(<WeatherOverlay mode="off" />);
    expect(container.innerHTML).toBe("");
  });

  it("keeps the lightning flash out of a reduced-motion scene", () => {
    // It's a full-screen white pulse — a photosensitivity concern, and being a
    // CSS *transition* it escapes the animation-silencing rules.
    const { container } = render(<WeatherOverlay mode="storm" reduceMotion />);
    expect(container.querySelector(".lightning-flash")).toBeNull();
    expect(container.querySelectorAll(".rain-drop").length).toBeGreaterThan(0);
  });
});
