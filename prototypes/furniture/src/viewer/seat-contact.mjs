import * as THREE from 'three';

// A fixed FRONT-view calibration using the existing SVG, not a claim of a
// rigged 3D character. Rotation is disabled by the viewer in this mode.
export function createSeatContact(manifest, pixelsPerUnit, invalidate, onError) {
  const group = new THREE.Group(), textures = new Map();
  const [, top, width, height] = manifest.viewBox;
  const geometry = new THREE.PlaneGeometry(width / pixelsPerUnit, height / pixelsPerUnit);
  const material = new THREE.MeshBasicMaterial({ alphaTest: .05, toneMapped: false });
  const figure = new THREE.Mesh(geometry, material);
  group.name = 'actual-resident-front-contact';
  group.add(figure); group.visible = false;
  let version = 0, disposed = false;
  return {
    group,
    async update(model, key, calibration) {
      const request = ++version;
      const filename = manifest.fixtures[key];
      if (!model || !calibration || !filename) { group.visible = false; return; }
      try {
        if (!textures.has(filename)) textures.set(filename, new THREE.TextureLoader().loadAsync(`/assets/characters/${filename}`).then(texture => {
          texture.colorSpace = THREE.SRGBColorSpace;
          if (disposed) texture.dispose();
          return texture;
        }).catch(error => { textures.delete(filename); throw error; }));
        const texture = await textures.get(filename);
        if (disposed || request !== version) return;
        material.map = texture; material.needsUpdate = true;
        figure.position.set(calibration.x, calibration.seatHeight / pixelsPerUnit - (top + height / 2) / pixelsPerUnit, calibration.z);
        group.visible = true; group.userData.fixture = key; invalidate();
      } catch (error) { if (request === version && !disposed) onError(error); }
    },
    cancel() { version++; group.visible = false; },
    dispose() {
      disposed = true; version++;
      geometry.dispose(); material.dispose();
      for (const promise of textures.values()) promise.then(texture => texture.dispose(), () => {});
    },
  };
}
