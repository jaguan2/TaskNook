import { describe, expect, it } from "vitest";
import {
  BUILD_SHAPE,
  MODEL_SHAPE,
  MIN_SHOULDER,
  HEAD_R,
  TORSO_H,
  TORSO_OVERLAP,
  WAIST_DROP,
  HEAD_LIFT,
  WIDTH_RANGE,
  HEIGHT_RANGE,
  TORSO_RANGE,
  STAND_TORSO_Y,
  STAND_HEAD_Y,
  SEAT_TORSO_Y,
  SEAT_HEAD_Y,
  figureMetrics,
  torsoGeom,
  farColor,
} from "./body";

const MODELS = Object.keys(MODEL_SHAPE);
const BUILDS = Object.keys(BUILD_SHAPE);

describe("figure proportions", () => {
  it("no model × build produces shoulders narrower than the head", () => {
    // The top-heavy guard: fem + slim once produced a body narrower than its
    // own skull. Parametric over the real tables so a new build or model is
    // covered the day it's added.
    for (const model of MODELS) {
      for (const build of BUILDS) {
        const { sh } = figureMetrics({ model, build });
        expect(sh, `${model} × ${build}`).toBeGreaterThanOrEqual(MIN_SHOULDER);
        expect(sh, `${model} × ${build}`).toBeGreaterThan(HEAD_R + 1);
      }
    }
  });

  it("the standing figure stays leggy enough not to read squat", () => {
    // The "chunky" complaint, as arithmetic: visible leg (floor up to the
    // torso's hem) must be at least 40% of total height. The pre-retune
    // 22/22 stack sat at 32%; a first fix at 37% was rejected against the
    // owner's reference art, which carries nearly half the figure as leg.
    const height = -STAND_HEAD_Y + HEAD_R;
    const visibleLeg = -(STAND_TORSO_Y + TORSO_H);
    expect(visibleLeg / height).toBeGreaterThanOrEqual(0.4);
    // ...while total height stays inside the band everything seat-, wall-
    // and camera-tuned was built against.
    expect(height).toBeGreaterThan(55);
    expect(height).toBeLessThan(58);
  });

  it("seated and standing share one head lift", () => {
    // The seated 8.0 vs standing 8.5 was a hand-tuned accident, unified in
    // the retune — a pose is not allowed its own neck length.
    expect(STAND_TORSO_Y - STAND_HEAD_Y).toBe(HEAD_LIFT);
    expect(SEAT_TORSO_Y - SEAT_HEAD_Y).toBe(HEAD_LIFT);
  });
});

