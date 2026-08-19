// SOFT VOLUME — the "actual modelling" pass (owner call, 2026-08-19: the
// models should read as 3D, cohesive, normal). The flat cel marks told you
// where the LIGHT was; these gradients tell you the SHAPE. Two reusable
// gradients cover every mass in the figure and the pets:
//
//   sphere — an off-centre radial for heads and round masses: highlight
//            biased up toward screen RIGHT (the one light every mark in
//            docs/MODELS.md §10 answers to), falling away to a cool core
//            shadow at the lower-left rim.
//   cyl    — a horizontal linear for upright masses (the torso): shaded
//            left edge, a lit band just inside the right edge, with the
//            very edge easing off — that ease is what separates a cylinder
//            from a box.
//
// Both are stacks of TRANSLUCENT neutral stops (GLINT/SHADE with opacity,
// never a solid mid-tone), so they model whatever colour the user picked —
// the same recolour bargain as every crescent they now sit alongside. The
// hard marks stay: gradient alone is airbrush-soft, crescent alone is cel-
// flat; the two together are what read as modelled.
//
// Ids are per-instance (useId at the call site): SVG ids are document-global
// and one room renders many bodies at once — the same lesson as the print
// clipPath.
import { GLINT, SHADE } from "./body";

export function VolumeDefs({ id }) {
  return (
    <defs>
      {/* Highlight kept FAINT (0.14): on near-black fur a stronger stop
          floats free of the form and reads as a glowing smudge — the ink
          cat's rear view shipped exactly that (owner screenshot,
          2026-08-19). The shadow rim carries the sphere on light masses;
          on dark ones the silhouette itself does. */}
      <radialGradient id={`${id}-sph`} cx="0.62" cy="0.3" r="0.82">
        <stop offset="0" stopColor={GLINT} stopOpacity="0.14" />
        <stop offset="0.4" stopColor={GLINT} stopOpacity="0" />
        <stop offset="0.68" stopColor={SHADE} stopOpacity="0" />
        <stop offset="1" stopColor={SHADE} stopOpacity="0.24" />
      </radialGradient>
      <linearGradient id={`${id}-cyl`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={SHADE} stopOpacity="0.2" />
        <stop offset="0.3" stopColor={SHADE} stopOpacity="0" />
        <stop offset="0.6" stopColor={GLINT} stopOpacity="0" />
        <stop offset="0.85" stopColor={GLINT} stopOpacity="0.14" />
        <stop offset="1" stopColor={GLINT} stopOpacity="0.04" />
      </linearGradient>
    </defs>
  );
}

/** Fill refs for the two gradients — pass the same id given to VolumeDefs. */
export const sphereFill = (id) => `url(#${id}-sph)`;
export const cylFill = (id) => `url(#${id}-cyl)`;
