// @vitest-environment node
// The wardrobe's PALETTE LINT — the mechanical half of the recolour
// guarantee. Every garment must paint only in: its two colour slots (the
// outfit style and `inner`), the shared light pair (SHADE form shadow /
// GLINT highlight), neutral #000/#fff for crevices and trims, and the fixed
// anchors (STITCH ochre, BRASS hardware). A literal mid-tone hex anywhere
// else is a colour the user's picker can clash with — the LPC "off-ramp
// colours break the recolour scripts" rule, enforced as a test instead of a
// script. (docs/CONTRIBUTING_ART.md explains the doctrine.)
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BRASS, GLINT, SHADE, STITCH } from "./body";
import { GARMENT_REGISTRY, Garment, GarmentCollar } from "./garments";

// Sentinel colours standing in for the user's picks.
const OUTFIT = "#123456";
const INNER = "#654321";
const CTX = { sh: 9, wa: 8, hem: 9, top: -44, bot: -27, waistY: -34 };
const ALLOWED = new Set(["none", "#000", "#fff", SHADE, GLINT, STITCH, BRASS, OUTFIT, INNER]);

const paintsOf = (markup) => {
  const found = [];
  for (const m of markup.matchAll(/(?:fill|stroke)="([^"]+)"/g)) found.push(m[1]);
  for (const m of markup.matchAll(/style="([^"]*)"/g)) {
    for (const p of m[1].matchAll(/(?:fill|stroke):\s*([^;"]+)/g)) found.push(p[1].trim());
  }
  return found;
};

describe("garment palette lint", () => {
  for (const [kind, entry] of Object.entries(GARMENT_REGISTRY)) {
    it(`${kind} paints only colour slots, anchors and translucent overlays`, () => {
      for (const view of ["front", "back", "side"]) {
        const markup = renderToStaticMarkup(
          <svg>
            <Garment kind={kind} {...CTX} inner={INNER} outfit={{ fill: OUTFIT }} view={view} />
          </svg>
        );
        for (const paint of paintsOf(markup)) {
          expect(ALLOWED.has(paint), `${kind}/${view} paints ${paint}`).toBe(true);
        }
      }
      if (entry.collar) {
        const markup = renderToStaticMarkup(
          <svg>
            <GarmentCollar kind={kind} headY={-58} torsoY={-44} outfit={{ fill: OUTFIT }} />
          </svg>
        );
        for (const paint of paintsOf(markup)) {
          expect(ALLOWED.has(paint), `${kind}/collar paints ${paint}`).toBe(true);
        }
      }
    });
  }
});
