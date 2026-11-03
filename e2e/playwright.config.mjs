import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import removeE2eRunDirectory from "./global-teardown.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const port = 5117;
const origin = `http://127.0.0.1:${port}`;
const runDirectory = mkdtempSync(join(tmpdir(), "tasknook-e2e-"));
const database = join(runDirectory, "tasknook.db");
process.env.TASKNOOK_E2E_RUN_DIR = runDirectory;
// Playwright stops its managed web server while the runner itself exits. A
// global teardown runs too early on Windows: Flask still owns SQLite there.
process.once("exit", removeE2eRunDirectory);

export default defineConfig({
  testDir: here,
  testMatch: "*.spec.mjs",
  snapshotPathTemplate: "{testDir}/{testFileName}-snapshots/{arg}{ext}",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: origin,
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "python backend/app.py",
    cwd: root,
    env: {
      ...process.env,
      FLASK_DEBUG: "0",
      PORT: String(port),
      TASKNOOK_DB: database,
      TASKNOOK_NO_UPDATE_CHECK: "1",
    },
    url: `${origin}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
