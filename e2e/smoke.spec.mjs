import { expect, test } from "@playwright/test";

test("a task survives the production browser journey", async ({ page, baseURL }) => {
  const failures = [];
  const origin = new URL(baseURL).origin;
  const taskName = `Browser smoke ${Date.now()}`;

  page.on("pageerror", (error) => failures.push(`page error: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).origin === origin) {
      failures.push(`request failed: ${request.method()} ${request.url()} (${request.failure()?.errorText})`);
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    const expectedFirstLogin = url.pathname === "/api/auth/login" && response.status() === 401;
    if (url.origin === origin && response.status() >= 400 && !expectedFirstLogin) {
      failures.push(`response ${response.status()}: ${response.request().method()} ${url.pathname}`);
    }
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Tasks" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Profile" })).toBeVisible();

  await page.getByRole("button", { name: "Tasks" }).click();
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  const drawer = page.locator("aside").filter({
    has: page.getByRole("heading", { name: "Tasks" }),
  });
  await drawer.getByPlaceholder("What needs doing?").fill(taskName);
  await drawer.getByRole("button", { name: "+ Add task" }).click();

  const activeRow = drawer
    .getByText(taskName, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'group')][1]");
  await expect(activeRow).toBeVisible();
  await activeRow.getByRole("button", { name: "Mark complete" }).click();
  await expect(drawer.getByText(taskName, { exact: true })).toHaveClass(/line-through/);

  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.getByRole("button", { name: "Tasks" })).toBeVisible();
  await page.getByRole("button", { name: "Tasks" }).click();
  const savedDrawer = page.locator("aside").filter({
    has: page.getByRole("heading", { name: "Tasks" }),
  });
  const savedTask = savedDrawer.getByText(taskName, { exact: true });
  await expect(savedTask).toBeVisible();
  const completedRow = savedTask.locator("xpath=ancestor::div[.//button[@aria-label='Mark as not done']][1]");
  await expect(completedRow.getByRole("button", { name: "Mark as not done" })).toBeVisible();

  await page.waitForLoadState("networkidle");
  expect(failures, failures.join("\n")).toEqual([]);
});

test("hidden room chat cannot intercept widget shortcuts and retains its draft", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Friends", exact: true }).click();
  await page.getByRole("button", { name: /Common Cottage.*Join/ }).click();
  await page.getByRole("button", { name: /Room chat/ }).click();
  await page.getByRole("textbox", { name: "Message the room" }).fill("Keep my room-chat draft");
  await page.getByRole("button", { name: "Widget Mode", exact: true }).click();
  await expect(page.getByRole("region", { name: "Focus widget" })).toBeVisible();
  await page.mouse.click(850, 650);
  await page.keyboard.press("/");
  await expect(page.locator("[data-common-room-chat]")).toHaveAttribute("data-common-chat-open", "false");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Focus widget" })).toHaveCount(0);
  await expect(page.locator('[data-common-room="common-cottage"]')).toBeVisible();
  await page.getByRole("button", { name: /Room chat/ }).click();
  await expect(page.getByRole("textbox", { name: "Message the room" })).toHaveValue("Keep my room-chat draft");
});
