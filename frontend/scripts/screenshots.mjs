/**
 * Capture docs/screenshots/*.webp and docs/preview.png from the REAL app.
 *
 * Every shot is the running SPA talking to the Flask API — tasks and focus
 * sessions created through the actual endpoints, rooms applied by clicking the
 * same preset buttons a person would. Nothing here is mocked, which is the
 * whole point: a screenshot that can drift from the app is worse than none.
 * Character examples isolate the editor's actual SVG models: 600x800 single
 * portraits and 1600x1000 standing/seated sheets of every authored preset look.
 *
 * This script is COMMITTED on purpose. It had been rebuilt from scratch in a
 * throwaway scratchpad at least twice, and each rebuild re-learned the same
 * traps (below) the hard way.
 *
 *   # Run the backend against a THROWAWAY database, or the shots aren't
 *   # reproducible: focus sessions have no delete endpoint, so re-running
 *   # accumulates minutes and the daily-goal chip drifts (75/120m the first
 *   # time, 225/120m the third).
 *   #   set TASKNOOK_DB=%TEMP%\shots.db  &&  python backend/app.py
 *   # then the frontend (npm run dev) and a headless Chrome with a port:
 *   #   chrome --headless=new --remote-debugging-port=9333 --hide-scrollbars \
 *   #          --user-data-dir=<temp> about:blank
 *   node --experimental-websocket scripts/screenshots.mjs
 *   node --experimental-websocket scripts/screenshots.mjs 01 02 22   # a subset
 *
 * For a throwaway review pass, keep generated files out of `docs/` and point
 * at any production/dev server without editing this script:
 *   set TASKNOOK_SHOT_APP=http://localhost:5099
 *   set TASKNOOK_SHOT_DIR=art-sheet\preset-review
 *   # To retry a subset on that same throwaway database without adding time:
 *   set TASKNOOK_SHOT_SKIP_SEED=1
 *
 * `--experimental-websocket` is required on Node 20 (global WebSocket is
 * undefined without it); Node 22+ doesn't need the flag but tolerates it.
 *
 * Traps, each of which cost a session:
 *  - Chrome CACHES file:// and http:// aggressively. Every state change here
 *    goes through a reload with a fresh query string, never a bare reload.
 *  - `Page.enable` does NOT survive a navigation. Re-enable after every reload
 *    or captureScreenshot silently returns nothing.
 *  - Dock buttons carry no aria-label; their label is a <span> inside. Match on
 *    textContent, not attributes.
 *  - The camera view persists in localStorage (`tasknook.isoView`). Clear it or
 *    successive rooms inherit the previous room's zoom.
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { RESIZABLE_FURNITURE } from '../src/lib/furnitureDimensions.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const OUT_DIR = process.env.TASKNOOK_SHOT_DIR || join(REPO, "docs", "screenshots");
const PREVIEW = process.env.TASKNOOK_SHOT_PREVIEW ||
  (process.env.TASKNOOK_SHOT_DIR ? join(OUT_DIR, "preview.png") : join(REPO, "docs", "preview.png"));

const CDP = Number(process.env.TASKNOOK_SHOT_CDP || 9333);
const APP = process.env.TASKNOOK_SHOT_APP || "http://localhost:5173";
const W = Number(process.env.TASKNOOK_SHOT_WIDTH || 1600);
const H = Number(process.env.TASKNOOK_SHOT_HEIGHT || 1000);

const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a));

// Complete snapshots: switching looks must not inherit the last one's coat
// or accessories. These are saved through the same profile API as the editor.
const LOOKS = {
  study: { model: "fem", skin: "#a66f4a", hair: "locs", hairColor: "#302329", garment: "sweater", outfit: "#dfa85d", pants: "maxi", trouser: "#677e81", shoes: "maryjanes", eyeColor: "#405877", eyeX: 3.5, eyeY: 1.85, width: 7.8, height: 28 },
  casual: { model: "masc", skin: "#edc39e", hair: "curly", hairColor: "#824c32", garment: "tee", outfit: "#e7dcc7", coat: "cardigan", coatColor: "#608478", pants: "jeans", trouser: "#526884", glasses: "round", width: 8.2, height: 29 },
  winter: { model: "fem", skin: "#e8ad84", hair: "braids", hairColor: "#4d332c", garment: "turtleneck", outfit: "#ede0c9", coat: "puffer", coatColor: "#8e526c", pants: "trousers", trouser: "#5b526d", hat: "trapper", scarf: "wrapped", scarfColor: "#c9a24b", shoes: "boots", width: 7.4, height: 29 },
  garden: { model: "masc", skin: "#774c37", hair: "buzz", hairColor: "#302329", garment: "overalls", outfit: "#7e9369", inner: "#e4b16b", pants: "jorts", trouser: "#677b8e", shoes: "boots", width: 7, height: 29 },
  cafe: { model: "fem", skin: "#f0cfb4", hair: "bob", hairColor: "#b57248", garment: "shirt", outfit: "#f2e4ca", coat: "cardigan", coatColor: "#ad6678", pants: "pleats", trouser: "#5f7384", shoes: "loafers", width: 6.6, height: 26 },
  summer: { model: "masc", skin: "#b47c55", hair: "undercut", hairColor: "#47332d", garment: "swim", outfit: "#69a5aa", pants: "shorts", trouser: "#d3946b", hat: "straw", width: 7.8, height: 31 },
  maker: { model: "fem", skin: "#c08552", hair: "pigtails", hairColor: "#51362f", garment: "tank", outfit: "#d98a72", coat: "none", pants: "cargo", trouser: "#6f8063", shoes: "sandals", shoeColor: "#8e526c", width: 6.2, shoulders: -0.8, height: 26, torso: 14.5 },
};
const ROOM_LOOK = { "01": "casual", "02": "study", "03": "winter", "04": "study", "05": "cafe", "06": "garden", "07": "cafe", "08": "casual", "09": "garden", "28": "study", "30": "garden", "31": "winter", "32": "summer", "59": "winter" };
const CHARACTERS = [
  ["33", "character-study", "study", "Body"],
  ["34", "character-casual", "casual", "Outfit"],
  ["35", "character-winter", "winter", "Extras"],
  ["36", "character-garden", "garden", "Hair"],
  ["37", "character-presets", null, "Looks"],
  ["38", "character-presets-seated", null, "Looks"],
  ["42", "character-customization", "maker", "Outfit"],
];

async function setCharacter(page, look) {
  await page.evaluate(`(async () => {
    const response = await fetch('/api/profile', { method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('tasknook.token') },
      body: JSON.stringify({ character: ${JSON.stringify(LOOKS[look])} }) });
    if (!response.ok) throw new Error('character save failed: ' + response.status);
  })()`);
}

// --------------------------------------------------------------------------- //
// A very small CDP client — no dependency, so this can't rot with the toolchain
// --------------------------------------------------------------------------- //
async function connect() {
  const res = await fetch(`http://127.0.0.1:${CDP}/json/new?${encodeURIComponent("about:blank")}`, {
    method: "PUT",
  });
  const tab = await res.json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const errors = [];
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = () => j(new Error(`no Chrome on :${CDP} — start one with --remote-debugging-port=${CDP}`));
  });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Runtime.exceptionThrown")
      errors.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 200));
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  return { send, errors };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --------------------------------------------------------------------------- //
// The shot list. Each entry is { n, name, format?, setup(page) }.
// --------------------------------------------------------------------------- //
const ROOMS = [
  ["01", "loft-night", "Loft", { weather: "off", time: "night" }],
  ["02", "cozy-study", "Cozy study", { weather: "off", time: "day" }],
  ["03", "cozy-cabin", "Cozy cabin", { weather: "snow", time: "night" }],
  ["04", "reading-room", "Reading room", { weather: "off", time: "day" }],
  ["05", "corner-cafe", "Corner café", { weather: "off", time: "day" }],
  ["06", "secret-garden", "Secret garden", { weather: "off", time: "day" }],
  ["07", "terrace", "Terrace", { weather: "off", time: "sunset" }],
  ["08", "study-hall", "Study studio", { weather: "off", time: "day" }],
  ["09", "autumn-yard", "Autumn yard", { weather: "off", time: "sunset" }],
  ["28", "shared-home", "Shared home", { weather: "off", time: "sunset" }],
  ["30", "plant-shop", "Plant shop", { weather: "off", time: "day" }],
  ["31", "winter-yard", "Winter yard", { weather: "snow", time: "night" }],
  ["32", "poolside", "Poolside", { weather: "off", time: "day" }],
  ["59", "holiday-hearth", "Holiday hearth", { weather: "snow", time: "night" }],
];

// The weather set is deliberately ONE room in five conditions, so the only
// variable is the sky.
const WEATHER = [
  ["10", "rain-night", { weather: "rain", time: "night" }],
  ["11", "storm", { weather: "storm", time: "night" }],
  ["12", "snow-day", { weather: "snow", time: "day" }],
  ["13", "cloudy-sunset", { weather: "cloudy", time: "sunset" }],
  ["14", "clear-night", { weather: "off", time: "night" }],
];

// No 18: the Progress panel was dissolved (its goal config moved into Tasks and
// its history under the calendar's month grid), so `18-progress.webp` describes
// a panel that no longer exists and is deleted rather than recaptured.
const PANELS = [
  ["15", "tasks", "Tasks"],
  ["16", "focus-timer", null], // the HUD card, no panel to open
  ["17", "sounds", "Sounds"],
  ["19", "calendar", "Calendar"],
  ["20", "weather", "Weather"],
  ["21", "settings", "Settings"],
  ["22", "character", "Profile"],
  ["23", "room-panel", "Room"],
  ["26", "friends", "Friends"],
];

export { ROOMS, WEATHER, PANELS };

// --------------------------------------------------------------------------- //
// Page helpers
// --------------------------------------------------------------------------- //
function makePage(cdp) {
  const { send } = cdp;

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
    return r.result?.value;
  };

  /**
   * Navigate fresh. Cache-busted, Page/Runtime re-enabled afterwards, and then
   * POLLED until the app is actually up — a fixed sleep is what made the first
   * run of a clean Chrome profile fail with "NO TOKEN", because a first-ever
   * boot registers the account and reconciles the room before it settles.
   */
  const load = async (extra = {}) => {
    const qs = new URLSearchParams({ shot: String(Date.now()), ...extra });
    await send("Page.navigate", { url: `${APP}/?${qs}` });
    await sleep(300);
    await send("Page.enable");
    await send("Runtime.enable");
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      const ready = await evaluate(
        `!!localStorage.getItem('tasknook.token') &&
         [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Room')`
      ).catch(() => false);
      if (ready) break;
    }
    await sleep(2500); // intro-chrome fade + first room paint
  };

  const setStorage = (pairs) =>
    evaluate(
      `(() => { const p = ${JSON.stringify(pairs)}; for (const k in p) localStorage.setItem(k, p[k]); return 'ok'; })()`
    );

  /**
   * Click a button by its visible text. `exact` for dock items (whose labels
   * are unique words); substring otherwise, because preset and action buttons
   * carry an emoji in the same node — "Cozy study" is really "🕯️ Cozy study",
   * which an equality match silently misses.
   */
  /**
   * Click a button by visible text, POLLING until it appears.
   *
   * Fixed sleeps were the wrong tool: panels animate open, and the moment the
   * boot wait got faster every "click the preset" started racing the drawer and
   * reporting MISSING. Polling makes the script insensitive to that.
   */
  const clickText = (label, { exact = false, timeout = 8000 } = {}) =>
    evaluate(
      `(async () => {
        const want = ${JSON.stringify(label)};
        const exact = ${JSON.stringify(exact)};
        const deadline = Date.now() + ${timeout};
        while (Date.now() < deadline) {
          const all = [...document.querySelectorAll('button')];
          const el = exact
            ? all.find(b => b.textContent.trim() === want)
            : all.find(b => b.textContent.trim().toLowerCase().includes(want.toLowerCase()));
          if (el) { el.scrollIntoView({ block: 'center' }); el.click(); return 'ok'; }
          await new Promise(r => setTimeout(r, 200));
        }
        throw new Error('MISSING:' + want);
      })()`
    );

  // The drawer's close button is labelled "Close (Esc)", not "Close" — an
  // equality selector matched nothing and every "closed" shot kept its panel
  // sitting over the room.
  const closePanels = () =>
    evaluate(`document.querySelectorAll('button[aria-label^="Close"]').forEach(b => b.click()); 'ok'`);

  const screenPoint = (selector, mode = "center") => evaluate(`(() => {
    const selector = ${JSON.stringify(selector)};
    const node = document.querySelector(selector);
    if (!node) throw new Error('MISSING:' + selector);
    if (${JSON.stringify(mode)} === 'origin') {
      const point = node.ownerSVGElement.createSVGPoint();
      const screen = point.matrixTransform(node.getScreenCTM());
      return { x: screen.x, y: screen.y };
    }
    const box = node.getBoundingClientRect();
    if (${JSON.stringify(mode)} === 'visible') {
      // A seated body overlaps its chair, so the group's geometric centre can
      // belong to the furniture painted in front. Find a pixel that really
      // hit-tests to this placement.
      for (let y = box.top + 2; y < box.bottom; y += 3) {
        for (let x = box.left + 2; x < box.right; x += 3) {
          if (document.elementFromPoint(x, y)?.closest(selector) === node) return { x, y };
        }
      }
      throw new Error('NO VISIBLE HIT:' + selector);
    }
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  })()`);

  /** Carry the common-room guest with the same pointer gesture used in-app. */
  const dragCommonGuest = async (seatId) => {
    const from = await screenPoint('[data-common-person="you"]');
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed", x: from.x, y: from.y, button: "left", buttons: 1, clickCount: 1,
    });
    await sleep(150);
    const to = await screenPoint(`[data-drop-seat="${seatId}"]`, "origin");
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved", x: to.x, y: to.y, button: "left", buttons: 1,
    });
    await sleep(200);
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased", x: to.x, y: to.y, button: "left", buttons: 0, clickCount: 1,
    });
    await sleep(500);
    return evaluate(`document.querySelector('[data-common-person="you"]')?.getAttribute('data-seat')`);
  };

  /** Carry the home profile character to the centre of its actual landing
   * highlight. The cursor chooses the footprint centre, not its origin. */
  const dragSelfToItem = async (item) => {
    const from = await screenPoint('[data-item="you"]', "visible");
    const cursor = await evaluate(`document.querySelector('[data-item="you"]')?.style.cursor || null`);
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed", x: from.x, y: from.y, button: "left", buttons: 1, clickCount: 1,
    });
    await sleep(150);
    const to = await evaluate(`(async () => {
      const node = document.querySelector(${JSON.stringify(`[data-item="${item}"]`)});
      if (!node) throw new Error('Landing item missing');
      const origin = new DOMPoint(0, 0).matrixTransform(node.getScreenCTM());
      for (let attempt = 0; attempt < 40; attempt++) {
        const glow = [...document.querySelectorAll('polygon.room-breathe[fill="#ffe9b0"][stroke="#ffe9b0"]')].find(polygon => {
          const point = polygon.points.getItem(0);
          const screen = new DOMPoint(point.x, point.y).matrixTransform(polygon.getScreenCTM());
          return Math.hypot(screen.x - origin.x, screen.y - origin.y) < 1;
        });
        if (glow) {
          const box = glow.getBBox();
          const point = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2).matrixTransform(glow.getScreenCTM());
          return { x: point.x, y: point.y };
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Landing highlight missing');
    })()`);
    const before = { cursor, from, to };
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved", x: to.x, y: to.y, button: "left", buttons: 1,
    });
    await sleep(200);
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased", x: to.x, y: to.y, button: "left", buttons: 0, clickCount: 1,
    });
    await sleep(700);
    return evaluate(`({
      lying: !!document.querySelector('[data-item="you"] [data-resident-pose="lying"]'),
      tucked: !!document.querySelector('[data-item="you"] [data-bed-tuck-cover="true"]'),
      itemCount: document.querySelectorAll('[data-item="you"]').length,
      before: ${JSON.stringify(before)}
    })`);
  };

  const shot = async (file, format = "webp", capture = {}) => {
    // Standalone and resized room models render on demand. Never publish a loading
    // fallback merely because a fixed screenshot delay happened to expire.
    await evaluate(`(async () => {
      for (let i = 0; i < 200; i++) {
        const failed = document.querySelector('[data-model-state="error"]');
        if (failed) throw new Error('Model capture failed: ' + failed.dataset.catalogModel);
        if (!document.querySelector('[data-model-state="loading"]')) {
          const urls = [...new Set([...document.querySelectorAll('[data-catalog-model] image')].map(node => node.getAttribute('href')))];
          await Promise.all(urls.map(async url => { const image = new Image(); image.src = url; await image.decode(); }));
          await document.fonts.ready;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      throw new Error('Room models did not finish loading for capture');
    })()`);
    const r = await send("Page.captureScreenshot", {
      ...(format === "webp" ? { format: "webp", quality: 92 } : { format: "png" }),
      ...capture,
    });
    if (!r?.data) throw new Error(`empty capture for ${file}`);
    writeFileSync(file, Buffer.from(r.data, "base64"));
    return r.data.length;
  };

  return { evaluate, load, setStorage, clickText, closePanels, dragCommonGuest, dragSelfToItem, shot };
}

