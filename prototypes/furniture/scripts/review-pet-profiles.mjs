// Review the actual shipping SVG rigs, including coat, age, form and motion.
// Solid intersections catch disconnected parts; contact sheets still need eyes.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { petSourceFingerprint } from './pet-source.mjs';

const requireFrontend = createRequire(new URL('../../../frontend/package.json', import.meta.url));
const React = requireFrontend('react');
const { renderToStaticMarkup } = requireFrontend('react-dom/server');
const { createServer } = await import(new URL('../../../frontend/node_modules/vite/dist/node/index.js', import.meta.url));
const output = new URL('../../../build/skill-verification/pet-profiles/', import.meta.url);
await mkdir(output, { recursive: true });
const server = await createServer({ root: fileURLToPath(new URL('../../../frontend/', import.meta.url)), optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true, watch: null }, logLevel: 'error' });
let browser;
try {
  const { PET_SPRITES } = await server.ssrLoadModule('/src/components/IsoPetItems.jsx');
  const { PET_STAGES, PET_FORMS } = await server.ssrLoadModule('/src/lib/pets.js');
  const { PET_LOOKS } = await server.ssrLoadModule('/src/lib/isoCatalog.js');
  const { project } = await server.ssrLoadModule('/src/lib/iso.js');
  const anchors = { cat: [.6, .4], dog: [.55, .35], bunny: [.35, .3] };
  const fixtures = [];
  for (const [species, Sprite] of Object.entries(PET_SPRITES)) for (const look of PET_LOOKS[species])
    for (const stage of PET_STAGES) for (const form of PET_FORMS)
      for (const pose of ['side', 'rest', 'front', 'back', 'held', 'walk']) {
        const anchor = project(...anchors[species]);
        const key = [species, look.key, stage.key, form.key, pose].join('/');
        const svg = renderToStaticMarkup(React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '-34 -44 68 52' },
          React.createElement('path', { d: 'M-30 1.5 H30', stroke: '#b9a3c4', strokeWidth: .15, opacity: .45 }),
          React.createElement('g', { transform: `translate(${-anchor.x} ${-anchor.y})` }, React.createElement(Sprite, {
            pet: { growth: { ageMs: stage.ageMs, startedAt: null }, petForm: form.key, petSize: 1 }, now: 0,
            awake: pose !== 'rest', held: pose === 'held', moving: pose === 'walk', facing: pose === 'walk' ? 'side' : pose, look: look.key,
          }))), { identifierPrefix: key.replaceAll('/', '-') });
        fixtures.push({ key, species, look: look.key, stage: stage.key, form: form.key, pose, svg });
      }
  const css = await readFile(new URL('../../../frontend/src/index.css', import.meta.url), 'utf8');
  const html = rows => `<style>${css}
    body { margin:0; background:#2f2635; color:#f2e9dd; font:12px 'Segoe UI',sans-serif; }
    main { display:grid; grid-template-columns:repeat(6,180px); gap:4px; padding:12px; }
    figure { margin:0; background:#423846; border-radius:8px; padding:6px; }
    svg { display:block; width:168px; height:130px; } figcaption { text-align:center; font-size:10px; }
  </style><main>${rows.map(f => `<figure data-key="${f.key}" data-pose="${f.pose}">${f.svg}<figcaption>${f.key.replaceAll('/', ' · ')}</figcaption></figure>`).join('')}</main>`;
  browser = await chromium.launch({ headless: true, channel: process.env.FURNITURE_BROWSER_CHANNEL || 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1124, height: 900 }, reducedMotion: 'no-preference' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setContent(html(fixtures));
  const report = await page.locator('figure').evaluateAll(figures => {
    const failures = [], phases = [0, .25, .5, .58, .8, .91, .95, .999];
    let checks = 0, failedChecks = 0;
    document.getAnimations().forEach(animation => animation.pause());
    const contains = (shape, point) => shape.isPointInFill(point.matrixTransform(shape.getScreenCTM().inverse()));
    function overlaps(a, b) {
      const aa = a.getBoundingClientRect(), bb = b.getBoundingClientRect();
      const left = Math.max(aa.left, bb.left), right = Math.min(aa.right, bb.right);
      const top = Math.max(aa.top, bb.top), bottom = Math.min(aa.bottom, bb.bottom);
      if (left >= right || top >= bottom) return false;
      const inverseA = a.getScreenCTM().inverse(), inverseB = b.getScreenCTM().inverse();
      for (let x = 0; x < 12; x++) for (let y = 0; y < 12; y++) {
        const p = new DOMPoint(left + (x + .5) / 12 * (right - left), top + (y + .5) / 12 * (bottom - top));
        if (a.isPointInFill(p.matrixTransform(inverseA)) && b.isPointInFill(p.matrixTransform(inverseB))) return true;
      }
      return false;
    }
    const record = (figure, phase, name, ok) => {
      checks++;
      if (!ok) { failedChecks++; if (failures.length < 60) failures.push({ key: figure.dataset.key, phase, name }); }
    };
    for (const figure of figures) {
      const body = figure.querySelector('[data-pet-silhouette="body"]'), head = figure.querySelector('[data-pet-skull]');
      const paws = [...figure.querySelectorAll('[data-pet-paw] > path:first-child, [data-pet-paw] > ellipse:first-child')];
      const tail = figure.querySelector('[data-pet-tail] > path');
      const root = figure.querySelector('[data-pet-stage]');
      const animations = figure.getAnimations({ subtree: true });
      animations.forEach(animation => animation.pause());
      for (const phase of phases) {
        animations.forEach(animation => { animation.currentTime = animation.effect.getTiming().duration * phase; });
        record(figure, phase, 'head joins shoulder', overlaps(head, body));
        for (const paw of paws) record(figure, phase, 'paw joins body or head', overlaps(paw, body) || overlaps(paw, head));
        if (tail) {
          const base = tail.getPointAtLength(0).matrixTransform(tail.getScreenCTM());
          record(figure, phase, 'tail emerges from rump', contains(body, base));
        }
        if (figure.dataset.pose !== 'held') {
          const floor = paws.map(paw => {
            const box = paw.getBBox(), matrix = root.getScreenCTM().inverse().multiply(paw.getScreenCTM());
            return Math.max(...[[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
              .map(([x,y]) => new DOMPoint(x,y).matrixTransform(matrix).y));
          });
          record(figure, phase, 'feet remain on or above floor', floor.every(y => y < 2.3));
          record(figure, phase, 'at least one supporting paw', floor.some(y => Math.abs(y) < 2.1));
        }
      }
      const bounds = root.getBBox(), matrix = figure.querySelector('svg').getScreenCTM().inverse().multiply(root.getScreenCTM());
      const corners = [[bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y], [bounds.x, bounds.y + bounds.height], [bounds.x + bounds.width, bounds.y + bounds.height]]
        .map(([x,y]) => new DOMPoint(x,y).matrixTransform(matrix));
      record(figure, 'framing', 'review frame contains the pet', bounds.width > 0 && corners.every(p => p.x >= -34 && p.x <= 34 && p.y >= -44 && p.y <= 8));
      record(figure, 'motion', 'breathing does not lift planted paws', !figure.querySelector('.cat-breathe [data-pet-paw]'));
    }
    return { fixtures: figures.length, phases: phases.length, checks, failedChecks, failures };
  });
  for (const species of Object.keys(PET_SPRITES)) {
    await page.setContent(html(fixtures.filter(f => f.species === species && f.look === PET_LOOKS[species][0].key)));
    await page.screenshot({ path: fileURLToPath(new URL(`${species}-growth.png`, output)), fullPage: true, animations: 'disabled' });
  }
  await page.setContent(html(fixtures.filter(f => f.stage === 'adult' && f.form === 'natural' && ['side', 'rest'].includes(f.pose))));
  await page.screenshot({ path: fileURLToPath(new URL('pet-side-poses.png', output)), fullPage: true, animations: 'disabled' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setContent(html(fixtures.filter(f => f.stage === 'adult' && f.form === 'natural')));
  // The app resolves OS/user preferences into this attribute; raw SVG fixtures
  // do not mount useAppearanceSettings and must apply the same contract.
  await page.evaluate(() => { document.documentElement.dataset.motion = 'reduced'; });
  const reducedMotionAnimations = await page.evaluate(() => document.getAnimations().length);
  const result = { ...report, reducedMotionAnimations, errors, sourceFingerprint: await petSourceFingerprint() };
  await writeFile(new URL('anatomy-report.json', output), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  assert.deepEqual(errors, []);
  assert.equal(reducedMotionAnimations, 0, 'Reduced motion must stop pet movement');
  assert.deepEqual(report.failures, [], 'A pet part lost its joint or ground contact; inspect anatomy-report.json and the review sheets');
} finally { await browser?.close(); await server.close(); }
