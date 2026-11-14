import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createPreviewServer } from '../server.mjs';

const output = fileURLToPath(new URL('../../../build/skill-verification/character-pilot/', import.meta.url));
const sheet = fileURLToPath(new URL('../../../docs/model-review/characters-and-pets/resident-3d-pilot.png', import.meta.url));
await mkdir(output, { recursive: true });
const server = createPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const evidence = { browser: null, views: [], errors: [], maxDrawCalls: 0, maxTriangles: 0, checks: [] };
try {
  browser = await chromium.launch({ headless: true, channel: process.env.FURNITURE_BROWSER_CHANNEL || 'msedge' });
  evidence.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1200, height: 940 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const requests = new Map();
  let oldBedFault = false, injectedFailures = 0;
  page.on('pageerror', error => evidence.errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (oldBedFault && message.location().url.endsWith('/assets/bed.glb') && message.text().includes('net::ERR_FAILED')) injectedFailures++;
    else evidence.errors.push(message.text());
  });
  page.on('request', request => { if (request.url().endsWith('.glb')) { const key = new URL(request.url()).pathname; requests.set(key, (requests.get(key) || 0) + 1); } });
  await page.goto(`http://127.0.0.1:${server.address().port}/character.html`);
  const settle = () => page.waitForFunction(() => document.querySelector('#viewport')?.dataset.ready === 'true' && document.querySelector('#viewport').dataset.loading === 'false' && document.querySelector('#source').complete && document.querySelector('#source').naturalWidth > 0);
  await settle();
  const sample = () => page.evaluate(() => window.characterPilot.sample());
  assert.equal((await sample()).playing, false);
  assert.equal((await sample()).skins, 14);
  assert.deepEqual(await page.locator('#pose option').evaluateAll(options => options.map(option => option.value).sort()), ['AnklesCrossed', 'Idle', 'Sit', 'Sleep', 'Type', 'Walk']);
  for (const facing of ['front', 'side', 'back']) assert.equal((await page.request.get(`http://127.0.0.1:${server.address().port}/assets/character-pilot/svg-crosslegged-${facing}.svg`)).status(), 404, 'Retired comparison frame remains available');

  // A stale failed cold load must not replace a new successful pose with an error.
  oldBedFault = true;
  await page.route('**/assets/bed.glb', async route => { await new Promise(resolve => setTimeout(resolve, 180)); await route.abort('failed'); });
  await page.selectOption('#pose', 'Sleep');
  await page.selectOption('#pose', 'Type');
  await settle(); await page.waitForTimeout(240);
  assert.deepEqual((await sample()).visibleProps, ['chair', 'desk', 'laptop']);
  assert.equal(await page.locator('#viewport').getAttribute('data-ready'), 'true');
  assert.equal(await page.locator('#play').isDisabled(), false);
  assert.equal(injectedFailures, 1);
  oldBedFault = false;
  await page.unroute('**/assets/bed.glb');
  evidence.checks.push('Stale failed furniture load cannot replace the selected pose or its ready state');

  const captures = [];
  const cases = [['Idle', 'front', 'Standing · front'], ['Idle', 'side', 'Standing · profile'], ['Idle', 'back', 'Standing · rear'],
    ['Sit', 'room', 'Seated · room angle'], ['Type', 'side', 'Typing · keyboard reach'], ['Sleep', 'room', 'Sleeping · bent limbs'],
    ['AnklesCrossed', 'front', 'Ankles crossed'], ['Sit', 'side', 'Seated · profile']];
  for (const [pose, view, label] of cases) {
    await page.selectOption('#pose', pose);
    await page.locator(`[data-view="${view}"]`).click(); await settle();
    const stats = await sample();
    assert.ok(stats.drawCalls > 0 && stats.triangles > 1000);
    evidence.maxDrawCalls = Math.max(evidence.maxDrawCalls, stats.drawCalls);
    evidence.maxTriangles = Math.max(evidence.maxTriangles, stats.triangles);
    evidence.views.push({ label, ...stats });
    if (!captures.length) captures.push({ label: 'Current production SVG · standing', bytes: await page.locator('.comparison section').first().screenshot() });
    captures.push({ label, bytes: await page.locator('.comparison section').last().screenshot() });
  }
  for (const [path, count] of requests) assert.equal(count, path === '/assets/bed.glb' ? 2 : 1, 'A successfully cached model was downloaded again');
  evidence.checks.push('Eight pose/view combinations render; each GLB loads once');

  await page.selectOption('#pose', 'Idle'); await page.locator('[data-view="front"]').click(); await settle();
  const fingerprint = async () => createHash('sha256').update(await page.locator('#viewport').screenshot()).digest('hex');
  const baseline = await fingerprint();
  for (const colour of ['#242032', '#f0e5cc', '#b77362']) {
    await page.locator('[data-material="outfit"]').evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, colour);
    assert.notEqual(await fingerprint(), baseline, 'Sweater recolour did not render');
  }
  await page.locator('[data-material="outfit"]').evaluate(input => { input.value = '#7faf8f'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  const slim = await fingerprint();
  await page.locator('#fullness').focus(); await page.locator('#fullness').press('End');
  assert.notEqual(await fingerprint(), slim, 'Body fullness did not render');
  await page.locator('#fullness').press('Home');
  evidence.checks.push('Dark/light/clay sweater materials and body fullness change rendered pixels');

  await page.selectOption('#pose', 'Walk'); await settle();
  await page.getByRole('button', { name: 'Play motion', exact: true }).click();
  await page.waitForTimeout(180);
  assert.ok((await sample()).time > .05);
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  const paused = (await sample()).time;
  await page.waitForTimeout(120);
  assert.equal((await sample()).time, paused);
  await page.getByRole('button', { name: 'Play motion', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !window.characterPilot.sample().playing && document.querySelector('#play').disabled);
  assert.equal((await sample()).playing, false);
  assert.ok(await page.locator('#play').isDisabled());
  const still = (await sample()).time;
  await page.waitForTimeout(120);
  assert.equal((await sample()).time, still);
  evidence.checks.push('Motion advances only when playing; pause and OS reduced motion stop it');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.selectOption('#pose', 'Idle'); await settle();
  await page.locator('#native-scale').check();
  await page.waitForTimeout(80);
  captures.push({ label: 'Current SVG and rigged pilot · room-scale preview', bytes: await page.locator('.comparison').screenshot() });
  await page.locator('#native-scale').uncheck();
  await page.setViewportSize({ width: 466, height: 678 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#pose').selectOption('Sit'); await settle();
  await page.locator('#fullness').focus();
  assert.equal(await page.locator('#fullness').evaluate(el => el === document.activeElement), true);
  await page.screenshot({ path: `${output}/narrow-preview.png`, fullPage: true });
  evidence.checks.push('Room-scale view, narrow layout and keyboard focus remain usable');

  const gallery = await context.newPage();
  await gallery.setViewportSize({ width: 1168, height: 900 });
  await gallery.setContent(`<html><head><style>body{margin:0;padding:32px;background:#eee8dd;color:#423746;font:14px system-ui}h1{font:32px Georgia;margin:0 0 8px}p{margin:0 0 24px;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}figure{margin:0;background:#e4dccf;border-radius:16px;overflow:hidden}figure:last-child{grid-column:1/-1}img{display:block;width:100%}figcaption{padding:12px 16px;font-weight:600}</style></head><body><h1>TaskNook · Resident modelling pilot</h1><p>Editable Blender source · Connected skinned surfaces · Virtual Cottage 2 style references<br>One outfit and six pose clips; production SVG characters remain in place.</p><div class="grid">${captures.map(({ label, bytes }) => `<figure><img src="data:image/png;base64,${bytes.toString('base64')}" alt="${label}"><figcaption>${label}</figcaption></figure>`).join('')}</div></body></html>`);
  await gallery.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await gallery.screenshot({ path: sheet, fullPage: true });

  // Graphics failure leaves named feedback instead of a silent empty study.
  await page.evaluate(() => document.querySelector('#viewport canvas').dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  assert.match(await page.locator('#status').textContent(), /Graphics context lost/);
  assert.ok(await page.locator('#play').isDisabled());
  evidence.checks.push('Graphics failure exposes a reload message');
  assert.deepEqual(evidence.errors, []);
  await writeFile(`${output}/summary.json`, JSON.stringify({ ...evidence, passed: true, sheet }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, views: evidence.views.length, checks: evidence.checks.length, maxDrawCalls: evidence.maxDrawCalls, maxTriangles: evidence.maxTriangles, sheet }));
} catch (error) {
  await writeFile(`${output}/summary.json`, JSON.stringify({ ...evidence, passed: false, failure: error.message }, null, 2) + '\n');
  throw error;
} finally {
  await browser?.close(); server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
