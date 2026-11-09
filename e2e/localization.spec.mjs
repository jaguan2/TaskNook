import { expect, test } from "@playwright/test";

for (const [language, tasks, placeholder, add] of [
  ["es", "Tareas", "¿Qué necesitas hacer?", "+ Añadir tarea"],
  ["zh-CN", "任务", "需要做什么？", "+ 添加任务"],
  ["ja", "タスク", "何をする？", "+ タスクを追加"],
  ["ko", "할 일", "무엇을 해야 하나요?", "+ 할 일 추가"],
]) {
  test(`${language} task controls save user content unchanged across reload`, async ({ page }) => {
    await page.addInitScript((language) => {
      localStorage.setItem("tasknook.language", language);
      localStorage.setItem("tasknook.motion", "reduced");
    }, language);
    const name = `${language} — My 日本語 notes`;
    await page.goto("/");
    await page.getByRole("button", { name: tasks, exact: true }).click();
    const drawer = page.locator("aside").filter({ has: page.getByRole("heading", { name: tasks, exact: true }) });
    await drawer.getByPlaceholder(placeholder).fill(name);
    const saved = page.waitForResponse((response) =>
      response.url().endsWith("/api/tasks") && response.request().method() === "POST" && response.status() === 201
    );
    await drawer.getByRole("button", { name: add, exact: true }).click();
    await saved;
    await expect(drawer.getByText(name, { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: tasks, exact: true }).click();
    await expect(drawer.getByText(name, { exact: true })).toBeVisible();
    await expect(drawer.getByRole("button", { name: add, exact: true })).toBeVisible();
  });
}
