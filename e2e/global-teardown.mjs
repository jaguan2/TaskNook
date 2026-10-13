import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";

export default function removeE2eRunDirectory() {
  const runDirectory = process.env.TASKNOOK_E2E_RUN_DIR;
  if (!runDirectory) return;

  const target = resolve(runDirectory);
  const withinTemp = relative(resolve(tmpdir()), target);
  if (!withinTemp || withinTemp.startsWith("..") || isAbsolute(withinTemp)) {
    throw new Error(`Refusing to remove E2E data outside the OS temp directory: ${target}`);
  }

  rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
