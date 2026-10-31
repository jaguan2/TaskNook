import { expect, test } from "@playwright/test";


test("the default isometric room keeps its composed silhouette", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem("tasknook.timeOfDay", "golden");
    localStorage.setItem("tasknook.timeOfDay.auto", "0");
    localStorage.setItem("tasknook.weatherMode", "clear");
    localStorage.setItem("tasknook.isoPreview", "1");
    localStorage.setItem("tasknook.reduceMotion", "1");
  });

  await page.goto("/");
  await expect(page.locator("[data-iso-room-scene]")).toBeVisible();
  await expect(page).toHaveScreenshot("default-isometric-room.png", {
    animations: "disabled",
    caret: "hide",
    clip: { x: 270, y: 95, width: 740, height: 590 },
    maxDiffPixelRatio: 0.015,
  });
});
