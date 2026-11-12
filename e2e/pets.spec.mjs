import { expect, test } from "@playwright/test";

test("adopted pets retain their traits, pause independently, and grow while closed", async ({ page, request }) => {
  const registered = await request.post("/api/auth/register", {
    data: { username: `pets${Date.now()}`, password: "pets-test-only" },
  });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json();
  const headers = { Authorization: `Bearer ${token}` };
  const room = async () => (await request.get("/api/room", { headers })).json();
  await page.addInitScript(value => {
    localStorage.setItem("tasknook.token", value);
    localStorage.setItem("tasknook.motion", "reduced");
    localStorage.setItem("tasknook.isoPreview", "1");
  }, token);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  const names = page.getByRole("textbox", { name: "Pet name" });
  await expect(names.first()).toBeVisible();
  const initialCount = await names.count();
  await page.getByRole("button", { name: /Adopt/ }).click();
  await page.getByRole("button", { name: /A rabbit/ }).click();
  await expect(names).toHaveCount(initialCount + 1);
  await names.last().fill("Sprout");
  await names.last().press("Enter");
  const card = names.last().locator('xpath=ancestor::div[contains(@class,"relative")][1]');
  await expect(card.getByRole("checkbox", { name: "Grow over time" })).toBeChecked();
  await expect(card.getByText("Teen in 2 days", { exact: true })).toBeVisible();
  await card.getByRole("checkbox", { name: "Grow over time" }).uncheck();
  await card.getByRole("group", { name: "Body form", exact: true })
    .getByRole("button", { name: "Round", exact: true }).click();
  await card.getByRole("slider", { name: "Pet adult size" }).fill("0.83");
  await expect.poll(async () => (await room()).iso.placements.find(p => p.name === "Sprout"))
    .toMatchObject({ petSize: 0.83, petForm: "round", growth: { startedAt: null } });
  const saved = await room();
  const sprout = saved.iso.placements.find(p => p.name === "Sprout");
  expect(sprout.growth.ageMs).toBeLessThan(60_000);
  await page.reload();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(card.getByRole("checkbox", { name: "Grow over time" })).not.toBeChecked();
  await expect(card.getByText("Growth paused · stays baby", { exact: true })).toBeVisible();
  await expect(card.getByRole("slider", { name: "Pet adult size" })).toHaveValue("0.83");
  await card.getByRole("checkbox", { name: "Grow over time" }).check();
  await expect.poll(async () => (await room()).iso.placements.find(p => p.id === sprout.id).growth.startedAt)
    .toEqual(expect.any(Number));

  // Simulate two pets adopted at the same time, with one left paused. No week-long wait.
  const offline = await room();
  offline.iso.placements = offline.iso.placements.map(p => p.id === sprout.id
    ? { ...p, growth: { ageMs: 0, startedAt: Date.now() - 3 * 86_400_000 } } : p);
  offline.iso.placements.push({ ...sprout, id: "paused-baby", name: "Bud", gx: 2, gy: 2 });
  expect((await request.put("/api/room", { headers, data: offline })).status()).toBe(200);
  await page.reload();
  await expect(page.locator(`[data-placement-id="${sprout.id}"] [data-pet-stage="teen"]`)).toHaveCount(1);
  await expect(page.locator('[data-placement-id="paused-baby"] [data-pet-stage="baby"]')).toHaveCount(1);
  const adult = await room();
  adult.iso.placements = adult.iso.placements.map(p => p.id === sprout.id
    ? { ...p, growth: { ageMs: 0, startedAt: Date.now() - 8 * 86_400_000 } } : p);
  expect((await request.put("/api/room", { headers, data: adult })).status()).toBe(200);
  await page.reload();
  await expect(page.locator(`[data-placement-id="${sprout.id}"] [data-pet-stage="adult"]`)).toHaveCount(1);
  await expect(page.locator('[data-placement-id="paused-baby"] [data-pet-stage="baby"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});