describe("figureMetrics", () => {
  // The geometry pin. These numbers are the reviewed silhouette — a change
  // here must be a deliberate retune re-baselined against a contact sheet,
  // never a drive-by.
  const PINNED = {
    // Re-baselined for the 2026-08-19 slimming retune (owner: "they look
    // like blobs") — reviewed on the contact sheet and in the dressing room.
    // masc keeps its shoulder line but the waist pinches to a V; fem is a
    // smaller hourglass; both hems came in with the base widths.
    masc: {
      slim: { sh: 8.8, wa: 5, hem: 6.6, kneeX: 8.5 },
      average: { sh: 9.6, wa: 5.8, hem: 7.4, kneeX: 8.5 },
      sturdy: { sh: 10.8, wa: 7, hem: 8.6, kneeX: 8.5 },
    },
    fem: {
      // All three builds now sit at MIN_SHOULDER (sturdy lands there
      // exactly) — the whole fem silhouette lives in the waist-to-hem
      // contrast and the finer limbs, exactly as documented.
      slim: { sh: 8.6, wa: 2.8, hem: 8.2, kneeX: 8.5 },
      average: { sh: 8.6, wa: 3.6, hem: 9, kneeX: 8.5 },
      sturdy: { sh: 8.6, wa: 4.8, hem: 10.2, kneeX: 9.7 },
    },
  };

  it("matches the pinned silhouette table", () => {
    for (const model of MODELS) {
      for (const build of BUILDS) {
        const m = figureMetrics({ model, build });
        const want = PINNED[model][build];
        for (const [key, value] of Object.entries(want)) {
          expect(m[key], `${model} × ${build} ${key}`).toBeCloseTo(value, 9);
        }
      }
    }
  });

  it("the torso hem always covers the standing stance", () => {
    // Standing trouser legs sit at centres ±4; their hips must tuck under
    // the torso's hem, or a narrow build grows hips outside its own shirt.
    for (const model of MODELS) {
      for (const build of BUILDS) {
        const { hem, legW } = figureMetrics({ model, build });
        expect(hem, `${model} × ${build}`).toBeGreaterThanOrEqual(4 + legW / 2);
      }
    }
  });

  it("the chest stays in the reference band relative to the head", () => {
    // The owner's reference kits carry shoulders at ~1.2–1.3× the head; the
    // pre-retune body sat at 1.6× and read chunky. Ceiling at 1.55 so a
    // future build can be broad without re-becoming a fridge.
    for (const model of MODELS) {
      for (const build of BUILDS) {
        const { sh } = figureMetrics({ model, build });
        expect(sh / HEAD_R, `${model} × ${build}`).toBeLessThanOrEqual(1.55);
      }
    }
  });

  it("limbs scale gently with width, and the models' limbs differ", () => {
    // A wide torso on unchanged stick legs reads as parts pasted together;
    // a narrow one on thick limbs reads stuffed. Since the slimming retune
    // the limb is also a MODEL axis: fem's arms and legs are visibly finer
    // than masc's at the same build — a 0.6px full-width difference, which
    // is the floor of what survives 57px.
    const base = figureMetrics({});
    expect(base.armW).toBeCloseTo(4.8, 9);
    expect(base.legW).toBeCloseTo(5.5, 9);
    expect(base.thighW).toBeCloseTo(7.4, 9);
    expect(base.shinW).toBeCloseTo(6.4, 9);
    expect(figureMetrics({ width: WIDTH_RANGE[0] }).legW).toBeLessThan(base.legW);
    expect(figureMetrics({ width: WIDTH_RANGE[1] }).legW).toBeGreaterThan(base.legW);
    const fem = figureMetrics({ model: "fem" });
    expect(base.armW - fem.armW).toBeCloseTo(0.6, 9);
    expect(base.legW - fem.legW).toBeCloseTo(0.6, 9);
  });

  it("the slider extremes stay inside every guard", () => {
    // WIDTH_RANGE/HEIGHT_RANGE claim to be guard-derived; this is what
    // makes that claim true. If a range is ever widened, these fail before
    // a user can drag a body outside its own rules.
    for (const model of MODELS) {
      for (const width of WIDTH_RANGE) {
        const { sh, hem, legW } = figureMetrics({ model, width });
        expect(sh, `${model} w${width}`).toBeGreaterThanOrEqual(MIN_SHOULDER);
        expect(sh / HEAD_R, `${model} w${width}`).toBeLessThanOrEqual(1.55);
        expect(hem, `${model} w${width}`).toBeGreaterThanOrEqual(4 + legW / 2);
      }
      for (const height of HEIGHT_RANGE) {
        // At the DEFAULT torso, the leg range keeps the figure leggy — the
        // original anti-squat guarantee.
        const m = figureMetrics({ model, height });
        const total = -m.standHeadY + HEAD_R;
        const legShare = (m.legH - TORSO_OVERLAP) / total;
        expect(legShare, `${model} h${height}`).toBeGreaterThanOrEqual(0.4);
      }
      // Legs and torso are separate axes now, and a deliberately long torso
      // is a chosen proportion — so the extremes get a looser floor (the
      // anti-toddler line) and a ceiling inside the resident's hit region.
      for (const height of HEIGHT_RANGE) {
        for (const torso of TORSO_RANGE) {
          const m = figureMetrics({ model, height, torso });
          const total = -m.standHeadY + HEAD_R;
          const legShare = (m.legH - TORSO_OVERLAP) / total;
          expect(legShare, `${model} h${height} t${torso}`).toBeGreaterThanOrEqual(0.33);
          expect(total, `${model} h${height} t${torso}`).toBeLessThanOrEqual(65);
        }
      }
    }
  });

  it("junk width/height falls back to the build and the classic leg", () => {
    expect(figureMetrics({ width: "9", height: NaN })).toEqual(figureMetrics({}));
  });

  it("falls back to masc/average for unknown keys", () => {
    expect(figureMetrics({ model: "alien", build: "gone" })).toEqual(
      figureMetrics({ model: "masc", build: "average" })
    );
    expect(figureMetrics()).toEqual(figureMetrics({ model: "masc", build: "average" }));
  });
});

describe("torsoGeom", () => {
  it("seats the band's top corners on the body's curve, not at the control point", () => {
    // `wa` is the quadratic's CONTROL point, which the curve never reaches —
    // banding from it left an unshaded crescent down each hip.
    for (const model of MODELS) {
      for (const build of BUILDS) {
        const { sh, wa, hem } = figureMetrics({ model, build });
        const { band } = torsoGeom({ sh, wa, hem, top: 0 });
        const [x, y] = band.slice(2).trim().split(" ").map(Number);
        expect(x).toBeCloseTo(-(0.25 * sh + 0.5 * wa + 0.25 * hem), 3);
        expect(y).toBeCloseTo(0.25 * 7 + 0.5 * WAIST_DROP + 0.25 * (TORSO_H - 3), 3);
      }
    }
  });

  it("a longer hem never moves the waist", () => {
    // The waist belongs to the body; a garment that drops the hem (a future
    // dress) must not drag the waist down with it.
    const { sh, wa, hem } = figureMetrics({});
    const long = torsoGeom({ sh, wa, hem, top: 0, bot: 33 });
    const normal = torsoGeom({ sh, wa, hem, top: 0 });
    expect(long.body).toContain(`Q ${wa} ${WAIST_DROP} `);
    expect(normal.body).toContain(`Q ${wa} ${WAIST_DROP} `);
  });

  it("emits float-dust-free path data", () => {
    for (const model of MODELS) {
      for (const build of BUILDS) {
        const { sh, wa, hem } = figureMetrics({ model, build });
        const { body, band } = torsoGeom({ sh, wa, hem, top: STAND_TORSO_Y });
        expect(body).not.toMatch(/\d\.\d{4,}/);
        expect(band).not.toMatch(/\d\.\d{4,}/);
      }
    }
  });
});

describe("farColor", () => {
  it("reproduces the hand-tuned trouser pair exactly", () => {
    // #3c2f4a is what the far trouser leg has always been; the derivation
    // (floor of ×0.82 per channel) exists so the pairing survives the
    // trousers ever becoming user-pickable. If this fails, the sprite's far
    // leg just changed colour.
    expect(farColor("#4a3a5b")).toBe("#3c2f4a");
  });

  it("keeps leading zeros", () => {
    expect(farColor("#01050a")).toBe("#000408");
  });
});
