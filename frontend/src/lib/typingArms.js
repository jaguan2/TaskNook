// Two joined arm segments reach a wrist; the fingertip contact stays on the
// keyboard plane. A small allowance fits stylized bodies without long rubber
// forearms. Unreachable stations use a resting pose instead.
export function typingArm({ shoulder, contact, direction, side, torsoH = 17 }) {
  const forward = direction || { x: 1, y: -.5 };
  const wrist = { x: contact.x - forward.x * 1.8, y: contact.y - forward.y * 1.8 };
  const dx = wrist.x - shoulder.x, dy = wrist.y - shoulder.y;
  const distance = Math.max(.01, Math.hypot(dx, dy));
  let upper = 7.6 + (torsoH - 17) * .15, lower = 7.2 + (torsoH - 17) * .15;
  if (distance > (upper + lower) * 1.08) return null;
  if (distance < Math.abs(upper - lower)) lower = upper;
  const stretch = Math.max(1, distance / (upper + lower));
  upper *= stretch; lower *= stretch;
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const bend = Math.sqrt(Math.max(0, upper * upper - along * along));
  const ux = dx / distance, uy = dy / distance;
  const candidates = [-1, 1].map(sign => ({
    x: shoulder.x + ux * along - uy * bend * sign,
    y: shoulder.y + uy * along + ux * bend * sign,
  }));
  const score = point => side * (point.x - shoulder.x) + .2 * (point.y - shoulder.y);
  const elbow = score(candidates[0]) > score(candidates[1]) ? candidates[0] : candidates[1];
  return { elbow, wrist, forward, contact };
}
