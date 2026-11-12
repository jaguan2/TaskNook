// Merge opaque pixel runs into a small invisible SVG hit path. Raster-image rectangles
// otherwise swallow clicks in their transparent corners and holes.
export function modelHitShape(rgba, width, height) {
  let active = new Map();
  const rectangles = [];
  for (let y = 0; y < height; y++) {
    const next = new Map();
    for (let x = 0; x < width;) {
      if (rgba[(y * width + x) * 4 + 3] < 16) { x++; continue; }
      const start = x;
      while (x < width && rgba[(y * width + x) * 4 + 3] >= 16) x++;
      const key = `${start}:${x - start}`;
      const rectangle = active.get(key) || { x: start, y, w: x - start, h: 0 };
      rectangle.h++; next.set(key, rectangle); active.delete(key);
    }
    rectangles.push(...active.values()); active = next;
  }
  rectangles.push(...active.values());
  return rectangles.map(({ x, y, w, h }) => `M${x} ${y}h${w}v${h}h${-w}z`).join('');
}
