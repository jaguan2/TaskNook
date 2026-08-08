// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MOTION_MODES,
  ambienceVars,
  applyMotionMode,
  reducesMotion,
  systemPrefersReduced,
} from "./motion";

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

// The only two classes allowed out of the reduced-motion list, each with the
// reason it's safe — asserted below, not taken on trust.
const EXEMPT_FROM_SILENCE = {
  "rain-drop-storm": "only ever applied together with .rain-drop, which is silenced",
  "intro-chrome": "shortened rather than stopped, by its own reduced-motion rule",
};

describe("nothing animates under reduced motion", () => {
  const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

  it("silences every animated class, by construction", () => {
    // The reduced-motion rule is an EXPLICIT selector list, so a new animation
    // class is silent-by-omission — it keeps moving for someone who asked it not
    // to, and nothing complains. `.body-breathe` slipped through exactly this
    // way. Rather than restate the list, derive the obligation: any class the
    // stylesheet gives an ambient phase to is an ambient animation, so it must
    // appear in the block.
    const list = css.match(/\[data-motion="reduced"\]\s*:is\(([^)]*)\)/);
    expect(list, "the reduced-motion rule is gone or reshaped").toBeTruthy();
    const silenced = new Set(
      list[1].split(",").map((s) => s.trim().replace(/^\./, "")).filter(Boolean)
    );

    // EVERY class that declares an animation, not just the phase-carrying ones:
    // a one-shot or a HUD flourish is just as much motion to someone who asked
    // for none, and wouldn't have a phase to give it away.
    const animated = [...css.matchAll(/\.([a-z-]+) \{([^}]*)\}/g)]
      .filter(([, , body]) => /\n\s*animation(-name)?:/.test(body))
      .map(([, cls]) => cls);
    expect(animated.length).toBeGreaterThanOrEqual(20);

    for (const cls of animated) {
      if (EXEMPT_FROM_SILENCE[cls]) continue;
      expect(silenced.has(cls), `.${cls} animates but is not in the reduced-motion list`).toBe(true);
    }
  });

  it("the exemptions are still true", () => {
    // An allowlist rots silently, so each entry states a reason the code can be
    // checked against.
    const weather = readFileSync(resolve(process.cwd(), "src/components/WeatherOverlay.jsx"), "utf8");
    // Storm rain is a MODIFIER: it only ever appears alongside .rain-drop, which
    // IS silenced, so the element stops either way.
    expect(weather).toMatch(/rain-drop[^"'`]*rain-drop-storm|rain-drop-storm[^"'`]*rain-drop/);
    // The intro fade isn't stopped, it's shortened — unmounting or freezing it
    // would leave the chrome invisible, which is worse than a brief fade.
    expect(css).toMatch(/\[data-motion="reduced"\] \.intro-chrome \{[^}]*animation-duration/);
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

// A source scan rather than a render, deliberately: the thing being guarded is
// that a JS gate EXISTS in the code, and the stylesheet provably can't provide
// it. `animation: none` cannot touch a CSS transition — so every transition
// that moves something has to be switched off in JS. Two exist, and both were
// found running under reduced motion at some point: the lightning flash, and
// the persona/pet wander glide (caught by counting live animations in a real
// browser, which reported one stubborn CSSTransition on a <g>).
describe("transitions are gated in JS, because CSS can't reach them", () => {
  const isoRoom = readFileSync(resolve(process.cwd(), "src/components/IsoRoom.jsx"), "utf8");
  const overlay = readFileSync(resolve(process.cwd(), "src/components/WeatherOverlay.jsx"), "utf8");

  it("the wander glide only gets its transition when motion is allowed", () => {
    expect(isoRoom).toContain('transition: "transform');
    expect(isoRoom).toMatch(/glides\s*&&\s*!editMode\s*&&\s*!reduceMotion/);
  });

  it("the wander timer doesn't run at all under reduced motion", () => {
    expect(isoRoom).toMatch(/if \(editMode \|\| reduceMotion\)/);
  });

  it("the lightning flash is still gated too", () => {
    expect(overlay).toMatch(/mode !== "storm" \|\| reduceMotion/);
  });
});

// Ambient motion is only convincing when instances disagree. The contract has
// two halves in two languages — the scene sets `--phase` per placement, the
// stylesheet spends it as a delay — and either half alone silently does nothing.
describe("ambient loops are desynchronised per item", () => {
  const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
  const isoRoom = readFileSync(resolve(process.cwd(), "src/components/IsoRoom.jsx"), "utf8");
  const items = readFileSync(resolve(process.cwd(), "src/components/IsoItems.jsx"), "utf8");
  const roomItems = readFileSync(resolve(process.cwd(), "src/components/RoomItems.jsx"), "utf8");

  it("the scene hands every placement both properties", () => {
    // BOTH branches: wanderers take the style-transform path, everything else
    // the attribute-transform path. Spreading into only one would leave all the
    // furniture in lockstep while the cat alone was independent.
    expect((isoRoom.match(/\.\.\.ambience/g) || []).length).toBeGreaterThanOrEqual(2);
    // …and the cast light pools, which are a separate layer outside the
    // placement groups and so can't inherit from them.
    expect(isoRoom).toMatch(/style=\{ambienceVars\(p\.gx, p\.gy\)\}/);
  });

  it("every loop that can appear twice in one room spends the phase", () => {
    // Checked per class, not by regex shape, because there are two legitimate
    // ways to write it. What must hold is that the block declares BOTH the
    // animation and the phase delay — and that the delay comes SECOND, since
    // the `animation` shorthand resets it and a tidy-up could reorder them.
    const mustPhase = [
      "room-sway", "room-sway-hanging", "room-twinkle", "room-breathe", "body-breathe",
      "steam-puff", "bubble-rise", "pond-ripple", "cat-breathe", "tail-flick",
      "flame-dance", "disc-spin", "curtain-sway", "pool-breathe", "pool-flicker",
      // Fast loops, but a study hall seats eight residents: at 0.5s, unison is
      // MORE obvious, not less — eight people typing on one beat.
      "resident-type", "leg-step-a", "leg-step-b",
    ];
    for (const cls of mustPhase) {
      const block = css.match(new RegExp(`\\.${cls} \\{([^}]*)\\}`));
      expect(block, `.${cls} is gone — did it get renamed?`).toBeTruthy();
      const body = block[1];
      expect(body, `.${cls} must animate`).toMatch(/animation(-name)?:/);
      // Either bare or wrapped in calc() — a sprite with its own internal
      // stagger has to add to the phase rather than replace it.
      expect(body, `.${cls} must inherit --phase`).toMatch(
        /animation-delay: (var\(--phase, 0s\);|calc\(var\(--phase, 0s\) [+-] [\d.]+s\);)/
      );
      expect(
        body.indexOf("animation-delay"),
        `.${cls}: the shorthand after the delay would reset it`
      ).toBeGreaterThan(body.indexOf("animation:"));
      // A NEGATIVE delay is only safe on a loop: on a finite animation it would
      // render the element in its already-finished state.
      expect(body, `.${cls} takes a negative delay, so it must be infinite`).toContain(
        "infinite"
      );
    }
  });

  it("a walker's two legs stay in counter-phase across the item's own phase", () => {
    // The half-cycle offset that makes the legs alternate has to be ADDED to the
    // inherited phase. As a bare `animation-delay: 0.25s` it would beat the
    // class rule, putting every walker in the room back in step — the same trap
    // as the two flames on a candle, but here it would also be the only thing
    // keeping one figure's legs from moving as one.
    const a = css.match(/\.leg-step-a \{([^}]*)\}/)[1];
    const b = css.match(/\.leg-step-b \{([^}]*)\}/)[1];
    expect(a).toContain("animation-delay: var(--phase, 0s);");
    expect(b).toMatch(/animation-delay: calc\(var\(--phase, 0s\) \+ 0\.25s\);/);
    // Half of the shared 0.5s period, or they aren't opposed.
    const period = a.match(/animation: leg-step ([\d.]+)s/)[1];
    expect(0.25).toBe(Number(period) / 2);
  });

  it("the long loops with many instances also vary their period", () => {
    // Plants are the most numerous animated thing in a room and the slowest,
    // so a shared period is still visible there even with the offset applied.
    for (const cls of ["room-sway", "room-sway-hanging"]) {
      const block = css.match(new RegExp(`\\.${cls} \\{([^}]*)\\}`))[1];
      expect(block).toMatch(/animation: room-sway calc\([\d.]+s \* var\(--dur-scale, 1\)\)/);
    }
  });

  it("the star field twinkles at scattered phases and rates", () => {
    // 44 stars once shared 9 POSITIVE delays: groups of five blinking as one,
    // each sitting at full brightness until its turn came round.
    const sky = readFileSync(resolve(process.cwd(), "src/components/SkyOverlay.jsx"), "utf8");
    expect(sky).toContain("animationDuration: s.duration");
    // Read the multipliers and the star count OUT of the source and check they
    // still fit each other. Hard-coding them here made this arithmetic on
    // constants the test itself supplied — `(i * 29) % 71` is injective for any
    // i < 71 because 71 is prime, so "44 distinct" could never have failed, and
    // raising STAR_COUNT past 71 (where collisions begin) wouldn't have been
    // noticed either.
    const count = Number(sky.match(/const STAR_COUNT = (\d+);/)[1]);
    const [, mulD, modD] = sky.match(/delay: `-\$\{\(\(i \* (\d+)\) % (\d+)\)/).map(Number);
    const [, base, mulR, modR] = sky
      .match(/duration: `\$\{\(([\d.]+) \+ \(\(i \* (\d+)\) % (\d+)\)/)
      .map(Number);

    const phases = new Set();
    const rates = new Set();
    for (let i = 0; i < count; i++) {
      phases.add(((i * mulD) % modD) / 10);
      rates.add((base + ((i * mulR) % modR) / 10).toFixed(1));
    }
    expect(phases.size, `${count} stars share only ${phases.size} twinkle phases`).toBe(count);
    expect(rates.size).toBeGreaterThan(modR / 2);
    expect(base).toBeGreaterThan(1); // a twinkle, not a strobe
  });

  it("sprites that stagger their own parts add the phase rather than replacing it", () => {
    // An inline animationDelay beats the class, so a bare one would put every
    // candle (or every string of lights) in the room back on the same beat.
    // Scanned across every file that draws room sprites, not just IsoItems —
    // two of the three sites live elsewhere, and they subtract rather than add.
    const sources = { items, isoRoom, roomItems };
    let found = 0;
    for (const [where, src] of Object.entries(sources)) {
      for (const decl of src.match(/animationDelay: .*/g) || []) {
        found += 1;
        expect(decl, `${where}: a bare inline delay overrides the item's phase`).toMatch(
          /calc\(var\(--phase, 0s\) [+-]/
        );
      }
    }
    expect(found).toBeGreaterThanOrEqual(6);
  });

  it("phases are negative, scales are near 1, and both are stable per tile", () => {
    // The REAL ambienceVars, not a copy of it. This test used to mirror the
    // implementation, which meant the one regression it named in its own comment
    // — flipping that leading minus sign — left every assertion green.
    const phases = new Set();
    const scales = new Set();
    for (let gx = 0; gx <= 24; gx += 0.5) {
      for (let gy = 0; gy <= 24; gy += 0.5) {
        const v = ambienceVars(gx, gy);
        // Negative: a positive delay freezes the room, then starts it all at
        // once. One decimal: half-tile coordinates must not leak float junk
        // into a CSS time.
        expect(v["--phase"]).toMatch(/^-\d\.\d\ds$/);
        expect(parseFloat(v["--phase"])).toBeGreaterThan(-7.2);
        // Near 1, or the room is retimed rather than merely broken up.
        expect(parseFloat(v["--dur-scale"])).toBeGreaterThanOrEqual(0.9);
        expect(parseFloat(v["--dur-scale"])).toBeLessThanOrEqual(1.12);
        phases.add(v["--phase"]);
        scales.add(v["--dur-scale"]);
      }
    }
    expect(phases.size).toBeGreaterThan(30); // actually spread, not one value
    expect(scales.size).toBeGreaterThan(15);

    // What a phase is worth is measured MODULO the loop it delays, and the
    // fastest phased loop is 0.5s (`leg-step`, `resident-type`). At tenth-second
    // granularity that loop had only five reachable positions, so eight
    // residents typed on four beats. This is the assertion that pins the
    // precision — a `.toFixed(1)` passes every check above and fails here.
    const FASTEST = 0.5;
    const beats = new Set([...phases].map((p) => Math.abs(parseFloat(p)) % FASTEST));
    expect(beats.size).toBeGreaterThan(20);
  });

  it("the same tile always gives the same ambience", () => {
    // The scene re-renders on the timer's 1Hz tick. A value that moved would
    // restart every animation inside every sprite, once a second — so this has
    // to hold across calls, and it's why the source may not reach for
    // Math.random.
    const first = [
      [0, 0], [3, 4.5], [11.5, 2], [24, 24],
    ].map(([x, y]) => ambienceVars(x, y));
    for (let i = 0; i < 5; i += 1) {
      expect([[0, 0], [3, 4.5], [11.5, 2], [24, 24]].map(([x, y]) => ambienceVars(x, y))).toEqual(
        first
      );
    }
    // Comments stripped first: the doc comment on ambienceVars names Math.random
    // as the thing NOT to reach for, and a substring search can't tell a rule
    // from a violation. (The previous version of this check was a proximity
    // regex, which matched that very comment and had 15 characters of slack.)
    const code = readFileSync(resolve(process.cwd(), "src/lib/motion.js"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*/g, "");
    expect(code).not.toContain("Math.random");
    expect(code).toContain("ambienceVars"); // the strip didn't eat the module
  });
});

// The residents' idle gestures — yawn, stretch, glance, rub an eye. Occasional
// motion is harder to get right than continuous motion, and the two ways it goes
// wrong are both invisible in a code review, so they're pinned here.
describe("idle gestures read as occasional, not as a loop", () => {
  const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
  const items = readFileSync(resolve(process.cwd(), "src/components/IsoItems.jsx"), "utf8");
  const GESTURES = [
    "gesture-look", "gesture-yawn", "gesture-yawn-mouth",
    "gesture-stretch", "gesture-rub", "gesture-rub-head",
  ];

  /** The class's cycle length and how far it stretches --phase, read from the CSS. */
  const timingOf = (cls) => {
    const body = css.match(new RegExp(`\\.${cls} \\{([^}]*)\\}`));
    expect(body, `.${cls} is missing`).toBeTruthy();
    const period = Number(body[1].match(/animation: [a-z-]+ calc\(([\d.]+)s \* var\(--dur-scale, 1\)\)/)[1]);
    const spread = Number(body[1].match(/animation-delay: calc\(var\(--phase, 0s\) \* ([\d.]+)\)/)[1]);
    return { period, spread };
  };

  // The widest phase ambienceVars actually hands out, measured over a grid
  // rather than assumed from the modulus — the two have to agree for the
  // coverage sums below to mean anything.
  let maxPhase = 0;
  for (let gx = 0; gx <= 20; gx += 0.5) {
    for (let gy = 0; gy <= 20; gy += 0.5) {
      maxPhase = Math.max(maxPhase, Math.abs(parseFloat(ambienceVars(gx, gy)["--phase"])));
    }
  }

  it("spreads each gesture across its OWN cycle, not across --phase's range", () => {
    // The trap: --phase spans ~7s, a gesture cycle is 29–61s. Used raw, every
    // resident in the room would yawn inside the same 7-second window and then
    // stand still together for the other 54 — synchronised waves, which is more
    // obviously mechanical than no offset at all. Each multiplier has to carry
    // the spread across its own period.
    for (const cls of GESTURES) {
      const { period, spread } = timingOf(cls);
      const covered = (maxPhase * spread) / period;
      expect(covered, `.${cls} only desynchronises over ${Math.round(covered * 100)}% of its cycle`)
        .toBeGreaterThan(0.6);
      // And not so far past it that the multiplier is doing nothing useful.
      expect(covered).toBeLessThan(1.4);
    }
  });

  it("leaves a character still most of the time", () => {
    // The judgement that's easiest to get wrong, and did get wrong: holding the
    // keyframe PERCENTAGES fixed while shortening the cycles left a resident in
    // motion 37% of the time, which reads as a fidget rather than as an idle.
    // What matters is the sum of duty cycles — the share of the time SOMETHING is
    // moving — and the absolute length of each action, which percentages alone
    // don't tell you.
    let duty = 0;
    let rate = 0;
    for (const cls of GESTURES) {
      // The paired halves of one gesture move together, so counting both would
      // double-count the time.
      if (cls.endsWith("-mouth") || cls.endsWith("-head")) continue;
      const { period } = timingOf(cls);
      const frames = css.match(new RegExp(`@keyframes ${cls} \\{([^@]*?)\\n\\}`))[1];
      const hold = Number(frames.match(/0%,\s*\n\s*([\d.]+)%/)[1]);
      const action = (period * (100 - hold)) / 100;
      // Long enough to read as a gesture, short enough to stay peripheral.
      expect(action, `.${cls} takes ${action.toFixed(1)}s`).toBeGreaterThan(2);
      expect(action, `.${cls} takes ${action.toFixed(1)}s`).toBeLessThan(5.5);
      duty += action / period;
      rate += 60 / period;
    }
    expect(duty, `in motion ${Math.round(duty * 100)}% of the time`).toBeLessThan(0.25);
    expect(duty, `in motion only ${Math.round(duty * 100)}% of the time`).toBeGreaterThan(0.1);
    // "Randomly every few seconds (or minutes)" — one gesture every 12-40s.
    expect(60 / rate).toBeGreaterThan(12);
    expect(60 / rate).toBeLessThan(40);
  });

  it("keeps each gesture a sliver of its cycle", () => {
    // "Idle motion is slow and peripheral" — a gesture that took a third of its
    // cycle would read as a fidget. The neutral hold is the `0%, N%` stop.
    for (const cls of GESTURES) {
      const frames = css.match(new RegExp(`@keyframes ${cls} \\{([^@]*?)\\n\\}`));
      expect(frames, `@keyframes ${cls} is missing`).toBeTruthy();
      const hold = Number(frames[1].match(/0%,\s*\n\s*([\d.]+)%/)[1]);
      expect(hold, `.${cls} is moving for ${100 - hold}% of its cycle`).toBeGreaterThanOrEqual(85);
      // Starts AND ends neutral, or reduced motion freezes it mid-gesture: with
      // `animation: none` the element falls back to its base style, which is the
      // 0% pose only if 100% matches it.
      const first = frames[1].match(/0%,\s*\n\s*[\d.]+% \{([^}]*)\}/)[1].trim();
      const last = frames[1].match(/\n\s*100% \{([^}]*)\}/)[1].trim();
      expect(last, `.${cls} must end where it started`).toBe(first);
      // Every stop has to be a real declaration. This isn't hypothetical: a
      // scripted rewrite once emitted bare `rotate(0deg)` with no property name
      // and no semicolon, and every assertion here still passed — only the build
      // caught it, because none of this parsed the declarations themselves.
      for (const stop of frames[1].match(/\{([^}]*)\}/g) || []) {
        for (const decl of stop.replace(/[{}]/g, "").split(";")) {
          if (!decl.trim()) continue;
          expect(decl, `.${cls} has a malformed stop: ${decl.trim()}`).toMatch(
            /^\s*(transform|opacity):\s*\S/
          );
        }
      }
    }
  });

  it("the periods are coprime, so a character's sequence doesn't repeat", () => {
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const periods = [...new Set(GESTURES.map((c) => timingOf(c).period))];
    expect(periods.length).toBeGreaterThanOrEqual(4);
    for (const a of periods) {
      for (const b of periods) {
        if (a !== b) expect(gcd(a, b), `${a}s and ${b}s share a factor`).toBe(1);
      }
    }
  });

  it("every two-part gesture moves on exactly one clock", () => {
    // A gesture built from two elements — the yawn's tilt plus its mouth, the
    // rub's arm plus the head leaning into it — has nothing holding the halves
    // together except matching period, delay AND stops. Any mismatch and the
    // mouth opens a beat after the head goes back, which reads as a fault
    // rather than as a yawn.
    const stops = (cls) =>
      (css.match(new RegExp(`@keyframes ${cls} \\{([^@]*?)\\n\\}`))[1].match(/[\d.]+%/g) || []).join();
    for (const [lead, follow] of [
      ["gesture-yawn", "gesture-yawn-mouth"],
      ["gesture-rub", "gesture-rub-head"],
    ]) {
      expect(timingOf(follow), `${follow} runs on a different clock to ${lead}`).toEqual(
        timingOf(lead)
      );
      expect(stops(follow), `${follow} moves at different moments to ${lead}`).toBe(stops(lead));
    }
  });

  it("hands busy on a keyboard don't also stretch", () => {
    // Arm gestures and the typing bob would fight over the same transforms, and
    // a person mid-keystroke throwing their arms up reads as a glitch. The head
    // is deliberately NOT gated — yawning at your desk is the whole charm.
    expect(items).toMatch(/const typing = working && seated;/);
    expect(items).toMatch(/className=\{typing \? undefined : "gesture-stretch"\}/);
    expect(items).toMatch(/className=\{typing \? undefined : "gesture-rub"\}/);
    expect(items).toMatch(/className="gesture-yawn"/);
    expect(items).toMatch(/className="gesture-look"/);
  });

  it("the yawning mouth rests shut without an animation to hold it", () => {
    // Its closed state can't be expressed as a transform, so it lives in a
    // presentation attribute that keyframes outrank while running and that takes
    // over when they're switched off. Get this wrong and reduced motion leaves
    // every character permanently gaping.
    const mouth = items.match(/className="gesture-yawn-mouth"[\s\S]{0,220}?\/>/);
    expect(mouth).toBeTruthy();
    expect(mouth[0]).toMatch(/opacity="0"/);
  });
});
