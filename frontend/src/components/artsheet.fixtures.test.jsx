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
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import FocusWidget from "./FocusWidget";
import { ISO_SPRITES } from "./IsoItems";
import IsoRoom from "./IsoRoom";
import Cottage from "./Cottage";
import { PRESETS, presetPlacements } from "../lib/room";
import { resolveVisitRoom } from "../lib/visiting";
import { CHARACTER_PRESETS } from "../lib/characterPresets";
import { BUNNY_COATS, CAT_COATS, DOG_BREEDS, ISO_ITEMS, ISO_ITEM_GROUPS, freeSeatSpot, isoPresetLayout, seatFor, seatedPlacement } from "../lib/isoRoom";
import { project } from "../lib/iso";
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
    const widgetCss = readFileSync("src/index.css", "utf8").split("/* Widget mode is one composed surface")[1];
    const widgetBase = { clock: "18:42", running: true, task: "Sketch the next chapter", progress: .25,
      round: 2, rounds: 4, today: 42, goal: 90, canFinish: true };
    for (const [name, props] of Object.entries({ focus: {}, break: { inBreak: true, clock: "04:30", progress: .1 }, stopwatch: { stopwatch: true, clock: "1:04:12", rounds: 0 }, idle: { running: false, canFinish: false, clock: "25:00", progress: 0 } })) {
      writeFileSync(`${DIR}/../widget-${name}.html`, `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}p{margin:0}button{font:inherit;border:0;background:transparent;cursor:pointer} :root{--color-rose:186 119 152} /* Widget mode is one composed surface${widgetCss}</style>${renderToStaticMarkup(<FocusWidget {...widgetBase} {...props} />)}`);
    }
    for (const [key, preset] of Object.entries(PRESETS)) {
      const cottage = renderToStaticMarkup(<Cottage preview reduceMotion setting={preset.setting || "city"} room={presetPlacements(key)} timeOfDay={key === "seaside" || key === "greenhouse" ? "day" : "night"} />);
      writeFileSync(`${DIR}/cottage-${key}.svg`, cottage.slice(cottage.indexOf("<svg"), cottage.lastIndexOf("</svg>") + 6)
        .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '));
    }
    const Resident = ISO_SPRITES.resident;
    const Cat = ISO_SPRITES.cat;
    const Dog = ISO_SPRITES.dog;
    let count = 0;
    const save = (name, node, viewBox = "-32 -72 64 90") => {
      writeFileSync(
        `${DIR}/${name}.svg`,
        renderToStaticMarkup(
          <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox}
            style={{ "--color-rose": "209 137 152", "--color-blush": "222 181 188",
              "--color-petal": "232 222 224" }}>
            {node}
          </svg>
        )
      );
      count += 1;
    };
    const dressed = (extra) => ({ ...DEFAULT_CHARACTER, ...extra });
    // The full catalog, including items absent from every preset. Reuse the
    // scene's actual paint definitions so screens, glass and water review as
    // they do in the app, rather than silently rendering black in isolation.
    const roomMarkup = renderToStaticMarkup(<IsoRoom size={{ w: 4, d: 4 }} placements={[]}
      saveView={false} reduceMotion timeOfDay="day" />);
    const defs = roomMarkup.match(/<defs>([\s\S]*?)<\/defs>/)[1];
    const inventory = [];
    for (const [key, item] of Object.entries(ISO_ITEMS)) {
      const Sprite = ISO_SPRITES[key];
      const [w, d] = item.foot;
      const left = project(0, d).x - 16;
      const right = project(w, 0).x + 16;
      const top = -(item.wall ? 128 : item.hitH + 18);
      const bottom = project(w, d).y + 16;
      const viewBox = `${left} ${top} ${right - left} ${bottom - top}`;
      const views = item.backView ? [false, true] : [false];
      for (const back of views) {
        save(`catalog-${key}-${back ? "back" : "front"}`, <>
          <defs dangerouslySetInnerHTML={{ __html: defs }} />
          <Sprite back={back} character={DEFAULT_CHARACTER} />
        </>, viewBox);
      }
      inventory.push({ key, label: item.label, group: ISO_ITEM_GROUPS.find((g) => g.keys.includes(key))?.label || "Other",
        views: views.length, foot: item.foot, height: item.hitH });
    }
    writeFileSync(`${DIR}/../catalog.json`, JSON.stringify(inventory, null, 2));
    // Face and lap pose review: skin contrast, accessories and body extremes
    // belong in the same sheet as the authored outfits.
    for (const [name, extra] of Object.entries({
      light: { skin: "#f0cfb4", hair: "bob", hairColor: "#e7dcc7", model: "fem", width: 6.2, height: 26 },
      dark: { skin: "#774c37", hair: "buzz", model: "masc", width: 8.4, height: 32 },
      glasses: { skin: "#b47c55", hair: "long", glasses: "round", hat: "headphones", garment: "blouse", coat: "blazer" },
      winter: { skin: "#8d5524", hat: "trapper", coat: "puffer", expression: "sleepy" },
    })) {
      save(`model-${name}-front`, <Resident character={dressed(extra)} />);
      save(`model-${name}-lap`, <Resident character={dressed(extra)} seated seatH={22} />, "-32 -45 64 85");
    }
    // Review the authored combinations as combinations too. Individual
    // garment sheets cannot catch a scarf hiding a lapel or headphones
    // erasing the hairstyle that made a preset coherent.
    for (const preset of CHARACTER_PRESETS) {
      save(`preset-${preset.key}-front`, <Resident character={preset.character} />);
      save(
        `preset-${preset.key}-seated`,
        <Resident character={preset.character} seated seatH={19} />,
        "-32 -60 64 100"
      );
      save(`preset-${preset.key}-back`, <Resident character={preset.character} facing="back" />);
      for (const facing of ["front", "back"]) {
        for (const activity of ["idle", "focus", "break"]) {
          save(`seated-look-${preset.key}-${facing}-${activity}`,
            <Resident character={preset.character} facing={facing} activity={activity}
              seated seatH={19} />, "-32 -48 64 85");
        }
      }
    }
    for (const { key: pants } of PANTS) {
      for (const model of ["masc", "fem"]) {
        save(`seated-${pants}-${model}`, <Resident character={dressed({ pants, model, trouser: "#a86d91" })} seated seatH={19} />, "-32 -60 64 100");
      }
    }
    for (const pants of ["jeans", "jorts", "dress", "maxi"]) {
      for (const [width, height] of [[6.2, 26], [8.4, 32]]) {
        for (const facing of ["front", "back", "side"]) {
          save(`fit-${pants}-${width}-${facing}`, <Resident facing={facing} seated seatH={22}
            character={dressed({ pants, width, height, trouser: "#b39277" })} />, "-32 -60 64 100");
        }
      }
    }
    for (const key of ["chair", "deskchair", "armchair", "sofa", "bed", "wardrobe", "dresser", "bookshelf"]) {
      const Sprite = ISO_SPRITES[key];
      save(`furniture-${key}`, <Sprite />, "-80 -120 160 165");
    }
    // Fabric and shelf depth must survive both light and dark user tints.
    for (const key of ["bed", "sofa", "armchair", "chair", "deskchair", "bench", "bookshelf", "monstera"]) {
      const Sprite = ISO_SPRITES[key];
      for (const [tone, color] of Object.entries({ sage: "#799a8c", dark: "#342b45", cream: "#e8d7b9" })) {
        for (const back of [false, true]) {
          if (back && !ISO_ITEMS[key].backView) continue;
          save(`material-${key}-${tone}-${back ? "back" : "front"}`,
            <g style={{ "--tint": color }}><Sprite back={back} /></g>, "-80 -105 160 150");
        }
      }
    }
    // Review furniture contact using the same anchor, seat height and facing
    // resolver as the room. Front/rear body extremes expose arm and backrest
    // occlusion that an empty chair or an isolated resident cannot show.
    for (const key of ["armchair", "sofa", "deskchair", "bench"]) {
      const Sprite = ISO_SPRITES[key];
      for (const back of [false, true]) {
        const chair = { id: "seat", item: key, gx: 0, gy: 0, rot: back ? 2 : 0 };
        const anchor = seatedPlacement({ item: "resident" }, { placement: chair, height: ISO_ITEMS[key].seat });
        const point = project(anchor.gx, anchor.gy);
        for (const [body, character] of Object.entries({
          slim: dressed({ model: "fem", width: 6.2, height: 26, coat: "cardigan", coatColor: "#e8d7b9", hair: "long", pants: "maxi" }),
          wide: dressed({ model: "masc", width: 8.4, height: 32, skin: "#774c37", coat: "puffer", coatColor: "#342b45", pants: "jeans" }),
        })) {
          for (const activity of ["idle", "focus", "break"]) {
            const furniture = <g style={{ "--tint": "#799a8c" }}><Sprite back={back} /></g>;
            const person = <g transform={`translate(${point.x},${point.y - anchor._seat})`}>
              <Resident seated seatH={anchor._seat} character={character} facing={anchor._facing} activity={activity === "idle" ? null : activity} />
            </g>;
            save(`seating-${key}-${back ? "back" : "front"}-${body}-${activity}`,
              <>{back ? person : furniture}{back ? furniture : person}</>, "-45 -80 90 105");
          }
        }
      }
    }
    for (const pants of ["skirt", "pleats", "maxi"]) {
      for (const [way, trouser] of Object.entries({ dark: "#33305e", light: "#e7dcc7" })) {
        for (const seatH of [4, 22]) {
          save(`drape-${pants}-${way}-${seatH}`, <Resident seated seatH={seatH}
            character={dressed({ pants, model: "fem", trouser })} />, "-32 -60 64 100");
        }
      }
    }
    // Rear hair must read on a chair as well as standing. Keep the skin,
    // wardrobe and hair contrast cases visible together during art review.
    for (const hair of ["bob", "long"]) {
      for (const model of ["masc", "fem"]) {
        for (const hairColor of ["#3a3142", "#9a6b46", "#e7dcc7"]) {
          save(`rear-${hair}-${model}-${hairColor.slice(1)}`,
            <Resident character={dressed({ hair, model, hairColor })} facing="back" seated seatH={19} />);
        }
      }
    }
    const { layout, personas, guestId } = resolveVisitRoom(
      { id: 1, username: "luna", displayName: "Luna", room: null, character: null },
      { character: dressed({ hair: "long" }), name: "You" }
    );
    // Rotate only the fixture's guest chair to review rear hair behind a
    // real backrest; the preset catalog stays untouched.
    const guestSeat = seatFor(layout.placements.find((p) => p.id === guestId), layout.placements);
    if (guestSeat && !guestSeat.soft) guestSeat.placement.rot = 2;
    const scene = renderToStaticMarkup(
      <IsoRoom size={layout} placements={layout.placements} personas={personas}
        saveView={false} reduceMotion timeOfDay="sunset" />
    );
    // IsoRoom includes its positioning div; the exported asset is SVG only.
    writeFileSync(`${DIR}/scene-visit.svg`, scene.slice(scene.indexOf("<svg"), scene.lastIndexOf("</svg>") + 6)
      .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '));
    for (const key of ["loft", "home"]) {
      const room = isoPresetLayout(key);
      const presetScene = renderToStaticMarkup(
        <IsoRoom size={room} placements={room.placements} saveView={false} reduceMotion timeOfDay="day" />
      );
      writeFileSync(`${DIR}/scene-${key}.svg`, presetScene.slice(presetScene.indexOf("<svg"), presetScene.lastIndexOf("</svg>") + 6)
        .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '));
    }
    // Real furniture, occlusion and seat heights: the same wardrobe test in
    // a furnished room, with no changes to the shipped preset placements.
    for (const pants of ["skirt", "pleats", "maxi", "jeans", "jorts", "dress"]) {
      const room = isoPresetLayout("loft");
      const personas = {};
      for (let i = 0; i < 3; i += 1) {
        const spot = freeSeatSpot(room.placements);
        if (spot) {
          const id = `review-${i}`;
          room.placements.push({ id, item: "resident", ...spot });
          personas[id] = { character: dressed({ pants, model: "fem", trouser: "#a86d91" }) };
        }
      }
      const scene = renderToStaticMarkup(<IsoRoom size={room} placements={room.placements}
        personas={personas}
        saveView={false} reduceMotion timeOfDay="day" />);
      writeFileSync(`${DIR}/scene-wardrobe-${pants}.svg`, scene.slice(scene.indexOf("<svg"), scene.lastIndexOf("</svg>") + 6)
        .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '));
    }
    // Pose review belongs beside wardrobe review: this catches a bed model
    // drifting back into a generic blanket/body that ignores customization.
    save(
      "pose-lying",
      <Resident character={dressed({ hair: "bob", garment: "sweater" })} lying />,
      "-48 -50 96 88"
    );
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
    // Swimwear is the one top whose cut is model-aware, so the default masc
    // wardrobe loop is only half its artwork. Keep the fem cut on the sheet
    // in the same three stress-test colours.
    for (const [way, hex] of Object.entries(WAYS)) {
      save(
        `top-swim-fem-${way}`,
        <Resident character={dressed({ model: "fem", garment: "swim", ...(hex ? { outfit: hex } : {}) })} />
      );
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
      save(`hat-${key}-side`, <Resident character={dressed({ hat: key })} facing="side" />);
      save(`hat-${key}-seated`, <Resident character={dressed({ hat: key })} seated seatH={22} />);
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