/**
 * Put YOU in the room, sitting where a person would actually sit.
 *
 * Add the saved profile character through the app's own seat selection.
 * Shared home's flatmate and the café customer keep their authored seats.
 * The profile's "In the room" toggle survives preset changes.
 */
async function seatResident(page) {
  // Use the actual toggle: the store chooses a legal free seat and inserts
  // `you`, which wears the saved profile. A generic `resident` does not.
  await page.closePanels();
  await page.clickText("Profile", { exact: true });
  await page.evaluate(`(async () => {
    for (let i = 0; i < 40; i++) {
      const label = [...document.querySelectorAll('label')].find(e => e.textContent.includes('In the room'));
      const input = label?.querySelector('input');
      if (input) { if (!input.checked) input.click(); return; }
      await new Promise(r => setTimeout(r, 200));
    }
    throw new Error('In the room toggle missing');
  })()`);
  await sleep(1800);
  await page.closePanels();
  return 'profile character seated by the app';
}

/** Open one exact catalog group without colliding with similarly named presets. */
async function openCatalogGroup(page, label) {
  await page.evaluate(`(async () => {
    const want = ${JSON.stringify(label)};
    const toggle = [...document.querySelectorAll('button')].find(
      button => button.textContent.includes('Browse by category'));
    if (!toggle) throw new Error('Furniture catalog toggle missing');
    if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click();

    let button = null;
    for (let i = 0; i < 20; i++) {
      button = [...document.querySelectorAll('button')].find(candidate =>
        [...candidate.querySelectorAll('span')].some(
          span => span.children.length === 0 && span.textContent.trim() === want));
      if (button) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!button) throw new Error(want + ' catalog group missing');
    if (button.getAttribute('aria-expanded') !== 'true') button.click();
    for (let i = 0; i < 20; i++) {
      if (button.getAttribute('aria-expanded') === 'true') {
        button.scrollIntoView({ block: 'start' });
        return 'ok';
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(want + ' catalog group did not expand');
  })()`);
}

