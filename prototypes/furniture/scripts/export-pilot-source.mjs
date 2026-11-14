import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { characterSourceFingerprint } from './character-source.mjs';

// Production SVG comparisons come from Resident itself, never a redrawn mock.
const requireFrontend = createRequire(new URL('../../../frontend/package.json', import.meta.url));
const React = requireFrontend('react');
const { renderToStaticMarkup } = requireFrontend('react-dom/server');
const { createServer } = await import(new URL('../../../frontend/node_modules/vite/dist/node/index.js', import.meta.url));
const server = await createServer({ root: fileURLToPath(new URL('../../../frontend/', import.meta.url)), server: { middlewareMode: true, watch: null }, logLevel: 'error' });
try {
  const { Resident } = await server.ssrLoadModule('/src/components/character/index.jsx');
  const { DEFAULT_CHARACTER } = await server.ssrLoadModule('/src/lib/profile.js');
  const { project } = await server.ssrLoadModule('/src/lib/iso.js');
  const output = new URL('../assets/character-pilot/', import.meta.url);
  await mkdir(output, { recursive: true });
  for (const pose of ['Idle', 'Walk', 'Sit', 'Type', 'Sleep', 'AnklesCrossed']) for (const facing of ['front', 'side', 'back']) {
    const seated = ['Sit', 'Type', 'AnklesCrossed'].includes(pose);
    const svg = renderToStaticMarkup(React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 384, height: 352, viewBox: '-48 -64 96 88' },
      React.createElement('g', { transform: `translate(0 ${-project(.4, .4).y - (seated ? 19 : 0)})` },
        React.createElement(Resident, { character: { ...DEFAULT_CHARACTER, seatPose: pose === 'AnklesCrossed' ? 'ankles' : 'relaxed' },
          facing, seated, seatH: 19, moving: pose === 'Walk', lying: pose === 'Sleep', activity: pose === 'Type' ? 'focus' : null }))));
    await writeFile(new URL(`svg-${pose.toLowerCase()}-${facing}.svg`, output), svg + '\n');
  }
  await writeFile(new URL('source-art.json', output), JSON.stringify({ sourceFingerprint: await characterSourceFingerprint(), character: DEFAULT_CHARACTER, viewBox: [-48, -64, 96, 88], seatHeight: 19, motion: 'Static comparison frames; production CSS animation is not embedded.' }, null, 2) + '\n');
  // These three generator-owned frames belong to the retired pilot pose.
  for (const facing of ['front', 'side', 'back']) await unlink(new URL(`svg-crosslegged-${facing}.svg`, output)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  console.log('Exported 18 actual Resident comparison frames.');
} finally { await server.close(); }
