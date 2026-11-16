import { expect, test } from '@playwright/test';
import { PRESETS, presetPlacements, ITEMS, COTTAGE_FRAME } from '../frontend/src/lib/room.js';
import en from '../frontend/src/i18n/locales/en.js';

const scene = page => page.getByLabel('Classic cottage scene', { exact: true });
const roomPanel = page => page.locator('.app-drawer');
async function boot(page, request) {
  const registered = await request.post('/api/auth/register', { data: { username: `classic${Date.now()}`, password: 'classic-test-only' } });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json(), headers = { Authorization: `Bearer ${token}` };
  expect((await request.put('/api/room', { headers, data: { placements: presetPlacements('lounge') } })).ok()).toBe(true);
  await page.clock.setFixedTime(new Date('2026-11-15T17:00:00Z'));
  await page.addInitScript(token => {
    localStorage.setItem('tasknook.token', token);
    localStorage.setItem('tasknook.isoPreview', '0');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, token);
  await page.goto('/');
  await expect(scene(page)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return { headers, saved: async () => (await (await request.get('/api/room', { headers })).json()).placements };
}
async function openRoom(page) {
  await page.locator('.dock-item').getByText('Room', { exact: true }).click();
  await expect(roomPanel(page)).toHaveCSS('opacity', '1');
}
async function closeRoom(page) {
  await roomPanel(page).getByRole('button', { name: en.messages['drawer.close'] }).click();
  await expect(roomPanel(page)).toHaveCount(0);
}

test('all seven classic presets have readable activity groups and complete furniture in the room', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const { saved } = await boot(page, request);
  const failures = []; page.on('pageerror', error => failures.push(error.message));
  for (const [key, preset] of Object.entries(PRESETS)) {
    await openRoom(page);
    await roomPanel(page).getByRole('button', { name: preset.label, exact: true }).click();
    await closeRoom(page);
    await expect(scene(page).locator('[data-cottage-placement]')).toHaveCount(preset.placements.length);
    await expect.poll(async () => (await saved()).length).toBe(preset.placements.length);
    const outside = await scene(page).locator('[data-cottage-placement]').evaluateAll((nodes, frame) => nodes.flatMap(node => {
      const p = new DOMPoint(0, 0).matrixTransform(node.transform.baseVal.consolidate().matrix);
      const b = node.getBBox();
      return p.x + b.x < frame.x - 4 || p.x + b.x + b.width > frame.x + frame.w + 4
        || p.y + b.y < frame.y - 4 || p.y + b.y + b.height > frame.y + frame.h + 4 ? [node.dataset.cottageItem] : [];
    }), COTTAGE_FRAME);
    expect(outside).toEqual([]);
    expect(await scene(page).locator('filter').count()).toBe(0);
    const missingPaint = await scene(page).evaluate(svg => [...svg.querySelectorAll('[fill^="url("], [clip-path^="url("]')].flatMap(node => {
      const value = node.getAttribute('fill') || node.getAttribute('clip-path');
      const id = value.match(/#([^)]*)/)?.[1];
      return id && !document.getElementById(id) ? [id] : [];
    }));
    expect(missingPaint).toEqual([]);
    await page.screenshot({ path: info.outputPath(`classic-${key}.png`) });
  }
  // The render-only refresh applies to old saved coordinates and colours too.
  const before = await saved(); await page.reload();
  await expect(scene(page).locator('[data-cottage-placement]')).toHaveCount(before.length);
  expect(await saved()).toEqual(before);
  expect(failures).toEqual([]);
});

test('classic furniture still moves, recolours, copies and reloads through the real decorate controls', async ({ page, request }, info) => {
  const { saved } = await boot(page, request);
  await openRoom(page);
  await roomPanel(page).getByRole('button', { name: 'Cozy lounge', exact: true }).click();
  await roomPanel(page).getByRole('button', { name: en.messages['room.decorate.start'], exact: true }).click();
  await closeRoom(page);
  const sofa = scene(page).getByRole('button', { name: 'Select Cozy sofa', exact: true });
  await sofa.focus(); await page.keyboard.press('Enter');
  await page.getByPlaceholder('#rrggbb').fill('#a78bb7');
  await page.getByPlaceholder('#rrggbb').press('Enter');
  await sofa.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowUp');
  await expect.poll(async () => (await saved()).find(p => p.item === 'sofa')).toMatchObject({ x: 844, y: 412, tint: '#a78bb7' });
  await page.screenshot({ path: info.outputPath('classic-decorate.png') });
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect.poll(async () => (await saved()).filter(p => p.item === 'sofa').length).toBe(2);
  const copy = (await saved()).filter(p => p.item === 'sofa').at(-1);
  const placed = scene(page).locator(`[data-cottage-placement="${copy.id}"]`);
  const start = await placed.evaluate(node => {
    const p = new DOMPoint(0, -60).matrixTransform(node.getScreenCTM()); return { x: p.x, y: p.y };
  });
  const delta = await scene(page).evaluate(svg => {
    const m = svg.getScreenCTM(); return { x: m.a * 40, y: m.d * 16 };
  });
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(start.x + delta.x, start.y + delta.y, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => (await saved()).find(p => p.id === copy.id)).toMatchObject({ x: copy.x + 40, y: copy.y + 16, tint: '#a78bb7' });
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect.poll(async () => (await saved()).filter(p => p.item === 'sofa').length).toBe(2);
  await page.getByRole('button', { name: 'Remove?', exact: true }).click();
  await expect.poll(async () => (await saved()).filter(p => p.item === 'sofa').length).toBe(1);
  const stored = await saved(); await page.reload();
  expect(await saved()).toEqual(stored);
  // Actual draw extents stay inside selection bounds for the remodeled pieces.
  const edited = ['sofa', 'deskchair', 'bookshelf', 'rug', 'rugstripe', 'deskplant', 'books', 'mug', 'pencilcup', 'frame', 'polaroids', 'shelf', 'cactus', 'hangplant', 'monstera', 'cat'];
  const bounds = await scene(page).locator('[data-cottage-placement]').evaluateAll((nodes, meta) => nodes.flatMap(node => {
    const key = node.dataset.cottageItem; if (!meta[key]) return [];
    const b = node.getBBox(), h = meta[key];
    return b.x < h.x - 4 || b.y < h.y - 4 || b.x + b.width > h.x + h.w + 4 || b.y + b.height > h.y + h.h + 4 ? [key] : [];
  }), Object.fromEntries(edited.map(key => [key, ITEMS[key].hit])));
  expect(bounds).toEqual([]);
});

test('classic catalog, lighting and compact windows remain usable', async ({ page, request }, info) => {
  await boot(page, request);
  await openRoom(page);
  const previews = roomPanel(page).locator('button > svg.cottage-preview');
  await expect(previews).toHaveCount(Object.keys(ITEMS).length);
  const cards = await previews.evaluateAll(nodes => nodes.map(svg => ({
    svg: svg.outerHTML,
    name: svg.parentElement.querySelector('span.block').textContent,
    width: svg.getBBox().width, height: svg.getBBox().height,
  })));
  expect(cards.every(card => card.width > 0 && card.height > 0)).toBe(true);
  const checked = ['sofa', 'armchair', 'deskchair', 'bookshelf', 'rug', 'rugstripe', 'deskplant', 'books', 'mug', 'pencilcup', 'frame', 'polaroids', 'shelf', 'cactus', 'hangplant', 'monstera', 'cat'];
  const clipped = await previews.evaluateAll((nodes, bounds) => nodes.flatMap(svg => {
    const name = svg.parentElement.querySelector('span.block').textContent;
    const h = bounds[name]; if (!h) return [];
    const b = svg.getBBox();
    return b.x < h.x - 4 || b.y < h.y - 4 || b.x + b.width > h.x + h.w + 4 || b.y + b.height > h.y + h.h + 4 ? [name] : [];
  }), Object.fromEntries(checked.map(key => [ITEMS[key].label, ITEMS[key].hit])));
  expect(clipped).toEqual([]);
  const theme = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ['rose', 'petal', 'glow', 'night'].map(key => `--color-${key}:${style.getPropertyValue(`--color-${key}`)};`).join('');
  });
  // Render the real catalog sprites together, without changing the live room.
  const sheet = await page.context().newPage();
  try {
    await sheet.setViewportSize({ width: 1200, height: 1000 });
    await sheet.setContent(`<style>:root{${theme}}body{margin:0;padding:24px;background:#302937;color:#eadfce;font:15px system-ui}main{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}article{height:138px;background:#8e7c76;border-radius:12px;text-align:center}svg{display:block;width:164px;height:108px;margin:auto}</style><h1>Classic cottage · ${cards.length} illustrated items</h1><main></main>`);
    await sheet.locator('main').evaluate((main, cards) => {
      for (const card of cards) {
        const article = document.createElement('article');
        article.innerHTML = card.svg;
        const name = document.createElement('span'); name.textContent = card.name;
        article.append(name); main.append(article);
      }
    }, cards);
    await sheet.screenshot({ path: info.outputPath('classic-catalog.png'), fullPage: true });
  } finally { await sheet.close(); }
  await closeRoom(page);
  for (const [period, opacity] of [['Day', '0.22'], ['Sunset', '0.15'], ['Night', '0.055']]) {
    await page.locator('.dock-item').getByText('Weather', { exact: true }).click();
    await expect(roomPanel(page)).toHaveCSS('opacity', '1');
    await roomPanel(page).getByTitle(`Clear ${period.toLowerCase()}`, { exact: true }).click();
    await closeRoom(page);
    await expect(scene(page).locator('[data-cottage-window-light]')).toHaveAttribute('opacity', opacity);
    await page.screenshot({ path: info.outputPath(`classic-light-${period.toLowerCase()}.png`) });
  }
  // The whole saved coordinate frame must fit even at the desktop minimum.
  await page.setViewportSize({ width: 600, height: 420 });
  const frame = await scene(page).evaluate((svg, frame) => {
    const m = svg.getScreenCTM();
    const a = new DOMPoint(frame.x, frame.y).matrixTransform(m);
    const b = new DOMPoint(frame.x + frame.w, frame.y + frame.h).matrixTransform(m);
    return { left: a.x, top: a.y, right: b.x, bottom: b.y };
  }, COTTAGE_FRAME);
  expect(frame.left).toBeGreaterThanOrEqual(-1); expect(frame.top).toBeGreaterThanOrEqual(-1);
  expect(frame.right).toBeLessThanOrEqual(601); expect(frame.bottom).toBeLessThanOrEqual(421);
  await expect(scene(page).getByRole('button', { name: /^Select / })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('classic-compact.png') });
});
