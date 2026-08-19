# Modelling roadmap — how the characters get to "actually 3D"

Written 2026-08-19, from a research pass over three candidate pipelines. The
owner's goal: models that look **3D, cohesive, and normal** — and openness to
"actual modelling instead of just formatting with CSS", thinking long-term.
This file is the decision record; docs/MODELS.md stays the authority on how
today's models are drawn.

## Where we are

The characters are parametric SVG: a body rig (`lib/body.js` numbers,
`character/` artwork), registries for hair/garments/hats/scarves, and a
CSS-keyframe animation substrate that survives the scene's 1Hz re-render.
Three facts about this system constrain every pipeline choice:

1. **The customization space is effectively infinite.** ~575k discrete
   silhouette combinations, times three CONTINUOUS body sliders
   (width/height/torso), times six independent user-picked hex colour
   channels with luminance-adaptive shading (`toneFor`) and derived far-limb
   colours (`farColor`).
2. **Animation is structural.** Up to six nested CSS-animation wrappers per
   figure animate SUB-PARTS (per-limb stride clocks, head-only gestures, the
   held-pose dangle with a mug riding inside an arm group). Anything that
   flattens the figure to an image loses all of it.
3. **The camera is viewBox math** — any raster asset blurs on zoom. The
   repo already paid for this lesson once: the Kenney PNG furniture renders
   were removed (see IsoItems.jsx's header) for exactly this plus the
   tint problem.

## The three options, evaluated

### A. Richer SVG modelling — SHIPPED (2026-08-19)
Soft-volume gradients over the existing rigs: `character/volume.jsx` defines
a sphere (heads, pet masses) and a cylinder (torsos) as stacks of translucent
GLINT/SHADE stops — recolour-safe by construction, GPU paint servers with no
per-frame cost. The hard cel marks stay; gradient + crescent together is what
reads as modelled. **The guardrail: deltas stay subtle** (the furniture is
deliberately flat three-tone, and a figure shaded much softer than its sofa
reads as pasted from another kit — the §10 cohesion rule, in reverse).
**Never SVG filters** (feGaussianBlur etc.): they force per-frame
re-rasterization under animation, the exact CPU bill the memo'd scene avoids.
Ceiling: excellent 2D. It will never read as *rendered*.

### B. Pre-rendered 3D sprites — RULED OUT
Blender-rendered sprite sheets fail every constraint at once: the continuous
sliders can't re-derive raster anchors (disqualifying on its own), faithful
6-channel hex recolour on rasters means rebuilding a renderer at runtime,
per-limb CSS animation dies, and the viewBox camera blurs every raster — the
Kenney lesson at 100× the asset count. Do not revisit.

### C. Runtime 3D (three.js / react-three-fiber) — THE LONG-TERM PATH
Everything hard about A and B is natural here: recolour is
`material.color.set(hex)`, the sliders map to bone scales (continuous by
nature), skeletal animation replaces six keyframe classes with one walk clip
that works at ANY angle, and wardrobe pieces are mesh swaps (~54 assets,
comparable to today's registry count). A toon gradient-map shader in the §10
palette keeps the look.

**The killer problem is the hybrid seam**: the room is ONE svg depth-sorted
by paint order; a WebGL character layered over it breaks the moment anyone
walks behind a sofa. Every workaround (foreignObject, render-to-texture,
GL depth proxies for 150 furniture items) is bad. So "characters-only 3D" is
a waystation — the stable end state is the WHOLE scene in one WebGL canvas:
furniture as the existing SVG art rasterized to billboard quads (2:1
dimetric maps 1:1 onto an orthographic camera; `project()` already is one),
depth from the same front-corner sort written to z, characters as true
meshes. Ports required: painted-pixel hit-testing → raycasting, `applyHeld`
→ per-frame ref writes, `--phase` desync → per-instance time offsets,
`prefers-reduced-motion` by hand. Bundle: ~200KB gzip (fine for a desktop
app). WebView2 does WebGL2; SwiftShader fallback is a small support risk.

Effort, honestly: **20–40 days after a successful spike.** It re-platforms
the app's most-loved layer; commit only with the seam proven.

## The gate: a 3–5 day throwaway spike

Before any commitment, build an offline spike page (not wired into the app):

- One R3F canvas, orthographic camera byte-matching `project()` from lib/iso.js
- One low-poly character blockout with:
  1. toon gradient-map shader in the SHADE/GLINT palette
  2. live hex recolour on 3 channels
  3. width/height sliders driven by bone scale
  4. one walk clip
  5. two furniture sprites rasterized to billboards at two depths, with the
     character walking BETWEEN them
- Screenshot it beside the real room.

**Pass/fail is one question, answered by the owner's eye: does the mesh sit
in the same world as the SVG furniture?** If yes → plan the full migration.
If no → Option A was the ceiling, and it has already shipped.
