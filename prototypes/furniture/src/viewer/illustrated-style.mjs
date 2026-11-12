import * as THREE from 'three';

// glTF retains portable matte PBR materials. The runtime selects this palette
// to match the existing SVG's broad values, without changing physical geometry.
export function createIllustratedPalette() {
  const gradient = new THREE.DataTexture(new Uint8Array([65, 112, 174, 221]), 4, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  const variants = new Map(), materials = new Set();
  let lightEnabled = true;
  function register(material) {
    if (!material.isMeshStandardMaterial || variants.has(material)) return;
    if (material.userData.lightSource) {
      material.emissive.set(material.userData.emissionColor);
      material.emissiveIntensity = material.userData.emissionStrength;
    }
    const illustrated = new THREE.MeshToonMaterial({ name: material.name, color: material.color.clone(),
      gradientMap: gradient, side: material.side, transparent: material.transparent,
      opacity: material.opacity, depthWrite: material.depthWrite,
      emissive: material.emissive.clone(), emissiveIntensity: material.emissiveIntensity,
      vertexColors: material.vertexColors });
    illustrated.userData = { ...material.userData };
    const pair = { original: material, illustrated, emissionStrength: material.emissiveIntensity };
    if (material.userData.lightSource && !lightEnabled) material.emissiveIntensity = illustrated.emissiveIntensity = 0;
    variants.set(material, pair); variants.set(illustrated, pair);
    materials.add(material); materials.add(illustrated);
  }
  return {
    materials,
    apply(root, style) {
      root.traverse(node => {
        if (!node.isMesh) return;
        register(node.material);
        const pair = variants.get(node.material);
        if (pair) node.material = pair[style];
      });
    },
    recolor(role, hex, root) {
      const scoped = root ? new Set() : null;
      root?.traverse(node => { if (node.isMesh) { const pair = variants.get(node.material); if (pair) { scoped.add(pair.original); scoped.add(pair.illustrated); } } });
      for (const material of materials) if (material.name === role && !material.userData.fixedPalette && (!scoped || scoped.has(material))) {
        material.color.set(hex);
        if (material.userData.recolorEmission) material.emissive.set(hex);
      }
    },
    setLightEnabled(enabled) {
      lightEnabled = enabled;
      for (const pair of new Set(variants.values())) if (pair.original.userData.lightSource) {
        pair.original.emissiveIntensity = pair.illustrated.emissiveIntensity = enabled ? pair.emissionStrength : 0;
      }
    },
    disposeTexture() { gradient.dispose(); },
  };
}
