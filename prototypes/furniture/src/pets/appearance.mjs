// AnimationMixer skips writes when a sampled channel is unchanged. Read the
// authored head scale directly so repeated renders never compound growth or
// lose the resting pose's compensation for its compressed body.
export function createPetAppearance(scene, clips) {
  const head = scene.getObjectByName('Head'), base = head.scale.toArray(), meshes = [];
  scene.traverse(node => { if (node.morphTargetDictionary) meshes.push(node); });
  const scales = new Map(clips.map(clip => [clip.name, {
    duration: clip.duration, sample: clip.tracks.find(track => track.name === `${head.name}.scale`)?.createInterpolant(),
  }]));
  return (stage, form, pose, time, adultSize = 1) => {
    const scale = scales.get(pose);
    head.scale.fromArray(scale?.sample?.evaluate(time % scale.duration) || base).multiplyScalar(stage.head);
    scene.scale.setScalar(stage.scale * adultSize);
    for (const node of meshes) for (const key of ['Slender', 'Round']) {
      const index = node.morphTargetDictionary[key];
      if (index !== undefined) node.morphTargetInfluences[index] = form === key.toLowerCase() ? 1 : 0;
    }
  };
}
