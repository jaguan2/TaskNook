// Runs inside Edge via page.evaluate. DOM matrices and painted-path probes
// follow production transforms; no copied body numbers or mock SVG geometry.
export function probeCharacterFit({ times, name }) {
  document.documentElement.dataset.motion = 'full';
  const svg = document.querySelector('svg'), torso = svg.querySelector('[data-character-torso]');
  const animations = svg.getAnimations({ subtree: true });
  animations.forEach(animation => animation.pause());
  const failures = [], fail = message => { if (!failures.includes(message)) failures.push(message); };
  const world = (node, point) => new DOMPoint(point.x, point.y).matrixTransform(node.getCTM());
  const local = (node, point) => point.matrixTransform(node.getCTM().inverse());
  const surfaces = node => [...node.querySelectorAll('path,rect,ellipse,circle')]
    .filter(shape => shape.getAttribute('fill') !== 'none');
  const legs = [...svg.querySelectorAll('[data-leg-view], [data-seated-leg]')];
  let bootProbes = 0, jointProbes = 0;
  for (const time of times) {
    animations.forEach(animation => { animation.currentTime = time * 1000; });
    // Geometry APIs force style/animation resolution at this exact time.
    const bounds = svg.getBBox(), frame = svg.viewBox.baseVal;
    if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
      || bounds.width <= 0 || bounds.height <= 0 || bounds.x < frame.x || bounds.y < frame.y
      || bounds.x + bounds.width > frame.x + frame.width || bounds.y + bounds.height > frame.y + frame.height) fail(`frame clipping at ${time}s`);
    if (legs.length !== 2) fail('missing leg');
    const feet = [];
    for (const leg of legs) {
      const shin = leg.querySelector('[data-leg-shin], [data-seated-shin]');
      const shoe = leg.querySelector('[data-held-shoe], [data-leg-shoe], [data-seated-shoe]');
      if (!shin || !shoe) { fail('missing calf/shoe'); continue; }
      const length = shin.getTotalLength(), end = shin.getPointAtLength(length);
      // The foot and leg must share some painted area. Probe the actual
      // ankle neighbourhood in the shin's coordinates, not bounding boxes.
      const paint = surfaces(shoe);
      let joined = false;
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 3; dy++) {
        const point = new DOMPoint(end.x + dx, end.y + dy);
        if (shin.isPointInStroke(point) && paint.some(shape => shape.isPointInFill(local(shape, world(shin, point))))) joined = true;
      }
      jointProbes++;
      if (!joined) fail(`detached shoe at ${time}s`);
      const shaft = shoe.querySelector('[data-boot-shaft]');
      if (shaft) for (const offset of leg.hasAttribute('data-held-leg') || leg.hasAttribute('data-seated-leg') ? [4, 7] : [2, 5]) {
        const point = world(shin, shin.getPointAtLength(Math.max(0, length - offset)));
        bootProbes++;
        if (!surfaces(shaft).some(shape => shape.isPointInFill(local(shape, point)))) fail(`boot misses calf at ${time}s`);
      }
      const hipPath = leg.hasAttribute('data-seated-leg')
        ? [...leg.querySelectorAll('path')].find(path => path !== shin && /^M[^L]+L/.test(path.getAttribute('d')))
        : shin;
      if (hipPath && torso) {
        const hip = world(hipPath, hipPath.getPointAtLength(0));
        jointProbes++;
        if (!torso.isPointInFill(local(torso, hip))) fail(`hip outside torso at ${time}s`);
      }
      // Project both soles to the carry/sit wrapper, cancelling shared sway.
      const foot = shoe.querySelector('[data-boot-foot]') || shoe;
      const box = foot.getBBox(), matrix = svg.querySelector('.resident-held')?.getCTM().inverse() || svg.getCTM().inverse();
      const points = [box.x, box.x + box.width].flatMap(x => [box.y, box.y + box.height]
        .map(y => world(foot, { x, y }).matrixTransform(matrix)));
      const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x));
      feet.push({ x: (left + right) / 2, width: right - left });
    }
    // In a stride one foot passes behind the other; sole separation is
    // a rest/carry contact contract, not a ban on natural gait overlap.
    if (!name.startsWith('motion-walking-') && !name.includes('-side.svg') && feet.length === 2
      && Math.abs(feet[0].x - feet[1].x) < Math.min(...feet.map(foot => foot.width)) * .75) fail(`merged soles at ${time}s`);
    for (const arm of svg.querySelectorAll('[data-arm-pose]')) {
      const path = arm.querySelector('path');
      jointProbes++;
      if (!torso.isPointInFill(local(torso, world(path, path.getPointAtLength(0))))) fail(`shoulder outside torso at ${time}s`);
    }
  }
  if (name.startsWith('motion-held-')) {
    if (animations.length !== 1 || animations[0].animationName !== 'resident-held') fail('conflicting carry clocks');
  }
  document.documentElement.dataset.motion = 'reduced';
  getComputedStyle(svg).animationName;
  const reduced = svg.getAnimations({ subtree: true }).filter(animation => animation.playState !== 'finished');
  if (reduced.length) fail('animations remain in reduced motion');
  return { failures, bootProbes, jointProbes };
}
