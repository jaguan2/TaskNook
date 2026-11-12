import { expect, test } from "@playwright/test";

test("Willow ducks follow water and shore routes and leave home data intact", async ({ page, request }) => {
  const registered = await request.post("/api/auth/register", {
    data: { username: `ducks${Date.now()}`, password: "ducks-test-only" },
  });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json();
  const headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(value => {
    localStorage.setItem("tasknook.token", value);
    localStorage.setItem("tasknook.motion", "full");
  }, token);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Friends", exact: true }).click();
  await page.getByRole("button", { name: "Places", exact: true }).click();
  await page.getByRole("button", { name: /Willow Pond/ }).click();
  const scene = page.locator('[data-common-room="willow-pond"]');
  await expect(scene).toBeVisible();
  await expect(scene.locator('[data-wildlife-route]')).toHaveCount(2);
  const homeBefore = await (await request.get("/api/room", { headers })).json();
  const samples = await scene.evaluate(root => {
    const water = root.querySelector('[data-common-prop="pond"] [data-water-part="surface"]');
    const routes = [...root.querySelectorAll('[data-wildlife-id]')];
    return routes.map(duck => {
      const route = duck.querySelector('[data-wildlife-route]');
      const animations = duck.getAnimations({ subtree: true }).filter(a => a.animationName?.includes('wildlife-'));
      animations.forEach(a => a.pause());
      const duration = animations[0].effect.getTiming().duration;
      const points = [];
      for (let step = 0; step < 100; step++) {
        animations.forEach(a => { a.currentTime = duration * step / 100; });
        const swimming = Number(getComputedStyle(duck.querySelector('[data-wildlife-water]')).opacity) > .5;
        const screen = new DOMPoint(0, 0).matrixTransform(route.getScreenCTM());
        const local = screen.matrixTransform(water.getScreenCTM().inverse());
        points.push({ swimming, inWater: water.isPointInFill(local) });
      }
      animations.forEach(a => { a.currentTime = 0; a.play(); });
      return { id: duck.dataset.wildlifeId, points };
    });
  });
  for (const duck of samples) {
    expect(duck.points.filter(p => p.swimming && !p.inWater), duck.id).toEqual([]);
    if (duck.id === "willow-mallard") expect(duck.points.every(p => p.swimming)).toBe(true);
    else expect(duck.points.some(p => !p.swimming && !p.inWater)).toBe(true);
  }
  // In-app motion settings take effect on these same browser animations.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Reduced", exact: true }).click();
  await expect.poll(() => scene.locator('[data-wildlife-route]').evaluateAll(nodes =>
    nodes.every(node => getComputedStyle(node).animationName === "none"))).toBe(true);
  expect(await (await request.get("/api/room", { headers })).json()).toEqual(homeBefore);
  expect(errors).toEqual([]);
});
