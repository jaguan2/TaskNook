import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const source = new URL('../../prototypes/furniture/assets/', import.meta.url);
const virtualId = '\0tasknook-catalog-models';

// One authoring source, consumed by both the workshop and the shipping app.
// Vite emits real local files; no prototype server or second asset copy is shipped.
export function catalogModelAssets() {
  let base = '/', models, development = false;
  return {
    name: 'tasknook-catalog-models',
    configResolved(config) { base = config.base; development = config.command === 'serve'; },
    resolveId(id) { if (id === 'virtual:catalog-models') return virtualId; },
    load(id) {
      if (id !== virtualId) return;
      const manifestPath = new URL('manifest.json', source);
      this.addWatchFile(fileURLToPath(manifestPath));
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      models = Object.fromEntries(Object.entries(manifest.models).filter(([, spec]) => !spec.persona && !spec.roamer).map(([key, spec]) => {
        const path = new URL(spec.file, source), bytes = readFileSync(path);
        if (createHash('sha256').update(bytes).digest('hex') !== spec.sha256) throw new Error(`${key}: exported model differs from its manifest. Run the workshop model export.`);
        this.addWatchFile(fileURLToPath(path));
        const filename = `models/catalog/${key}-${spec.sha256.slice(0, 12)}.glb`;
        if (!development) this.emitFile({ type: 'asset', fileName: filename, source: bytes });
        return [key, { url: `${base}${filename}`, width: spec.width, depth: spec.depth, height: spec.height,
          controlHeight: spec.controlHeight, surface: spec.surface, colorRole: spec.colorRole, defaultColor: spec.defaultColor,
          tintable: spec.tintable, wall: spec.wall, forward: spec.forward || '+Z' }];
      }));
      return `export default ${JSON.stringify(models)};`;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        const entry = Object.entries(models || {}).find(([, spec]) => spec.url === pathname);
        if (!entry) return next();
        if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
        const bytes = readFileSync(new URL(`${entry[0]}.glb`, source));
        response.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Cache-Control': 'no-store' });
        response.end(request.method === 'HEAD' ? undefined : bytes);
      });
    },
  };
}
