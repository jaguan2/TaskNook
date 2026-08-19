// npm run art — render the whole character wardrobe to one browsable
// contact sheet (frontend/art-sheet/index.html, gitignored).
//
// The loop this exists for (docs/CONTRIBUTING_ART.md): edit a registry
// entry, run this, refresh the browser tab. Judging the whole set side by
// side is the review method every shipped style went through.
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "art-sheet");
const svgDir = join(outDir, "svg");
rmSync(svgDir, { recursive: true, force: true });
mkdirSync(svgDir, { recursive: true });

// 1. The gated fixture test renders every piece to an SVG file.
const run = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "src/components/artsheet.fixtures.test.jsx"],
  { cwd: root, env: { ...process.env, SHEET_DIR: svgDir }, stdio: "inherit", shell: true }
);
if (run.status !== 0) {
  console.error("fixture render failed");
  process.exit(run.status ?? 1);
}

// 2. Lay them out, grouped by prefix, biggest first for close judging.
const names = readdirSync(svgDir)
  .filter((f) => f.endsWith(".svg"))
  .map((f) => f.replace(/\.svg$/, ""));
const groupOf = (n) => n.split("-").slice(0, n.startsWith("hair-") || n.startsWith("pants-side") || n.startsWith("shoes-side") ? 2 : 1).join("-");
const groups = [...new Set(names.map(groupOf))].sort();
const svg = (n) => readFileSync(join(svgDir, `${n}.svg`), "utf8");
const section = (g) => {
  const members = names.filter((n) => groupOf(n) === g).sort();
  return `<h2>${g} <small>(${members.length})</small></h2><div class="grid">${members
    .map((n) => `<figure><div class="shot">${svg(n)}</div><figcaption>${n}</figcaption></figure>`)
    .join("")}</div>`;
};
writeFileSync(
  join(outDir, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>TaskNook art sheet</title>
<style>
  body { background: #241328; color: #f2e9dd; margin: 0; font-family: "Segoe UI", system-ui, sans-serif; }
  main { max-width: 1500px; margin: 0 auto; padding: 20px 16px 60px; }
  h2 { font-size: 15px; color: #e8d5b5; margin: 22px 0 8px; } h2 small { color: #b9a3c4; font-weight: normal; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; }
  figure { margin: 0; background: #2f1b34; border-radius: 8px; padding: 6px 6px 2px; }
  .shot svg { width: 150px; height: auto; display: block; }
  figcaption { text-align: center; font-size: 11px; color: #b9a3c4; padding-top: 2px; }
</style>
<main><h1 style="font-size:18px">Character art — every piece, side by side</h1>
${groups.map(section).join("")}
</main>`
);
console.log(`\nart sheet: ${join(outDir, "index.html")} (${names.length} pieces)`);
