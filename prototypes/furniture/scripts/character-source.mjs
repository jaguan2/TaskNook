import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

// Source evidence for the exported comparison figures. Do not quietly replace
// the actual Resident with a separately drawn stand-in when the rig changes.
export async function characterSourceFingerprint() {
  const root = new URL('../../../frontend/src/', import.meta.url);
  const files = (await readdir(new URL('components/character/', root)))
    .filter(name => name.endsWith('.jsx') && !name.includes('.test.'))
    .map(name => `components/character/${name}`);
  files.push('lib/body.js', 'lib/profile.js', 'lib/characterPresets.js', 'lib/iso.js', 'lib/tint.js');
  const hash = createHash('sha256');
  for (const file of files.sort()) hash.update(file).update((await readFile(new URL(file, root), 'utf8')).replace(/\r\n?/g, '\n'));
  for (const name of ['export-characters.mjs', 'character-source.mjs']) hash.update(name).update(await readFile(new URL(name, import.meta.url)));
  hash.update(await readFile(new URL('../src/catalog.mjs', import.meta.url)));
  hash.update(await readFile(new URL('../src/catalog-additions.mjs', import.meta.url)));
  return hash.digest('hex');
}
