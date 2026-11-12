import { readdir, realpath, unlink, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';

export const QA_OUTPUT = new URL('../../../build/skill-verification/furniture-3d/', import.meta.url);
const generatedCapture = /^(?:[a-z0-9-]+-(?:[a-f0-9]{6}-(?:iso|rear|under)|default-iso)|contact-[a-z0-9-]+|workshop-[a-z-]+|room-[a-z-]+|furnished-room|[a-z-]+-section)\.(?:png|html)$/;
const summaryCapture = /^(?:[a-z-]+-section|room-(?:lounge|study|cafe|storage|textiles|lighting)|workshop-(?:desktop|mobile|mobile-contact))\.png$/;

// Only recognized regular capture files in this pipeline's owned output.
// Never recurse, follow a file symlink, or delete reports/source assets.
export async function cleanupQa({ keepSummaries = true } = {}) {
  const workspace = await realpath(new URL('../../../', import.meta.url));
  const output = await realpath(QA_OUTPUT);
  if (!output.toLowerCase().startsWith((workspace + sep).toLowerCase())) throw new Error('QA output resolves outside the workspace');
  let removed = 0;
  for (const entry of await readdir(output, { withFileTypes: true })) {
    if (!entry.isFile() || !generatedCapture.test(entry.name) || (keepSummaries && summaryCapture.test(entry.name))) continue;
    await unlink(new URL(entry.name, QA_OUTPUT)); removed++;
  }
  const retainedImages = (await readdir(output)).filter(name => summaryCapture.test(name)).sort();
  return { intermediateCapturesRemoved: removed, retainedImages, rawCapturesRetained: false };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const summary = await cleanupQa();
  const reportUrl = new URL('browser-report.json', QA_OUTPUT);
  const report = JSON.parse(await readFile(reportUrl, 'utf8'));
  await writeFile(reportUrl, JSON.stringify({ ...report, ...summary }, null, 2) + '\n');
  console.log(`Removed ${summary.intermediateCapturesRemoved} intermediate captures; retained ${summary.retainedImages.length} summary images and the QA report in ${fileURLToPath(QA_OUTPUT)}`);
}
