import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewServer } from '../server.mjs';

test('preview serves local assets, rejects writes, and contains file access', async () => {
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const index = await fetch(base);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /Furniture workshop/);
    for (const [path, mime] of [['src/viewer/index.mjs', 'text/javascript'], ['src/viewer/workshop.css', 'text/css']]) {
      const response = await fetch(`${base}/${path}`);
      assert.equal(response.status, 200, 'organized viewer entry is unreachable');
      assert.equal(response.headers.get('content-type'), mime);
    }
    const asset = await fetch(`${base}/assets/armchair.glb`, { method: 'HEAD' });
    assert.equal(asset.headers.get('content-type'), 'model/gltf-binary');
    assert.equal((await asset.arrayBuffer()).byteLength, 0);
    assert.equal((await fetch(base, { method: 'PUT', body: 'no writes' })).status, 405);
    assert.equal((await fetch(`${base}/.git/config`)).status, 403);
    assert.equal((await fetch(`${base}/..%5c..%5cbackend%5capp.py`)).status, 403);
    assert.equal((await fetch(`${base}/%zz`)).status, 400);
    assert.equal((await fetch(`${base}/missing.glb`)).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
