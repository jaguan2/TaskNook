import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { characterSourceFingerprint } from './character-source.mjs';

// Render the real parametric Resident through the existing fixture generator.
// These samples cover each slot individually; they do not approve every outfit.
const source = new URL('../../../frontend/art-sheet/svg/', import.meta.url);
const output = new URL('../../../build/skill-verification/wardrobe-fit/', import.meta.url);
await mkdir(output, { recursive: true });
const generated = spawnSync(process.execPath, ['scripts/art-sheet.mjs'], {
  cwd: fileURLToPath(new URL('../../../frontend/', import.meta.url)), encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
await writeFile(new URL('art-generation.log', output), (generated.stdout || '') + (generated.stderr || ''));
assert.equal(generated.status, 0, 'art generation failed; see wardrobe-fit/art-generation.log');
const files = (await readdir(source)).filter(name => name.endsWith('.svg')).sort();
const bodies = ['compact', 'broad'];
const views = ['front', 'side', 'back', 'seated', 'ankles'];
const slots = ['garment', 'coat', 'pants', 'shoes', 'hair'];
const evidence = { sourceFingerprint: await characterSourceFingerprint(), browser: null,
  coverage: {}, bounds: [], faceOpenings: [], bootContacts: [], sheets: [] };
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const browser = await chromium.launch({ headless: true, channel: process.env.FURNITURE_BROWSER_CHANNEL || 'msedge' });
try {
  evidence.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  // The browser evaluates SVG geometry, including transforms. A unit test that
  // only counts paths cannot catch a fringe covering a correctly rendered eye.
  for (const name of files.filter(name => name.startsWith('wardrobe-'))) {
    await page.setContent(await readFile(new URL(name, source), 'utf8'));
    const bounds = await page.evaluate(() => {
      const svg = document.querySelector('svg'), box = svg.getBBox(), view = svg.viewBox.baseVal;
      return { x: box.x, y: box.y, width: box.width, height: box.height,
        frame: { x: view.x, y: view.y, width: view.width, height: view.height } };
    });
    const { x, y, width, height, frame } = bounds;
    assert.ok([x, y, width, height].every(Number.isFinite) && width > 0 && height > 0, `${name}: invalid drawing`);
    assert.ok(x >= frame.x && y >= frame.y && x + width <= frame.x + frame.width && y + height <= frame.y + frame.height,
      `${name}: clipped artwork ${JSON.stringify(bounds)}`);
    evidence.bounds.push({ name, ...bounds });
  }
  for (const name of files.filter(name => name.startsWith('seated-boots-'))) {
    await page.setContent(await readFile(new URL(name, source), 'utf8'));
    const contacts = await page.evaluate(() => [...document.querySelectorAll('[data-seated-leg]')].map(leg => {
      const shin = leg.querySelector('[data-seated-shin]'), shaft = leg.querySelector('[data-boot-shaft]');
      const covered = [4, 7].every(offset => {
        const at = shin.getPointAtLength(Math.max(0, shin.getTotalLength() - offset));
        const world = new DOMPoint(at.x, at.y).matrixTransform(shin.getCTM());
        return [...shaft.querySelectorAll('rect')].some(rect => rect.isPointInFill(world.matrixTransform(rect.getCTM().inverse())));
      });
      const foot = leg.querySelector('[data-boot-foot]'), box = foot.getBBox(), matrix = foot.getCTM();
      const corners = [box.x, box.x + box.width].flatMap(x => [box.y, box.y + box.height]
        .map(y => new DOMPoint(x, y).matrixTransform(matrix)));
      const left = Math.min(...corners.map(point => point.x)), right = Math.max(...corners.map(point => point.x));
      return { leg: leg.dataset.seatedLeg, covered, centre: (left + right) / 2, width: right - left };
    }));
    assert.equal(contacts.length, 2, `${name}: missing leg/boot pair`);
    assert.ok(contacts.every(contact => contact.covered), `${name}: boot shaft misses its actual calf`);
    assert.ok(Math.abs(contacts[0].centre - contacts[1].centre) >= Math.min(...contacts.map(contact => contact.width)) * .75,
      `${name}: overlapping soles hide the second foot`);
    evidence.bootContacts.push({ name, contacts });
  }
  assert.equal(evidence.bootContacts.length, 144, 'incomplete boot contact matrix');
  for (const style of ['curly', 'afro']) for (const view of ['front', 'side']) {
    await page.setContent(await readFile(new URL(`hair-opening-${style}-${view}.svg`, source), 'utf8'));
    const probes = view === 'front'
      ? [[-3.6, 1.7], [3.6, 1.7], [-4.4, 4], [4.4, 4], [0, 5]]
      : [[-3.5, 1.7], [-2.4, 3.5], [-6.2, 4.5]];
    const covered = await page.evaluate(points => {
      const svg = document.querySelector('svg');
      const surfaces = [...svg.querySelectorAll('path,circle,ellipse')].filter(node => node.getAttribute('fill') === '#805336');
      return points.filter(([x, y]) => surfaces.some(node => {
        const point = new DOMPoint(x, y).matrixTransform(node.getCTM().inverse().multiply(svg.getCTM()));
        return node.isPointInFill(point);
      }));
    }, probes);
    assert.deepEqual(covered, [], `${style}/${view}: hair covers the face at ${JSON.stringify(covered)}`);
    evidence.faceOpenings.push({ style, view, probes });
  }
  async function sheet(name, title, names, columns, caption) {
    assert.ok(names.length, `${name}: empty sheet`);
    const cards = await Promise.all(names.map(async filename => {
      const svg = await readFile(new URL(filename, source));
      // Separate image documents isolate React useId gradient/clip identifiers.
      return `<figure><img src="data:image/svg+xml;base64,${svg.toString('base64')}" alt="${escape(filename)}"><figcaption>${escape(filename.replace('.svg', '').replace(/^wardrobe-/, ''))}</figcaption></figure>`;
    }));
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:22px;background:#ded6c8;color:#403746;font:12px 'Segoe UI',sans-serif}h1{font:26px Georgia,serif;margin:0 0 10px}p{margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(${columns},1fr);gap:8px}figure{margin:0;background:#f3ecdf;border-radius:8px}img{display:block;width:100%;height:160px}figcaption{padding:7px;font-size:10px}</style><h1>${escape(title)}</h1><p>Actual production SVG artwork · ${escape(caption)}</p><div class="grid">${cards.join('')}</div>`);
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: true });
    evidence.sheets.push({ name: `${name}.png`, fixtures: names });
  }
  for (const slot of slots) {
    const keys = [...new Set(files.filter(name => name.startsWith(`wardrobe-${slot}-`))
      .map(name => name.slice(`wardrobe-${slot}-`.length).replace(/-(compact|broad)-[^-]+\.svg$/, '')))];
    assert.ok(keys.length, `${slot}: no catalog coverage`);
    const names = keys.flatMap(key => bodies.flatMap(body => views.map(view => `wardrobe-${slot}-${key}-${body}-${view}.svg`)));
    assert.ok(names.every(name => files.includes(name)), `${slot}: incomplete body/pose matrix`);
    evidence.coverage[slot] = { keys, bodies, views, samples: names.length };
    await sheet(`fit-${slot}`, `Wardrobe fit: ${slot}`, names, 10,
      'Each row: compact then broad · Front / profile / rear / relaxed sitting / ankles crossed · Seat 19px');
  }
  await sheet('seated-boots-crossed', 'Seated boots: connected calves and separate feet',
    files.filter(name => /^seated-boots-.*-skirt-front-(compact|broad)\.svg$/.test(name)), 6,
    'Seat heights 13 / 17 / 21 / 26px · Relaxed, ankles crossed and folded legs · Compact/broad bodies');
  await sheet('wardrobe-colourways', 'Tops and outerwear: dark, cream and mid tones',
    files.filter(name => /^(top|coat)-/.test(name)), 9, 'All 13 tops (both swim cuts) and 10 coats, plus no coat');
  await sheet('wardrobe-hair', 'Hairstyles: keep the face visible',
    evidence.coverage.hair.keys.flatMap(key => ['front', 'side', 'back'].map(view => `hair-${view}-${key}.svg`)), 9,
    'All 19 cuts · Front / profile / rear · Curly and afro face openings corrected');
  await sheet('wardrobe-headwear', 'Hair and headwear fit',
    evidence.coverage.hair.keys.flatMap(key => ['beanie', 'headphones'].flatMap(hat => ['front', 'side', 'back']
      .map(view => `wardrobe-headwear-${key}-${hat}-${view}.svg`))), 6,
    'All 19 cuts · Replacing beanie and overlay headphones · Front / profile / rear');
  await writeFile(new URL('summary.json', output), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`PASS: ${evidence.bounds.length} fit frames, ${evidence.bootContacts.length} boot contact pairs, ${evidence.faceOpenings.length} face-opening checks and ${evidence.sheets.length} review sheets.`);
} finally { await browser.close(); }
