# Contributing artwork (for the owner)

How to design or fix a character piece yourself — a hairstyle, a garment, a
shoe, a hat — without needing anyone to translate for you. The character is
parametric SVG, so every piece is a small function returning shapes; this
page gives you the coordinate system, the entry format, and the review loop.

## The loop

```bash
cd frontend
npm run art          # renders EVERY piece to art-sheet/index.html
```

Open `frontend/art-sheet/index.html` in a browser. Edit a registry entry,
run `npm run art` again, refresh the tab. Judge pieces **side by side with
the whole set** — that is how every dud so far was caught (two styles
sharing a silhouette, a fringe reading as a blindfold, shoes that were just
circles). Never judge one piece alone.

To see a piece in the real app afterwards: `npm run dev` + the backend, then
Profile → the tab it lives in.

## Where each thing lives

| Piece | Catalog (name, label) | Artwork (the drawing) |
| --- | --- | --- |
| Hairstyle | `src/lib/profile.js` → `HAIR_STYLES` | `src/components/character/hair.jsx` → `HAIR_REGISTRY` |
| Top | `profile.js` → `OUTFITS` | `character/garments.jsx` → `GARMENT_REGISTRY` |
| Coat | `profile.js` → `COATS` | same registry (colours rewired by `Coat`) |
| Bottoms | `profile.js` → `PANTS` | `character/body.jsx` → `PANTS_FORM` + the leg drawings |
| Shoes | `profile.js` → `SHOES` | `character/body.jsx` → `FrontShoe` / `SideShoe` |
| Hat | `profile.js` → `HATS` | `character/hats.jsx` → `HAT_REGISTRY` |

A piece must exist in BOTH its catalog and its registry — tests pin the two
key sets against each other, so forgetting one side is a failing test, not a
silent bug.

## The coordinate system (draw over this)

Everything is drawn in "figure space": **y grows downward, x = 0 is the
body's centre line**. Paste this into any SVG editor (Figma, Inkscape,
even a text editor) and draw over it:

```svg
<svg viewBox="-32 -60 64 78" xmlns="http://www.w3.org/2000/svg">
  <line x1="-32" y1="12.3" x2="32" y2="12.3" stroke="#888"/>   <!-- floor -->
  <circle cx="0" cy="-47" r="7.3" fill="#edc39e"/>             <!-- head -->
  <rect x="-9" y="-32" width="18" height="17" fill="#7faf8f"/> <!-- torso, roughly -->
  <line x1="0" y1="-60" x2="0" y2="14" stroke="#8884"/>        <!-- centre -->
</svg>
```

Key numbers (all in `src/lib/body.js`):

- Head: radius **7.3**, centred at `(0, headY)` — hair and hats receive
  `headY` and draw relative to it, so never hard-code a head position.
- Hair stands **1.2px off the skull** (`HAIR_LIFT`) — hair drawn on the
  head's own radius reads as a decal, not a layer.
- Torso: garments receive `sh / wa / hem` (shoulder, waist, hem half-widths)
  and `top / bot / waistY` — use them, never fixed widths, so your garment
  fits every body-slider combination.
- Feet: the floor is at **y ≈ 2.7** in leg space; shoes are drawn around a
  foot centre `cx`.
- The profile faces **-x** (the mirror handles the other direction).

## The rules that make a piece good here

Read `docs/MODELS.md` §9–10 for the full versions. The short list:

1. **A slot must change the OUTLINE or carry one distinct mark.** At 57px a
   recoloured tee and a recoloured sweater are the same sprite.
2. **One silhouette, carved — never pieces glued on a cap** (hair). Back
   masses go in the shadow tone (`farColor`). A carved wig then takes the
   TEXTURE PASS via the `wig()` helper: notch shadow wedges + 2–3 unequal
   flow lines + the notched crown band — you tune `lean`/`lines`, never
   redraw the marks. Coily styles use C-arc curl marks; gathered ones stay
   matte with tension lines.
3. **At most ~3 interior marks** per piece. More reads as noise at room scale.
4. **Two materials beat two tones**: the shoe soles are fixed light rubber
   under a coloured upper — that split is what reads as "modelled". `STITCH`
   (ochre topstitch) and `BRASS` (buckles) are the same idea — tiny fixed
   anchors the tint never touches.
5. **You don't draw the lighting — the assembly does.** One light (above,
   slightly in front, screen right) casts a form shadow, a lit shoulder and
   the hem shadow over WHATEVER a garment draws. Your entry only adds its
   signature marks, plus three optional fields: `finish: {shade, glint}`
   (matte knit vs sheeny nylon), `cuffs: true`, `drape: true` (cloth that
   hangs past the hem).
6. **Overlay paints come from `character/body.jsx`**: `SHADE` (cool dark)
   for form shadow, `GLINT` (warm light) for shine, plain `#000` for
   crevices (pocket mouths, under-hem bands). Never a literal mid-tone hex —
   `palette.test.jsx` fails the build if a garment paints outside the
   allowed set, so a bad colour is a red test, not a shipped bug.
7. **Folds are shadow WEDGES at real gather points, two per figure, max.**
   A taut plane at this size is smooth; if a piece feels flat, restyle its
   hem or opening instead of adding folds.

The sheet renders tops and coats in three colourways (mid, near-black,
cream) — judge your marks on all three, because a mark tuned on the default
green is invisible on navy.

## Adding a piece, start to finish (example: a new hairstyle "fluffy")

1. Catalog: add `{ key: "fluffy", label: "Fluffy" }` to `HAIR_STYLES`.
2. Artwork: add a `fluffy` entry to `HAIR_REGISTRY` with a `front` drawing
   (start by copying `short`'s entry and tuning `wigPath`'s numbers); add
   `side` if the generic profile wig doesn't say it, and `length`/
   `sideLength` if it hangs past the jaw.
3. `npm run art` — judge it against all nineteen others, all three facings.
4. `npx vitest run` — the registry/catalog and distinct-markup tests confirm
   it exists everywhere it must and draws its own geometry.

If you'd rather draw freehand: draw over the template above in an editor,
then paste the resulting `<path d="…">` data into the entry — the entry is
just a function returning SVG elements, and hand-drawn path data is as
legitimate as computed paths. Keep coordinates relative to `headY` (hair,
hats) or the passed-in torso metrics (garments).
