// @vitest-environment node
// The ART SHEET's fixture generator — the owner's design-review tool, not a
// test of behaviour. Skipped in every normal run; `npm run art` sets
// SHEET_DIR and drives it (see scripts/art-sheet.mjs), rendering the whole
// character wardrobe — every hairstyle in all three facings, every top,
// coat, bottom, shoe and hat, plus the pets — to one SVG file each, which
// the script then lays out as a browsable contact sheet.
//
// This is HOW ARTWORK GETS JUDGED here (docs/CONTRIBUTING_ART.md): edit a
// registry entry, `npm run art`, refresh the sheet. Rendering the set side
// by side is what has caught every dud so far — two styles sharing one
// silhouette, a fringe reading as a blindfold, soles that were just circles.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import { ISO_SPRITES } from "./IsoItems";
import { BUNNY_COATS, CAT_COATS, DOG_BREEDS } from "../lib/isoRoom";
import {
  COATS,
  DEFAULT_CHARACTER,
  GLASSES,
  HAIR_STYLES,
  HATS,
  OUTFITS,
  PANTS,
  SCARVES,
  SHOES,
} from "../lib/profile";

const DIR = globalThis.process?.env?.SHEET_DIR;

describe.skipIf(!DIR)("art sheet fixtures", () => {
  it("renders the whole wardrobe to SVG files", () => {
    mkdirSync(DIR, { recursive: true });
    const Resident = ISO_SPRITES.resident;
    const Cat = ISO_SPRITES.cat;
    const Dog = ISO_SPRITES.dog;
    let count = 0;
    const save = (name, node, viewBox = "-32 -60 64 78") => {
      writeFileSync(
        `${DIR}/${name}.svg`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${renderToStaticMarkup(node)}</svg>`
      );
      count += 1;
    };
    const dressed = (extra) => ({ ...DEFAULT_CHARACTER, ...extra });
    for (const { key } of HAIR_STYLES) {
      save(`hair-front-${key}`, <Resident character={dressed({ hair: key })} />);
      // A light colourway too — the texture pass (flow lines, notch wedges,
      // sheen band) is tuned on near-black hair at your peril.
      save(
        `hair-front-${key}-oak`,
        <Resident character={dressed({ hair: key, hairColor: "#9a6b46" })} />
      );
      save(`hair-side-${key}`, <Resident character={dressed({ hair: key })} facing="side" />);
      save(`hair-back-${key}`, <Resident character={dressed({ hair: key })} facing="back" />);
    }
    // Tops and coats render in THREE colourways — the marks live on these
    // two slots, and a mark tuned on the default mid green can vanish on a
    // near-black or a cream pick. Single-colourway review is exactly how the
    // first too-faint set shipped.
    const WAYS = { dark: "#33305e", light: "#e7dcc7", mid: null };
    for (const { key } of OUTFITS) {
      for (const [way, hex] of Object.entries(WAYS)) {
        save(
          `top-${key}-${way}`,
          <Resident character={dressed({ garment: key, ...(hex ? { outfit: hex } : {}) })} />
        );
      }
    }
    for (const { key } of COATS) {
      for (const [way, hex] of Object.entries(WAYS)) {
        save(
          `coat-${key}-${way}`,
          <Resident character={dressed({ garment: "tee", coat: key, coatColor: hex || "#a05555" })} />
        );
      }
    }
    for (const { key } of PANTS) {
      save(`pants-${key}`, <Resident character={dressed({ pants: key })} />);
      save(`pants-side-${key}`, <Resident character={dressed({ pants: key })} facing="side" />);
    }
    for (const { key } of SHOES) {
      save(`shoes-${key}`, <Resident character={dressed({ shoes: key, shoeColor: "#8e3a3f" })} />);
      save(
        `shoes-side-${key}`,
        <Resident character={dressed({ shoes: key, shoeColor: "#8e3a3f" })} facing="side" />
      );
    }
    for (const { key } of HATS) {
      save(`hat-${key}`, <Resident character={dressed({ hat: key })} />);
    }
    for (const { key } of SCARVES) {
      save(`scarf-${key}`, <Resident character={dressed({ scarf: key })} />);
      save(`scarf-${key}-side`, <Resident character={dressed({ scarf: key })} facing="side" />);
    }
    for (const { key } of GLASSES) {
      save(`glasses-${key}`, <Resident character={dressed({ glasses: key })} />);
      save(`glasses-${key}-side`, <Resident character={dressed({ glasses: key })} facing="side" />);
    }
    // Every coat and breed, every pose — a pattern that only works on the
    // barrel but not the curl is exactly what side-by-side review catches.
    for (const look of CAT_COATS.map((c) => c.key)) {
      for (const f of ["side", "front", "back"]) {
        save(`cat-${look}-${f}`, <Cat awake facing={f} look={look} />, "-44 -48 88 62");
      }
      save(`cat-${look}-held`, <Cat held look={look} />, "-44 -48 88 62");
      save(`cat-${look}-asleep`, <Cat look={look} />, "-44 -48 88 62");
    }
    for (const look of DOG_BREEDS.map((b) => b.key)) {
      for (const f of ["side", "front", "back"]) {
        save(`dog-${look}-${f}`, <Dog awake facing={f} look={look} />, "-44 -48 88 62");
      }
      save(`dog-${look}-held`, <Dog held look={look} />, "-44 -48 88 62");
      save(`dog-${look}-asleep`, <Dog look={look} />, "-44 -48 88 62");
    }
    const Bunny = ISO_SPRITES.bunny;
    for (const look of BUNNY_COATS.map((b) => b.key)) {
      save(`bunny-${look}-awake`, <Bunny awake look={look} />, "-44 -48 88 62");
      save(`bunny-${look}-asleep`, <Bunny look={look} />, "-44 -48 88 62");
    }
    expect(count).toBeGreaterThan(0);
  });
});
