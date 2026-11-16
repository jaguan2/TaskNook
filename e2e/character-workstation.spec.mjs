import { expect, test } from '@playwright/test';

test.use({ actionTimeout: 15000 });
test.setTimeout(120000);
// Reproduces the reported resident independently of changes to NPC hashing.
const mochi = { model: 'masc', skin: '#d9a273', hair: 'curtains', hairColor: '#8a8a94',
  outfit: '#e0a374', coat: 'jacket', coatColor: '#e0a374', width: 6.6, shoulders: -.6,
  height: 32, torso: 17, pants: 'trousers', trouser: '#4a3a5b', shoes: 'sneakers', shoeColor: '#2b2350' };
const ready = async page => {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
};
async function boot(page, request, closeUp = true) {
  const response = await request.post('/api/auth/register', { data: { username: `pose${Date.now()}`, password: 'pose-test-only' } });
  expect(response.status()).toBe(201);
  const { token } = await response.json(), headers = { Authorization: `Bearer ${token}` };
  expect((await request.put('/api/profile', { headers, data: { character: mochi } })).ok()).toBe(true);
  await page.addInitScript(({ token, closeUp }) => {
    localStorage.setItem('tasknook.token', token); localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced'); localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
    localStorage.setItem('tasknook.isoView', JSON.stringify(closeUp ? { x: 155, y: 85, w: 330, h: 247.5 } : { x: 0, y: 0, w: 640, h: 480 }));
  }, { token, closeUp });
  return { headers, saved: async () => (await (await request.get('/api/room', { headers })).json()).iso };
}
async function place(page, request, headers, desk, computer, chair) {
  const placements = [{ id: 'desk', item: 'desk', tint: '#7f9ec9', ...desk },
    { id: 'computer', item: 'computer', ...computer }, { id: 'chair', item: 'deskchair', tint: '#7f9ec9', ...chair },
    { id: 'you', item: 'you', gx: chair.gx, gy: chair.gy }];
  expect((await request.put('/api/room', { headers, data: { placements: [], iso: { w: 8, d: 7, walls: 'none', placements } } })).ok()).toBe(true);
  await page.goto('/'); await ready(page);
  const start = page.getByRole('button', { name: 'Start focusing', exact: true });
  if (!await start.isVisible()) await page.getByRole('button', { name: /^Reset \(discards/ }).click();
  await start.click();
}
async function checkSeat(page) {
  const gap = await page.locator('[data-placement-id="you"] [data-character-torso]').evaluate(torso => {
    const bounds = torso.getBBox();
    const hip = new DOMPoint(0, bounds.y + bounds.height).matrixTransform(torso.getScreenCTM());
    const chair = document.querySelector('[data-placement-id="chair"]');
    // Actual desk-chair pad: centred x/z=0, 21 logical px high, inside its .8 tile footprint.
    const seat = new DOMPoint(0, .8 * 12 - 21).matrixTransform(chair.getScreenCTM());
    const inverse = chair.getScreenCTM().inverse();
    const h = hip.matrixTransform(inverse), s = seat.matrixTransform(inverse);
    return { x: h.x - s.x, y: h.y - s.y };
  });
  expect(Math.abs(gap.x)).toBeLessThan(.3);
  expect(gap.y).toBeGreaterThanOrEqual(-.3);
  expect(gap.y).toBeLessThan(1.5);
}

test('the reported rear workstation has a cushion contact, bent arms and textured hair', async ({ page, request }, info) => {
  const { headers, saved } = await boot(page, request);
  await place(page, request, headers, { gx: 0, gy: 1.5, rot: 1 }, { gx: 0, gy: 2, rot: 1 }, { gx: 1, gy: 2.5, rot: 3 });
  await checkSeat(page);
  const person = page.locator('[data-placement-id="you"]');
  await expect(person.locator('[data-arm-pose="keyboard"]')).toHaveCount(2);
  await expect(person.locator('[data-typing-hand]')).toHaveCount(2);
  await expect(person.locator('[data-hair-back="curtains"][data-hair-texture="clump-flow"]')).toHaveCount(1);
  const badBones = await person.locator('[data-arm-pose="keyboard"]').evaluateAll(nodes => nodes.flatMap(node => {
    const pair = key => node.getAttribute(key).split(',').map(Number);
    const s = pair('data-arm-shoulder'), e = pair('data-arm-elbow'), w = pair('data-arm-wrist');
    return Math.hypot(s[0]-e[0],s[1]-e[1]) > 8.21 || Math.hypot(e[0]-w[0],e[1]-w[1]) > 7.78 ? [node.dataset.armDepth] : [];
  }));
  expect(badBones).toEqual([]);
  const before = await saved();
  await page.screenshot({ path: info.outputPath('workstation-mochi.png') });
  await person.screenshot({ path: info.outputPath('workstation-character.png') });
  await page.reload(); await ready(page); expect(await saved()).toEqual(before);
});

test('the actual Loft preset keeps its desk chair aligned with the keyboard', async ({ page, request }, info) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const { saved } = await boot(page, request, false);
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.locator('.app-drawer').getByTitle('Use Loft', { exact: true }).click();
  await page.getByRole('button', { name: 'Close (Esc)', exact: true }).click();
  await expect.poll(async () => (await saved()).placements.find(p => p.item === 'deskchair')?.gy).toBe(2.5);
  // Use the actual arrival control; an out-of-band PUT while the room is
  // mounted is overwritten by its intentional page-close save.
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await page.getByRole('checkbox', { name: 'In the room', exact: true }).check();
  await page.getByRole('button', { name: 'Close (Esc)', exact: true }).click();
  await expect.poll(async () => (await saved()).placements.some(p => p.item === 'you')).toBe(true);
  const room = await saved(), person = room.placements.find(p => p.item === 'you');
  const chair = room.placements.find(p => p.item === 'deskchair');
  expect([person.gx, person.gy]).toEqual([chair.gx, chair.gy]);
  await page.getByRole('button', { name: 'Start focusing', exact: true }).click();
  await expect(page.locator(`[data-placement-id="${person.id}"] [data-arm-pose="keyboard"]`)).toHaveCount(2);
  await expect(page.getByText('Pick your little self up and set them on any seat', { exact: false })).toBeHidden({ timeout: 10000 });
  await page.screenshot({ path: info.outputPath('workstation-loft.png') });
});

