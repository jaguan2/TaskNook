// A movable panel is effectively lost once its grab surface has been dragged
// beyond the viewport and only a narrow sliver remains. Treat that deliberate
// throw as dismissal; ordinary edge-adjacent placement stays untouched.
export const EDGE_DISMISS_SLIVER = 40;

export function shouldDismissAtEdge(
  rect,
  viewport = { width: window.innerWidth, height: window.innerHeight },
  sliver = EDGE_DISMISS_SLIVER
) {
  if (!rect || !Number.isFinite(viewport?.width) || !Number.isFinite(viewport?.height)) {
    return false;
  }
  return (
    rect.right <= sliver ||
    rect.left >= viewport.width - sliver ||
    rect.bottom <= sliver ||
    rect.top >= viewport.height - sliver
  );
}

