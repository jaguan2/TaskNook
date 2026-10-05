import { describe, expect, it } from "vitest";
import {
  BUILD_SHAPE,
  MODEL_SHAPE,
  MIN_SHOULDER,
  HEAD_R,
  HEAD_R_EFF,
  HEAD_SCALE,
  TORSO_H,
  TORSO_OVERLAP,
  WAIST_DROP,
  HEAD_LIFT,
  WIDTH_RANGE,
  SHOULDER_RANGE,
  HEIGHT_RANGE,
  TORSO_RANGE,
  BODY_SIZE_PRESETS,
  bodySizePresetMatches,
  bodySizePresetPatch,
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
  it("keeps every shoulder line compact but readable beneath the head", () => {
    // The reference deliberately allows the rounded head to overhang narrow
    // shoulders. Parametric bounds keep that softness without letting a new
    // model collapse into an unreadable stem or return to the broad toy body.
    for (const model of MODELS) {
      for (const build of BUILDS) {
        const { sh } = figureMetrics({ model, build });
        expect(sh, `${model} × ${build}`).toBeGreaterThanOrEqual(MIN_SHOULDER);
        expect(sh / HEAD_R_EFF, `${model} × ${build}`).toBeGreaterThanOrEqual(0.8);
        expect(sh / HEAD_R_EFF, `${model} × ${build}`).toBeLessThanOrEqual(1.25);
      }
    }
  });

  it("the head unit scales as one and the figure lands in the compact-human band", () => {
    // The drawing radius never moves (every asset is authored against it),
    // and the whole unit scales together. VC2's soft figures read at roughly
    // 3.5–4 heads, with the hair silhouette doing far more work than facial
    // detail at room scale.
    expect(HEAD_R_EFF).toBeCloseTo(HEAD_R * HEAD_SCALE, 9);
    const height = -STAND_HEAD_Y + HEAD_R_EFF;
    const heads = height / (HEAD_R_EFF * 2);
    expect(heads).toBeGreaterThanOrEqual(3.5);
    expect(heads).toBeLessThanOrEqual(4);
  });

  it("the standing figure keeps short but readable legs", () => {
    // Visible leg (floor up to the torso's hem) stays above the original
    // squat body without returning to the later long-legged illustration.
    const height = -STAND_HEAD_Y + HEAD_R_EFF;
    const visibleLeg = -(STAND_TORSO_Y + TORSO_H);
    expect(visibleLeg / height).toBeGreaterThanOrEqual(0.4);
    // ...while total height stays inside the band everything seat-, wall-
    // and camera-tuned was built against.
    expect(height).toBeGreaterThan(54);
    expect(height).toBeLessThanOrEqual(59);
  });

  it("seated and standing share one head lift", () => {
    // The seated 8.0 vs standing 8.5 was a hand-tuned accident, unified in
    // the retune — a pose is not allowed its own neck length.
    expect(STAND_TORSO_Y - STAND_HEAD_Y).toBeCloseTo(HEAD_LIFT, 9);
    expect(SEAT_TORSO_Y - SEAT_HEAD_Y).toBeCloseTo(HEAD_LIFT, 9);
  });
});

