// SOFT VOLUME — the "actual modelling" pass (owner call, 2026-08-19: the
// models should read as 3D, cohesive, normal). The flat cel marks told you
// where the LIGHT was; this restrained gradient gives rounded heads and pet
// masses a little volume without adding another hard detail:
//
//   sphere — an off-centre radial for heads and round masses: highlight
//            biased up toward screen RIGHT (the one light every mark in
//            docs/MODELS.md §10 answers to), falling away to a cool core
//            shadow at the lower-left rim.
// It is a stack of TRANSLUCENT neutral stops (GLINT/SHADE with opacity,
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
      {/* Ramps deepened a touch for the VC2 reference pass (2026-08-19):
          the reference's masses carry visibly soft value ramps under warm
          light. Still translucent, still subtle-by-rule — a figure shaded
          much softer than its sofa reads as pasted from another kit. */}
      <radialGradient id={`${id}-sph`} cx="0.62" cy="0.3" r="0.82">
        <stop offset="0" stopColor={GLINT} stopOpacity="0.17" />
        <stop offset="0.4" stopColor={GLINT} stopOpacity="0" />
        <stop offset="0.68" stopColor={SHADE} stopOpacity="0" />
        <stop offset="1" stopColor={SHADE} stopOpacity="0.28" />
      </radialGradient>
    </defs>
  );
}

/** Fill ref for the sphere gradient — pass the same id given to VolumeDefs. */
export const sphereFill = (id) => `url(#${id}-sph)`;
