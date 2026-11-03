import { afterEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = resolve(tmpdir());
let fixture;

afterEach(() => {
  vi.unstubAllEnvs();
  if (!fixture) return;
  // Delete only this test's freshly allocated directory, never a computed parent.
  expect(dirname(fixture)).toBe(temporaryRoot);
  rmSync(fixture, { recursive: true, force: true });
  fixture = undefined;
});

function emittedFiles(directory, prefix = "") {
  return Object.fromEntries(readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = join(prefix, entry.name);
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? Object.entries(emittedFiles(path, name))
      : [[name, readFileSync(path, "utf8")]];
  }));
}

it("emits identical production assets from LF and CRLF HTML, JSX and CSS without rewriting sources", async () => {
  vi.stubEnv("NODE_ENV", "production");
  fixture = mkdtempSync(join(temporaryRoot, "tasknook-build-"));
  mkdirSync(join(fixture, "src"));
  const inputs = {
    "index.html": '<!doctype html>\n<main></main>\n<script type="module" src="/src/shape.jsx"></script>\n',
    "src/shape.jsx": 'import "./style.css";\nconst shape = <path d="M0 0\n  L4 8 Z" />;\ndocument.querySelector("main").textContent = shape.props.d;\n',
    "src/style.css": "main {\n  color: #789388;\n}\n",
  };
  const outputs = [];
  for (const ending of ["\n", "\r\n"]) {
    for (const [name, source] of Object.entries(inputs)) {
      writeFileSync(join(fixture, name), source.replaceAll("\n", ending));
    }
    const outDir = join(fixture, ending === "\n" ? "dist-lf" : "dist-crlf");
    await build({
      configFile: join(frontend, "vite.config.js"),
      root: fixture,
      logLevel: "silent",
      resolve: { alias: { react: join(frontend, "node_modules/react") } },
      build: { outDir, emptyOutDir: true },
    });
    const emitted = emittedFiles(outDir);
    // The fixture geometry must survive tree shaking for this to test JSX values.
    expect(Object.values(emitted).join("\n")).toContain("L4 8 Z");
    outputs.push(Object.fromEntries(Object.entries(emitted).map(([name, contents]) =>
      [name, createHash("sha256").update(contents).digest("hex")]
    )));
  }

  expect(outputs[1]).toEqual(outputs[0]);
  expect(readFileSync(join(fixture, "src/shape.jsx"), "utf8")).toContain("\r\n");
}, 30_000);
