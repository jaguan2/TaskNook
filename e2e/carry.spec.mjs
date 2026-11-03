import { expect, test } from "@playwright/test";

test("a resident dropped at a glowing seat's centre sits there and survives reload", async ({ page, request }) => {
  const registered = await request.post("/api/auth/register", {
    data: { username: `carry${Date.now()}`, password: "carry-test-only" },
  });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json();
  const headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript((value) => {
    localStorage.setItem("tasknook.token", value);
    localStorage.setItem("tasknook.motion", "reduced");
    localStorage.setItem("tasknook.isoPreview", "1");
  }, token);
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  for (const [item, rot, expected] of [
    ["chair", 0, { gx: 4, gy: 3 }],
    ["sofa", 1, { gx: 4, gy: 3.5 }],
  ]) {
    const saved = await request.put("/api/room", {
      headers,
      data: { placements: [], iso: { w: 9, d: 7, placements: [
        { id: "me", item: "resident", gx: 1, gy: 4 },
        { id: "seat", item, gx: 4, gy: 3, rot },
      ] } },
    });
    expect(saved.status()).toBe(200);
    await page.goto("/");
    const resident = page.locator('[data-placement-id="me"]');
    await expect(resident).toBeVisible();
    await page.waitForLoadState("networkidle");
    const body = await resident.boundingBox();
    await page.mouse.move(body.x + body.width / 2, body.y + body.height * 0.2);
    await page.mouse.down();
    const glow = page.locator('polygon.room-breathe[fill="#ffe9b0"][stroke="#ffe9b0"]');
    await expect(glow).toHaveCount(1);
    const target = await glow.evaluate(element => {
      const box = element.getBBox();
      const point = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2)
        .matrixTransform(element.getScreenCTM());
      return { x: point.x, y: point.y };
    });
    await page.mouse.move(target.x, target.y, { steps: 5 });
    await page.mouse.up();

    await expect.poll(async () => {
      const response = await request.get("/api/room", { headers });
      return (await response.json()).iso.placements.find(placement => placement.id === "me");
    }).toEqual({ id: "me", item: "resident", ...expected });
    await page.reload();
    await expect(page.locator('[data-placement-id="me"]')).toBeVisible();
    const response = await request.get("/api/room", { headers });
    expect((await response.json()).iso.placements.find(placement => placement.id === "me"))
      .toEqual({ id: "me", item: "resident", ...expected });
  }
  expect(errors).toEqual([]);
});
