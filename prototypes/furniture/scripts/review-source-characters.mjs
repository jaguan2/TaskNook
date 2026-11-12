import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Reuse the production art generator; do not draw comparison stand-ins.
// npm run art in frontend/ supplies these ignored, self-contained SVGs.
const source = new URL('../../../frontend/art-sheet/svg/', import.meta.url);
const output = new URL('../../../build/skill-verification/character-pet-review/', import.meta.url);
const generated = spawnSync(process.execPath, ['scripts/art-sheet.mjs'], {
  cwd: fileURLToPath(new URL('../../../frontend/', import.meta.url)), stdio: 'inherit',
});
assert.equal(generated.status, 0, 'production art generation failed');
await mkdir(output, { recursive: true });
const files = (await readdir(source)).filter(name => name.endsWith('.svg'));
const poses = ['front', 'side', 'back', 'asleep', 'held'];
const stages = ['baby', 'teen', 'adult'], forms = ['natural', 'slender', 'round'];
const evidence = { browser: null, petBounds: [], headBodyRatios: [], sheets: [] };
const browser = await chromium.launch({ headless: true,
  ...(process.env.FURNITURE_BROWSER_CHANNEL && { channel: process.env.FURNITURE_BROWSER_CHANNEL }) });
try {
  evidence.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  for (const species of ['cat', 'dog', 'bunny']) {
    for (const form of forms) for (const pose of poses) {
      const ratios = [];
      for (const stage of stages) {
        const name = `growth-${species}-${stage}-${form}-${pose}.svg`, svg = await readFile(new URL(name, source), 'utf8');
        await page.setContent(svg);
        const metrics = await page.evaluate(() => {
          const svg = document.querySelector('svg'), view = svg.viewBox.baseVal;
          const bounds = node => {
            const box = node.getBBox(), matrix = svg.getScreenCTM().inverse().multiply(node.getScreenCTM());
            const points = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
              .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
            const minX = Math.min(...points.map(p => p.x)), minY = Math.min(...points.map(p => p.y));
            return { x: minX, y: minY, width: Math.max(...points.map(p => p.x)) - minX, height: Math.max(...points.map(p => p.y)) - minY };
          };
          return { box: bounds(document.querySelector('[data-pet-stage]')),
            head: bounds(document.querySelector('[data-pet-head]')),
            body: bounds(document.querySelector('[data-pet-body] > path')),
            frame: { x: view.x, y: view.y, width: view.width, height: view.height } };
        });
        const { box, frame } = metrics;
        assert.ok(box.width > 0 && box.height > 0 && Object.values(box).every(Number.isFinite), `${name}: empty or invalid drawing`);
        assert.ok(box.x >= frame.x && box.y >= frame.y && box.x + box.width <= frame.x + frame.width && box.y + box.height <= frame.y + frame.height, `${name}: artwork is clipped ${JSON.stringify({ box, frame })}`);
        evidence.petBounds.push({ name, ...metrics }); ratios.push(metrics.head.height / metrics.body.height);
      }
      assert.ok(ratios[0] > ratios[1] && ratios[1] > ratios[2], `${species}/${form}/${pose}: younger pets need a proportionally larger head`);
      evidence.headBodyRatios.push({ species, form, pose, ratios });
    }
  }
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  async function sheet(name, title, names, columns) {
    const cards = await Promise.all(names.map(async filename => {
      const svg = await readFile(new URL(filename, source));
      // Image documents isolate useId gradients/clip paths between SSR fixtures.
      return `<figure><img src="data:image/svg+xml;base64,${svg.toString('base64')}" alt="${escape(filename)}"><figcaption>${escape(filename.replace('.svg', ''))}</figcaption></figure>`;
    }));
    const caption = name.includes('growth') ? 'Baby / medium (teen) / adult · Natural / slender / round' : 'Standing / seated / rear and profile views · Authored looks and body/clothing extremes';
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:25px;background:#ddd5c7;color:#403746;font:12px 'Segoe UI',sans-serif}h1{font:26px Georgia,serif;margin:0 0 10px}p{margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(${columns},1fr);gap:10px}figure{margin:0;background:#f0eadd;border-radius:8px;overflow:hidden}img{display:block;width:100%;height:150px}figcaption{padding:8px;font-size:10px}</style><h1>${escape(title)}</h1><p>Current production SVGs · Fixed frames and scale · ${caption}</p><div class="grid">${cards.join('')}</div>`);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: true });
    evidence.sheets.push(`${name}.png`);
  }
  for (const species of ['cat', 'dog', 'bunny']) {
    const names = stages.flatMap(stage => forms.flatMap(form => poses.map(pose => `growth-${species}-${stage}-${form}-${pose}.svg`)));
    await sheet(`${species}-growth-review`, `${species}: all three growth stages and body forms`, names, 5);
  }
  await sheet('resident-presets-review', 'Residents: the existing cute silhouettes', files.filter(name => name.startsWith('preset-')).sort(), 6);
  await sheet('resident-extremes-review', 'Residents: body and clothing extremes', files.filter(name => /^fit-|^hair-fit-(?:short|bob|long)-(?:light|dark)-/.test(name)).sort(), 6);
  await writeFile(new URL('source-art-report.json', output), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`PASS: ${evidence.petBounds.length} growth-pose bounds and ${evidence.headBodyRatios.length} age-proportion comparisons; ${evidence.sheets.length} review sheets.`);
} finally {
  await browser.close();
}
