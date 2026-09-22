/**
 * Capture docs/screenshots/*.webp and docs/preview.png from the REAL app.
 *
 * Every shot is the running SPA talking to the Flask API — tasks and focus
 * sessions created through the actual endpoints, rooms applied by clicking the
 * same preset buttons a person would. Nothing here is mocked, which is the
 * whole point: a screenshot that can drift from the app is worse than none.
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
  study: { model: "fem", skin: "#a66f4a", hair: "locs", hairColor: "#302329", garment: "sweater", outfit: "#dfa85d", pants: "maxi", trouser: "#677e81", shoes: "maryjanes", width: 7.8, height: 30 },
  casual: { model: "masc", skin: "#edc39e", hair: "curly", hairColor: "#824c32", garment: "tee", outfit: "#e7dcc7", coat: "cardigan", coatColor: "#608478", pants: "jeans", trouser: "#526884", glasses: "round", width: 8.2, height: 34 },
  winter: { model: "fem", skin: "#e8ad84", hair: "braids", hairColor: "#4d332c", garment: "turtleneck", outfit: "#ede0c9", coat: "puffer", coatColor: "#8e526c", pants: "trousers", trouser: "#5b526d", hat: "trapper", scarf: "wrapped", scarfColor: "#c9a24b", shoes: "boots", width: 7.4, height: 31 },
  garden: { model: "masc", skin: "#774c37", hair: "buzz", hairColor: "#302329", garment: "overalls", outfit: "#7e9369", inner: "#e4b16b", pants: "jorts", trouser: "#677b8e", shoes: "boots", width: 7, height: 32 },
  cafe: { model: "fem", skin: "#f0cfb4", hair: "bob", hairColor: "#b57248", garment: "shirt", outfit: "#f2e4ca", coat: "cardigan", coatColor: "#ad6678", pants: "pleats", trouser: "#5f7384", shoes: "loafers", width: 6.6, height: 28 },
  summer: { model: "masc", skin: "#b47c55", hair: "undercut", hairColor: "#47332d", garment: "swim", outfit: "#69a5aa", pants: "shorts", trouser: "#d3946b", hat: "straw", width: 7.8, height: 33 },
};
const ROOM_LOOK = { "01": "casual", "02": "study", "03": "winter", "04": "study", "05": "cafe", "06": "garden", "07": "cafe", "08": "casual", "09": "garden", "28": "study", "30": "garden", "31": "winter", "32": "summer" };
const CHARACTERS = [
  ["33", "character-study", "study", "Body"],
  ["34", "character-casual", "casual", "Outfit"],
  ["35", "character-winter", "winter", "Extras"],
  ["36", "character-garden", "garden", "Hair"],
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
  ["08", "study-hall", "Study hall", { weather: "off", time: "day" }],
  ["09", "autumn-yard", "Autumn yard", { weather: "off", time: "sunset" }],
  ["28", "shared-home", "Shared home", { weather: "off", time: "sunset" }],
  ["30", "plant-shop", "Plant shop", { weather: "off", time: "day" }],
  ["31", "winter-yard", "Winter yard", { weather: "snow", time: "night" }],
  ["32", "poolside", "Poolside", { weather: "off", time: "day" }],
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

  const shot = async (file, format = "webp") => {
    const r = await send("Page.captureScreenshot",
      format === "webp" ? { format: "webp", quality: 92 } : { format: "png" });
    if (!r?.data) throw new Error(`empty capture for ${file}`);
    writeFileSync(file, Buffer.from(r.data, "base64"));
    return r.data.length;
  };

  return { evaluate, load, setStorage, clickText, closePanels, shot };
}

/**
 * Put YOU in the room, sitting where a person would actually sit.
 *
 * The personal presets ship their seats empty on purpose (a stranger at your
 * desk reads wrong), so a preset alone gives an unoccupied room — which is what
 * the shots are meant to show you living in. The profile's "In the room"
 * toggle uses the app's own placement logic and survives preset changes.
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
    return 'seeded';
  })()`);
  return out;
}

// --------------------------------------------------------------------------- //
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
    // The communal presets already have people; the personal ones don't.
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
    }
    const bytes = await page.shot(join(OUT_DIR, `${n}-${name}.webp`));
    console.log(`  ${n}-${name}.webp  ${Math.round(bytes * 0.75 / 1024)}kB`);
  }

  // ---- 24 furniture: the Room panel scrolled down to the picker ----
  if (want("24")) {
    await page.load();
    await page.clickText("Room", { exact: true });
    await sleep(1600);
    await page.clickText("Browse by category");
    await page.clickText("Seating");
    await page.evaluate(`(() => {
      const h = [...document.querySelectorAll('*')].find(
        e => e.children.length === 0 && /^seating/i.test(e.textContent.trim()));
      h?.scrollIntoView({ block: 'start' });
      return 'ok';
    })()`);
    await sleep(1400);
    const b = await page.shot(join(OUT_DIR, "24-furniture.webp"));
    console.log(`  24-furniture.webp  ${Math.round(b * 0.75 / 1024)}kB`);
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

  // Dedicated examples keep the real editor's larger preview in frame.
  for (const [n, name, look, tab] of CHARACTERS) {
    if (!want(n)) continue;
    await setCharacter(page, look);
    await page.setStorage(ambient({ weather: "off", time: "day" }));
    await page.load();
    await page.clickText("Profile", { exact: true });
    await page.clickText(tab, { exact: true });
    await sleep(1600);
    await page.shot(join(OUT_DIR, `${n}-${name}.webp`));
    console.log(`  ${n}-${name}.webp (${look})`);
  }

  if (cdp.errors.length) throw new Error("page errors: " + cdp.errors.slice(0, 5).join(" | "));
  console.log("done ->", OUT_DIR);
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