/** Tasks, groups and focus time — the content every shot shares. */
async function seed(page) {
  const out = await page.evaluate(`(async () => {
    const token = localStorage.getItem('tasknook.token');
    if (!token) return 'NO TOKEN';
    const h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
    const existing = await (await fetch('/api/tasks', { headers: h })).json();
    for (const t of existing) await fetch('/api/tasks/' + t.id, { method: 'DELETE', headers: h });

    const add = (name, group, duration, priority) =>
      fetch('/api/tasks', { method: 'POST', headers: h,
        body: JSON.stringify({ name, group, duration, priority, routine: group === 'Routines' }) }).then(r => r.json());

    await add('Finish the release notes', 'Today', 45, 'high');
    await add('Sketch the café layout', 'Today', 30, 'medium');
    await add('Water the monstera', 'Routines', 5, 'low');
    await add('Tidy the desk', 'Routines', 10, 'low');
    await add('Read a chapter', 'Someday', 25, 'medium');
    const done = await add('Review the pull request', 'Someday', 20, 'medium');
    // PUT, not PATCH: the task route is a PUT and a PATCH 405s, which fetch
    // reports as a resolved response — so the "one task already ticked" in
    // every shot silently didn't happen and the list read 0/6.
    await fetch('/api/tasks/' + done.id, { method: 'PUT', headers: h,
      body: JSON.stringify({ completed: true }) });

    // Focus time so the goal chip and the calendar aren't empty.
    for (const [m, n] of [[45, 'Finish the release notes'], [30, 'Sketch the café layout']])
      await fetch('/api/sessions', { method: 'POST', headers: h,
        body: JSON.stringify({ minutes: m, taskName: n }) });

    localStorage.setItem('tasknook.taskGroups', JSON.stringify(['Today', 'Routines', 'Someday']));
    localStorage.setItem('tasknook.dailyGoal', '120');
    // Relationship hearts need visibly different fill states in social-room
    // captures, or the screenshots only exercise the empty-heart baseline.
    localStorage.setItem('tasknook.friendship', JSON.stringify({
      luna: 320, kai: 160, sora: 80, mochi: 25
    }));
    return 'seeded';
  })()`);
  return out;
}

