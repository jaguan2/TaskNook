import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { characterSourceFingerprint } from './character-source.mjs';
import { FURNITURE } from '../src/catalog.mjs';

// The frontend's own JSX transform and React renderer read the real rig. No
// backend, storage or user profile is started or accessed by this generator.
const requireFrontend = createRequire(new URL('../../../frontend/package.json', import.meta.url));
const React = requireFrontend('react');
const { renderToStaticMarkup } = requireFrontend('react-dom/server');
const { createServer } = await import(new URL('../../../frontend/node_modules/vite/dist/node/index.js', import.meta.url));
const root = fileURLToPath(new URL('../../../frontend/', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true, watch: null }, logLevel: 'error' });
try {
  const { Resident } = await server.ssrLoadModule('/src/components/character/index.jsx');
  const { CHARACTER_PRESETS } = await server.ssrLoadModule('/src/lib/characterPresets.js');
  const { BODY_SIZE_PRESETS, bodySizePresetPatch } = await server.ssrLoadModule('/src/lib/body.js');
  const { project } = await server.ssrLoadModule('/src/lib/iso.js');
  const looks = CHARACTER_PRESETS.filter(preset => ['fall-girl', 'fall-guy', 'office-female', 'cozy-gamer'].includes(preset.key));
  const bodies = [{ key: 'authored', label: 'Original build' }, ...BODY_SIZE_PRESETS.filter(body => ['compact', 'broad'].includes(body.key))];
  const output = new URL('../assets/characters/', import.meta.url);
  await mkdir(output, { recursive: true });
  const seatHeights = [...new Set(Object.values(FURNITURE).filter(item => item.contact).map(item => item.contact.seatHeight))].sort((a, b) => a - b);
  const manifest = { version: 2, sourceFingerprint: await characterSourceFingerprint(), viewBox: [-24, -52, 48, 78], seatHeights,
    looks: looks.map(({ key, label }) => ({ key, label })), bodies: bodies.map(({ key, label }) => ({ key, label })), fixtures: {} };
  for (const look of looks) for (const body of bodies) for (const seatHeight of seatHeights) {
    const character = { ...look.character, ...(body.key === 'authored' ? {} : bodySizePresetPatch(body)) };
    const svg = renderToStaticMarkup(React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 288, height: 468, viewBox: manifest.viewBox.join(' ') },
      React.createElement('g', { transform: `translate(0 ${-project(.4, .4).y})` },
        React.createElement(Resident, { character, seated: true, seatH: seatHeight, facing: 'front', activity: null }))));
    const key = `${look.key}-${body.key}-${seatHeight}`;
    const filename = `${key}.svg`;
    await writeFile(new URL(filename, output), svg + '\n');
    manifest.fixtures[key] = filename;
  }
  await writeFile(new URL('manifest.json', output), JSON.stringify(manifest, null, 2) + '\n');
  const expected = new Set(Object.values(manifest.fixtures));
  for (const name of await readdir(output)) {
    if (/^(fall-girl|fall-guy|office-female|cozy-gamer)-(authored|compact|broad)(-\d+)?\.svg$/.test(name) && !expected.has(name)) await unlink(new URL(name, output));
  }
  console.log(`Exported ${Object.keys(manifest.fixtures).length} actual Resident fixtures for the fixed front-view contact check.`);
} finally {
  await server.close();
}