test('misaligned old layouts rest their arms and all four chair facings keep the hips on the pad', async ({ page, request }, info) => {
  const { headers } = await boot(page, request);
  await place(page, request, headers, { gx: 0, gy: 1.5, rot: 1 }, { gx: 0, gy: 2, rot: 1 }, { gx: 1, gy: 2, rot: 3 });
  await checkSeat(page);
  await expect(page.locator('[data-placement-id="you"] [data-arm-pose="keyboard"]')).toHaveCount(0);
  const setups = [
    [{ gx: 2, gy: 2, rot: 0 }, { gx: 2.5, gy: 2, rot: 0 }, { gx: 3, gy: 3, rot: 2 }],
    [{ gx: 2, gy: 2, rot: 1 }, { gx: 2, gy: 2.5, rot: 1 }, { gx: 3, gy: 3, rot: 3 }],
    [{ gx: 2, gy: 2, rot: 2 }, { gx: 2.5, gy: 2, rot: 2 }, { gx: 2.5, gy: 1.5, rot: 0 }],
    [{ gx: 2, gy: 2, rot: 3 }, { gx: 2, gy: 2.5, rot: 3 }, { gx: 1.5, gy: 2.5, rot: 1 }],
  ];
  for (const [desk, computer, chair] of setups) {
    await place(page, request, headers, desk, computer, chair);
    await checkSeat(page);
    await expect(page.locator('[data-placement-id="you"] [data-arm-pose="keyboard"]')).toHaveCount(2);
    await page.screenshot({ path: info.outputPath(`workstation-facing-${chair.rot}.png`) });
  }
});