// --------------------------------------------------------------------------- //
/** Closeups of the exact SVG models rendered by the editor. Extract the
 * complete drawing, then render it at capture resolution; cropping the tiny
 * preview out of a full-app bitmap would only enlarge blurry pixels.
 */
async function modelShot(cdp, page, file, presets) {
  const models = await page.evaluate(`(() => {
    const buttons = [...document.querySelectorAll('[aria-label="Character looks"] > button')];
    const sources = ${presets} ? buttons.map(button => ({
      svg: button.querySelector('svg'), label: button.querySelector('span > span')?.textContent.trim()
    })) : [{ svg: document.querySelector('svg[aria-label^="Front view of your character"]'), label: '' }];
    if (!sources.length || sources.some(source => !source.svg) || (!${presets} && sources.length !== 1))
      throw new Error('Character closeup sources missing');
    return sources.map(({svg, label}) => {
      const bounds = svg.getBBox();
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.removeAttribute('class'); clone.removeAttribute('style');
      return { svg: clone.outerHTML, label,
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } };
    });
  })()`);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: presets ? 1600 : 600, height: presets ? 1000 : 800, deviceScaleFactor: 1, mobile: false,
  });
  const columns = presets ? Math.min(5, Math.ceil(models.length / 2)) : 1;
  const rows = Math.ceil(models.length / columns);
  await page.evaluate(`(() => {
    const models = ${JSON.stringify(models)};
    const left = Math.min(...models.map(model => model.bounds.x)) - 5;
    const top = Math.min(...models.map(model => model.bounds.y)) - 5;
    const right = Math.max(...models.map(model => model.bounds.x + model.bounds.width)) + 5;
    const bottom = Math.max(...models.map(model => model.bounds.y + model.bounds.height)) + 5;
    const stage = document.createElement('main');
    // Pin the review sheet to the viewport. Clicking a preview control inside
    // the right-hand drawer can leave the document horizontally scrolled;
    // a normal-flow stage inherited that offset and clipped the first caption.
    stage.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;padding:36px;box-sizing:border-box;background:#eee7de;display:grid;gap:24px;grid-template-columns:repeat(${columns},minmax(0,1fr));grid-template-rows:repeat(${rows},minmax(0,1fr))';
    for (const model of models) {
      const figure = document.createElement('figure');
      figure.style.cssText = 'margin:0;min-width:0;min-height:0;overflow:hidden;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:12px';
      const svg = new DOMParser().parseFromString(model.svg, 'image/svg+xml').documentElement;
      svg.setAttribute('viewBox', [left, top, right-left, bottom-top].join(' '));
      svg.style.cssText = 'width:100%;max-width:100%;height:100%;min-width:0;min-height:0;display:block';
      figure.append(svg);
      if (model.label) {
        const caption = document.createElement('figcaption'); caption.textContent = model.label;
        caption.style.cssText = 'min-width:0;overflow:hidden;white-space:nowrap;font:600 18px/26px "Segoe UI",sans-serif;color:#493c43;text-align:center';
        figure.append(caption);
      }
      stage.append(figure);
    }
    const still = document.createElement('style');
    still.textContent = '*{animation:none!important;transition:none!important}body{margin:0!important}';
    document.head.append(still);
    document.documentElement.style.cssText = 'overflow:hidden;width:100%;height:100%';
    document.body.style.cssText = 'margin:0!important;position:fixed;inset:0;width:100%;height:100%;overflow:hidden';
    document.body.replaceChildren(stage);
    if (document.scrollingElement) {
      document.scrollingElement.scrollLeft = 0;
      document.scrollingElement.scrollTop = 0;
    }
    window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  })()`);
  await sleep(200);
  const layout = await page.evaluate(`(() => {
    const stage = document.querySelector('main');
    const captions = [...document.querySelectorAll('figcaption')].map(node => {
      const box = node.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(node);
      const textBox = range.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { text: node.textContent, left: box.left, right: box.right,
        textLeft: textBox.left, textRight: textBox.right, transform: style.transform,
        position: style.position, width: style.width };
    });
    const box = stage?.getBoundingClientRect();
    return {
      stage: box && { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
      viewport: { width: innerWidth, height: innerHeight },
      clippedCaptions: captions.filter(caption => caption.textLeft < 0 || caption.textRight > innerWidth),
      scroll: { x: scrollX, y: scrollY },
    };
  })()`);
  if (!layout.stage || layout.stage.left !== 0 || layout.stage.top !== 0 ||
      layout.stage.right !== layout.viewport.width || layout.stage.bottom !== layout.viewport.height ||
      layout.clippedCaptions.length || layout.scroll.x || layout.scroll.y) {
    throw new Error(`Character sheet escaped its viewport: ${JSON.stringify(layout)}`);
  }
  await page.shot(file, "webp", { captureBeyondViewport: false });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: W, height: H, deviceScaleFactor: 1, mobile: false,
  });
  return models.length;
}

async function resizePlacedFurniture(page, cdp, id, w, d) {
  const points = await page.evaluate(`(async () => {
    const response = await fetch('/api/room', { headers: { Authorization: 'Bearer ' + localStorage.getItem('tasknook.token') } });
    const placement = (await response.json()).iso.placements.find(p => p.id === ${JSON.stringify(id)});
    const old = placement.dimensions || ${JSON.stringify(Object.fromEntries(Object.entries(RESIZABLE_FURNITURE).map(([key, value]) => [key, value.defaults])))}[placement.item];
    const dx = placement.rot % 2 ? ${d} - old.d : ${w} - old.w;
    const dy = placement.rot % 2 ? ${w} - old.w : ${d} - old.d;
    const item = [...document.querySelectorAll('[data-placement-id]')].find(node => node.dataset.placementId === placement.id);
    item.focus(); item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(resolve => requestAnimationFrame(resolve));
    const circle = document.querySelector('[data-resize-corners] [data-resize-corner="front"] [data-resize-hit]')
      || document.querySelector('[data-resize-item] circle');
    if (!circle) throw new Error('Furniture resize handle missing: ' + placement.item);
    const box = circle.getBBox(), matrix = circle.getScreenCTM();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    return [new DOMPoint(x, y), new DOMPoint(x + (dx - dy) * 24, y + (dx + dy) * 12)]
      .map(p => { const q = p.matrixTransform(matrix); return { x: q.x, y: q.y }; });
  })()`);
  await page.clickText('Size', { exact: true });
  await page.clickText('Drag resize handle', { exact: true });
  for (const [type, point, buttons] of [['mousePressed', points[0], 1], ['mouseMoved', points[1], 1], ['mouseReleased', points[1], 0]]) {
    await cdp.send('Input.dispatchMouseEvent', { type, ...point, button: 'left', buttons, clickCount: 1 });
  }
  await page.evaluate(`(async () => {
    for (let i = 0; i < 60; i++) {
      const response = await fetch('/api/room', { headers: { Authorization: 'Bearer ' + localStorage.getItem('tasknook.token') } });
      const item = (await response.json()).iso.placements.find(p => p.id === ${JSON.stringify(id)});
      if (item?.dimensions?.w === ${w} && item.dimensions.d === ${d}) return;
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error('Dragged furniture size was not saved');
  })()`);
}

