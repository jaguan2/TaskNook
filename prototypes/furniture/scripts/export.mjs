import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { validateBytes } from 'gltf-validator';
import { createFurniture, FURNITURE, PIXELS_PER_UNIT } from '../src/models.mjs';
import { migrationSections } from '../src/catalog.mjs';
import { migrationReport } from './migration-report.mjs';

// GLTFExporter uses the browser FileReader interface for binary blobs. Node
// supplies Blob; keep this tiny adapter local to the authoring process.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};

const output = new URL('../assets/', import.meta.url);
await mkdir(output, { recursive: true });
const sections = migrationSections();
const manifest = { version: 1, units: 'tile', pixelsPerUnit: PIXELS_PER_UNIT, sections, models: {} };
for (const [key, spec] of Object.entries(FURNITURE)) {
  const model = createFurniture(key);
  const data = new Uint8Array(await new GLTFExporter().parseAsync(model, { binary: true, onlyVisible: true, animations: model.animations }));
  const validation = await validateBytes(data, { uri: `${key}.glb`, maxIssues: 100 });
  if (validation.issues.numErrors || validation.issues.numWarnings) {
    throw new Error(`${key}: invalid GLB: ${JSON.stringify(validation.issues)}`);
  }
  let triangles = 0, meshes = 0;
  model.traverse(node => {
    if (!node.isMesh) return;
    meshes++;
    triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
  });
  await writeFile(new URL(`${key}.glb`, output), data);
  manifest.models[key] = { ...spec, ...(model.userData.lightSources && { lightSources: model.userData.lightSources }),
    ...(model.animations.length && { animations: model.animations.map(clip => ({ name: clip.name, duration: clip.duration, tracks: clip.tracks.length })), rig: model.userData.rig }),
    ...(model.userData.shades && { shadeOpenings: model.userData.shades }), file: `${key}.glb`, bytes: data.byteLength, triangles, meshes,
    sha256: createHash('sha256').update(data).digest('hex') };
  console.log(`${key}: ${triangles} triangles, ${data.byteLength} bytes, validator clean`);
}
await writeFile(new URL('manifest.json', output), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(new URL('../../../docs/CATALOG_3D_MIGRATION.md', import.meta.url), migrationReport(manifest));
console.log(`Wrote standalone assets to ${fileURLToPath(output)}`);
