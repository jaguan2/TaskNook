import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createPreviewServer } from '../server.mjs';
import { cleanupQa } from './cleanup-qa.mjs';

const output = fileURLToPath(new URL('../../../build/skill-verification/furniture-3d/', import.meta.url));
const assetManifest = JSON.parse(await readFile(new URL('../assets/manifest.json', import.meta.url)));
const reviewSection = process.env.FURNITURE_QA_SECTION;
const reviewSections = reviewSection ? new Set(reviewSection.split(',').map(value => value.trim()).filter(Boolean)) : null;
for (const section of reviewSections || []) if (!assetManifest.sections.some(family => family.id === section && family.exported.length)) throw new Error(`No exported models in section: ${section}`);
const reviewedModels = Object.keys(assetManifest.models).filter(key => !reviewSections || reviewSections.has(assetManifest.models[key].section));
if (!reviewedModels.length) throw new Error(`No exported models in section: ${reviewSection}`);
await mkdir(output, { recursive: true });
await cleanupQa({ keepSummaries: false });
const server = createPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const evidence = { scope: reviewSection || 'full exported catalog', browser: null, viewChecks: [], errors: [], notes: [] };
let succeeded = false;
try {
  browser = await chromium.launch({ headless: true,
    ...(process.env.FURNITURE_BROWSER_CHANNEL && { channel: process.env.FURNITURE_BROWSER_CHANNEL }) });
  evidence.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(20000);
  const requests = new Map();
  let phase = 'startup';
  const requestPhases = new WeakMap();
  page.on('request', request => { requestPhases.set(request, phase); if (request.url().endsWith('.glb')) { const key = request.url().split('/').at(-1).replace('.glb', ''); requests.set(key, (requests.get(key) || 0) + 1); } });
  page.on('pageerror', error => evidence.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') evidence.errors.push(message.text()); });
  page.on('requestfailed', request => evidence.errors.push(`Request failed: ${request.url()} (${request.failure()?.errorText}; ${request.resourceType()}; started ${requestPhases.get(request)}, failed ${phase})`));
  await page.goto(origin);
  await page.locator('#viewport[data-ready="true"]').waitFor();
  assert.deepEqual([...requests.keys()].sort(), ['armchair', 'coffeetable', 'sofa'], 'startup should load only the room assets');
  const selectModel = async key => {
    const section = assetManifest.models[key].section;
    if (await page.locator('#catalog-section').inputValue() !== section) {
      await page.locator('#catalog-section').selectOption(section);
      // Changing section automatically selects its first entry. Settle that
      // real UI action before the next click; racing it creates orphan loads
      // in a smoke run. Explicit stale-response tests below retain that race.
      const first = assetManifest.sections.find(family => family.id === section).exported[0];
      await page.locator(`#viewport[data-model="${first}"][data-loading="false"]`).waitFor();
    }
    await page.locator(`button[data-model="${key}"]`).click();
    await page.locator(`#viewport[data-model="${key}"][data-loading="false"]`).waitFor();
  };
  const paint = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const fingerprints = new Map(), colorFingerprints = new Map();
  assert.equal(await page.locator('#viewport').getAttribute('data-style'), 'illustrated');
  for (const model of reviewedModels) {
    phase = `model ${model}`;
    await selectModel(model);
    const fixedPalette = assetManifest.models[model].tintable === false;
    assert.equal(await page.locator('#color').isDisabled(), fixedPalette);
    for (const color of fixedPalette ? [assetManifest.models[model].defaultColor] : ['#8baba0', '#e7d9bf', '#393545']) {
      if (!fixedPalette) await page.locator(`button[data-color="${color}"]`).click();
      for (const view of ['iso', 'rear', 'under']) {
        await page.locator(`button[data-view="${view}"]`).click(); await paint();
        const filename = `${model}-${color.slice(1)}-${view}.png`;
        const bytes = await page.locator('#viewport').screenshot({ path: `${output}/${filename}` });
        const hash = createHash('sha256').update(bytes).digest('hex');
        const variants = fingerprints.get(`${model}-${color}`) || new Set();
        assert.ok(!variants.has(hash), `camera did not change the render: ${filename}`);
        variants.add(hash); fingerprints.set(`${model}-${color}`, variants);
        if (view === 'iso') {
          const colors = colorFingerprints.get(model) || new Set();
          assert.ok(!colors.has(hash), `recolor did not change a visible surface: ${filename}`);
          colors.add(hash); colorFingerprints.set(model, colors);
        }
        const sample = await page.evaluate(() => {
          const sample = document.createElement('canvas'); sample.width = sample.height = 96;
          const context = sample.getContext('2d');
          context.drawImage(document.querySelector('#viewport canvas'), 0, 0, 96, 96);
          const rgba = context.getImageData(0, 0, 96, 96).data, colors = new Set();
          let occupied = 0;
          for (let i = 0; i < rgba.length; i += 4) {
            colors.add(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`);
            if (Math.abs(rgba[i] - 42) + Math.abs(rgba[i + 1] - 36) + Math.abs(rgba[i + 2] - 43) > 16) occupied++;
          }
          return { colors: colors.size, occupied };
        });
        // A correctly closed timber back can legitimately have very few
        // matte tones. Check occupied area as well as variation, not texture.
        // Dark metal can differ only slightly from the dark backdrop. Clear
        // colour variation or a broad low-tone shape both establish a render.
        assert.ok(sample.colors > 32 || (sample.colors > 4 && sample.occupied > 300), `blank canvas: ${filename} (${JSON.stringify(sample)})`);
        evidence.viewChecks.push({ model, color, view, filename, distinctSampleColors: sample.colors, occupiedSamplePixels: sample.occupied });
      }
    }
    if (!fixedPalette) await page.locator('#color').evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, assetManifest.models[model].defaultColor);
    await page.locator('button[data-view="iso"]').click(); await paint();
    await page.locator('#viewport').screenshot({ path: `${output}/${model}-default-iso.png` });
    const hasLight = !!assetManifest.models[model].lightSources?.length;
    assert.equal(await page.locator('#light-state').isDisabled(), !hasLight);
    if (hasLight) {
      // Metal shades legitimately hide their bulb from above. Test the
      // switch through the opening, then restore the natural gallery angle.
      if (assetManifest.models[model].shadeOpenings?.length) {
        await page.locator('button[data-view="under"]').click(); await paint();
      }
      const lit = await page.locator('#viewport').screenshot();
      await page.locator('#light-state').click(); await paint();
      assert.equal(await page.locator('#viewport').getAttribute('data-light-enabled'), 'false');
      assert.notDeepEqual(lit, await page.locator('#viewport').screenshot(), `${model}: light switch must change the emitted appearance`);
      await page.locator('#light-state').click(); await paint();
      assert.deepEqual(lit, await page.locator('#viewport').screenshot(), 'switching the light back on must restore the selected finish');
      await page.locator('button[data-view="iso"]').click(); await paint();
    }
    if (assetManifest.models[model].animations?.length) {
      assert.equal(await page.locator('#motion-controls').isVisible(), true);
      const still = await page.locator('#viewport').screenshot();
      for (const clip of ['Idle', 'Walk']) {
        await page.locator('#motion-clip').selectOption(clip); await page.locator('#motion-state').click();
        await page.waitForTimeout(350); assert.equal(await page.locator('#viewport').getAttribute('data-motion'), clip);
        assert.notDeepEqual(still, await page.locator('#viewport').screenshot(), `${model}: ${clip} did not move the rendered rig`);
        await page.locator('#motion-state').click(); await paint();
        assert.deepEqual(still, await page.locator('#viewport').screenshot(), 'stopping motion must restore the model');
      }
    }
  }
  for (const key of reviewedModels) assert.equal(requests.get(key), 1, 'assets should reuse their loaded model');
  phase = 'material and contact checks';
  await selectModel('coffeetable');
  await page.locator('#color').evaluate(input => { input.value = '#b08a61'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await selectModel('armchair');
  await page.locator('button[data-color="#8baba0"]').click();
  await page.locator('button[data-view="iso"]').click(); await paint();
  const frames = await page.locator('#viewport').getAttribute('data-frames');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#viewport').getAttribute('data-frames'), frames, 'idle preview must not continuously render');
  await page.screenshot({ path: `${output}/workshop-desktop.png`, fullPage: true });
  const illustrated = await page.locator('#viewport').screenshot();
  await page.locator('button[data-style="original"]').click(); await paint();
  assert.notDeepEqual(illustrated, await page.locator('#viewport').screenshot(), 'shading comparison must change the appearance');
  await page.locator('button[data-style="illustrated"]').click(); await paint();
  assert.deepEqual(illustrated, await page.locator('#viewport').screenshot(), 'illustrated shading must restore the selected material color');
  const contactManifest = JSON.parse(await readFile(new URL('../assets/characters/manifest.json', import.meta.url)));
  for (const chair of Object.keys(assetManifest.models).filter(key => assetManifest.models[key].contact)) {
    await selectModel(chair);
    await page.locator('button[data-mode="contact"]').click();
    for (const look of contactManifest.looks) for (const body of contactManifest.bodies) {
      await page.locator('#resident-look').selectOption(look.key);
      await page.locator('#resident-body').selectOption(body.key);
      await page.locator('#viewport[data-contact-ready="true"]').waitFor(); await paint();
      assert.equal(await page.locator('.views').isVisible(), false, 'front-only character check must not offer orbit presets');
      await page.locator('#viewport').screenshot({ path: `${output}/contact-${chair}-${look.key}-${body.key}.png` });
    }
    const locked = await page.locator('#viewport').screenshot();
    const contactBox = await page.locator('#viewport').boundingBox();
    await page.mouse.move(contactBox.x + contactBox.width / 2, contactBox.y + contactBox.height / 2);
    await page.mouse.down(); await page.mouse.move(contactBox.x + contactBox.width / 2 + 90, contactBox.y + contactBox.height / 2, { steps: 5 }); await page.mouse.up(); await paint();
    assert.deepEqual(locked, await page.locator('#viewport').screenshot(), 'fixed-front check must not rotate the 2D resident');
  }
  await selectModel('bed'); await paint();
  assert.equal(await page.locator('#viewport').getAttribute('data-mode'), 'object', 'unsupported furniture must leave the seating check');
  assert.equal(await page.locator('button[data-mode="contact"]').isDisabled(), true);
  await selectModel('armchair');
  const downloadPromise = page.waitForEvent('download');
  phase = 'download';
  await page.locator('#download').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'armchair.glb');
  const downloaded = await readFile(await download.path());
  const asset = await readFile(new URL('../assets/armchair.glb', import.meta.url));
  assert.deepEqual(downloaded, asset, 'download must be the actual standalone asset');
  await page.locator('button[data-mode="room"]').click(); await paint();
  const room = await page.locator('#viewport').screenshot({ path: `${output}/furnished-room.png` });
  await page.locator('button[data-view="rear"]').click(); await paint();
  const rear = await page.locator('#viewport').screenshot({ path: `${output}/room-rear.png` });
  assert.notDeepEqual(room, rear, 'room camera control must change the render');
  for (const layout of ['study', 'cafe', 'storage', 'textiles', 'lighting', 'lounge']) {
    phase = `room ${layout}`;
    await page.locator('#room-layout').selectOption(layout);
    await page.locator(`#viewport[data-room="${layout}"][data-room-loading="false"]`).waitFor(); await paint();
    const capture = await page.locator('#viewport').screenshot({ path: `${output}/room-${layout}.png` });
    if (layout !== 'lounge') assert.notDeepEqual(capture, room, 'room arrangement did not change');
  }
  await page.locator('button[data-view="iso"]').click(); await paint();
  await page.locator('#color').evaluate(input => { input.value = '#bc8870'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await paint();
  assert.notDeepEqual(room, await page.locator('#viewport').screenshot(), 'custom material must recolor the room models');
  // Exercise real pointer orbit and wheel zoom rather than only the presets.
  const box = await page.locator('#viewport').boundingBox();
  const before = await page.locator('#viewport').screenshot();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 8 }); await page.mouse.up();
  await page.mouse.wheel(0, -180); await paint();
  assert.notDeepEqual(before, await page.locator('#viewport').screenshot(), 'pointer controls must move the camera');
  await page.setViewportSize({ width: 390, height: 844 }); await paint();
  phase = 'mobile';
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile page overflows horizontally');
  await page.locator('button[data-mode="object"]').click();
  await selectModel('sofa'); await paint();
  await page.screenshot({ path: `${output}/workshop-mobile.png`, fullPage: true });
  await page.locator('button[data-mode="contact"]').click();
  await page.locator('#resident-look').selectOption('cozy-gamer');
  await page.locator('#resident-body').selectOption('compact');
  await page.locator('#viewport[data-contact-ready="true"]').waitFor(); await paint();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile contact controls overflow');
  await page.screenshot({ path: `${output}/workshop-mobile-contact.png`, fullPage: true });
  await page.locator('button[data-mode="object"]').click();
  await page.locator('button[data-view="front"]').focus(); await page.keyboard.press('Enter'); await paint();
  assert.equal(await page.locator('button[data-view="front"]').evaluate(el => document.activeElement === el), true);
  // A separate context verifies useful failure feedback without touching the
  // successful run's console evidence or any real TaskNook data.
  const failure = await browser.newPage();
  phase = 'isolated failure scenarios';
  await failure.route('**/assets/armchair.glb', route => route.fulfill({ status: 404, body: 'missing model' }));
  await failure.goto(origin);
  await failure.locator('#viewport[data-error="true"]').waitFor();
  assert.match(await failure.locator('#status').textContent(), /Unable to open the 3D preview/);
  await failure.close();
  const optional = await browser.newPage(); optional.setDefaultTimeout(20000);
  await optional.route('**/assets/woodstool.glb', route => route.fulfill({ status: 404, body: 'missing optional model' }));
  await optional.goto(origin); await optional.locator('#viewport[data-ready="true"]').waitFor();
  await optional.locator('button[data-model="woodstool"]').click();
  await optional.waitForFunction(() => document.querySelector('#status').textContent.includes('Unable to load this furniture'));
  assert.equal(await optional.locator('#viewport').getAttribute('data-model'), 'armchair', 'failed selection must retain the previous model');
  await optional.unroute('**/assets/woodstool.glb');
  await optional.locator('button[data-model="woodstool"]').click();
  await optional.locator('#viewport[data-model="woodstool"][data-loading="false"]').waitFor();
  await optional.route('**/assets/chair.glb', async route => { await new Promise(resolve => setTimeout(resolve, 200)); await route.continue(); });
  await optional.locator('button[data-model="chair"]').click();
  await optional.locator('button[data-model="armchair"]').click();
  await optional.waitForTimeout(400);
  assert.equal(await optional.locator('#viewport').getAttribute('data-model'), 'armchair', 'late model response must not replace the newer selection');
  assert.equal(await optional.locator('#status').textContent(), '');
  await optional.locator('button[data-mode="room"]').click();
  await optional.route('**/assets/desk.glb', route => route.fulfill({ status: 404, body: 'missing room model' }));
  await optional.locator('#room-layout').selectOption('study');
  await optional.waitForFunction(() => document.querySelector('#status').textContent.includes('Unable to open this room'));
  assert.equal(await optional.locator('#viewport').getAttribute('data-room'), 'lounge');
  assert.equal(await optional.locator('#room-layout').inputValue(), 'lounge');
  await optional.unroute('**/assets/desk.glb');
  await optional.locator('#room-layout').selectOption('study');
  await optional.locator('#viewport[data-room="study"][data-room-loading="false"]').waitFor();
  assert.equal(await optional.locator('#status').textContent(), '', 'successful room retry must clear the error');
  await optional.route('**/assets/coffeecounter.glb', async route => { await new Promise(resolve => setTimeout(resolve, 200)); await route.continue(); });
  await optional.locator('#room-layout').selectOption('cafe');
  await optional.locator('#room-layout').selectOption('lounge');
  await optional.waitForTimeout(400);
  assert.equal(await optional.locator('#viewport').getAttribute('data-room'), 'lounge', 'late room response must not replace the newer arrangement');
  await optional.close();

  const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  phase = 'section sheets';
  for (const family of assetManifest.sections.filter(section => section.complete && (!reviewSections || reviewSections.has(section.id)))) {
    const cards = await Promise.all(family.exported.map(async key => {
      const image = (await readFile(`${output}/${key}-default-iso.png`)).toString('base64');
      return `<figure><img src="data:image/png;base64,${image}" alt="${escape(assetManifest.models[key].label)}"><figcaption>${escape(assetManifest.models[key].label)}</figcaption></figure>`;
    }));
    const sheet = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const html = `<!doctype html><meta charset="utf-8"><title>${escape(family.label)} — standalone assets</title><style>*{box-sizing:border-box}body{margin:0;padding:36px;background:#201c22;color:#eee7da;font-family:'Segoe UI',sans-serif}h1{font:32px Georgia,serif;margin:0 0 12px}p{font-size:13px;color:#bdb1b7;margin:0 0 28px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0;background:#2a242b;border:1px solid #ffffff16;border-radius:12px;overflow:hidden}img{width:100%;height:235px;object-fit:cover;display:block}figcaption{font-size:13px;padding:14px 18px}</style><h1>${escape(family.label)}</h1><p>${family.exported.length} standalone pieces · Illustrated shading · Natural finishes · Geometry and contact review</p><div class="grid">${cards.join('')}</div>`;
    await writeFile(`${output}/${family.id}-section.html`, html);
    await sheet.setContent(html); await sheet.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    await sheet.screenshot({ path: `${output}/${family.id}-section.png`, fullPage: true }); await sheet.close();
  }
  assert.deepEqual(evidence.errors, [], 'browser errors');
  evidence.notes.push(`${evidence.viewChecks.length} asset/color/view captures; ${Object.values(assetManifest.models).filter(spec => spec.contact).length * 12} fixed-front actual-character contact captures; section navigation; lazy asset loading/cache reuse; illustrated/original shader comparison with color restoration; contact rotation lock; real GLB download; room depth; custom recolor; pointer orbit/zoom; mobile object/contact layouts; keyboard controls; missing-asset feedback; no continuous idle render loop.`);
  evidence.notes.push('Demand-rendered preview; continuous frames run only while an explicitly selected motion clip plays. This is not a full-app/native WebView2 performance benchmark or production character integration.');
  evidence.notes.push('Optional asset failure retains the previous model and supports retry; stale responses cannot override newer selections. Completed sections in the declared review scope have natural-finish sheets. Lounge, study, café, storage, textile and hearth arrangements captured; lighting switches verified.');
  console.log(`PASS: ${evidence.viewChecks.length} view checks and browser interactions; Chromium ${evidence.browser}`);
  succeeded = true;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  if (succeeded && process.env.FURNITURE_KEEP_CAPTURES !== '1') Object.assign(evidence, await cleanupQa());
  else evidence.rawCapturesRetained = true;
  await writeFile(`${output}/browser-report.json`, JSON.stringify(evidence, null, 2) + '\n');
}
