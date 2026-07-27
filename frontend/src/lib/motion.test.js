// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MOTION_MODES, applyMotionMode, reducesMotion, systemPrefersReduced } from "./motion";

/** Pretend the OS does (or doesn't) ask for reduced motion. */
function systemSays(reduce) {
  vi.stubGlobal("matchMedia", (q) => ({
    matches: reduce && q.includes("prefers-reduced-motion"),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-motion");
});

describe("motion modes", () => {
  it("offers exactly the three the UI shows", () => {
    expect(MOTION_MODES).toEqual(["auto", "full", "reduced"]);
  });

  it("explicit modes ignore the system entirely", () => {
    systemSays(true);
    expect(reducesMotion("full")).toBe(false); // keep the room alive anyway
    systemSays(false);
    expect(reducesMotion("reduced")).toBe(true); // calm it anyway
  });

  it("auto follows the system, in both directions", () => {
    systemSays(true);
    expect(reducesMotion("auto")).toBe(true);
    systemSays(false);
    expect(reducesMotion("auto")).toBe(false);
  });

  it("treats an unknown mode as auto rather than as motion-on", () => {
    // A corrupted localStorage value must not silently disable someone's
    // accessibility preference.
    systemSays(true);
    expect(reducesMotion("wobble")).toBe(true);
    expect(reducesMotion(undefined)).toBe(true);
  });

  it("survives matchMedia being missing", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(() => systemPrefersReduced()).not.toThrow();
    expect(systemPrefersReduced()).toBe(false);
  });
});

describe("applyMotionMode stamps the attribute every CSS rule keys off", () => {
  it("sets it when reducing and clears it when not", () => {
    systemSays(false);
    applyMotionMode("reduced");
    expect(document.documentElement.getAttribute("data-motion")).toBe("reduced");
    applyMotionMode("full");
    expect(document.documentElement.hasAttribute("data-motion")).toBe(false);
  });

  it("clears it when auto and the system stops asking", () => {
    systemSays(true);
    applyMotionMode("auto");
    expect(document.documentElement.getAttribute("data-motion")).toBe("reduced");
    systemSays(false);
    applyMotionMode("auto");
    expect(document.documentElement.hasAttribute("data-motion")).toBe(false);
  });
});

describe("the pre-paint script agrees with the app", () => {
  // index.html sets the attribute before React mounts so reduced-motion users
  // never see a flash of the movement they asked not to see. It duplicates the
  // storage key, the attribute and the mode names by necessity — it has to run
  // before any module loads — so this pins the three places they must match.
  // Resolved from the working directory, not import.meta.url — vitest's jsdom
  // transform doesn't hand these modules a file: URL.
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

  it("uses the same storage key the store writes", () => {
    expect(html).toContain('"tasknook.motion"');
  });

  it("sets the same attribute the stylesheet keys off", () => {
    expect(html).toContain('"data-motion", "reduced"');
    expect(css).toContain('[data-motion="reduced"]');
  });

  it("knows the same explicit mode names", () => {
    expect(html).toContain('"reduced"');
    expect(html).toContain('"full"');
  });

  it("leaves no prefers-reduced-motion media query behind in the CSS", () => {
    // Motion is silenced by ONE condition now. A stray media query would mean
    // the Motion setting couldn't turn animation back ON for someone whose OS
    // asks to reduce it.
    expect(css).not.toContain("prefers-reduced-motion");
  });
});
