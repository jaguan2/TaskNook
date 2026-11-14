import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function petSourceFingerprint() {
  const hash = createHash('sha256');
  for (const name of ['components/IsoPetItems.jsx', 'components/character/volume.jsx', 'lib/pets.js', 'lib/iso.js']) {
    hash.update(name).update((await readFile(new URL(`../../../frontend/src/${name}`, import.meta.url), 'utf8')).replace(/\r\n?/g, '\n'));
  }
  for (const name of ['pet-source.mjs', 'export-pet-source.mjs']) hash.update(name).update((await readFile(new URL(name, import.meta.url), 'utf8')).replace(/\r\n?/g, '\n'));
  return hash.digest('hex');
}