describe("figureMetrics", () => {
  it("body templates span meaningfully different proportions on both models", () => {
    const compact = BODY_SIZE_PRESETS.find(({ key }) => key === "compact");
    const broad = BODY_SIZE_PRESETS.find(({ key }) => key === "broad");
    const tall = BODY_SIZE_PRESETS.find(({ key }) => key === "tall");
    for (const model of MODELS) {
      const small = figureMetrics({ model, ...compact });
      const wide = figureMetrics({ model, ...broad });
      const long = figureMetrics({ model, ...tall });
      expect(wide.hem - small.hem, `${model} width span`).toBeCloseTo(2, 9);
      expect(long.legH - small.legH, `${model} height span`).toBeGreaterThanOrEqual(5);
    }
  });

  it("a body template patch preserves every non-body character choice", () => {
    const character = { skin: "#123456", hair: "wolf", garment: "tank", width: 7.1 };
    const patch = bodySizePresetPatch(BODY_SIZE_PRESETS[2]);
    expect({ ...character, ...patch }).toMatchObject({ skin: "#123456", hair: "wolf", garment: "tank" });
    expect(bodySizePresetMatches({ ...character, ...patch }, BODY_SIZE_PRESETS[2])).toBe(true);
    expect(bodySizePresetMatches(character, BODY_SIZE_PRESETS[2])).toBe(false);
  });

  // The geometry pin. These numbers are the reviewed silhouette — a change
  // here must be a deliberate retune re-baselined against a contact sheet,
  // never a drive-by.
  const PINNED = {
    // Re-baselined for the compact-human pass: shoulders may sit inside the
    // head width, hips are no longer an exaggerated triangle, and limb mass
    // no longer supplies the missing chest width.
    masc: {
      slim: { sh: 6.9, wa: 5.2, hem: 6.3, kneeX: 8.5 },
      average: { sh: 7.7, wa: 6, hem: 7.1, kneeX: 8.5 },
      sturdy: { sh: 8.9, wa: 7.2, hem: 8.3, kneeX: 8.5 },
    },
    fem: {
      slim: { sh: 6.45, wa: 4, hem: 7.2, kneeX: 8.5 },
      average: { sh: 6.45, wa: 4.8, hem: 8, kneeX: 8.5 },
      sturdy: { sh: 7.4, wa: 6, hem: 9.2, kneeX: 8.7 },
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
    // Broad builds may still be broad, but the torso must not overwhelm the
    // generous illustrated head that carries the character's identity.
    for (const model of MODELS) {
      for (const build of BUILDS) {
        const { sh } = figureMetrics({ model, build });
        expect(sh / HEAD_R_EFF, `${model} × ${build}`).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it("the chest axis changes shoulders without changing waist or hem", () => {
    const narrow = figureMetrics({ shoulders: SHOULDER_RANGE[0] });
    const broad = figureMetrics({ shoulders: SHOULDER_RANGE[1] });

    expect(narrow.sh).toBeLessThan(broad.sh);
    expect(narrow.wa).toBe(broad.wa);
    expect(narrow.hem).toBe(broad.hem);
    expect(narrow.legW).toBe(broad.legW);
  });

  it("limbs scale gently with width, and the models' limbs differ", () => {
    // A wide torso on unchanged stick legs reads as parts pasted together;
    // a narrow one on thick limbs reads stuffed. Since the slimming retune
    // the limb is also a MODEL axis: fem's arms and legs remain visibly finer
    // than masc's at the same build, while both share the new slender base.
    const base = figureMetrics({});
    expect(base.armW).toBeCloseTo(3.5, 9);
    expect(base.legW).toBeCloseTo(4.9, 9);
    expect(base.thighW).toBeCloseTo(6.5, 9);
    expect(base.shinW).toBeCloseTo(5.7, 9);
    expect(figureMetrics({ width: WIDTH_RANGE[0] }).legW).toBeLessThan(base.legW);
    expect(figureMetrics({ width: WIDTH_RANGE[1] }).legW).toBeGreaterThan(base.legW);
    const fem = figureMetrics({ model: "fem" });
    expect(base.armW - fem.armW).toBeCloseTo(0.45, 9);
    expect(base.legW - fem.legW).toBeCloseTo(0.45, 9);
  });

  it("the slider extremes stay inside every guard", () => {
    // WIDTH_RANGE/HEIGHT_RANGE claim to be guard-derived; this is what
    // makes that claim true. If a range is ever widened, these fail before
    // a user can drag a body outside its own rules.
    for (const model of MODELS) {
      for (const width of WIDTH_RANGE) {
        const { sh, hem, legW } = figureMetrics({ model, width });
        expect(sh, `${model} w${width}`).toBeGreaterThanOrEqual(MIN_SHOULDER);
        expect(sh / HEAD_R_EFF, `${model} w${width}`).toBeLessThanOrEqual(1.6);
        expect(hem, `${model} w${width}`).toBeGreaterThanOrEqual(4 + legW / 2);
      }
      for (const shoulders of SHOULDER_RANGE) {
        const { sh } = figureMetrics({ model, shoulders });
        expect(sh, `${model} chest${shoulders}`).toBeGreaterThanOrEqual(MIN_SHOULDER);
        expect(sh / HEAD_R_EFF, `${model} chest${shoulders}`).toBeLessThanOrEqual(1.6);
      }
      for (const height of HEIGHT_RANGE) {
        // At the DEFAULT torso, the leg range keeps the figure leggy — the
        // original anti-squat guarantee.
        const m = figureMetrics({ model, height });
        const total = -m.standHeadY + HEAD_R_EFF;
        const legShare = (m.legH - TORSO_OVERLAP) / total;
        expect(legShare, `${model} h${height}`).toBeGreaterThanOrEqual(0.4);
      }
      // Legs and torso are separate axes now, and a deliberately long torso
      // is a chosen proportion — so the extremes get a looser floor (the
      // anti-toddler line) and a ceiling inside the resident's hit region.
      for (const height of HEIGHT_RANGE) {
        for (const torso of TORSO_RANGE) {
          const m = figureMetrics({ model, height, torso });
          const total = -m.standHeadY + HEAD_R_EFF;
          const legShare = (m.legH - TORSO_OVERLAP) / total;
          expect(legShare, `${model} h${height} t${torso}`).toBeGreaterThanOrEqual(0.33);
          expect(total, `${model} h${height} t${torso}`).toBeLessThanOrEqual(66);
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
