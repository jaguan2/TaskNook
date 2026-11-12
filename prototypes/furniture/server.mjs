import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const references = {
  '/reference.jpg': fileURLToPath(new URL('../../docs/inpso/ss_11568adac20d4baea389a2e0a1c85137ff403955.1920x1080.jpg', import.meta.url)),
  '/game.webp': fileURLToPath(new URL('../../docs/screenshots/01-loft-night.webp', import.meta.url)),
};
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

export function createPreviewServer() {
  return createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = references[path] || resolve(root, `.${path === '/' ? '/index.html' : path}`);
      if (!references[path] && (!file.startsWith(root + sep) || path.split('/').some(p => p.startsWith('.')))) {
        response.writeHead(403).end(); return;
      }
      const type = types[extname(file)];
      if (!type) { response.writeHead(404).end(); return; }
      const content = await readFile(file);
      response.writeHead(200, { 'Content-Type': type, 'Content-Length': content.length, 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      response.writeHead(error instanceof URIError ? 400 : 404).end();
    }
  });
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5188);
  const server = createPreviewServer();
  server.listen(port, '127.0.0.1', () => console.log(`Furniture preview: http://127.0.0.1:${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close());
}