async function showResizeRoom(page, placements, w = 8, d = 8, view = '') {
  await page.setStorage({ 'tasknook.isoView': view, 'tasknook.isoPreview': '1' });
  await page.evaluate(`(async () => {
    const response = await fetch('/api/room', { method: 'PUT', headers: {
      'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('tasknook.token') },
      body: JSON.stringify(${JSON.stringify({ placements: [], iso: { version: 2, w, d, placements } })}) });
    if (!response.ok) throw new Error('Resize showcase seed failed: ' + response.status);
  })()`);
  await page.load();
  await page.clickText('Room', { exact: true });
  await page.clickText('Decorate the room');
  await page.closePanels();
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const cdp = await connect();
  const page = makePage(cdp);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: W, height: H, deviceScaleFactor: 1, mobile: false,
  });

  const want = (n) => only.length === 0 || only.includes(n);

  await page.load();
  if (process.env.TASKNOOK_SHOT_SKIP_SEED !== "1") console.log("seed:", await seed(page));

  const ambient = (a) => ({
    "tasknook.weatherMode": a.weather,
    "tasknook.timeOfDay": a.time,
    "tasknook.timeOfDay.auto": "0",
    "tasknook.weather.automatch": "0",
    "tasknook.weather.random": "0",
    "tasknook.backdrop": "gradient",
    "tasknook.walkHinted": "1",
  });

  // ---- rooms ----
  for (const [n, name, preset, amb] of ROOMS) {
    if (!want(n)) continue;
    await setCharacter(page, ROOM_LOOK[n]);
    // Room screenshots are specifically the isometric preset gallery. Make
    // that mode explicit: a previous interactive run may have persisted the
    // flat-room toggle, which made every iso preset label disappear and left
    // a partial capture run reporting MISSING after its first room.
    await page.setStorage({
      ...ambient(amb),
      "tasknook.isoView": "",
      "tasknook.isoPreview": "1",
    });
    await page.load();
    await page.clickText("Room", { exact: true });
    await sleep(1400);
    const r = await page.clickText(preset);
    if (r !== "ok") { console.log(`  ${n} ${name}: ${r}`); continue; }
    await sleep(2400);
    // The owner takes an available seat alongside any authored resident.
    const seated = await seatResident(page);
    await page.load(); // re-read the room so the new placement is drawn
    await page.closePanels();
    await sleep(2200);
    const bytes = await page.shot(join(OUT_DIR, `${n}-${name}.webp`));
    console.log(`  ${n}-${name}.webp  ${Math.round(bytes * 0.75 / 1024)}kB  (${seated})`);
    if (n === "02") await page.shot(PREVIEW, "png"); // the README hero
  }

  // Every section starts from an explicit room, including subset runs.
  await page.setStorage({ ...ambient({ weather: "off", time: "day" }), "tasknook.isoView": "", "tasknook.isoPreview": "1" });
  await setCharacter(page, "casual");
  await page.load();
  await page.clickText("Room", { exact: true });
  await page.clickText("Loft");
  await sleep(1800);
  await seatResident(page);

  // ---- 55 solid backdrop: the same atmospheric scene without a sky wash ----
  if (want("55")) {
    await page.setStorage({
      ...ambient({ weather: "off", time: "night" }),
      "tasknook.backdrop": "solid",
    });
    await page.load();
    await page.closePanels();
    await sleep(2000);
    const bytes = await page.shot(join(OUT_DIR, "55-solid-backdrop.webp"));
    console.log(`  55-solid-backdrop.webp  ${Math.round(bytes * 0.75 / 1024)}kB`);
  }

  // ---- weather, all on the default room ----
  for (const [n, name, amb] of WEATHER) {
    if (!want(n)) continue;
    await page.setStorage(ambient(amb));
    await page.load();
    await page.closePanels();
    await sleep(2000);
    const bytes = await page.shot(join(OUT_DIR, `${n}-${name}.webp`));
    console.log(`  ${n}-${name}.webp  ${Math.round(bytes * 0.75 / 1024)}kB`);
  }

  // ---- panels ----
  await page.setStorage(ambient({ weather: "off", time: "night" }));
  for (const [n, name, panel] of PANELS) {
    if (!want(n)) continue;
    await setCharacter(page, n === "22" ? "study" : "casual");
    await page.load();
    if (panel) {
      const r = await page.clickText(panel, { exact: true });
      if (r !== "ok") { console.log(`  ${n} ${name}: ${r}`); continue; }
      await sleep(1800);
      if (n === "22") {
        await page.clickText("Face", { exact: true });
        await sleep(700);
      }
      if (n === "21") {
        await page.evaluate(`(() => {
          const label = [...document.querySelectorAll('p')].find(
            e => e.textContent.trim() === 'Backdrop');
          label?.closest('[role="group"]')?.scrollIntoView({ block: 'center' });
          return 'ok';
        })()`);
        await sleep(500);
      }
    }
    const bytes = await page.shot(join(OUT_DIR, `${n}-${name}.webp`));
    console.log(`  ${n}-${name}.webp  ${Math.round(bytes * 0.75 / 1024)}kB`);
  }

  // ---- 24 furniture: the Room panel scrolled down to the picker ----
  if (want("24")) {
    await page.load();
    await page.clickText("Room", { exact: true });
    await sleep(1600);
    await openCatalogGroup(page, "Seating & beds");
    await sleep(1400);
    const b = await page.shot(join(OUT_DIR, "24-furniture.webp"));
    console.log(`  24-furniture.webp  ${Math.round(b * 0.75 / 1024)}kB`);
  }

  // ---- 57 autumn catalog: the complete seasonal decoration set in the real picker ----
  if (want("57")) {
    await page.load();
    await page.clickText("Room", { exact: true });
    await sleep(1600);
    await openCatalogGroup(page, "Autumn");
    await sleep(1400);
    const bytes = await page.shot(join(OUT_DIR, "57-autumn-decorations.webp"));
    console.log(`  57-autumn-decorations.webp  ${Math.round(bytes * 0.75 / 1024)}kB`);
  }

  // ---- 58 winter catalog: outdoor snow pieces plus the indoor holiday set ----
  if (want("58")) {
    await page.load();
    await page.clickText("Room", { exact: true });
    await sleep(1600);
    await openCatalogGroup(page, "Winter");
    await sleep(1400);
    const bytes = await page.shot(join(OUT_DIR, "58-winter-decorations.webp"));
    console.log(`  58-winter-decorations.webp  ${Math.round(bytes * 0.75 / 1024)}kB`);
  }

  // ---- 25 decorating: edit mode, grid on, HUD stood aside ----
  if (want("25")) {
    await page.load();
    await page.clickText("Room", { exact: true });
    await sleep(1600);
    const r = await page.clickText("Decorate the room");
    if (r === "ok") {
      await sleep(2200);
      const b = await page.shot(join(OUT_DIR, "25-decorating.webp"));
      console.log(`  25-decorating.webp  ${Math.round(b * 0.75 / 1024)}kB`);
    } else console.log("  25 decorating:", r);
  }

  // ---- 29 floor plan: both wall and arch tools visible on a zoned room ----
  if (want("29")) {
    await page.load();
    await page.clickText("Room", { exact: true });
    await sleep(1400);
    const r = await page.clickText("Floor plan");
    if (r === "ok") {
      await sleep(1200);
      const b = await page.shot(join(OUT_DIR, "29-floor-plan.webp"));
      console.log(`  29-floor-plan.webp  ${Math.round(b * 0.75 / 1024)}kB`);
    } else console.log("  29 floor plan:", r);
  }

  // ---- 27 visiting: knock on a friend's door and stand in their room ----
  if (want("27")) {
    await page.load();
    await page.clickText("Friends", { exact: true });
    await sleep(1800);
    const r = await page.clickText("Visit");
    if (r === "ok") {
      // The knock is a real wait (KNOCK_WAIT_MS) — the bots always answer.
      await sleep(6000);
      await page.closePanels();
      await sleep(2000);
      const b = await page.shot(join(OUT_DIR, "27-visiting.webp"));
      console.log(`  27-visiting.webp  ${Math.round(b * 0.75 / 1024)}kB`);
    } else console.log("  27 visiting:", r);
  }

  // Dedicated examples show only the actual model, at full capture resolution.
  for (const [n, name, look, tab] of CHARACTERS) {
    if (!want(n)) continue;
    await setCharacter(page, look || "casual");
    await page.setStorage(ambient({ weather: "off", time: "day" }));
    await page.load();
    await page.clickText("Profile", { exact: true });
    await page.clickText(tab, { exact: true });
    // The preset screenshot exercises the real one-click path rather than
    // inserting the same payload through a second test-only route.
    if (n === "37" || n === "38") await page.clickText("Lofi girl");
    if (n === "38") await page.clickText("Seated", { exact: true });
    await sleep(1600);
    const modelCount = await modelShot(cdp, page, join(OUT_DIR, `${n}-${name}.webp`), !look);
    console.log(`  ${n}-${name}.webp (${look || `${modelCount} preset models`}, closeup)`);
  }

  // Fixed common place: join through the real drawer, then try the raised seat.
  if (["39", "40", "41", "53", "54"].some(want)) {
    await setCharacter(page, "casual");
    await page.setStorage(ambient({ weather: "off", time: "sunset" }));
    await page.load();
    await page.clickText("Friends", { exact: true });
    await page.clickText("Places", { exact: true });
    const joined = await page.clickText("Common Cottage");
    if (joined !== "ok") throw new Error("Common Cottage entry: " + joined);
    await sleep(2500);
    if (want("39")) await page.shot(join(OUT_DIR, "39-common-cottage.webp"));
    await page.clickText("Drag and drop to change seats");
    if (want("41")) await page.shot(join(OUT_DIR, "41-common-cottage-seats.webp"));
    await page.clickText("Done choosing", { exact: true });
    const moved = await page.dragCommonGuest("window-right");
    if (moved !== "window-right") throw new Error(`Common Cottage drag settled at ${moved || "no seat"}`);
    if (want("40")) await page.shot(join(OUT_DIR, "40-common-cottage-reading.webp"));
    if (want("53") || want("54")) {
      await page.evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })); 'ok'`);
      await page.evaluate(`(() => {
        const input = document.querySelector('input[aria-label="Message the room"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'hello everyone');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.closest('form').requestSubmit();
        return 'ok';
      })()`);
      for (let attempt = 0; attempt < 26; attempt += 1) {
        if (await page.evaluate(`!!document.querySelector('[data-message-kind="npc"]')`)) break;
        await sleep(500);
      }
      if (want("53")) await page.shot(join(OUT_DIR, "53-common-room-chat.webp"));
      if (want("54")) {
        await page.evaluate(`document.querySelector('button[aria-controls="common-room-participants"]').click(); 'ok'`);
        await page.shot(join(OUT_DIR, "54-common-room-participants.webp"));
      }
    }
    console.log("  common cottage: entry, open seats and raised reading nook");
  }

  // Outdoor common place: sunset arrival plus the same garden at night with
  // all seat targets visible. Both go through the real Friends card.
  if (["43", "44"].some(want)) {
    await setCharacter(page, "garden");
    if (want("43")) {
      await page.setStorage(ambient({ weather: "off", time: "sunset" }));
      await page.load();
      await page.clickText("Friends", { exact: true });
      await page.clickText("Places", { exact: true });
      if (await page.clickText("Willow Pond") !== "ok") throw new Error("Willow Pond sunset entry failed");
      await sleep(2500);
      await page.shot(join(OUT_DIR, "43-willow-pond.webp"));
    }
    if (want("44")) {
      await page.setStorage(ambient({ weather: "off", time: "night" }));
      await page.load();
      await page.clickText("Friends", { exact: true });
      await page.clickText("Places", { exact: true });
      if (await page.clickText("Willow Pond") !== "ok") throw new Error("Willow Pond night entry failed");
      await sleep(2500);
      await page.clickText("Drag and drop to change seats");
      await page.shot(join(OUT_DIR, "44-willow-pond-seats.webp"));
    }
    console.log("  willow pond: garden arrival and open-seat view");
  }

  if (want("48") || want("49")) {
    await setCharacter(page, "casual");
    await page.setStorage(ambient({ weather: "off", time: "night" }));
    await page.load();
    await page.clickText("Friends", { exact: true });
    await page.clickText("Places", { exact: true });
    if (await page.clickText("Grand Library") !== "ok") throw new Error("Grand Library entry failed");
    await sleep(2500);
    if (want("48")) await page.shot(join(OUT_DIR, "48-grand-library.webp"));
    if (want("49")) {
      await page.clickText("Drag and drop to change seats");
      await page.shot(join(OUT_DIR, "49-grand-library-seats.webp"));
    }
    console.log("  grand library: candlelit book hall and gallery seat choices");
  }

  if (want("45") || want("46")) {
    // These are daily device markers, not seeded task/session totals. Reset
    // them on the throwaway capture profile for a reproducible first look.
    await page.evaluate(`localStorage.removeItem('tasknook.challenges')`);
    await page.setStorage({ "tasknook.timerMode": "timer" });
    await page.load();
    await page.clickText("Challenges", { exact: true });
    await sleep(1000);
    if (want("45")) {
      await page.shot(join(OUT_DIR, "45-challenges.webp"));
      console.log("  challenges: varied daily developer prompts");
    }
    if (want("46")) {
      await page.clickText("My challenges", { exact: true });
      const createGoal = async (draft) => {
        await page.clickText("New challenge", { exact: true });
        await page.evaluate(`(() => {
          const form = document.querySelector('form[aria-label="New personal challenge"]');
          const draft = ${JSON.stringify(draft)};
          for (const [input, value] of [
            [form.querySelector('input:not([type="number"])'), draft.title],
            [form.querySelector('input[type="number"]'), String(draft.target)],
          ]) {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          const selects = form.querySelectorAll('select');
          selects[0].value = draft.tracking;
          selects[0].dispatchEvent(new Event('change', { bubbles: true }));
          selects[1].value = draft.cadence;
          selects[1].dispatchEvent(new Event('change', { bubbles: true }));
        })()`);
        await page.clickText("Add challenge", { exact: true });
      };
      await createGoal({ title: "Read three chapters", target: 3, cadence: "ongoing", tracking: "manual" });
      await page.clickText("+1 step", { exact: true });
      await createGoal({ title: "Stretch today", target: 1, cadence: "daily", tracking: "manual" });
      await createGoal({ title: "Finish two tasks", target: 2, cadence: "daily", tracking: "task-completed" });
      await page.closePanels();
      if (!await page.evaluate(`!!document.querySelector('button[aria-label^="Mark "][aria-label$=" complete"]')`)) {
        // Subset runs may skip the normal seed and have no unfinished task.
        await page.evaluate(`(() => {
          const input = document.querySelector('input[placeholder$="New Task"]');
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Read another chapter');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        })()`);
        await page.evaluate(`document.querySelector('input[placeholder$="New Task"]').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`);
        await page.evaluate(`(async () => {
          for (let i = 0; i < 40; i++) {
            if (document.querySelector('button[aria-label^="Mark "][aria-label$=" complete"]')) return;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          throw new Error('Could not prepare a personal-challenge task');
        })()`);
      }
      await page.evaluate(`(() => {
        const button = document.querySelector('button[aria-label^="Mark "][aria-label$=" complete"]');
        if (!button) throw new Error('Personal challenge capture needs an unfinished task');
        button.click();
      })()`);
      await page.evaluate(`(async () => {
        for (let i = 0; i < 40; i++) {
          if (JSON.parse(localStorage.getItem('tasknook.challenges')).custom.find(g => g.title === 'Finish two tasks')?.progress === 1) return;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('Personal challenge task credit did not arrive');
      })()`);
      await page.clickText("Challenges", { exact: true });
      await page.clickText("My challenges", { exact: true });
      await sleep(1000);
      await page.shot(join(OUT_DIR, "46-personal-challenges.webp"));
      console.log("  challenges: daily and ongoing personal goals");
    }
  }

  if (want("47")) {
    // Reset the throwaway device's bonus marker; SQLite study history still
    // supplies real XP, avoiding a prior review's simulated future check-in.
    await page.evaluate(`localStorage.removeItem('tasknook.progression')`);
    await page.load();
    await page.clickText("Profile", { exact: true });
    await page.evaluate(`(async () => {
      for (let i = 0; i < 40; i++) {
        const card = document.querySelector('[aria-label="Your progress"]');
        if (card) { card.querySelector('details').open = true; return; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Profile level card did not load');
    })()`);
    await sleep(1000);
    await page.shot(join(OUT_DIR, "47-profile-levels.webp"));
    console.log("  profile: level, XP and check-in streak");
  }

  // ---- 56 sleeping: carry the real profile character into the Loft bed ----
  if (want("56")) {
    await setCharacter(page, "winter");
    await page.setStorage({
      ...ambient({ weather: "off", time: "night" }),
      "tasknook.isoView": "",
      "tasknook.isoPreview": "1",
    });
    await page.load();
    await page.clickText("Room", { exact: true });
    await page.clickText("Loft");
    await sleep(1800);
    await seatResident(page);
    await page.load();
    await page.closePanels();
    const result = await page.dragSelfToItem("bed");
    if (!result.lying || !result.tucked)
      throw new Error(`Bed carry did not resolve to the tucked pose: ${JSON.stringify(result)}`);
    await sleep(1600);
    const bytes = await page.shot(join(OUT_DIR, "56-tucked-in-bed.webp"));
    console.log(`  56-tucked-in-bed.webp  ${Math.round(bytes * 0.75 / 1024)}kB`);
  }

  // Shelf customization uses the real home item controls and persisted layout.
  if (want("60")) {
    await page.setStorage({ ...ambient({ weather: "off", time: "day" }), "tasknook.isoView": "", "tasknook.isoPreview": "1" });
    await page.load();
    await page.clickText("Room", { exact: true });
    await page.clickText("Plant shop");
    await sleep(1800);
    await page.closePanels();
    await page.evaluate(`(() => {
      const shelf = document.querySelector('[data-iso-room-scene] [data-item="plantshelf"][role="button"]');
      if (!shelf) throw new Error('No customizable plant rack');
      shelf.focus(); shelf.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    })()`);
    await sleep(300);
    await page.evaluate(`(() => {
      const select = document.querySelector('[aria-label="Shelf contents"]');
      select.value = 'mixed'; select.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[aria-label="Book colour #598fa4"]').click();
    })()`);
    await page.shot(join(OUT_DIR, "60-shelf-customization.webp"));
    console.log("  60-shelf-customization.webp");
  }

  // One placed bed, four independent materials, edited through the real UI.
  if (want("61")) {
    await page.setStorage({ ...ambient({ weather: "off", time: "day" }), "tasknook.isoView": "", "tasknook.isoPreview": "1" });
    await setCharacter(page, "casual");
    await page.load();
    await page.clickText("Room", { exact: true });
    await page.clickText("Loft");
    await sleep(1800);
    await page.closePanels();
    await page.evaluate(`(() => {
      const bed = document.querySelector('[data-iso-room-scene] [data-item="bed"][role="button"]');
      if (!bed) throw new Error('No customizable bed');
      bed.focus(); bed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    })()`);
    for (const [part, label, color] of [
      ["main", "Blanket", "#506b9c"], ["frame", "Frame", "#885533"],
      ["sheets", "Sheets", "#d8b8a8"], ["pillows", "Pillows", "#d891a9"],
    ]) {
      await page.evaluate(`(() => {
        const select = document.querySelector('[aria-label="Furniture part"]');
        if (!select) throw new Error('Furniture part selector missing');
        select.value = ${JSON.stringify(part)};
        select.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
      await sleep(150);
      await page.evaluate(`(() => {
        const input = document.querySelector('[aria-label="${label} colour hex"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(color)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      await sleep(200);
    }
    await sleep(1200);
    await page.evaluate(`(async () => {
      const response = await fetch('/api/room', { headers: { Authorization: 'Bearer ' + localStorage.getItem('tasknook.token') } });
      const bed = (await response.json()).iso.placements.find(p => p.item === 'bed');
      if (bed?.tint !== '#506b9c' || bed.colors?.frame !== '#885533' || bed.colors?.sheets !== '#d8b8a8' || bed.colors?.pillows !== '#d891a9') {
        throw new Error('Bed material colours were not saved by the controls');
      }
    })()`);
    await page.shot(join(OUT_DIR, "61-furniture-colors.webp"));
    console.log("  61-furniture-colors.webp");
  }

  // A dedicated throwaway room keeps the before/after size demonstration
  // reproducible without changing the shipped presets or a user's layout.
  if (want("62")) {
    await page.setStorage({ ...ambient({ weather: "off", time: "day" }), "tasknook.isoView": "", "tasknook.isoPreview": "1" });
    await setCharacter(page, "casual");
    await page.evaluate(`(async () => {
      const response = await fetch('/api/room', { method: 'PUT', headers: {
        'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('tasknook.token') },
        body: JSON.stringify({ placements: [], iso: { version: 2, w: 8, d: 7, placements: [
          { id: 'resize-bed', item: 'bed', gx: 2, gy: 1, dimensions: { w: 1, d: 2 },
            tint: '#506b9c', colors: { frame: '#885533', sheets: '#d8b8a8', pillows: '#d891a9' } },
          { id: 'sleeper', item: 'resident', gx: 2, gy: 1.5 },
          { id: 'side', item: 'nightstand', gx: .5, gy: 1 },
          { id: 'plant', item: 'monstera', gx: 6, gy: 1 },
        ] } }) });
      if (!response.ok) throw new Error('Resize showcase seed failed: ' + response.status);
    })()`);
    await page.load();
    await page.clickText("Room", { exact: true });
    await page.clickText("Decorate the room");
    await page.closePanels();
    await page.evaluate(`(() => {
      const bed = document.querySelector('[data-placement-id="resize-bed"]');
      bed.focus(); bed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    })()`);
    await page.clickText('Size', { exact: true });
    await sleep(300);
    await page.shot(join(OUT_DIR, "62-bed-resize-before.webp"));
    const points = await page.evaluate(`(() => {
      const circle = document.querySelector('[data-resize-corners="resize-bed"] [data-resize-corner="front"] [data-resize-hit]');
      if (!circle) throw new Error('Bed resize handle missing');
      const box = circle.getBBox(), matrix = circle.getScreenCTM();
      return [new DOMPoint(box.x + box.width / 2, box.y + box.height / 2),
        new DOMPoint(box.x + box.width / 2 + 24, box.y + box.height / 2 + 12)]
        .map(p => { const q = p.matrixTransform(matrix); return { x: q.x, y: q.y }; });
    })()`);
    await page.clickText('Drag resize handle', { exact: true });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...points[0], button: 'left', buttons: 1, clickCount: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points[1], button: 'left', buttons: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points[1], button: 'left', buttons: 0, clickCount: 1 });
    await page.evaluate(`(async () => {
      for (let i = 0; i < 60; i++) {
        const response = await fetch('/api/room', { headers: { Authorization: 'Bearer ' + localStorage.getItem('tasknook.token') } });
        const bed = (await response.json()).iso.placements.find(p => p.id === 'resize-bed');
        if (bed?.dimensions?.w === 2 && bed.dimensions.d === 2) return;
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      throw new Error('Dragged bed size was not saved');
    })()`);
    await page.evaluate(`(() => {
      const bed = document.querySelector('[data-placement-id="resize-bed"]');
      bed.focus(); bed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    })()`);
    await page.clickText('Size', { exact: true });
    await page.shot(join(OUT_DIR, "62-bed-resize-after.webp"));
    console.log("  62-bed-resize-before.webp / 62-bed-resize-after.webp");
  }

  for (const n of ['63', '64', '65']) {
    if (!want(n)) continue;
    await page.setStorage(ambient({ weather: 'off', time: 'day' }));
    if (n === '63') {
      await showResizeRoom(page, [
        { id: 'sofa', item: 'sofa', gx: 1, gy: 1, tint: '#7799aa' },
        { id: 'sitter', item: 'resident', gx: 1.5, gy: 1 },
        { id: 'comparison', item: 'sofa', gx: 1, gy: 5, tint: '#7799aa' },
      ]);
      await resizePlacedFurniture(page, cdp, 'sofa', 3.5, 1);
      await page.shot(join(OUT_DIR, '63-sofa-resize.webp'));
    } else if (n === '64') {
      await showResizeRoom(page, [
        { id: 'desk', item: 'desk', gx: 1, gy: 1, tint: '#9d8971' },
        { id: 'computer', item: 'computer', gx: 1.5, gy: 1 },
        { id: 'mug', item: 'mug', gx: 2.5, gy: 1.5, tint: '#9977aa' },
        { id: 'chair', item: 'deskchair', gx: 1.5, gy: 2.5, rot: 2 },
        { id: 'sitter', item: 'resident', gx: 1.5, gy: 2.5 },
      ]);
      await resizePlacedFurniture(page, cdp, 'desk', 4, 1.5);
      await page.shot(join(OUT_DIR, '64-desk-resize.webp'));
    } else {
      const shelves = [['bookshelf', 1, 2, 0], ['bookcase', 6, 2, 1], ['shelf', 11, 2, 0],
        ['ladder', 1, 6, 0], ['plantshelf', 6, 6, 0], ['wallshelf', 1, 0, 0]];
      await showResizeRoom(page, shelves.map(([item, gx, gy, rot]) => ({ id: item, item, gx, gy, rot,
        tint: '#82917b', decor: { layout: 'mixed', bookColor: '#8975af' } })), 16, 14,
      JSON.stringify({ x: -180, y: -80, w: 1000, h: 650 }));
      for (const [item] of shelves) await resizePlacedFurniture(page, cdp, item, 3.5, 1);
      await page.shot(join(OUT_DIR, '65-shelf-resize.webp'));
    }
    console.log(`  ${n}: resized furniture`);
  }

  // Selected-piece controls are captured through the same inspector a player
  // uses. The room fixture is disposable; source presets remain unchanged.
  if (want('66')) {
    await page.setStorage(ambient({ weather: 'off', time: 'day' }));
    await showResizeRoom(page, [
      { id: 'editor-sofa', item: 'sofa', gx: 1, gy: 1, tint: '#7799aa', dimensions: { w: 3, d: 1 } },
      { id: 'editor-bed', item: 'bed', gx: 1, gy: 5, dimensions: { w: 2, d: 2 },
        tint: '#8baba0', colors: { frame: '#946b50', sheets: '#d8b8a8', pillows: '#d891a9' } },
      { id: 'editor-shelf', item: 'bookcase', gx: 5, gy: 1, decor: { layout: 'mixed' } },
      { id: 'editor-plant', item: 'monstera', gx: 6, gy: 5 },
    ]);
    await page.evaluate(`(() => {
      const bed = document.querySelector('[data-placement-id="editor-bed"]');
      bed.focus(); bed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    })()`);
    await page.clickText('Colours', { exact: true });
    await page.evaluate(`(() => {
      const part = document.querySelector('select[aria-label="Furniture part"]');
      if (!part) throw new Error('Furniture material selector missing');
      part.value = 'pillows'; part.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await page.shot(join(OUT_DIR, '66-decorate-controls.webp'));
    console.log('  66-decorate-controls.webp');
  }

  if (cdp.errors.length) throw new Error("page errors: " + cdp.errors.slice(0, 5).join(" | "));
  console.log("done ->", OUT_DIR);
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
