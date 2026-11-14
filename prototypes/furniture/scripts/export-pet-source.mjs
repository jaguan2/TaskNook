import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { petSourceFingerprint } from './pet-source.mjs';
import { chromium } from '@playwright/test';

const requireFrontend = createRequire(new URL('../../../frontend/package.json', import.meta.url));
const React = requireFrontend('react');
const { renderToStaticMarkup } = requireFrontend('react-dom/server');
const { createServer } = await import(new URL('../../../frontend/node_modules/vite/dist/node/index.js', import.meta.url));
const server = await createServer({ root: fileURLToPath(new URL('../../../frontend/', import.meta.url)), optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true, watch: null }, logLevel: 'error' });
let browser;
try {
  const { PET_SPRITES } = await server.ssrLoadModule('/src/components/IsoPetItems.jsx');
  const { PET_STAGES, PET_FORMS } = await server.ssrLoadModule('/src/lib/pets.js');
  const { project } = await server.ssrLoadModule('/src/lib/iso.js');
  const anchors = { cat: [.6, .4], dog: [.55, .35], bunny: [.35, .3] };
  const fixtures = {};
  for (const [species, Sprite] of Object.entries(PET_SPRITES)) for (const stage of PET_STAGES) for (const form of PET_FORMS) for (const pose of ['Idle', 'Rest']) for (const facing of ['front', 'side', 'back']) {
    const anchor = project(...anchors[species]);
    fixtures[[species, stage.key, form.key, pose, facing].join('-')] = renderToStaticMarkup(React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 512, height: 400, viewBox: '-32 -42 64 50' },
      React.createElement('g', { transform: `translate(${-anchor.x} ${-anchor.y})` }, React.createElement(Sprite, { pet: { growth: { ageMs: stage.ageMs, startedAt: null }, petForm: form.key, petSize: 1 }, now: 0, awake: pose !== 'Rest', facing }))));
  }
  const output = new URL('../assets/pet-pilot/', import.meta.url);
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, channel: process.env.FURNITURE_BROWSER_CHANNEL || 'msedge' });
  const page = await browser.newPage(), referenceBounds = {};
  for (const species of Object.keys(PET_SPRITES)) {
    await page.setContent(fixtures[`${species}-adult-natural-Idle-front`]);
    referenceBounds[species] = await page.locator('svg').evaluate(svg => { const b = svg.getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
  }
  await writeFile(new URL('source-art.json', output), JSON.stringify({ sourceFingerprint: await petSourceFingerprint(), stages: PET_STAGES, forms: PET_FORMS, viewBox: [-32, -42, 64, 50], referenceBounds, fixtures }) + '\n');
  console.log(`Exported ${Object.keys(fixtures).length} actual pet SVG frames and the existing growth/form contract.`);
} finally { await browser?.close(); await server.close(); }
