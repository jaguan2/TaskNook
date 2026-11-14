import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createPreviewServer } from '../server.mjs';

const evidencePath = fileURLToPath(new URL('../../../build/skill-verification/pet-pilot/', import.meta.url));
const pictures = new URL('../../../docs/model-review/characters-and-pets/', import.meta.url);
await mkdir(evidencePath, { recursive: true });
const server = createPreviewServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const evidence = { errors: [], combinations: 0, poseViews: 0, checks: [], maxDraws: 0, maxTriangles: 0 };
try {
  browser = await chromium.launch({ headless: true, channel: process.env.FURNITURE_BROWSER_CHANNEL || 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1200, height: 940 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const requests = new Map(); let injectedFault = false, expectedErrors = 0;
  page.on('pageerror', error => evidence.errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (injectedFault && message.location().url.endsWith('/bunny.glb') && message.text().includes('net::ERR_FAILED')) expectedErrors++;
    else evidence.errors.push(message.text());
  });
  page.on('request', request => { if (request.url().endsWith('.glb')) { const key = new URL(request.url()).pathname; requests.set(key, (requests.get(key) || 0) + 1); } });
  await page.goto(`http://127.0.0.1:${server.address().port}/pets.html`);
  const settle = () => page.waitForFunction(() => document.querySelector('#viewport')?.dataset.ready === 'true' && document.querySelector('#viewport').dataset.loading === 'false' && document.querySelector('#source').complete && document.querySelector('#source').naturalWidth > 0);
  const sample = () => page.evaluate(() => window.petPilot.sample());
  await settle();
  const sourceData = JSON.parse(await readFile(new URL('../assets/pet-pilot/source-art.json', import.meta.url)));
  const framing = await context.newPage();
  await framing.setContent(Object.values(sourceData.fixtures).join(''));
  const outside = await framing.locator('svg').evaluateAll((svgs, bounds) => svgs.flatMap((svg, index) => {
    const box = svg.getBBox(), [x, y, width, height] = bounds;
    return box.x < x - .1 || box.y < y - .1 || box.x + box.width > x + width + .1 || box.y + box.height > y + height + .1 ? [index] : [];
  }), sourceData.viewBox);
  assert.deepEqual(outside, [], 'A production comparison frame is cropped');
  await framing.close(); evidence.checks.push('All 162 actual SVG comparison frames fit their fixed review bounds');
  injectedFault = true;
  await page.route('**/bunny.glb', async route => { await new Promise(resolve => setTimeout(resolve, 180)); await route.abort('failed'); });
  await page.selectOption('#species', 'bunny'); await page.selectOption('#species', 'dog');
  await settle(); await page.waitForTimeout(240);
  assert.equal((await sample()).loadedSpecies, 'dog'); assert.equal(await page.locator('#play').isDisabled(), false); assert.equal(expectedErrors, 1);
  injectedFault = false; await page.unroute('**/bunny.glb');
  evidence.checks.push('Stale failed species load cannot replace a newer successful pet');

  const growth = [], poses = [];
  const labels = { cat: 'Cat', dog: 'Dog', bunny: 'Rabbit' };
  for (const species of ['cat', 'dog', 'bunny']) {
    await page.selectOption('#species', species); await settle();
    assert.equal((await sample()).loadedSpecies, species);
    await page.selectOption('#pose', 'Idle'); await page.selectOption('#form', 'natural'); await page.selectOption('#age', 'adult');
    await page.locator('[data-view="room"]').click(); await settle();
    growth.push({ label: `${labels[species]} · current SVG adult`, bytes: await page.locator('.comparison section').first().screenshot() });
    for (const age of ['baby', 'teen', 'adult']) {
      await page.selectOption('#age', age); await settle();
      growth.push({ label: `${labels[species]} · ${age === 'teen' ? 'medium' : age}`, bytes: await page.locator('.comparison section').last().screenshot() });
      for (const form of ['natural', 'slender', 'round']) {
        await page.selectOption('#form', form); await settle();
        const stats = await sample();
        assert.ok(stats.triangles > 1000 && stats.draws > 0);
        evidence.maxDraws = Math.max(evidence.maxDraws, stats.draws); evidence.maxTriangles = Math.max(evidence.maxTriangles, stats.triangles);
        evidence.combinations++;
      }
      await page.selectOption('#form', 'natural');
    }
    for (const [pose, view] of [['Idle', 'front'], ['Idle', 'side'], ['Idle', 'back'], ['Rest', 'room']]) {
      await page.selectOption('#pose', pose); await page.locator(`[data-view="${view}"]`).click(); await settle();
      poses.push({ label: `${labels[species]} · ${pose === 'Rest' ? 'resting' : view}`, bytes: await page.locator('.comparison section').last().screenshot() }); evidence.poseViews++;
    }
    await page.selectOption('#pose', 'Walk');
    await page.getByRole('button', { name: 'Play motion', exact: true }).click();
    await page.waitForTimeout(180); assert.ok((await sample()).time > .05);
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    const paused = (await sample()).time; await page.waitForTimeout(100); assert.equal((await sample()).time, paused);
  }
  for (const [path, count] of requests) assert.equal(count, path.endsWith('bunny.glb') ? 2 : 1);
  evidence.checks.push('All 27 species/age/form combinations render; 12 pose views captured; each successful GLB is cached');
  evidence.checks.push('Walk animation advances and pauses for all three pets');

  await page.selectOption('#pose', 'Idle');
  const fingerprint = async () => createHash('sha256').update(await page.locator('#viewport').screenshot()).digest('hex');
  const original = await fingerprint();
  await page.locator('#coat').evaluate(input => { input.value = '#746c89'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.notEqual(await fingerprint(), original);
  await page.getByRole('button', { name: 'Play motion', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !window.petPilot.sample().playing && document.querySelector('#play').disabled);
  const stopped = (await sample()).time; await page.waitForTimeout(120); assert.equal((await sample()).time, stopped);
  evidence.checks.push('Coat recolour changes rendered pixels; OS reduced motion disables playback');
  await page.locator('#native-scale').check(); await page.waitForTimeout(80);
  await page.screenshot({ path: `${evidencePath}/room-scale.png`, fullPage: true });
  await page.locator('#native-scale').uncheck(); await page.setViewportSize({ width: 466, height: 678 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#form').focus(); assert.ok(await page.locator('#form').evaluate(el => el === document.activeElement));
  evidence.checks.push('Room-scale, narrow viewport and keyboard selection remain usable');

  async function sheet(filename, title, captures) {
    const gallery = await context.newPage(); await gallery.setViewportSize({ width: 1360, height: 900 });
    await gallery.setContent(`<html><head><style>body{margin:0;padding:28px;background:#eee8dd;color:#423746;font:14px system-ui}h1{font:32px Georgia;margin:0 0 10px}p{margin:0 0 22px;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}figure{margin:0;overflow:hidden;background:#e4dccf;border-radius:14px}img{display:block;width:100%}figcaption{padding:12px}</style></head><body><h1>${title}</h1><p>Connected Blender mesh pilots · Classic coats · Baby / medium / adult and Natural / Slender / Round<br>Standing, walking and resting studies; production pets and their growth clocks remain unchanged.</p><div class="grid">${captures.map(({ label, bytes }) => `<figure><img src="data:image/png;base64,${bytes.toString('base64')}" alt="${label}"><figcaption>${label}</figcaption></figure>`).join('')}</div></body></html>`);
    await gallery.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await gallery.screenshot({ path: fileURLToPath(new URL(filename, pictures)), fullPage: true }); await gallery.close();
  }
  await sheet('pets-3d-growth-pilot.png', 'TaskNook · Pet growth comparison', growth);
  await sheet('pets-3d-poses-pilot.png', 'TaskNook · Connected pet silhouettes', poses);
  const navigation = await context.newPage(); await navigation.setViewportSize({ width: 466, height: 678 });
  await navigation.goto(`http://127.0.0.1:${server.address().port}/`);
  assert.ok(await navigation.getByRole('navigation', { name: 'Model pilots' }).isVisible());
  assert.ok(await navigation.locator('header').evaluate(el => el.scrollWidth <= el.clientWidth));
  await navigation.close(); evidence.checks.push('Workshop pilot navigation fits a narrow window');
  await page.evaluate(() => document.querySelector('#viewport canvas').dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  assert.match(await page.locator('#status').textContent(), /Graphics context lost/); assert.ok(await page.locator('#play').isDisabled());
  evidence.checks.push('Graphics failure exposes named feedback and stops motion');
  assert.deepEqual(evidence.errors, []);
  await writeFile(`${evidencePath}/summary.json`, JSON.stringify({ ...evidence, passed: true }, null, 2) + '\n');
  console.log(JSON.stringify({ ...evidence, passed: true }));
} catch (error) {
  await writeFile(`${evidencePath}/summary.json`, JSON.stringify({ ...evidence, passed: false, failure: error.message }, null, 2) + '\n'); throw error;
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
